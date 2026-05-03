document.addEventListener('DOMContentLoaded', () => {
    // Detect mode from body data attribute
    const mode = document.body.getAttribute('data-mode') || 'landing';
    
    // --- Breathing & Light Logic ---
    const canvas = document.getElementById('glow-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        const headline = document.getElementById('breathing-headline');

        let width, height;
        function resize() {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        }
        window.addEventListener('resize', resize);
        resize();

        function render() {
            ctx.clearRect(0, 0, width, height);
            const breathingCycle = 8000; 
            const phase = (Date.now() % breathingCycle) / breathingCycle;
            const intensity = (Math.sin(phase * Math.PI * 2 - Math.PI / 2) + 1) / 2;

            const gradient = ctx.createRadialGradient(
                width * 1.0, height * 0.5, 0,
                width * 1.0, height * 0.5, width * 0.9
            );

            const alpha = 0.4 + (intensity * 0.4);
            
            // LIGHT COLOR LOGIC
            if (mode === 'chat') {
                // RED LIGHTING for Chat mode
                gradient.addColorStop(0, `rgba(255, 30, 30, ${alpha})`); 
                gradient.addColorStop(0.4, `rgba(150, 0, 0, ${alpha * 0.4})`);
            } else {
                // GOLDEN LIGHTING for Landing mode
                gradient.addColorStop(0, `rgba(238, 221, 136, ${alpha})`); 
                gradient.addColorStop(0.4, `rgba(200, 120, 50, ${alpha * 0.4})`);
            }
            
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);

            if (headline) {
                headline.style.opacity = 0.6 + (intensity * 0.4);
            }
            requestAnimationFrame(render);
        }
        render();
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
