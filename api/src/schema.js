const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS actors (
    id INTEGER PRIMARY KEY,
    username TEXT,
    role TEXT,
    name TEXT,
    place TEXT,
    address TEXT,
    token TEXT
  );

  CREATE TABLE IF NOT EXISTS batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    productName TEXT,
    batchNo TEXT,
    expiry TEXT,
    quantity INTEGER
  );

  CREATE TABLE IF NOT EXISTS packs (
    serial TEXT PRIMARY KEY,
    batchId INTEGER,
    status TEXT,
    currentHolderId INTEGER
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    packSerial TEXT,
    type TEXT,
    actorId INTEGER,
    at TEXT,
    txHash TEXT,
    details TEXT
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    serial TEXT,
    type TEXT,
    at TEXT,
    details TEXT
  );
`;

const TABLES = ['actors', 'batches', 'packs', 'events', 'alerts'];

const DEMO_ACTORS = [
  { id: 1, username: 'zenocare', role: 'manufacturer', name: 'Zenocare Labs (demo)', place: 'Nairobi', address: '0x1000000000000000000000000000000000000001' },
  { id: 2, username: 'afyalink', role: 'distributor', name: 'AfyaLink Distributors (demo)', place: 'Nairobi', address: '0x1000000000000000000000000000000000000002' },
  { id: 3, username: 'mlimani', role: 'pharmacy', name: 'Mlimani Pharmacy (demo)', place: 'Meru', address: '0x1000000000000000000000000000000000000003' },
  { id: 4, username: 'kaaga', role: 'pharmacy', name: 'Kaaga Chemist (demo)', place: 'Meru', address: '0x1000000000000000000000000000000000000004' },
  { id: 5, username: 'lakeview', role: 'pharmacy', name: 'Lakeview Pharmacy (demo)', place: 'Kisumu', address: '0x1000000000000000000000000000000000000005' },
  { id: 6, username: 'regulator', role: 'regulator', name: 'Demo Regulator', place: 'Nairobi', address: '0x1000000000000000000000000000000000000006' }
];

function ensureBatchNoIndex(db) {
  try {
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_batches_batch_no_nocase
        ON batches(batchNo COLLATE NOCASE);
    `);
  } catch (error) {
    console.warn(
      `Could not create the unique batch-number index: ${error.message}`
    );
  }
}

function ensureInitialized(db) {
  const placeholders = TABLES.map(() => '?').join(', ');
  const { count } = db
    .prepare(`SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name IN (${placeholders})`)
    .get(...TABLES);

  if (count === TABLES.length) {
    ensureBatchNoIndex(db);
    return false;
  }

  db.transaction(() => {
    db.exec(SCHEMA_SQL);
    const { count: actorCount } = db.prepare('SELECT COUNT(*) AS count FROM actors').get();
    if (actorCount === 0) {
      const insertActor = db.prepare(`
        INSERT INTO actors (id, username, role, name, place, address)
        VALUES (@id, @username, @role, @name, @place, @address)
      `);
      for (const actor of DEMO_ACTORS) {
        insertActor.run(actor);
      }
    }
  })();

  ensureBatchNoIndex(db);

  return true;
}

module.exports = { SCHEMA_SQL, TABLES, DEMO_ACTORS, ensureInitialized };
