/**
 * Main application logic for the podcast transcript browser
 */

// Global state
const AppState = {
    indexData: null,
    allEpisodes: [],
    filteredEpisodes: [],
    selectedKeywords: new Set(),
    currentSort: 'views',
    searchQuery: '',
    currentEpisode: null
};

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    await loadIndex();
    setupEventListeners();
    renderKeywordFilters();
    renderEpisodes();
});

/**
 * Load the index data from JSON file
 */
async function loadIndex() {
    try {
        showLoading(true);
        const response = await fetch('data/index.json');

        if (!response.ok) {
            throw new Error(`Failed to load index: ${response.statusText}`);
        }

        AppState.indexData = await response.json();
        AppState.allEpisodes = AppState.indexData.episodes;
        AppState.filteredEpisodes = [...AppState.allEpisodes];

        // Update episode count in header
        document.getElementById('episode-count').textContent = AppState.indexData.total_episodes;

        console.log(`Loaded ${AppState.allEpisodes.length} episodes`);
    } catch (error) {
        console.error('Error loading index:', error);
        alert('Failed to load episode index. Please make sure you run the build script first.');
    } finally {
        showLoading(false);
    }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', debounce(handleSearch, 300));

    // Sort controls
    document.querySelectorAll('input[name="sort"]').forEach(radio => {
        radio.addEventListener('change', handleSortChange);
    });

    // Close detail view
    document.getElementById('close-detail').addEventListener('click', closeDetailView);

    // AI chat toggle
    document.getElementById('toggle-ai-chat').addEventListener('click', toggleAIChat);
    document.getElementById('close-chat').addEventListener('click', toggleAIChat);
}

/**
 * Render keyword filter checkboxes
 */
function renderKeywordFilters() {
    if (!AppState.indexData) return;

    const container = document.getElementById('keyword-filters');

    // Count episodes per keyword
    const keywordCounts = {};
    AppState.allEpisodes.forEach(episode => {
        episode.keywords.forEach(keyword => {
            keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
        });
    });

    // Sort keywords by count (descending)
    const sortedKeywords = AppState.indexData.all_keywords.sort((a, b) => {
        return (keywordCounts[b] || 0) - (keywordCounts[a] || 0);
    });

    container.innerHTML = sortedKeywords.map(keyword => `
        <label class="keyword-filter">
            <input type="checkbox" value="${keyword}" class="keyword-checkbox">
            <span>${keyword}</span>
            <span class="keyword-count">${keywordCounts[keyword] || 0}</span>
        </label>
    `).join('');

    // Add event listeners to checkboxes
    container.querySelectorAll('.keyword-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', handleKeywordFilter);
    });
}

/**
 * Handle keyword filter changes
 */
function handleKeywordFilter(event) {
    const keyword = event.target.value;

    if (event.target.checked) {
        AppState.selectedKeywords.add(keyword);
    } else {
        AppState.selectedKeywords.delete(keyword);
    }

    applyFilters();
}

/**
 * Handle search input
 */
function handleSearch(event) {
    AppState.searchQuery = event.target.value.trim().toLowerCase();
    applyFilters();
}

/**
 * Handle sort change
 */
function handleSortChange(event) {
    AppState.currentSort = event.target.value;
    sortEpisodes();
    renderEpisodes();
}

/**
 * Apply all filters (keywords and search)
 */
function applyFilters() {
    let filtered = [...AppState.allEpisodes];

    // Apply keyword filters (AND logic - episode must have ALL selected keywords)
    if (AppState.selectedKeywords.size > 0) {
        filtered = filtered.filter(episode => {
            return Array.from(AppState.selectedKeywords).every(keyword =>
                episode.keywords.includes(keyword)
            );
        });
    }

    // Apply search filter
    if (AppState.searchQuery) {
        filtered = filtered.filter(episode => {
            const searchText = `
                ${episode.guest}
                ${episode.title}
                ${episode.description}
                ${episode.keywords.join(' ')}
            `.toLowerCase();

            return searchText.includes(AppState.searchQuery);
        });
    }

    AppState.filteredEpisodes = filtered;
    sortEpisodes();
    renderEpisodes();
    updateSearchStats();
}

/**
 * Sort episodes based on current sort option
 */
function sortEpisodes() {
    switch (AppState.currentSort) {
        case 'views':
            AppState.filteredEpisodes.sort((a, b) => b.view_count - a.view_count);
            break;
        case 'duration':
            AppState.filteredEpisodes.sort((a, b) => b.duration_seconds - a.duration_seconds);
            break;
        case 'title':
            AppState.filteredEpisodes.sort((a, b) => a.guest.localeCompare(b.guest));
            break;
    }
}

/**
 * Update search stats display
 */
function updateSearchStats() {
    const statsEl = document.getElementById('search-stats');
    const total = AppState.allEpisodes.length;
    const showing = AppState.filteredEpisodes.length;

    if (showing === total) {
        statsEl.textContent = `Showing all ${total} episodes`;
    } else {
        statsEl.textContent = `Showing ${showing} of ${total} episodes`;
    }
}

/**
 * Render the episode list
 */
function renderEpisodes() {
    const container = document.getElementById('episode-list');

    if (AppState.filteredEpisodes.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6B7280;">No episodes found matching your filters.</p>';
        return;
    }

    container.innerHTML = AppState.filteredEpisodes.map(episode => `
        <div class="episode-card" data-slug="${episode.slug}">
            <div class="episode-card-header">
                <div class="episode-guest">${escapeHtml(episode.guest)}</div>
                <div class="episode-views">${formatNumber(episode.view_count)} views</div>
            </div>
            <div class="episode-title">${escapeHtml(episode.title)}</div>
            <div class="episode-meta">
                <span>⏱️ ${episode.duration}</span>
                <span>🎬 <a href="${episode.youtube_url}" target="_blank" onclick="event.stopPropagation()">YouTube</a></span>
            </div>
            <div class="episode-keywords">
                ${episode.keywords.slice(0, 5).map(kw => `<span class="keyword-tag">${kw}</span>`).join('')}
                ${episode.keywords.length > 5 ? `<span class="keyword-tag">+${episode.keywords.length - 5} more</span>` : ''}
            </div>
        </div>
    `).join('');

    // Add click listeners to episode cards
    container.querySelectorAll('.episode-card').forEach(card => {
        card.addEventListener('click', () => {
            const slug = card.dataset.slug;
            loadEpisodeDetail(slug);
        });
    });

    updateSearchStats();
}

/**
 * Load and display episode detail
 */
async function loadEpisodeDetail(slug) {
    try {
        showLoading(true);

        const episode = AppState.allEpisodes.find(ep => ep.slug === slug);
        if (!episode) {
            throw new Error('Episode not found');
        }

        // Load the full transcript
        const response = await fetch(`../${episode.transcript_path}`);
        if (!response.ok) {
            throw new Error('Failed to load transcript');
        }

        const transcriptText = await response.text();

        // Parse the transcript
        const parsed = parseTranscript(transcriptText);

        // Store current episode
        AppState.currentEpisode = { ...episode, fullTranscript: parsed.content };

        // Render detail view
        renderEpisodeDetail(episode, parsed.content);

        // Hide list, show detail
        document.querySelector('.episode-list-container').classList.add('hidden');
        document.getElementById('episode-detail').classList.remove('hidden');

    } catch (error) {
        console.error('Error loading episode:', error);
        alert('Failed to load episode transcript');
    } finally {
        showLoading(false);
    }
}

/**
 * Parse transcript markdown content
 */
function parseTranscript(fullText) {
    // Extract content after frontmatter
    const match = fullText.match(/^---\s*\n.*?\n---\s*\n(.*)$/s);
    const content = match ? match[1] : fullText;

    return {
        content: content.trim()
    };
}

/**
 * Render the episode detail view
 */
function renderEpisodeDetail(episode, transcriptContent) {
    const container = document.getElementById('episode-content');

    // Convert markdown to HTML
    const transcriptHtml = marked.parse(transcriptContent);

    container.innerHTML = `
        <h1>${escapeHtml(episode.title)}</h1>

        <div class="episode-info">
            <p><strong>Guest:</strong> ${escapeHtml(episode.guest)}</p>
            <p><strong>Duration:</strong> ${episode.duration} (${formatNumber(episode.view_count)} views)</p>
            <p><strong>Topics:</strong> ${episode.keywords.join(', ')}</p>
            ${episode.description ? `<p><strong>Description:</strong> ${escapeHtml(episode.description)}</p>` : ''}
            <p>
                <a href="${episode.youtube_url}" target="_blank" class="youtube-link">
                    ▶️ Watch on YouTube
                </a>
            </p>
        </div>

        <div class="transcript-content">
            ${transcriptHtml}
        </div>
    `;
}

/**
 * Close the detail view and return to list
 */
function closeDetailView() {
    document.getElementById('episode-detail').classList.add('hidden');
    document.querySelector('.episode-list-container').classList.remove('hidden');
    AppState.currentEpisode = null;
}

/**
 * Toggle AI chat panel
 */
function toggleAIChat() {
    const chatPanel = document.getElementById('ai-chat-panel');
    const mainContent = document.querySelector('.main-content');
    const toggleBtn = document.getElementById('toggle-ai-chat');

    if (chatPanel.classList.contains('hidden')) {
        chatPanel.classList.remove('hidden');
        mainContent.classList.add('with-chat');
        toggleBtn.textContent = '💬 Close AI Chat';
    } else {
        chatPanel.classList.add('hidden');
        mainContent.classList.remove('with-chat');
        toggleBtn.textContent = '💬 Open AI Chat';
    }
}

/**
 * Show/hide loading indicator
 */
function showLoading(show) {
    const loading = document.getElementById('loading');
    if (show) {
        loading.classList.remove('hidden');
    } else {
        loading.classList.add('hidden');
    }
}

/**
 * Utility: Debounce function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Utility: Format number with commas
 */
function formatNumber(num) {
    return num.toLocaleString();
}

/**
 * Utility: Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
