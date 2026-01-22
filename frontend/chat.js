/**
 * AI Chat integration for querying transcripts
 * Supports both Claude (Anthropic) and OpenAI APIs
 */

// Chat state
const ChatState = {
    apiKey: localStorage.getItem('ai_api_key') || '',
    provider: localStorage.getItem('ai_provider') || 'claude',
    conversationHistory: []
};

// Initialize chat when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setupChatListeners();
    loadChatConfig();
});

/**
 * Set up event listeners for chat
 */
function setupChatListeners() {
    const apiKeyInput = document.getElementById('api-key-input');
    const providerSelect = document.getElementById('api-provider');
    const sendBtn = document.getElementById('send-chat');
    const chatInput = document.getElementById('chat-input');

    // Load saved API key
    if (ChatState.apiKey) {
        apiKeyInput.value = ChatState.apiKey;
    }

    // Load saved provider
    if (ChatState.provider) {
        providerSelect.value = ChatState.provider;
    }

    // Save API key on input
    apiKeyInput.addEventListener('input', (e) => {
        ChatState.apiKey = e.target.value;
        localStorage.setItem('ai_api_key', e.target.value);
    });

    // Save provider on change
    providerSelect.addEventListener('change', (e) => {
        ChatState.provider = e.target.value;
        localStorage.setItem('ai_provider', e.target.value);
    });

    // Send message on button click
    sendBtn.addEventListener('click', sendChatMessage);

    // Send message on Enter (but Shift+Enter for new line)
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });
}

/**
 * Load chat configuration from localStorage
 */
function loadChatConfig() {
    ChatState.apiKey = localStorage.getItem('ai_api_key') || '';
    ChatState.provider = localStorage.getItem('ai_provider') || 'claude';
}

/**
 * Send a chat message
 */
async function sendChatMessage() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();

    if (!message) return;

    if (!ChatState.apiKey) {
        addChatMessage('error', 'Please enter your API key first.');
        return;
    }

    // Add user message to chat
    addChatMessage('user', message);
    chatInput.value = '';

    // Disable send button while processing
    const sendBtn = document.getElementById('send-chat');
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';

    try {
        // Get relevant context from current view
        const context = getContextForChat();

        // Send to AI
        const response = await queryAI(message, context);

        // Add AI response to chat
        addChatMessage('assistant', response);

    } catch (error) {
        console.error('Chat error:', error);
        addChatMessage('error', `Error: ${error.message}`);
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send';
    }
}

/**
 * Get context for the chat based on current view
 */
function getContextForChat() {
    let context = {
        totalEpisodes: AppState.allEpisodes.length,
        filteredEpisodes: AppState.filteredEpisodes.length,
        selectedKeywords: Array.from(AppState.selectedKeywords)
    };

    // If viewing a specific episode, include its details
    if (AppState.currentEpisode) {
        context.currentEpisode = {
            guest: AppState.currentEpisode.guest,
            title: AppState.currentEpisode.title,
            keywords: AppState.currentEpisode.keywords,
            transcript: AppState.currentEpisode.fullTranscript.substring(0, 8000) // Limit transcript length
        };
    }

    // Include some episodes metadata for context
    context.availableEpisodes = AppState.filteredEpisodes.slice(0, 10).map(ep => ({
        guest: ep.guest,
        title: ep.title,
        keywords: ep.keywords
    }));

    return context;
}

/**
 * Query the AI with message and context
 */
async function queryAI(message, context) {
    if (ChatState.provider === 'claude') {
        return await queryClaude(message, context);
    } else {
        return await queryOpenAI(message, context);
    }
}

/**
 * Query Claude API
 */
async function queryClaude(message, context) {
    const systemPrompt = buildSystemPrompt(context);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': ChatState.apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            system: systemPrompt,
            messages: [
                ...ChatState.conversationHistory,
                { role: 'user', content: message }
            ]
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to get response from Claude');
    }

    const data = await response.json();

    // Update conversation history
    ChatState.conversationHistory.push(
        { role: 'user', content: message },
        { role: 'assistant', content: data.content[0].text }
    );

    // Keep conversation history limited
    if (ChatState.conversationHistory.length > 10) {
        ChatState.conversationHistory = ChatState.conversationHistory.slice(-10);
    }

    return data.content[0].text;
}

/**
 * Query OpenAI API
 */
async function queryOpenAI(message, context) {
    const systemPrompt = buildSystemPrompt(context);

    const messages = [
        { role: 'system', content: systemPrompt },
        ...ChatState.conversationHistory,
        { role: 'user', content: message }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ChatState.apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4',
            messages: messages,
            max_tokens: 1024
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to get response from OpenAI');
    }

    const data = await response.json();

    // Update conversation history
    ChatState.conversationHistory.push(
        { role: 'user', content: message },
        { role: 'assistant', content: data.choices[0].message.content }
    );

    // Keep conversation history limited
    if (ChatState.conversationHistory.length > 10) {
        ChatState.conversationHistory = ChatState.conversationHistory.slice(-10);
    }

    return data.choices[0].message.content;
}

/**
 * Build system prompt with context
 */
function buildSystemPrompt(context) {
    let prompt = `You are a helpful assistant for searching and understanding Lenny's Podcast transcripts.

The podcast features interviews with world-class product leaders and growth experts.

Current context:
- Total episodes in archive: ${context.totalEpisodes}
- Episodes matching current filters: ${context.filteredEpisodes}
`;

    if (context.selectedKeywords.length > 0) {
        prompt += `- Active keyword filters: ${context.selectedKeywords.join(', ')}\n`;
    }

    if (context.currentEpisode) {
        prompt += `\nUser is currently viewing this episode:
- Guest: ${context.currentEpisode.guest}
- Title: ${context.currentEpisode.title}
- Topics: ${context.currentEpisode.keywords.join(', ')}

Transcript excerpt:
${context.currentEpisode.transcript}

`;
    } else if (context.availableEpisodes.length > 0) {
        prompt += `\nSome available episodes:\n`;
        context.availableEpisodes.forEach(ep => {
            prompt += `- ${ep.guest}: "${ep.title}" (topics: ${ep.keywords.slice(0, 3).join(', ')})\n`;
        });
    }

    prompt += `\nHelp the user find relevant information, answer questions about the episodes, or provide insights based on the transcripts. Be concise and helpful.`;

    return prompt;
}

/**
 * Add a message to the chat display
 */
function addChatMessage(type, content) {
    const messagesContainer = document.getElementById('chat-messages');

    const messageEl = document.createElement('div');
    messageEl.className = `chat-message ${type}`;
    messageEl.textContent = content;

    messagesContainer.appendChild(messageEl);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Clear chat history
 */
function clearChatHistory() {
    ChatState.conversationHistory = [];
    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.innerHTML = `
        <div class="chat-message system">
            <p>Chat history cleared. How can I help you?</p>
        </div>
    `;
}

// Export for potential use
window.ChatUtils = {
    clearChatHistory
};
