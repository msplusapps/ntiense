require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const db = require('./database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const authenticateToken = require('./authMiddleware');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.get('/embed.js', (req, res) => {
    fs.readFile(path.join(__dirname, '..', 'public', 'embed.js'), 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error reading embed.js');
            return;
        }
        const host = req.get('host');
        const script = data.replace('http://localhost:3000', `http://${host}`);
        res.type('application/javascript').send(script);
    });
});

app.use(express.static('public'));
app.use(express.json());

const users = {};

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('set username', (data) => {
        const { username, persistentId } = data;
        const conversationId = persistentId;
        db.run('INSERT OR IGNORE INTO conversations (id, userId, updatedAt) VALUES (?, ?, ?)',
               [conversationId, username, new Date()], (err) => {
            if (!err) {
                socket.join(conversationId);
                users[socket.id] = { username, conversationId };
            }
        });
    });

    socket.on('adminConnect', (data) => {
        jwt.verify(data.token, process.env.JWT_SECRET, (err, user) => {
            if (!err && user) {
                socket.join('admin-room');
                console.log('Admin connected and joined admin-room');
            }
        });
    });

    socket.on('userMessage', (data) => {
        const { message } = data;
        const conversationId = users[socket.id]?.conversationId;
        if (conversationId) {
            const timestamp = new Date();
            db.run('INSERT INTO messages (conversationId, sender, content, timestamp) VALUES (?, ?, ?, ?)',
                   [conversationId, 'user', message, timestamp], (err) => {
                if (!err) {
                    db.run('UPDATE conversations SET lastMessage = ?, updatedAt = ? WHERE id = ?',
                           [message, timestamp, conversationId]);

                    const payload = { chatId: conversationId, message, timestamp, sender: 'user' };
                    io.to(conversationId).emit('userMessage', payload);
                    io.to('admin-room').emit('userMessage', payload);
                }
            });
        }
    });

    socket.on('adminMessage', (data) => {
        const { chatId, message, token } = data;
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (!err && user) {
                const timestamp = new Date();
                db.run('INSERT INTO messages (conversationId, sender, content, timestamp) VALUES (?, ?, ?, ?)',
                       [chatId, 'admin', message, timestamp], (err) => {
                    if (!err) {
                        db.run('UPDATE conversations SET lastMessage = ?, updatedAt = ? WHERE id = ?',
                               [message, timestamp, chatId]);
                        io.to(chatId).emit('userMessage', { chatId, message, timestamp, sender: 'admin' });
                    }
                });
            }
        });
    });

});

// Admin login route
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err || !user) {
            return res.status(401).json({ message: 'Authentication failed' });
        }
        bcrypt.compare(password, user.password, (err, result) => {
            if (result) {
                const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
                res.json({ token });
            } else {
                res.status(401).json({ message: 'Authentication failed' });
            }
        });
    });
});

// API routes
app.get('/api/conversations', authenticateToken, (req, res) => {
    db.all('SELECT * FROM conversations ORDER BY updatedAt DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.get('/api/messages/:chatId', authenticateToken, (req, res) => {
    const { chatId } = req.params;
    db.all('SELECT * FROM messages WHERE conversationId = ? ORDER BY timestamp ASC', [chatId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

function createOrUpdateAdmin() {
    const adminUsername = 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin';

    db.get('SELECT * FROM users WHERE username = ?', [adminUsername], (err, user) => {
        if (err) {
            console.error('Error finding admin user:', err);
            return;
        }

        bcrypt.hash(adminPassword, 10, (err, hash) => {
            if (err) {
                console.error('Error hashing password:', err);
                return;
            }

            if (user) {
                // Update existing admin password
                db.run('UPDATE users SET password = ? WHERE username = ?', [hash, adminUsername], (err) => {
                    if (err) {
                        console.error('Error updating admin user:', err);
                    } else {
                        console.log('Admin user password updated.');
                    }
                });
            } else {
                // Create new admin user
                db.run('INSERT INTO users (username, password) VALUES (?, ?)', [adminUsername, hash], (err) => {
                    if (err) {
                        console.error('Error creating admin user:', err);
                    } else {
                        console.log('Admin user created.');
                    }
                });
            }
        });
    });
}

server.listen(3000, () => {
    console.log('listening on *:3000');
    createOrUpdateAdmin();
});