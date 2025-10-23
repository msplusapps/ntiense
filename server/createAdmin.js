require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('./database');

const adminUsername = 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin';

bcrypt.hash(adminPassword, 10, (err, hash) => {
    if (err) {
        console.error('Error hashing password:', err);
        return;
    }
    db.run('INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)', [adminUsername, hash], (err) => {
        if (err) {
            console.error('Error creating admin user:', err);
        } else {
            console.log('Admin user created or already exists.');
        }
    });
});
