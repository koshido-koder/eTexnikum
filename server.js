// eTexnikum: сервер + SQLite (etexnikum.db)
const express = require('express');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data'); // на Render/Railway укажите путь к Disk/Volume
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';                      // нужен для скачивания .db
fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'etexnikum.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`CREATE TABLE IF NOT EXISTS app_state (
  id INTEGER PRIMARY KEY CHECK(id=1),
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`);

const getState = db.prepare('SELECT json FROM app_state WHERE id=1');
const putState = db.prepare('INSERT OR REPLACE INTO app_state(id,json,updated_at) VALUES(1,?,?)');

const app = express();
app.use(express.json({ limit: '50mb' }));

app.get('/api/state', (req, res) => {
  const row = getState.get();
  res.json({ state: row ? JSON.parse(row.json) : null });
});

app.put('/api/state', (req, res) => {
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ ok: false });
  putState.run(JSON.stringify(req.body), new Date().toISOString());
  res.json({ ok: true });
});

app.get('/api/db', (req, res) => {
  if (!ADMIN_TOKEN || req.get('x-token') !== ADMIN_TOKEN) return res.status(403).end();
  db.pragma('wal_checkpoint(TRUNCATE)');
  res.download(DB_PATH, 'etexnikum.db');
});

// Отдаём только эти файлы из корня (server.js, package.json и data/ недоступны снаружи)
const PUBLIC = ['index.html', 'sw.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
PUBLIC.forEach(f => app.get('/' + f, (req, res) =>
  fs.existsSync(path.join(__dirname, f)) ? res.sendFile(path.join(__dirname, f)) : res.status(404).end()));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('eTexnikum: http://localhost:' + PORT + '  DB: ' + DB_PATH));
