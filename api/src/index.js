"use strict";

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const integrations = require("./integrations");
const { ensureInitialized } = require("./schema");
const multer = require("multer");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp"
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE,
    files: 1
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      const error = new Error(
        "Unsupported image type. Upload a JPG, PNG, or WebP image."
      );
      error.code = "UNSUPPORTED_IMAGE_TYPE";
      return callback(error);
    }

    callback(null, true);
  }
});

const dbPath =
  process.env.DB_FILE || path.join(__dirname, "../data/demo.db");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

if (ensureInitialized(db)) {
  console.log(`Fresh database initialized with schema and demo actors at ${dbPath}`);
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function sendError(res, status, error, message, extra = {}) {
  return res.status(status).json({
    error,
    message,
    ...extra
  });
}

function isPositiveInteger(value) {
  return (
    Number.isSafeInteger(Number(value)) &&
    Number(value) > 0
  );
}

function generateSerial() {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const bytes = crypto.randomBytes(16);
  let serial = "";

  for (let i = 0; i < 16; i += 1) {
    serial += alphabet[bytes[i] % alphabet.length];
  }

  return serial;
}

function getPackAndBatch(serial) {
  const pack = db
    .prepare("SELECT * FROM packs WHERE serial = ?")
    .get(serial);

  if (!pack) {
    return { pack: null, batch: null };
  }

  const batch = db
    .prepare("SELECT * FROM batches WHERE id = ?")
    .get(pack.batchId);

  return { pack, batch };
}

function recordAlert(serial, type, details = null) {
  db.prepare(
    "INSERT INTO alerts (serial, type, at, details) VALUES (?, ?, ?, ?)"
  ).run(serial, type, new Date().toISOString(), details);
}

function findBatchByNumber(batchNo) {
  return db
    .prepare(`
      SELECT id, productName, batchNo
      FROM batches
      WHERE batchNo COLLATE NOCASE = ?
      LIMIT 1
    `)
    .get(batchNo);
}

function firstSerialForBatch(batchId) {
  const row = db
    .prepare(`
      SELECT serial
      FROM packs
      WHERE batchId = ?
      ORDER BY rowid ASC
      LIMIT 1
    `)
    .get(batchId);

  return row ? row.serial : null;
}

function rejectDuplicateBatch(res, existing, attemptedProduct) {
  const message =
    `Batch number ${existing.batchNo} is already registered for ` +
    `${existing.productName} (batch #${existing.id}). Registration for ` +
    `${attemptedProduct} was blocked and the regulator alert feed was notified.`;

  recordAlert(
    firstSerialForBatch(existing.id),
    "duplicate_batch",
    message
  );

  return sendError(
    res,
    409,
    "duplicate_batch",
    message,
    {
      existingBatch: {
        id: existing.id,
        productName: existing.productName,
        batchNo: existing.batchNo
      }
    }
  );
}

/* -------------------------------------------------------------------------- */
/* Authentication                                                             */
/* -------------------------------------------------------------------------- */

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(
      res,
      401,
      "unauthorized",
      "Missing or invalid token"
    );
  }

  const token = authHeader.substring(7).trim();

  if (!token) {
    return sendError(
      res,
      401,
      "unauthorized",
      "Missing or invalid token"
    );
  }

  const actor = db
    .prepare("SELECT * FROM actors WHERE token = ?")
    .get(token);

  if (!actor) {
    return sendError(
      res,
      401,
      "unauthorized",
      "Missing or invalid token"
    );
  }

  req.actor = actor;
  next();
};

/*
 * Demo login retained for compatibility with the existing UI.
 * Username-only authentication is not suitable for production.
 * Add password hashing and expiring sessions before real deployment.
 */
app.post("/api/login", (req, res) => {
  const username =
    typeof req.body?.username === "string"
      ? req.body.username.trim()
      : "";

  if (!username) {
    return sendError(
      res,
      400,
      "bad_request",
      "Username is required"
    );
  }

  const actor = db
    .prepare("SELECT * FROM actors WHERE username = ?")
    .get(username);

  if (!actor) {
    return sendError(
      res,
      401,
      "unauthorized",
      "Unknown user"
    );
  }

  const token = crypto.randomUUID();

  db.prepare(
    "UPDATE actors SET token = ? WHERE id = ?"
  ).run(token, actor.id);

  return res.status(200).json({
    token,
    actor: {
      id: actor.id,
      role: actor.role,
      name: actor.name,
      place: actor.place
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Batch registration                                                         */
/* -------------------------------------------------------------------------- */

app.post("/api/batches", requireAuth, async (req, res) => {
  if (req.actor.role !== "manufacturer") {
    return sendError(
      res,
      403,
      "forbidden",
      "Only manufacturers can register batches"
    );
  }

  const {
    productName,
    batchNo,
    expiry,
    quantity
  } = req.body || {};

  const cleanProductName =
    typeof productName === "string" ? productName.trim() : "";

  const cleanBatchNo =
    typeof batchNo === "string" ? batchNo.trim() : "";

  const cleanExpiry =
    typeof expiry === "string" ? expiry.trim() : "";

  const parsedQuantity = Number(quantity);

  if (
    !cleanProductName ||
    !cleanBatchNo ||
    !cleanExpiry ||
    !Number.isSafeInteger(parsedQuantity) ||
    parsedQuantity < 1 ||
    parsedQuantity > 10000
  ) {
    return sendError(
      res,
      400,
      "bad_request",
      "Provide productName, batchNo, expiry, and a whole-number quantity between 1 and 10000"
    );
  }

  const existingBatch = findBatchByNumber(cleanBatchNo);

  if (existingBatch) {
    return rejectDuplicateBatch(
      res,
      existingBatch,
      cleanProductName
    );
  }

  const serials = [];

  for (let i = 0; i < parsedQuantity; i += 1) {
    serials.push(generateSerial());
  }

  const now = new Date().toISOString();
  let batchId;

  const insertBatch = db.prepare(`
    INSERT INTO batches
      (productName, batchNo, expiry, quantity)
    VALUES (?, ?, ?, ?)
  `);

  const insertPack = db.prepare(`
    INSERT INTO packs
      (serial, batchId, status, currentHolderId)
    VALUES (?, ?, ?, ?)
  `);

  const insertEvent = db.prepare(`
    INSERT INTO events
      (packSerial, type, actorId, at, txHash)
    VALUES (?, ?, ?, ?, ?)
  `);

  const updateEventTx = db.prepare(`
    UPDATE events
    SET txHash = ?
    WHERE packSerial = ? AND type = 'registered'
  `);

  const registerTransaction = db.transaction(() => {
    const info = insertBatch.run(
      cleanProductName,
      cleanBatchNo,
      cleanExpiry,
      parsedQuantity
    );

    batchId = info.lastInsertRowid;

    for (const serial of serials) {
      insertPack.run(
        serial,
        batchId,
        "registered",
        req.actor.id
      );

      insertEvent.run(
        serial,
        "registered",
        req.actor.id,
        now,
        null
      );
    }
  });

  try {
    registerTransaction();
  } catch (err) {
    if (String(err.code).startsWith("SQLITE_CONSTRAINT")) {
      const existing = findBatchByNumber(cleanBatchNo);

      if (existing) {
        return rejectDuplicateBatch(res, existing, cleanProductName);
      }
    }

    console.error("Batch registration failed:", err);

    return sendError(
      res,
      500,
      "database_error",
      "Could not register this batch"
    );
  }

  try {
    const { txHash } = await integrations.chain.registerPacks(
      batchId,
      serials,
      req.actor.address
    );

    if (txHash) {
      const updateHashTransaction = db.transaction(() => {
        for (const serial of serials) {
          updateEventTx.run(txHash, serial);
        }
      });

      updateHashTransaction();
    }
  } catch (err) {
    console.error(
      "Chain integration failed during batch registration:",
      err
    );
  }

  return res.status(201).json({
    batchId,
    serials
  });
});

/* -------------------------------------------------------------------------- */
/* Chain of custody                                                           */
/* -------------------------------------------------------------------------- */

app.post("/api/custody/transfer", requireAuth, async (req, res) => {
  const { serials, toActorId } = req.body || {};

  if (
    !Array.isArray(serials) ||
    serials.length === 0 ||
    serials.length > 500 ||
    !isPositiveInteger(toActorId)
  ) {
    return sendError(
      res,
      400,
      "bad_request",
      "Provide a non-empty serials array and a valid toActorId"
    );
  }

  if (
    serials.some(
      serial => typeof serial !== "string" || !serial.trim()
    ) ||
    new Set(serials).size !== serials.length
  ) {
    return sendError(
      res,
      400,
      "bad_request",
      "Serials must be non-empty strings without duplicates"
    );
  }

  const recipient = db
    .prepare("SELECT * FROM actors WHERE id = ?")
    .get(Number(toActorId));

  if (
    !recipient ||
    !["distributor", "pharmacy"].includes(recipient.role)
  ) {
    return sendError(
      res,
      400,
      "bad_request",
      "Invalid recipient"
    );
  }

  if (recipient.id === req.actor.id) {
    return sendError(
      res,
      400,
      "bad_request",
      "You cannot transfer stock to yourself"
    );
  }

  const getPack = db.prepare(
    "SELECT * FROM packs WHERE serial = ?"
  );

  for (const serial of serials) {
    const pack = getPack.get(serial);

    if (!pack) {
      return sendError(
        res,
        404,
        "unknown_serial",
        `Serial not found: ${serial}`
      );
    }

    if (pack.currentHolderId !== req.actor.id) {
      return sendError(
        res,
        403,
        "forbidden",
        `You do not currently hold serial ${serial}`
      );
    }

    if (pack.status === "dispensed") {
      return sendError(
        res,
        409,
        "invalid_state",
        `Serial ${serial} has already been dispensed`
      );
    }
  }

  const now = new Date().toISOString();

  const updatePack = db.prepare(`
    UPDATE packs
    SET currentHolderId = ?, status = 'in_custody'
    WHERE serial = ?
  `);

  const insertEvent = db.prepare(`
    INSERT INTO events
      (packSerial, type, actorId, at, details)
    VALUES (?, 'transferred', ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    for (const serial of serials) {
      updatePack.run(recipient.id, serial);

      insertEvent.run(
        serial,
        req.actor.id,
        now,
        JSON.stringify({ to: recipient.id })
      );
    }
  });

  try {
    tx();
  } catch (err) {
    console.error("Custody transfer database error:", err);

    return sendError(
      res,
      500,
      "database_error",
      "Could not record the transfer"
    );
  }

  const txHashes = [];

  try {
    for (const serial of serials) {
      const result = await integrations.chain.transfer(
        serial,
        req.actor.address,
        recipient.address
      );

      if (result?.txHash) {
        txHashes.push(result.txHash);

        db.prepare(`
          UPDATE events
          SET txHash = ?
          WHERE packSerial = ?
            AND type = 'transferred'
            AND at = ?
        `).run(result.txHash, serial, now);
      }
    }
  } catch (err) {
    console.error(
      "Chain integration failed during transfer:",
      err
    );
  }

  return res.status(200).json({
    ok: true,
    transferred: serials.length,
    txHashes
  });
});

/* -------------------------------------------------------------------------- */
/* Dispensing                                                                 */
/* -------------------------------------------------------------------------- */

app.post("/api/dispense", requireAuth, async (req, res) => {
  if (req.actor.role !== "pharmacy") {
    return sendError(
      res,
      403,
      "forbidden",
      "Only pharmacies can dispense"
    );
  }

  const serial =
    typeof req.body?.serial === "string"
      ? req.body.serial.trim()
      : "";

  if (!serial) {
    return sendError(
      res,
      400,
      "bad_request",
      "Missing serial"
    );
  }

  const now = new Date().toISOString();

  const pack = db
    .prepare("SELECT * FROM packs WHERE serial = ?")
    .get(serial);

  if (!pack) {
    recordAlert(serial, "unknown_serial");

    return sendError(
      res,
      404,
      "unknown_serial",
      "No registered record found"
    );
  }

  const flags = [];

  if (pack.currentHolderId !== req.actor.id) {
    flags.push("No custody record before dispensing");
    recordAlert(serial, "custody_mismatch");

    return res.status(409).json({
      result: "blocked",
      message: "This pharmacy is not the recorded current holder of this pack.",
      flags
    });
  }

  if (pack.status === "dispensed") {
    const dispensedEvent = db.prepare(`
      SELECT *
      FROM events
      WHERE packSerial = ? AND type = 'dispensed'
      ORDER BY at ASC
      LIMIT 1
    `).get(serial);

    db.transaction(() => {
      db.prepare(`
        INSERT INTO events
          (packSerial, type, actorId, at)
        VALUES (?, 'conflict', ?, ?)
      `).run(serial, req.actor.id, now);

      recordAlert(serial, "double_dispense");
    })();

    const firstActor = dispensedEvent
      ? db.prepare(
          "SELECT name FROM actors WHERE id = ?"
        ).get(dispensedEvent.actorId)
      : null;

    let txHash = null;

    try {
      const result = await integrations.chain.dispense(
        serial,
        req.actor.address
      );

      txHash = result?.txHash || null;

      if (txHash) {
        db.prepare(`
          UPDATE events
          SET txHash = ?
          WHERE packSerial = ?
            AND type = 'conflict'
            AND at = ?
        `).run(txHash, serial, now);
      }
    } catch (err) {
      console.error(
        "Chain integration failed during duplicate dispense:",
        err
      );
    }

    return res.status(409).json({
      result: "conflict",
      txHash,
      flags: ["This pack has already been dispensed."],
      conflictWith: dispensedEvent
        ? {
            actorName: firstActor
              ? firstActor.name
              : "Unknown",
            at: dispensedEvent.at
          }
        : null
    });
  }

  const dispenseTransaction = db.transaction(() => {
    db.prepare(`
      UPDATE packs
      SET status = 'dispensed'
      WHERE serial = ?
    `).run(serial);

    db.prepare(`
      INSERT INTO events
        (packSerial, type, actorId, at)
      VALUES (?, 'dispensed', ?, ?)
    `).run(serial, req.actor.id, now);
  });

  try {
    dispenseTransaction();
  } catch (err) {
    console.error("Dispensing database error:", err);

    return sendError(
      res,
      500,
      "database_error",
      "Could not record dispensing"
    );
  }

  let txHash = null;

  try {
    const result = await integrations.chain.dispense(
      serial,
      req.actor.address
    );

    txHash = result?.txHash || null;

    if (txHash) {
      db.prepare(`
        UPDATE events
        SET txHash = ?
        WHERE packSerial = ?
          AND type = 'dispensed'
          AND at = ?
      `).run(txHash, serial, now);
    }
  } catch (err) {
    console.error(
      "Chain integration failed during dispensing:",
      err
    );
  }

  return res.status(200).json({
    result: "ok",
    txHash,
    flags
  });
});

/* -------------------------------------------------------------------------- */
/* Public serial verification                                                 */
/* -------------------------------------------------------------------------- */

app.get("/api/verify/:serial", (req, res) => {
  const serial =
    typeof req.params.serial === "string"
      ? req.params.serial.trim()
      : "";

  if (!serial) {
    return sendError(
      res,
      400,
      "bad_request",
      "Serial is required"
    );
  }

  const pack = db
    .prepare("SELECT * FROM packs WHERE serial = ?")
    .get(serial);

  if (!pack) {
    return res.status(200).json({
      serial,
      status: "unknown",
      product: null,
      currentHolder: null,
      trail: [],
      flags: [
        "No registered record was found for this identifier."
      ]
    });
  }

  const batch = db
    .prepare("SELECT * FROM batches WHERE id = ?")
    .get(pack.batchId);

  const holder = db
    .prepare("SELECT name, place FROM actors WHERE id = ?")
    .get(pack.currentHolderId);

  const events = db.prepare(`
    SELECT
      e.type,
      e.at,
      e.txHash,
      a.name AS actorName,
      a.place
    FROM events e
    LEFT JOIN actors a ON e.actorId = a.id
    WHERE e.packSerial = ?
    ORDER BY e.at ASC
  `).all(serial);

  const trail = events.map(event => ({
    type: event.type,
    actorName: event.actorName,
    place: event.place,
    at: event.at,
    txHash: event.txHash
  }));

  const alerts = db
    .prepare("SELECT * FROM alerts WHERE serial = ?")
    .all(serial);

  const flags = [];

  if (alerts.some(alert => alert.type === "ocr_mismatch")) {
    flags.push(
      "Pack photo did not match the registered record."
    );
  }

  if (alerts.some(alert => alert.type === "double_dispense")) {
    flags.push(
      "Duplicate dispensing activity was detected."
    );
  }

  if (alerts.some(alert => alert.type === "custody_mismatch")) {
    flags.push("A custody mismatch was recorded.");
  }

  if (alerts.some(alert => alert.type === "duplicate_batch")) {
    flags.push(
      "A duplicate batch registration attempt was blocked for this batch."
    );
  }

  let derivedStatus = "unknown";

  if (alerts.some(alert => alert.type === "double_dispense")) {
    derivedStatus = "conflict";
  } else if (pack.status === "dispensed") {
    derivedStatus = "dispensed";
  } else if (pack.status === "in_custody") {
    derivedStatus = "in_custody";
  } else if (pack.status === "registered") {
    derivedStatus = "registered";
  }

  return res.status(200).json({
    serial,
    status: derivedStatus,
    product: batch
      ? {
          productName: batch.productName,
          batchNo: batch.batchNo,
          expiry: batch.expiry
        }
      : null,
    currentHolder: holder
      ? {
          name: holder.name,
          place: holder.place
        }
      : null,
    trail,
    flags
  });
});

/* -------------------------------------------------------------------------- */
/* Image-based OCR and verification                                           */
/* -------------------------------------------------------------------------- */

app.post(
  "/api/verify/ocr",
  upload.single("image"),
  async (req, res) => {
    const serial =
      typeof req.body?.serial === "string"
        ? req.body.serial.trim()
        : "";

    if (!req.file) {
      return sendError(
        res,
        400,
        "bad_request",
        "An image file is required. Upload a JPG, PNG, or WebP image."
      );
    }

    if (!serial) {
      return sendError(
        res,
        400,
        "bad_request",
        "A registered pack serial is required"
      );
    }

    const { pack, batch } = getPackAndBatch(serial);

    if (!pack || !batch) {
      return sendError(
        res,
        404,
        "unknown_serial",
        "No registered record found for this pack serial"
      );
    }

    if (!ALLOWED_IMAGE_TYPES.has(req.file.mimetype)) {
      return sendError(
        res,
        415,
        "unsupported_image_type",
        "Upload a JPG, PNG, or WebP image"
      );
    }

    let fields;

    try {
      fields = await integrations.ocr.extractPackFields(
        req.file.buffer,
        req.file.mimetype,
        batch
      );
    } catch (err) {
      console.error("OCR integration failed:", err);

      return sendError(
        res,
        502,
        "ocr_unavailable",
        "Image checking is unavailable. Please try again."
      );
    }

    if (!fields || typeof fields !== "object") {
      return sendError(
        res,
        502,
        "ocr_invalid_response",
        "The image checker returned an invalid response."
      );
    }

    /*
     * Reject unrelated images. The OCR integration must explicitly return
     * isMedicinePackage: true before comparison can continue.
     */
    if (fields.isMedicinePackage === false) {
      return res.status(422).json({
        error: "not_medicine",
        message:
          "No identifiable medicine package was detected. Please upload a clear photo of the medicine packaging.",
        extracted: {
          isMedicinePackage: false,
          batchNo: null,
          expiry: null,
          manufacturer: null,
          confidence: 0
        },
        confidence: 0,
        match: "not_medicine",
        differences: [
          "The image does not appear to contain an identifiable medicine package."
        ]
      });
    }

    /*
     * Fail closed when classification is missing or uncertain.
     * Older OCR integrations must be updated to return this field.
     */
    if (fields.isMedicinePackage !== true) {
      return res.status(422).json({
        error: "image_unclassified",
        message:
          "The image could not be reliably classified as medicine packaging. Please try a clearer photo.",
        extracted: fields,
        confidence: 0,
        match: "unreadable",
        differences: [
          "The image classification result is missing or uncertain."
        ]
      });
    }

    let comparison;

    try {
      comparison = await integrations.ocr.comparePack(
        fields,
        batch
      );
    } catch (err) {
      console.error("OCR comparison failed:", err);

      return sendError(
        res,
        502,
        "ocr_unavailable",
        "Image checking is unavailable. Please try again."
      );
    }

    const validMatches = [
      "match",
      "mismatch",
      "unreadable",
      "not_medicine"
    ];

    if (
      !comparison ||
      !validMatches.includes(comparison.match)
    ) {
      return sendError(
        res,
        502,
        "ocr_invalid_response",
        "The image checker returned an invalid comparison result."
      );
    }

    const match = comparison.match;
    const differences = Array.isArray(comparison.differences)
      ? comparison.differences
      : [];

    if (match === "mismatch") {
      try {
        recordAlert(
          serial,
          "ocr_mismatch",
          JSON.stringify({ differences })
        );
      } catch (err) {
        console.error(
          "Failed to record OCR mismatch alert:",
          err
        );
      }
    }

    if (match === "not_medicine") {
      return res.status(422).json({
        error: "not_medicine",
        message:
          "The uploaded image is not identifiable as medicine packaging.",
        extracted: fields,
        confidence: Number(fields.confidence) || 0,
        match,
        differences
      });
    }

    if (match === "unreadable") {
      return res.status(422).json({
        error: "unreadable",
        message:
          "We could not read the required medicine details. Try a clearer image.",
        extracted: fields,
        confidence: Number(fields.confidence) || 0,
        match,
        differences
      });
    }

    /*
     * A match confirms only that the readable fields match the database.
     * It does not independently prove that the physical medicine is genuine.
     */
    return res.status(200).json({
      extracted: fields,
      confidence: Number(fields.confidence) || 0,
      match,
      verifiedRecordMatch: match === "match",
      message:
        match === "match"
          ? "The readable package details match the registered record. This alone does not prove the physical product is genuine."
          : "The package details do not match the registered record.",
      differences
    });
  }
);

/* -------------------------------------------------------------------------- */
/* Risk alerts                                                                */
/* -------------------------------------------------------------------------- */

app.get("/api/alerts", requireAuth, (req, res) => {
  if (req.actor.role !== "regulator") {
    return sendError(
      res,
      403,
      "forbidden",
      "Only regulators can view alerts"
    );
  }

  const requestedLimit = Number.parseInt(req.query.limit, 10);

  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 1000)
    : 200;

  const alerts = db.prepare(`
    SELECT id, serial, type, at, details
    FROM alerts
    ORDER BY at DESC, id DESC
    LIMIT ?
  `).all(limit);

  return res.status(200).json(alerts);
});

/* -------------------------------------------------------------------------- */
/* Error handling                                                             */
/* -------------------------------------------------------------------------- */

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Image is too large. Please upload a file under 8 MB."
        : err.message;

    return sendError(
      res,
      400,
      "bad_request",
      message
    );
  }

  if (err?.code === "UNSUPPORTED_IMAGE_TYPE") {
    return sendError(
      res,
      415,
      "unsupported_image_type",
      err.message
    );
  }

  console.error("Unhandled server error:", err);

  return sendError(
    res,
    500,
    "server_error",
    "Unexpected server error"
  );
});

/* -------------------------------------------------------------------------- */
/* Start server                                                               */
/* -------------------------------------------------------------------------- */

const configuredPort = process.env.PORT ? Number(process.env.PORT) : NaN;
const PORT = Number.isInteger(configuredPort) ? configuredPort : 3001;

const server = app.listen(PORT, () => {
  const address = server.address();
  const activePort =
    address && typeof address === "object" ? address.port : PORT;

  console.log(`Server listening on port ${activePort}`);
});

console.log(
  `OCR implementation: ${
    process.env.OCR_MODE === "real" ? "REAL TESSERACT" : "STUB"
  }`
);
