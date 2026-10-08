const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = process.env.DB_FILE || path.join(__dirname, '../data/demo.db');

const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE actors (
    id INTEGER PRIMARY KEY,
    username TEXT,
    role TEXT,
    name TEXT,
    place TEXT,
    address TEXT,
    token TEXT
  );

  CREATE TABLE batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    productName TEXT,
    batchNo TEXT,
    expiry TEXT,
    quantity INTEGER
  );

  CREATE TABLE packs (
    serial TEXT PRIMARY KEY,
    batchId INTEGER,
    status TEXT,
    currentHolderId INTEGER
  );

  CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    packSerial TEXT,
    type TEXT,
    actorId INTEGER,
    at TEXT,
    txHash TEXT,
    details TEXT
  );

  CREATE TABLE alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    serial TEXT,
    type TEXT,
    at TEXT,
    details TEXT
  );
`);

console.log('Database schema initialized.');
db.close();
