#!/usr/bin/env node
/**
 * Restore real Energy and Ball variants from scraped data
 * Only keeps variants that actually exist in the scraped data
 */
const fs = require('fs');

if (!fs.existsSync('scraped_cards_raw.json')) {
  console.error('Error: scraped_cards_raw.json not found!');
  process.exit(1);
}

const scrapedData = JSON.parse(fs.readFileSync('scraped_cards_raw.json', 'utf8'));
const setsData = JSON.parse(fs.readFileSync('data/sets.json', 'utf8'));
const set = setsData[0];

console.log(`Restoring real Energy and Ball variants...\n`);

// Create a map of what variants actually exist in scraped data
const variantMap = new Map();

scrapedData.forEach(scrapedCard => {
  const cardNumber = scrapedCard.number;
  const cardName = scrapedCard.name;
  
  // Determine variant type
  let variantType = 'Regular';
  if (cardName.includes('[Ball]')) {
    variantType = 'Ball';
  } else if (cardName.includes('[Energy]')) {
    variantType = 'Energy';
  } else if (cardName.includes('[Reverse Holo]') || scrapedCard.url.includes('reverse-holo')) {
    variantType = 'Reverse Holo';
  } else if (scrapedCard.rarity?.toLowerCase().includes('secret')) {
    variantType = 'Secret Rare';
  } else if (scrapedCard.rarity?.toLowerCase().includes('rainbow')) {
    variantType = 'Rainbow Rare';
  } else if (scrapedCard.rarity?.toLowerCase().includes('holo') && !scrapedCard.rarity?.toLowerCase().includes('reverse')) {
    variantType = 'Holo';
  }
  
  // Store variant info
  const key = `${cardNumber}-${variantType}`;
  if (!variantMap.has(key)) {
    variantMap.set(key, []);
  }
  variantMap.get(key).push({
    type: variantType,
    image: scrapedCard.image_url || scrapedCard.image,
    name: cardName
  });
});

let restored = 0;
let added = 0;

set.cards.forEach(card => {
  const cardNumber = card.number;
  
  // Check for Ball variant
  const ballKey = `${cardNumber}-Ball`;
  if (variantMap.has(ballKey)) {
    const ballVariants = variantMap.get(ballKey);
    const hasBall = card.variants.some(v => v.type === 'Ball');
    
    if (!hasBall && ballVariants.length > 0) {
      // Update image URL to high-res
      let imageUrl = ballVariants[0].image;
      if (imageUrl && imageUrl.includes('storage.googleapis.com/images.pricecharting.com')) {
        imageUrl = imageUrl.replace(/\/60\.jpg$/, '/1600.jpg');
      }
      
      card.variants.push({
        type: 'Ball',
        image: imageUrl
      });
      restored++;
      added++;
    }
  }
  
  // Check for Energy variant
  const energyKey = `${cardNumber}-Energy`;
  if (variantMap.has(energyKey)) {
    const energyVariants = variantMap.get(energyKey);
    const hasEnergy = card.variants.some(v => v.type === 'Energy');
    
    if (!hasEnergy && energyVariants.length > 0) {
      // Update image URL to high-res
      let imageUrl = energyVariants[0].image;
      if (imageUrl && imageUrl.includes('storage.googleapis.com/images.pricecharting.com')) {
        imageUrl = imageUrl.replace(/\/60\.jpg$/, '/1600.jpg');
      }
      
      card.variants.push({
        type: 'Energy',
        image: imageUrl
      });
      restored++;
      added++;
    }
  }
});

console.log(`✓ Restored ${restored} variants (${added} new additions)`);
console.log(`  - Ball variants: ${set.cards.filter(c => c.variants.some(v => v.type === 'Ball')).length} cards`);
console.log(`  - Energy variants: ${set.cards.filter(c => c.variants.some(v => v.type === 'Energy')).length} cards`);

// Save updated data
fs.writeFileSync('data/sets.json', JSON.stringify(setsData, null, 2));
console.log(`\n✓ Saved to data/sets.json`);

// Create backup
const backupName = `data/sets_backup_${Date.now()}.json`;
fs.writeFileSync(backupName, JSON.stringify(setsData, null, 2));
console.log(`✓ Backup saved to ${backupName}`);

