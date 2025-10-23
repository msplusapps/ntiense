document.addEventListener('DOMContentLoaded', function() {
    const chatPopup = document.getElementById('chat-popup');
    const minimizedChat = document.getElementById('minimized-chat');
    const minimizeBtn = document.getElementById('minimize-btn');
    const closeBtn = document.getElementById('close-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.querySelector('input[type="text"]');
    const sendBtn = document.querySelector('button:nth-last-child(1)');

    // Theme toggle
    themeToggle.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        feather.replace();
    });

    // Minimize chat
    minimizeBtn.addEventListener('click', () => {
        chatPopup.classList.add('hidden');
        minimizedChat.classList.remove('hidden');
    });

    // Close chat
    closeBtn.addEventListener('click', () => {
        chatPopup.classList.add('hidden');
        minimizedChat.classList.remove('hidden');
    });

    // Restore chat
    minimizedChat.addEventListener('click', () => {
        chatPopup.classList.remove('hidden');
        minimizedChat.classList.add('hidden');
    });

    const socket = io();
    let persistentId = '';

    function getPersistentId() {
        let id = localStorage.getItem('persistentId');
        if (!id) {
            id = self.crypto.randomUUID();
            localStorage.setItem('persistentId', id);
        }
        return id;
    }

    persistentId = getPersistentId();
    socket.emit('set username', { username: 'User', persistentId });

    // Send message
    function sendMessage() {
        const message = messageInput.value.trim();
        if (message) {
            socket.emit('userMessage', { message });
            messageInput.value = '';
        }
    }

    socket.on('userMessage', (data) => {
        const messageElement = document.createElement('div');
        const justification = data.sender === 'admin' ? 'justify-start' : 'justify-end';
        messageElement.className = `flex ${justification} chat-message`;

        const innerDiv = document.createElement('div');
        const colors = data.sender === 'admin' ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200' : 'bg-primary-500 text-white';
        innerDiv.className = `${colors} rounded-lg p-3 max-w-xs`;

        const p1 = document.createElement('p');
        p1.textContent = data.message;

        const p2 = document.createElement('p');
        p2.className = 'text-xs text-gray-500 dark:text-gray-400 text-right mt-1';
        p2.textContent = new Date(data.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        innerDiv.appendChild(p1);
        innerDiv.appendChild(p2);
        messageElement.appendChild(innerDiv);
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });

    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Auto-scroll to bottom of chat
    chatMessages.scrollTop = chatMessages.scrollHeight;
});