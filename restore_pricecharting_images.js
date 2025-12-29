#!/usr/bin/env node
/**
 * Restore PriceCharting image URLs from scraped data
 * This restores the original high-quality image URLs we scraped
 */
const fs = require('fs');

if (!fs.existsSync('scraped_cards_raw.json')) {
  console.error('Error: scraped_cards_raw.json not found!');
  console.error('This file should contain the original scraped data with image URLs.');
  process.exit(1);
}

const scrapedData = JSON.parse(fs.readFileSync('scraped_cards_raw.json', 'utf8'));
const setsData = JSON.parse(fs.readFileSync('data/sets.json', 'utf8'));
const set = setsData[0];

console.log(`Restoring PriceCharting image URLs...\n`);
console.log(`Scraped cards: ${scrapedData.length}`);
console.log(`Current cards: ${set.cards.length}\n`);

// Create a map of scraped cards by number and name
const scrapedMap = new Map();
scrapedData.forEach(card => {
  const key = `${card.number}-${card.name}`;
  scrapedMap.set(key, card);
  
  // Also map by number only (for variants)
  if (!scrapedMap.has(card.number)) {
    scrapedMap.set(card.number, []);
  }
  scrapedMap.get(card.number).push(card);
});

let updated = 0;
let notFound = 0;

set.cards.forEach((card, idx) => {
  // Try to find matching scraped card
  let found = false;
  
  // Try exact match first
  const exactKey = `${card.number}-${card.name}`;
  const exactMatch = scrapedMap.get(exactKey);
  
  if (exactMatch && exactMatch.image_url) {
    // Update all variants with this image
    card.variants.forEach(variant => {
      variant.image = exactMatch.image_url;
    });
    updated++;
    found = true;
  } else {
    // Try to find by number and match variant type
    const numberMatches = scrapedMap.get(card.number);
    if (Array.isArray(numberMatches)) {
      card.variants.forEach(variant => {
        // Try to find matching variant
        const variantMatch = numberMatches.find(sc => {
          const scName = sc.name.toLowerCase();
          const variantType = variant.type.toLowerCase();
          
          // Match variant types
          if (variantType === 'ball' && scName.includes('[ball]')) return true;
          if (variantType === 'energy' && scName.includes('[energy]')) return true;
          if (variantType === 'regular' && !scName.includes('[ball]') && !scName.includes('[energy]')) return true;
          if (variantType === 'secret rare' && sc.rarity?.toLowerCase().includes('secret')) return true;
          
          return false;
        });
        
        if (variantMatch && variantMatch.image_url) {
          variant.image = variantMatch.image_url;
          if (!found) {
            found = true;
            updated++;
          }
        }
      });
    }
  }
  
  if (!found) {
    notFound++;
    if (notFound <= 5) {
      console.log(`Not found: ${card.name} (#${card.number})`);
    }
  }
});

console.log(`\n=== Summary ===`);
console.log(`✓ Updated: ${updated} cards`);
console.log(`✗ Not found: ${notFound} cards`);

if (updated > 0) {
  // Save updated data
  fs.writeFileSync('data/sets.json', JSON.stringify(setsData, null, 2));
  console.log(`\n✓ Saved updated data to data/sets.json`);
  console.log(`\nCards now use PriceCharting image URLs!`);
  
  // Create backup
  const backupName = `data/sets_backup_${Date.now()}.json`;
  fs.writeFileSync(backupName, JSON.stringify(setsData, null, 2));
  console.log(`✓ Backup saved to ${backupName}`);
} else {
  console.log(`\n⚠ No cards were updated.`);
}

