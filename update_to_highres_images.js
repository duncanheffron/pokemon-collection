#!/usr/bin/env node
/**
 * Update image URLs to high-resolution PriceCharting images
 * Changes /60.jpg to /1600.jpg for better quality
 */
const fs = require('fs');

const setsData = JSON.parse(fs.readFileSync('data/sets.json', 'utf8'));
const set = setsData[0];

console.log(`Updating images to high-resolution...\n`);

let updated = 0;

set.cards.forEach(card => {
  card.variants.forEach(variant => {
    if (variant.image && variant.image.includes('storage.googleapis.com/images.pricecharting.com')) {
      // Change /60.jpg to /1600.jpg for high-res
      const oldUrl = variant.image;
      variant.image = oldUrl.replace(/\/60\.jpg$/, '/1600.jpg');
      
      if (oldUrl !== variant.image) {
        updated++;
      }
    }
  });
});

console.log(`✓ Updated ${updated} image URLs to high-resolution (1600px)`);

// Save updated data
fs.writeFileSync('data/sets.json', JSON.stringify(setsData, null, 2));
console.log(`✓ Saved to data/sets.json`);

// Create backup
const backupName = `data/sets_backup_${Date.now()}.json`;
fs.writeFileSync(backupName, JSON.stringify(setsData, null, 2));
console.log(`✓ Backup saved to ${backupName}`);

