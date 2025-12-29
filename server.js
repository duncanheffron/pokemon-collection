const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const COLLECTION_FILE = path.join(__dirname, 'data', 'collection.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files

// Ensure collection file exists
async function ensureCollectionFile() {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(COLLECTION_FILE);
    try {
      await fs.access(dataDir);
    } catch {
      // Directory doesn't exist, create it
      await fs.mkdir(dataDir, { recursive: true });
    }
    
    // Check if collection file exists
    try {
      await fs.access(COLLECTION_FILE);
    } catch {
      // File doesn't exist, create it with empty object
      await fs.writeFile(COLLECTION_FILE, JSON.stringify({}, null, 2));
    }
  } catch (error) {
    console.error('Error ensuring collection file:', error);
  }
}

// Load collection data
async function loadCollection() {
  try {
    const data = await fs.readFile(COLLECTION_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading collection:', error);
    return {};
  }
}

// Save collection data
async function saveCollection(data) {
  try {
    await fs.writeFile(COLLECTION_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving collection:', error);
    return false;
  }
}

// GET /api/collection - Get all collection data
app.get('/api/collection', async (req, res) => {
  try {
    const collection = await loadCollection();
    res.json(collection);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load collection' });
  }
});

// GET /api/collection/:setId - Get collection for a specific set
app.get('/api/collection/:setId', async (req, res) => {
  try {
    const { setId } = req.params;
    const collection = await loadCollection();
    res.json(collection[setId] || {});
  } catch (error) {
    res.status(500).json({ error: 'Failed to load collection' });
  }
});

// POST /api/collection/:setId - Update collection for a specific set
app.post('/api/collection/:setId', async (req, res) => {
  try {
    const { setId } = req.params;
    const setCollection = req.body;
    
    const allCollections = await loadCollection();
    allCollections[setId] = setCollection;
    
    const saved = await saveCollection(allCollections);
    if (saved) {
      res.json({ success: true, message: 'Collection updated' });
    } else {
      res.status(500).json({ error: 'Failed to save collection' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update collection' });
  }
});

// PUT /api/collection/:setId/card/:cardId - Toggle a single card
app.put('/api/collection/:setId/card/:cardId', async (req, res) => {
  try {
    const { setId, cardId } = req.params;
    
    const allCollections = await loadCollection();
    if (!allCollections[setId]) {
      allCollections[setId] = {};
    }
    
    // Toggle the card
    allCollections[setId][cardId] = !allCollections[setId][cardId];
    
    const saved = await saveCollection(allCollections);
    if (saved) {
      res.json({ 
        success: true, 
        collected: allCollections[setId][cardId],
        message: 'Card toggled' 
      });
    } else {
      res.status(500).json({ error: 'Failed to save collection' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle card' });
  }
});

// Initialize server
async function startServer() {
  await ensureCollectionFile();
  app.listen(PORT, () => {
    console.log(`Pokémon Collection Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);

