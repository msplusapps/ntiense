require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const db = require('./database');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const authenticateToken = require('./authMiddleware');
const { ip } = require('address');

const port = process.env.PORT || 5555;
const hostIp = ip();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());
app.use(express.static('public'));
app.use(express.json());

// ========== Serve embed.js ==========
app.get('/embed.js', (req, res) => {
    fs.readFile(path.join(__dirname, '..', 'public', 'embed.js'), 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error reading embed.js');
            return;
        }
        const host = req.get('host');
        const script = data.replace('http://192.168.0.132:3000', `http://${host}`);
        res.type('application/javascript').send(script);
    });
});

const users = {}; // Store connected users

// ========== SOCKET.IO ==========
io.on('connection', (socket) => {
    console.log('🟢 New socket connected:', socket.id);

    // 🔹 Admin connects
    socket.on('adminConnect', (data) => {
        jwt.verify(data.token, process.env.JWT_SECRET, (err, user) => {
            if (!err && user) {
                socket.join('admin-room');
                console.log('🧑‍💼 Admin connected and joined admin-room');
                socket.emit('adminConnected', { message: 'Admin connected successfully' });
            } else {
                console.warn('❌ Invalid admin token');
            }
        });
    });

    // 🔹 User logs in (emit this after login)
    socket.on('userLogin', (data) => {
        console.log(`👤 User logged in: ${data.username}`);
        
        // Notify all admins in admin-room
        io.to('admin-room').emit('userConnected', {
            username: data.username,
            timestamp: new Date().toISOString()
        });
    });

    // 🔹 Handle messages from admin
    socket.on('adminMessage', (data) => {
        jwt.verify(data.token, process.env.JWT_SECRET, (err, user) => {
            if (!err && user) {
                io.emit('messageFromAdmin', {
                    sender: 'Admin',
                    message: data.message,
                    timestamp: new Date().toISOString()
                });
            }
        });
    });

    // Optional: handle messages from user
    socket.on('messageFromUser', (data) => {
        io.to('admin-room').emit('messageFromUser', data);
    });
});


// ========== REST API ROUTES ==========

// 🔐 Admin login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err || !user) return res.status(401).json({ message: 'Authentication failed' });

        // Simple password check (no bcrypt)
        if (password === user.password) {
            const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET, { expiresIn: '2h' });
            res.json({ token });
        } else {
            res.status(401).json({ message: 'Authentication failed' });
        }
    });
});

// 📄 Get all conversations
app.get('/api/conversations', authenticateToken, (req, res) => {
    db.all('SELECT * FROM conversations ORDER BY updatedAt DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 💬 Get messages of a conversation
app.get('/api/messages/:chatId', authenticateToken, (req, res) => {
    const { chatId } = req.params;
    db.all('SELECT * FROM messages WHERE conversationId = ? ORDER BY timestamp ASC', [chatId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ✉️ Send a message (admin or system)
app.post('/api/messages/:chatId', authenticateToken, (req, res) => {
    const { chatId } = req.params;
    const { sender, content } = req.body;
    const timestamp = new Date();

    if (!sender || !content) return res.status(400).json({ message: 'Sender and content are required.' });

    db.run(
        'INSERT INTO messages (conversationId, sender, content, timestamp) VALUES (?, ?, ?, ?)',
        [chatId, sender, content, timestamp],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });

            io.to(chatId).emit('messageFromAdmin', { chatId, content, sender, timestamp });
            res.json({ id: this.lastID, chatId, sender, content, timestamp });
        }
    );
});

// ========== ADMIN CREATION ==========
function createOrUpdateAdmin() {
    const adminUsername = 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin';

    db.get('SELECT * FROM users WHERE username = ?', [adminUsername], (err, user) => {
        if (err) return console.error('Error finding admin user:', err);

        if (user) {
            db.run('UPDATE users SET password = ? WHERE username = ?', [adminPassword, adminUsername], (err) => {
                if (err) console.error('Error updating admin user:', err);
                else console.log('✅ Admin user password updated.');
            });
        } else {
            db.run('INSERT INTO users (username, password) VALUES (?, ?)', [adminUsername, adminPassword], (err) => {
                if (err) console.error('Error creating admin user:', err);
                else console.log('✅ Admin user created.');
            });
        }
    });
}

// ========== SERVER START ==========
server.listen(port, () => {
    console.log(`🚀 Server running on: http://${hostIp}:${port}`);
    console.log(`🧭 Admin panel: http://${hostIp}:${port}/admin-login.html`);
    createOrUpdateAdmin();
});