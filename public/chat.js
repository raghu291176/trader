/**
 * Chat Widget Logic with RAG
 */

let chatHistory = [];

// Toggle chat widget
function toggleChat() {
    const widget = document.getElementById('chatWidget');
    widget.classList.toggle('collapsed');
}

// Send chat message
async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const question = input.value.trim();

    if (!question) return;

    // Add user message to chat
    addChatMessage(question, 'user');
    input.value = '';

    // Show loading message
    addChatMessage('Thinking...', 'bot', true);

    try {
        const response = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question })
        });

        const data = await response.json();

        // Remove loading message
        const messages = document.getElementById('chatMessages');
        messages.removeChild(messages.lastChild);

        // Add bot response
        addChatMessage(data.answer, 'bot');

        // Add to history
        chatHistory.push({ question, answer: data.answer, timestamp: new Date() });

    } catch (error) {
        // Remove loading message
        const messages = document.getElementById('chatMessages');
        messages.removeChild(messages.lastChild);

        addChatMessage('Sorry, I encountered an error. Please make sure OPENAI_API_KEY is set.', 'bot');
        console.error('Chat error:', error);
    }
}

// Add message to chat
function addChatMessage(text, sender, isLoading = false) {
    const messages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}${isLoading ? ' loading' : ''}`;
    messageDiv.textContent = text;
    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
}

// Handle enter key in chat input
function handleChatKeypress(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}

// Load suggested questions
async function loadChatSuggestions() {
    try {
        const response = await fetch(`${API_BASE}/chat/suggestions`);
        const data = await response.json();

        const suggestionsDiv = document.getElementById('chatSuggestions');
        suggestionsDiv.innerHTML = data.suggestions.slice(0, 3).map(q =>
            `<div class="chat-suggestion" onclick="askSuggestion('${q}')">${q}</div>`
        ).join('');
    } catch (error) {
        console.error('Failed to load suggestions:', error);
    }
}

// Ask a suggested question
function askSuggestion(question) {
    document.getElementById('chatInput').value = question;
    sendChatMessage();
}

// Initialize chat on load
document.addEventListener('DOMContentLoaded', () => {
    loadChatSuggestions();

    // Collapse chat by default
    document.getElementById('chatWidget').classList.add('collapsed');
});
