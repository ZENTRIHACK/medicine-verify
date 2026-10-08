const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const path = require('path');
const integrations = require('./integrations');

const app = express();
app.use(cors());
app.use(express.json());

const dbPath = process.env.DB_FILE || path.join(__dirname, '../data/demo.db');
const db = new Database(dbPath);

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized', message: 'Missing or invalid token' });
  }
  const token = authHeader.substring(7);
  const actor = db.prepare('SELECT * FROM actors WHERE token = ?').get(token);
  if (!actor) {
    return res.status(401).json({ error: 'unauthorized', message: 'Missing or invalid token' });
  }
  req.actor = actor;
  next();
};

app.post('/api/login', (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(401).json({ error: 'unauthorized', message: 'Unknown user' });
  }

  const actor = db.prepare('SELECT * FROM actors WHERE username = ?').get(username);
  
  if (!actor) {
    return res.status(401).json({ error: 'unauthorized', message: 'Unknown user' });
  }

  const token = crypto.randomUUID();
  db.prepare('UPDATE actors SET token = ? WHERE id = ?').run(token, actor.id);
  
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

function generateSerial() {
  const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const bytes = crypto.randomBytes(16);
  let serial = '';
  for (let i = 0; i < 16; i++) {
    serial += alphabet[bytes[i] % alphabet.length];
  }
  return serial;
}

app.post('/api/batches', requireAuth, async (req, res) => {
  if (req.actor.role !== 'manufacturer') {
    return res.status(403).json({ error: 'forbidden', message: 'Only manufacturers can register batches' });
  }

  const { productName, batchNo, expiry, quantity } = req.body;
  if (!productName || !batchNo || !expiry || !quantity) {
    return res.status(400).json({ error: 'bad_request', message: 'Missing fields' });
  }
  
  const serials = [];
  for (let i = 0; i < quantity; i++) {
    serials.push(generateSerial());
  }

  const now = new Date().toISOString();
  let batchId;

  const insertBatch = db.prepare(`INSERT INTO batches (productName, batchNo, expiry, quantity) VALUES (?, ?, ?, ?)`);
  const insertPack = db.prepare(`INSERT INTO packs (serial, batchId, status, currentHolderId) VALUES (?, ?, ?, ?)`);
  const insertEvent = db.prepare(`INSERT INTO events (packSerial, type, actorId, at, txHash) VALUES (?, ?, ?, ?, ?)`);
  const updateEventTx = db.prepare(`UPDATE events SET txHash = ? WHERE packSerial = ? AND type = 'registered'`);

  const registerTransaction = db.transaction(() => {
    const info = insertBatch.run(productName, batchNo, expiry, quantity);
    batchId = info.lastInsertRowid;

    for (const serial of serials) {
      insertPack.run(serial, batchId, 'registered', req.actor.id);
      insertEvent.run(serial, 'registered', req.actor.id, now, null);
    }
  });

  registerTransaction();

  try {
    const { txHash } = await integrations.chain.registerPacks(batchId, serials, req.actor.address);
    if (txHash) {
      const updateHashTransaction = db.transaction(() => {
        for (const serial of serials) {
          updateEventTx.run(txHash, serial);
        }
      });
      updateHashTransaction();
    }
  } catch (err) {
    // Chain integration failed, but DB transaction succeeded
    console.error('Chain integration failed:', err);
  }

  res.status(201).json({ batchId, serials });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
