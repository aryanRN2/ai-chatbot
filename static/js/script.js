document.addEventListener('DOMContentLoaded', () => {
    // Detect mode from body data attribute
    const mode = document.body.getAttribute('data-mode') || 'landing';
    
    // --- Breathing & Light Logic ---
    // --- Loading Logic ---
    const spline = document.getElementById('spline-bg');
    const loadingScreen = document.getElementById('loading-screen');
    
    function hideLoadingScreen() {
        if (spline) spline.classList.add('loaded');
        if (loadingScreen) loadingScreen.classList.add('hidden');
    }

    if (spline) {
        spline.addEventListener('load-complete', hideLoadingScreen);
        // Fallback in case load-complete doesn't fire within 5 seconds
        setTimeout(hideLoadingScreen, 5000);
    } else {
        // If no spline element, hide loader immediately
        hideLoadingScreen();
    }



    // --- Chat Functionality ---
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');

    function appendMessage(role, text) {
        if (!chatBox) return;
        const div = document.createElement('div');
        div.className = `message ${role}`;
        const prefix = role === 'user' ? '$' : '>';
        div.innerHTML = `<span>${prefix}</span> ${text}`;
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        appendMessage('user', message);
        userInput.value = '';

        // Add Thinking Indicator
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'message bot thinking-indicator';
        thinkingDiv.innerHTML = `<span>></span> Thinking...`;
        chatBox.appendChild(thinkingDiv);
        chatBox.scrollTop = chatBox.scrollHeight;

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });

            const data = await response.json();
            
            // Remove Thinking Indicator
            thinkingDiv.remove();

            if (data.response) {
                appendMessage('bot', data.response);
            } else if (data.error) {
                appendMessage('bot', `Error: ${data.error}`);
            }
        } catch (error) {
            thinkingDiv.remove();
            appendMessage('bot', `Error: Connection failed. Please check your API keys in Vercel.`);
            console.error('Chat Error:', error);
        }
    }

    if (userInput) {
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
        userInput.focus();
    }

    const sendBtn = document.getElementById('send-btn');
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }
});
