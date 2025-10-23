(function() {
    // Create a container for the chat widget
    const chatWidgetContainer = document.createElement('div');
    chatWidgetContainer.id = 'chat-widget-container';
    document.body.appendChild(chatWidgetContainer);

    // Style the container
    chatWidgetContainer.style.position = 'fixed';
    chatWidgetContainer.style.bottom = '20px';
    chatWidgetContainer.style.right = '20px';
    chatWidgetContainer.style.width = '300px';
    chatWidgetContainer.style.height = '400px';
    chatWidgetContainer.style.border = '1px solid #ccc';
    chatWidgetContainer.style.borderRadius = '10px';
    chatWidgetContainer.style.overflow = 'hidden';

    // Create the iframe
    const iframe = document.createElement('iframe');
    iframe.src = 'http://localhost:3000'; // Replace with your server URL
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';

    // Append the iframe to the container
    chatWidgetContainer.appendChild(iframe);
})();
