const socket = io();
let username = '';
let persistentId = '';

function getPersistentId() {
    let id = localStorage.getItem('persistentId');
    if (!id) {
        id = self.crypto.randomUUID();
        localStorage.setItem('persistentId', id);
    }
    return id;
}

function startChat() {
    username = document.getElementById('username').value;
    if (username) {
        persistentId = getPersistentId();
        socket.emit('set username', { username, persistentId });
        document.getElementById('username-container').style.display = 'none';
        document.getElementById('chat-container').style.display = 'block';
    }
}

function sendMessage() {
    const message = document.getElementById('message').value;
    if (username && message) {
        socket.emit('userMessage', { message });
        document.getElementById('message').value = '';
    }
}

socket.on('userMessage', (data) => {
    const chatBox = document.getElementById('chat-box');
    const messageElement = document.createElement('div');
    messageElement.textContent = data.message;
    if (data.sender === 'admin') {
        messageElement.style.textAlign = 'left';
        messageElement.style.color = 'blue';
    } else {
        messageElement.style.textAlign = 'right';
    }
    chatBox.appendChild(messageElement);
});