const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./chat.db');

db.serialize(() => {
    // Users table for admin credentials
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )`);

    // Conversations table
    db.run(`CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        userId TEXT,
        updatedAt DATETIME,
        lastMessage TEXT
    )`);

    // Messages table
    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversationId TEXT,
        sender TEXT,
        content TEXT,
        timestamp DATETIME,
        FOREIGN KEY (conversationId) REFERENCES conversations (id)
    )`);
});

module.exports = db;
