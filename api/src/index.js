const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const dbPath = process.env.DB_FILE || path.join(__dirname, '../data/demo.db');
const db = new Database(dbPath);

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
