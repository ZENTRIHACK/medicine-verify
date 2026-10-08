const path = require('path');
const Database = require('better-sqlite3');

const dbPath = process.env.DB_FILE || path.join(__dirname, '../data/demo.db');
const db = new Database(dbPath);

const actors = [
  { id: 1, username: 'zenocare', role: 'manufacturer', name: 'Zenocare Labs (demo)', place: 'Nairobi', address: '0x1000000000000000000000000000000000000001' },
  { id: 2, username: 'afyalink', role: 'distributor', name: 'AfyaLink Distributors (demo)', place: 'Nairobi', address: '0x1000000000000000000000000000000000000002' },
  { id: 3, username: 'mlimani', role: 'pharmacy', name: 'Mlimani Pharmacy (demo)', place: 'Meru', address: '0x1000000000000000000000000000000000000003' },
  { id: 4, username: 'kaaga', role: 'pharmacy', name: 'Kaaga Chemist (demo)', place: 'Meru', address: '0x1000000000000000000000000000000000000004' },
  { id: 5, username: 'lakeview', role: 'pharmacy', name: 'Lakeview Pharmacy (demo)', place: 'Kisumu', address: '0x1000000000000000000000000000000000000005' },
  { id: 6, username: 'regulator', role: 'regulator', name: 'Demo Regulator', place: 'Nairobi', address: '0x1000000000000000000000000000000000000006' }
];

const insert = db.prepare(`
  INSERT INTO actors (id, username, role, name, place, address)
  VALUES (@id, @username, @role, @name, @place, @address)
`);

const insertMany = db.transaction((items) => {
  for (const item of items) {
    insert.run(item);
  }
});

insertMany(actors);

console.log('Seed data inserted.');
db.close();
