#!/usr/bin/env node
/**
 * Download all card images from PriceCharting
 */
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const setsData = JSON.parse(fs.readFileSync('data/sets.json', 'utf8'));
const cards = setsData[0].cards;

// Create images/cards directory if it doesn't exist
const imagesDir = path.join(__dirname, 'images', 'cards');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const file = fs.createWriteStream(filepath);
    
    client.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirects
        return downloadImage(response.headers.location, filepath)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(filepath);
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      reject(err);
    });
  });
}

async function downloadAllImages() {
  let downloaded = 0;
  let failed = 0;
  const total = cards.reduce((sum, card) => sum + card.variants.length, 0);
  
  console.log(`Downloading ${total} images...\n`);
  
  for (const card of cards) {
    for (const variant of card.variants) {
      if (!variant.image || !variant.image.startsWith('http')) {
        console.log(`Skipping ${card.name} ${variant.type} (no URL)`);
        continue;
      }
      
      // Create filename
      const safeName = card.name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const safeVariant = variant.type.toLowerCase().replace(/\s+/g, '-');
      const filename = `${card.number}-${safeName}-${safeVariant}.jpg`;
      const filepath = path.join(imagesDir, filename);
      
      // Skip if already exists
      if (fs.existsSync(filepath)) {
        downloaded++;
        process.stdout.write(`\r[${downloaded}/${total}] Skipped (exists): ${filename}`);
        continue;
      }
      
      try {
        await downloadImage(variant.image, filepath);
        downloaded++;
        process.stdout.write(`\r[${downloaded}/${total}] Downloaded: ${filename}`);
        
        // Update JSON to use local path
        variant.image = `images/cards/${filename}`;
      } catch (err) {
        failed++;
        console.error(`\nFailed to download ${filename}: ${err.message}`);
        // Keep the original URL as fallback
      }
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log(`\n\n✓ Downloaded: ${downloaded}`);
  console.log(`✗ Failed: ${failed}`);
  
  // Save updated JSON with local paths
  fs.writeFileSync('data/sets.json', JSON.stringify(setsData, null, 2));
  console.log(`\n✓ Updated data/sets.json with local image paths`);
}

downloadAllImages().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

