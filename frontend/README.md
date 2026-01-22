# Lenny's Podcast Transcripts - Frontend

Interactive web interface for browsing, searching, and chatting with Lenny's Podcast transcripts.

## Features

- **Search**: Full-text search across episode titles, guests, descriptions, and keywords
- **Browse**: Filter episodes by topic keywords
- **Sort**: View episodes by most viewed, longest duration, or alphabetically
- **AI Chat**: Ask questions about the transcripts using Claude or OpenAI
- **Episode Details**: Read full transcripts with YouTube links

## Setup

### 1. Build the Index

Before using the frontend, you must generate the episode index:

```bash
cd /home/user/lennys-podcast-transcripts
python3 build_index.py
```

This creates `frontend/data/index.json` with metadata for all 303 episodes.

### 2. Start Local Server

The frontend requires a local web server to function (it can't open HTML files directly due to CORS restrictions).

**Option A: Python (Simple HTTP Server)**
```bash
cd frontend
python3 -m http.server 8000
```

**Option B: Node.js (http-server)**
```bash
npm install -g http-server
cd frontend
http-server -p 8000
```

**Option C: Use the provided script**
```bash
chmod +x serve.sh
./serve.sh
```

### 3. Open in Browser

Navigate to: `http://localhost:8000`

## Using AI Chat

To use the AI chat feature:

1. Click **"Open AI Chat"** button in the sidebar
2. Enter your API key:
   - **Claude**: Get from [console.anthropic.com](https://console.anthropic.com)
   - **OpenAI**: Get from [platform.openai.com](https://platform.openai.com)
3. Select your preferred provider
4. Start asking questions!

**Note**: Your API key is stored locally in your browser's localStorage and never sent anywhere except to the respective API.

### Example Questions

- "What does Brian Chesky say about product management?"
- "Which episodes discuss growth strategies?"
- "Summarize the key points about hiring"
- "Find episodes about pricing models"

## File Structure

```
frontend/
├── index.html          # Main HTML structure
├── styles.css          # All CSS styling
├── app.js              # Core app logic (loading, filtering, rendering)
├── search.js           # Search utilities
├── chat.js             # AI chat integration
├── data/
│   └── index.json      # Generated episode index (created by build script)
└── README.md           # This file
```

## How It Works

1. **Build Script**: `build_index.py` scans all episode directories, parses YAML frontmatter, and generates a JSON index
2. **Frontend Loading**: `app.js` loads the index and displays episodes
3. **Search & Filter**: Client-side filtering by keywords and search terms
4. **Episode Details**: Full transcripts are loaded on-demand when you click an episode
5. **AI Chat**: Sends your question + relevant context to Claude/OpenAI API

## Customization

### Changing the Appearance

Edit `styles.css` - all colors are defined as CSS variables at the top:

```css
:root {
    --primary-color: #4F46E5;
    --secondary-color: #7C3AED;
    /* ... etc */
}
```

### Modifying Search Behavior

The search uses simple substring matching. To enable fuzzy search with Fuse.js:

1. Uncomment the Fuse.js integration in `search.js`
2. Replace the search logic in `app.js` with `fuzzySearch()`

### Adding More Features

Ideas for enhancement:
- Save favorite episodes to localStorage
- Export search results as JSON/CSV
- YouTube player embed with timestamp sync
- Highlight search terms in transcripts
- Dark mode toggle
- Share filtered results via URL parameters

## Troubleshooting

**Issue**: Index not loading
- Make sure you ran `python3 build_index.py` first
- Check that `frontend/data/index.json` exists
- Open browser console (F12) for error messages

**Issue**: AI chat not working
- Verify your API key is correct
- Check browser console for API errors
- Ensure you have internet connection
- For Claude, make sure you selected the right provider

**Issue**: Transcripts not displaying
- Verify the relative paths are correct
- Check that episodes directory exists at `../episodes/`
- Look for CORS errors in browser console

## Development

This is a static HTML/JS application with no build step required. Just edit the files and refresh your browser.

All external dependencies are loaded from CDN:
- `marked.js` - Markdown parser
- `js-yaml` - YAML parser
- `fuse.js` - Fuzzy search (optional)

## License

This frontend is provided as-is for personal use with the Lenny's Podcast transcripts repository.
