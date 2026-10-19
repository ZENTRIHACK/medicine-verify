const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { SCHEMA_SQL } = require('../src/schema');

const dbPath = process.env.DB_FILE || path.join(__dirname, '../data/demo.db');

const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const db = new Database(dbPath);

db.exec(SCHEMA_SQL);

console.log('Database schema initialized.');
db.close();
