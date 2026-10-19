const path = require('path');
const Database = require('better-sqlite3');
const { DEMO_ACTORS } = require('../src/schema');

const dbPath = process.env.DB_FILE || path.join(__dirname, '../data/demo.db');
const db = new Database(dbPath);

const insert = db.prepare(`
  INSERT INTO actors (id, username, role, name, place, address)
  VALUES (@id, @username, @role, @name, @place, @address)
`);

const insertMany = db.transaction((items) => {
  for (const item of items) {
    insert.run(item);
  }
});

insertMany(DEMO_ACTORS);

console.log('Seed data inserted.');
db.close();
