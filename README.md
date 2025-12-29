# Pokémon Card Collection Tracker

A web application for tracking your Pokémon card collection with support for multiple sets, variants, and collection progress tracking.

## Features

- 📦 Multiple set support (MEGA Dream ex, Greninja Collection, Miltank Collection, etc.)
- 🎴 Card variant tracking (Regular, Holo, Reverse Holo, Ball, Energy, etc.)
- ✅ Collection progress tracking with visual progress bars
- 🔍 Advanced filtering (by type, variant, rarity, collection status)
- 📊 Completion statistics per set
- 🖼️ High-resolution card images
- 💾 Persistent storage via API or localStorage fallback
- 🌐 GitHub Pages deployment ready

## Deployment Options

### Option 1: GitHub Pages (Static Hosting)

**Perfect for public sharing and easy deployment!**

1. Push your code to a GitHub repository
2. Go to **Settings** → **Pages** in your repository
3. Under **Source**, select **GitHub Actions**
4. The GitHub Actions workflow will automatically deploy on push to `main`/`master`

Your site will be available at: `https://yourusername.github.io/repository-name/`

**Note:** On GitHub Pages, collection data is stored in browser localStorage (per-device). For multi-device sync, use the Docker/server option below.

### Option 2: Docker (Recommended for Multi-Device Sync)

1. Build and run with Docker Compose:
```bash
docker-compose up -d
```

The application will be available at `http://localhost:3000`

Collection data is stored in `data/collection.json` and syncs across all devices accessing the server.

### Option 3: Local Development

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## Data Storage

Collection data is stored in `data/collection.json` (one file for all collections, organized by set ID). This file is automatically created when you first save a collection.

The file structure looks like:
```json
{
  "mega-dream-ex": {
    "001-Ethan's Pinsir-Regular": true,
    "001-Ethan's Pinsir-Ball": false,
    ...
  },
  "greninja-collection": {
    ...
  }
}
```

## API Endpoints

- `GET /api/collection` - Get all collection data
- `GET /api/collection/:setId` - Get collection for a specific set
- `POST /api/collection/:setId` - Update collection for a specific set
- `PUT /api/collection/:setId/card/:cardId` - Toggle a single card's collection status

## File Structure

```
.
├── server.js              # Express server with API endpoints
├── package.json           # Node.js dependencies
├── Dockerfile             # Docker configuration
├── docker-compose.yml     # Docker Compose configuration
├── index.html             # Main page (set overview)
├── set.html               # Set detail page
├── assets/
│   ├── css/
│   │   └── style.css      # Styling
│   └── js/
│       └── app.js         # Frontend JavaScript
└── data/
    ├── sets.json          # Card set data
    └── collection.json    # Collection progress (auto-generated)
```

## Storage Modes

### GitHub Pages / Static Hosting
- Uses **localStorage** (browser-based storage)
- Data persists per device/browser
- No server required
- Perfect for personal use on a single device

### Server Mode (Docker/Local)
- Uses **file-based storage** (`data/collection.json`)
- Data syncs across all devices accessing the server
- Requires server to be running
- Perfect for multi-device access

The application automatically detects the hosting environment and uses the appropriate storage method.

## Notes

- The application automatically detects GitHub Pages and uses localStorage
- Falls back to localStorage if API is unavailable
- Collection data is stored per set ID for easy organization
- All collection operations are async to support both API and localStorage
