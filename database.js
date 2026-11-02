const sqlite3 = require('@karinjs/sqlite3').verbose(); const db = new sqlite3.Database('./fasttap.db');
db.serialize(() => { db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, login TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT 'client')");
db.run("CREATE TABLE IF NOT EXISTS cards (id TEXT PRIMARY KEY, user_id INTEGER, target_url TEXT DEFAULT '', FOREIGN KEY(user_id) REFERENCES users(id))");

db.get("SELECT * FROM users WHERE login = 'admin'", (err, row) => {
    if (!row) {
        db.run("INSERT INTO users (name, login, password, role) VALUES ('Главный админ', 'admin', 'admin123', 'admin')");
    }
});
});
module.exports = db;
