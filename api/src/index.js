require('dotenv').config();

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const multer = require('multer');
const Database = require('better-sqlite3');
const path = require('path');

const integrations = require('./integrations');
const chain = integrations.chain;
const ocr = integrations.ocr;

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const dbPath = process.env.DB_FILE || path.join(__dirname, '../data/demo.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

const SERIAL_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const SERIAL_LENGTH = 16;

const PACK_STATUS = {
  REGISTERED: 'registered',
  IN_CUSTODY: 'in_custody',
  DISPENSED: 'dispensed'
};

function generateSerial() {
  if (SERIAL_ALPHABET.length !== 32) {
    throw new Error('Serial alphabet must contain exactly 32 symbols');
  }
  const bytes = crypto.randomBytes(SERIAL_LENGTH);
  let serial = '';
  for (let i = 0; i < SERIAL_LENGTH; i += 1) {
    serial += SERIAL_ALPHABET[bytes[i] % SERIAL_ALPHABET.length];
  }
  return serial;
}

function generateSerialSet(count) {
  const serials = new Set();
  while (serials.size < count) {
    serials.add(generateSerial());
  }
  return [...serials];
}

async function withChain(fn, fallback) {
  try {
    const result = await fn();
    return result || fallback;
  } catch (error) {
    console.error('[chain] call failed:', error.message);
    return fallback;
  }
}

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized', message: 'Missing or invalid token' });
  }
  const token = authHeader.substring(7).trim();
  if (!token) {
    return res.status(401).json({ error: 'unauthorized', message: 'Missing or invalid token' });
  }
  const actor = db.prepare('SELECT * FROM actors WHERE token = ?').get(token);
  if (!actor) {
    return res.status(401).json({ error: 'unauthorized', message: 'Missing or invalid token' });
  }
  req.actor = actor;
  next();
};

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.actor.role)) {
      return res.status(403).json({ error: 'forbidden', message: 'Role not permitted for this action' });
    }
    next();
  };
}

const findActorById = db.prepare('SELECT * FROM actors WHERE id = ?');
const findActorByAddress = db.prepare('SELECT * FROM actors WHERE address = ?');
const findPackBySerial = db.prepare('SELECT * FROM packs WHERE serial = ?');
const findBatchById = db.prepare('SELECT * FROM batches WHERE id = ?');
const insertBatch = db.prepare(`
  INSERT INTO batches (productName, batchNo, expiry, quantity)
  VALUES (@productName, @batchNo, @expiry, @quantity)
`);
const insertPack = db.prepare(`
  INSERT INTO packs (serial, batchId, status, currentHolderId)
  VALUES (@serial, @batchId, @status, @currentHolderId)
`);
const updatePack = db.prepare(`
  UPDATE packs SET status = @status, currentHolderId = @currentHolderId WHERE serial = @serial
`);
const insertEvent = db.prepare(`
  INSERT INTO events (packSerial, type, actorId, at, txHash, details)
  VALUES (@packSerial, @type, @actorId, @at, @txHash, @details)
`);
const insertAlert = db.prepare(`
  INSERT INTO alerts (serial, type, at, details)
  VALUES (@serial, @type, @at, @details)
`);
const selectEventsForSerial = db.prepare(`
  SELECT events.*, actors.name AS actorName, actors.place AS place
  FROM events
  LEFT JOIN actors ON actors.id = events.actorId
  WHERE events.packSerial = ?
  ORDER BY events.at ASC, events.id ASC
`);

app.post('/api/login', (req, res) => {
  const { username } = req.body || {};
  if (!username) {
    return res.status(401).json({ error: 'unauthorized', message: 'Unknown user' });
  }

  const actor = db.prepare('SELECT * FROM actors WHERE username = ?').get(username);

  if (!actor) {
    return res.status(401).json({ error: 'unauthorized', message: 'Unknown user' });
  }

  const issueToken = db.transaction(() => {
    const token = crypto.randomUUID();
    db.prepare('UPDATE actors SET token = ? WHERE id = ?').run(token, actor.id);
    return token;
  });

  const token = issueToken();

  res.status(200).json({
    token,
    actor: {
      id: actor.id,
      role: actor.role,
      name: actor.name,
      place: actor.place
    }
  });
});

app.post('/api/batches', requireAuth, requireRole('manufacturer'), async (req, res) => {
  const { productName, batchNo, expiry, quantity } = req.body || {};
  const count = Number(quantity);

  if (!productName || !batchNo || !expiry || !Number.isInteger(count) || count < 1) {
    return res.status(400).json({
      error: 'invalid_request',
      message: 'productName, batchNo, expiry and a positive integer quantity are required'
    });
  }

  const serials = generateSerialSet(count);

  try {
    const chainResult = await withChain(
      () => chain.registerPacks(serials, { actor: req.actor.address, batchNo }),
      { txHash: null }
    );

    const createBatch = db.transaction(() => {
      const batch = insertBatch.run({
        productName: String(productName).trim(),
        batchNo: String(batchNo).trim(),
        expiry: String(expiry).trim(),
        quantity: count
      });
      const batchId = batch.lastInsertRowid;
      const at = new Date().toISOString();

      for (const serial of serials) {
        insertPack.run({
          serial,
          batchId,
          status: PACK_STATUS.REGISTERED,
          currentHolderId: req.actor.id
        });
        insertEvent.run({
          packSerial: serial,
          type: 'registered',
          actorId: req.actor.id,
          at,
          txHash: chainResult.txHash || null,
          details: JSON.stringify({ batchId, batchNo, productName })
        });
      }

      return batchId;
    });

    const batchId = createBatch();
    res.status(201).json({ batchId, serials, txHash: chainResult.txHash || null });
  } catch (error) {
    if (error && error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
      return res.status(409).json({ error: 'conflict', message: 'Serial collision, retry batch creation' });
    }
    console.error('[api] batch creation failed:', error);
    res.status(500).json({ error: 'server_error', message: 'Unable to register batch' });
  }
});

app.post('/api/custody/transfer', requireAuth, requireRole('manufacturer', 'distributor'), async (req, res) => {
  const { serials, toActorId } = req.body || {};

  if (!Array.isArray(serials) || serials.length === 0 || !toActorId) {
    return res.status(400).json({
      error: 'invalid_request',
      message: 'serials (non-empty array) and toActorId are required'
    });
  }

  const cleanSerials = [...new Set(serials.map((item) => String(item).trim()).filter(Boolean))];
  if (cleanSerials.length === 0) {
    return res.status(400).json({ error: 'invalid_request', message: 'serials must contain at least one value' });
  }

  const destination = Number.isInteger(Number(toActorId))
    ? findActorById.get(Number(toActorId))
    : findActorByAddress.get(String(toActorId).trim());

  if (!destination) {
    return res.status(404).json({ error: 'not_found', message: 'Destination actor does not exist' });
  }

  if (destination.id === req.actor.id) {
    return res.status(400).json({ error: 'invalid_request', message: 'Cannot transfer custody to yourself' });
  }

  const packs = cleanSerials.map((serial) => ({ serial, pack: findPackBySerial.get(serial) }));
  const missing = packs.filter((entry) => !entry.pack).map((entry) => entry.serial);
  if (missing.length > 0) {
    return res.status(404).json({ error: 'not_found', message: 'Unknown serials', serials: missing });
  }

  const notHeld = packs
    .filter((entry) => entry.pack.currentHolderId !== req.actor.id)
    .map((entry) => entry.serial);
  if (notHeld.length > 0) {
    return res.status(409).json({
      error: 'not_current_holder',
      message: 'Actor does not currently hold these serials',
      serials: notHeld
    });
  }

  const alreadyDispensed = packs
    .filter((entry) => entry.pack.status === PACK_STATUS.DISPENSED)
    .map((entry) => entry.serial);
  if (alreadyDispensed.length > 0) {
    return res.status(409).json({
      error: 'already_dispensed',
      message: 'Dispensed serials cannot be transferred',
      serials: alreadyDispensed
    });
  }

  try {
    const chainResult = await withChain(
      () => chain.transfer(cleanSerials, {
        from: req.actor.address,
        to: destination.address
      }),
      { txHash: null }
    );

    const transfer = db.transaction((serialsToMove) => {
      const at = new Date().toISOString();
      for (const serial of serialsToMove) {
        updatePack.run({
          serial,
          status: PACK_STATUS.IN_CUSTODY,
          currentHolderId: destination.id
        });
        insertEvent.run({
          packSerial: serial,
          type: 'transferred',
          actorId: req.actor.id,
          at,
          txHash: chainResult.txHash || null,
          details: JSON.stringify({ toActorId: destination.id })
        });
      }
      return serialsToMove.length;
    });

    const transferred = transfer(cleanSerials);
    res.status(200).json({ transferred, toActorId: destination.id, txHash: chainResult.txHash || null });
  } catch (error) {
    console.error('[api] custody transfer failed:', error);
    res.status(500).json({ error: 'server_error', message: 'Unable to transfer custody' });
  }
});

app.post('/api/dispense', requireAuth, requireRole('pharmacy'), async (req, res) => {
  const { serial } = req.body || {};
  if (!serial || typeof serial !== 'string') {
    return res.status(400).json({ error: 'invalid_request', message: 'serial is required' });
  }

  const cleanSerial = serial.trim();
  const pack = findPackBySerial.get(cleanSerial);

  if (!pack) {
    return res.status(200).json({
      serial: cleanSerial,
      result: 'unknown',
      status: 'unknown'
    });
  }

  if (pack.status === PACK_STATUS.DISPENSED) {
    const trail = selectEventsForSerial.all(cleanSerial);
    const priorDispense = [...trail].reverse().find((event) => event.type === 'dispensed');
    const priorHolder = findActorById.get(priorDispense ? priorDispense.actorId : pack.currentHolderId);

    const recordConflict = db.transaction(() => {
      insertAlert.run({
        serial: cleanSerial,
        type: 'double_dispense',
        at: new Date().toISOString(),
        details: JSON.stringify({
          attemptedBy: req.actor.id,
          previouslyDispensedBy: priorDispense ? priorDispense.actorId : null,
          at: priorDispense ? priorDispense.at : null
        })
      });
    });
    recordConflict();

    return res.status(200).json({
      serial: cleanSerial,
      result: 'conflict',
      status: PACK_STATUS.DISPENSED,
      conflictWith: {
        actorId: priorHolder ? priorHolder.id : null,
        actorName: priorHolder ? priorHolder.name : null,
        at: priorDispense ? priorDispense.at : null
      }
    });
  }

  if (pack.currentHolderId !== req.actor.id) {
    return res.status(409).json({
      error: 'not_current_holder',
      message: 'Serial is not in this pharmacy’s custody',
      serial: cleanSerial
    });
  }

  try {
    const chainResult = await withChain(
      () => chain.dispense([cleanSerial], { actor: req.actor.address }),
      { txHash: null }
    );

    const dispense = db.transaction(() => {
      const at = new Date().toISOString();
      updatePack.run({
        serial: cleanSerial,
        status: PACK_STATUS.DISPENSED,
        currentHolderId: req.actor.id
      });
      insertEvent.run({
        packSerial: cleanSerial,
        type: 'dispensed',
        actorId: req.actor.id,
        at,
        txHash: chainResult.txHash || null,
        details: JSON.stringify({ batchId: pack.batchId })
      });
      return at;
    });

    const at = dispense();
    res.status(200).json({ serial: cleanSerial, result: 'ok', status: PACK_STATUS.DISPENSED, at });
  } catch (error) {
    console.error('[api] dispense failed:', error);
    res.status(500).json({ error: 'server_error', message: 'Unable to record dispensing' });
  }
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 }
});

app.get('/api/verify/:serial', (req, res) => {
  const serial = String(req.params.serial || '').trim();
  const pack = findPackBySerial.get(serial);

  if (!pack) {
    return res.status(200).json({
      serial,
      status: 'unknown',
      product: null,
      currentHolder: null,
      trail: [],
      flags: []
    });
  }

  const batch = findBatchById.get(pack.batchId);
  const holder = findActorById.get(pack.currentHolderId);
  const trail = selectEventsForSerial.all(serial);
  const alerts = db.prepare('SELECT * FROM alerts WHERE serial = ? ORDER BY at DESC, id DESC').all(serial);

  const flags = alerts.map((alert) => ({
    type: alert.type,
    at: alert.at,
    message: 'This serial has a record that needs review.'
  }));

  res.status(200).json({
    serial,
    status: pack.status,
    product: batch
      ? {
          productName: batch.productName,
          batchNo: batch.batchNo,
          expiry: batch.expiry,
          quantity: batch.quantity
        }
      : null,
    currentHolder: holder
      ? { id: holder.id, name: holder.name, role: holder.role, place: holder.place }
      : null,
    trail: trail.map((event) => ({
      type: event.type,
      actorName: event.actorName ?? null,
      place: event.place ?? null,
      at: event.at,
      txHash: event.txHash ?? null
    })),
    flags
  });
});

app.post('/api/verify/ocr', upload.single('image'), async (req, res) => {
  const serial = String(req.body?.serial || '').trim();
  if (!req.file) {
    return res.status(400).json({ error: 'invalid_request', message: 'An image file is required' });
  }
  if (!serial) {
    return res.status(400).json({ error: 'invalid_request', message: 'serial is required' });
  }

  const pack = findPackBySerial.get(serial);
  if (!pack) {
    return res.status(200).json({ serial, match: 'unreadable', differences: [] });
  }

  const batch = findBatchById.get(pack.batchId);

  try {
    const extracted = await ocr.extractPackFields(req.file.buffer, 'image/*');
    const comparison = await ocr.comparePack(extracted, {
      productName: batch ? batch.productName : null,
      batchNo: batch ? batch.batchNo : null,
      expiry: batch ? batch.expiry : null
    });
    const match = String(comparison?.match || 'unreadable');
    res.status(200).json({
      serial,
      match: ['match', 'mismatch', 'unreadable'].includes(match) ? match : 'unreadable',
      differences: Array.isArray(comparison?.differences) ? comparison.differences : []
    });
  } catch (error) {
    console.error('[api] ocr verification failed:', error);
    res.status(200).json({ serial, match: 'unreadable', differences: [] });
  }
});

app.get('/api/alerts', requireAuth, requireRole('regulator'), (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const alerts = db.prepare(`
    SELECT * FROM alerts ORDER BY at DESC, id DESC LIMIT ?
  `).all(limit);

  res.status(200).json({ alerts });
});

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ error: 'invalid_request', message: error.message });
  }
  console.error('[api] unhandled error:', error);
  res.status(500).json({ error: 'server_error', message: 'Unexpected server error' });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

function shutdown() {
  server.close(() => {
    try { db.close(); } catch { /* already closed */ }
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = app;
module.exports.db = db;
module.exports.generateSerial = generateSerial;
