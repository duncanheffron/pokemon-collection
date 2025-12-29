#!/usr/bin/env node
/**
 * Apply manual variant overrides
 * Use this to correct variants based on actual card information
 */
const fs = require('fs');

if (!fs.existsSync('manual_variant_overrides.json')) {
  console.log('No manual_variant_overrides.json found. Creating template...');
  fs.writeFileSync('manual_variant_overrides.json', JSON.stringify({
    "overrides": {
      "001": {
        "name": "Ethan's Pinsir",
        "hasBall": true,
        "hasEnergy": false,
        "note": "Only has Ball variant, not Energy"
      }
    },
    "instructions": "Add card numbers and specify which variants they actually have. Set hasBall/hasEnergy to true/false."
  }, null, 2));
  console.log('Created manual_variant_overrides.json - please edit it with correct variant information');
  process.exit(0);
}

const overrides = JSON.parse(fs.readFileSync('manual_variant_overrides.json', 'utf8'));
const setsData = JSON.parse(fs.readFileSync('data/sets.json', 'utf8'));
const set = setsData[0];

console.log(`Applying manual variant overrides...\n`);

let removed = 0;
let cardsModified = 0;

set.cards.forEach(card => {
  const cardNumber = card.number;
  const override = overrides.overrides[cardNumber];
  
  if (!override) return;
  
  const beforeCount = card.variants.length;
  const beforeBall = card.variants.some(v => v.type === 'Ball');
  const beforeEnergy = card.variants.some(v => v.type === 'Energy');
  
  // Remove Ball if override says it doesn't exist
  if (beforeBall && override.hasBall === false) {
    card.variants = card.variants.filter(v => v.type !== 'Ball');
    removed++;
    console.log(`  ${card.name} (#${cardNumber}): Removed Ball (override)`);
  }
  
  // Remove Energy if override says it doesn't exist
  if (beforeEnergy && override.hasEnergy === false) {
    card.variants = card.variants.filter(v => v.type !== 'Energy');
    removed++;
    console.log(`  ${card.name} (#${cardNumber}): Removed Energy (override)`);
  }
  
  // Add Ball if override says it exists but we don't have it
  if (!beforeBall && override.hasBall === true) {
    // Try to find it in scraped data
    const scrapedData = JSON.parse(fs.readFileSync('scraped_cards_raw.json', 'utf8'));
    const ballCard = scrapedData.find(c => c.number === cardNumber && c.name.includes('[Ball]'));
    if (ballCard) {
      let imageUrl = ballCard.image_url || ballCard.image;
      if (imageUrl && imageUrl.includes('storage.googleapis.com/images.pricecharting.com')) {
        imageUrl = imageUrl.replace(/\/60\.jpg$/, '/1600.jpg');
      }
      card.variants.push({
        type: 'Ball',
        image: imageUrl || `images/cards/${card.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${cardNumber}-ball.jpg`
      });
      console.log(`  ${card.name} (#${cardNumber}): Added Ball (override)`);
    }
  }
  
  // Add Energy if override says it exists but we don't have it
  if (!beforeEnergy && override.hasEnergy === true) {
    // Try to find it in scraped data
    const scrapedData = JSON.parse(fs.readFileSync('scraped_cards_raw.json', 'utf8'));
    const energyCard = scrapedData.find(c => c.number === cardNumber && c.name.includes('[Energy]'));
    if (energyCard) {
      let imageUrl = energyCard.image_url || energyCard.image;
      if (imageUrl && imageUrl.includes('storage.googleapis.com/images.pricecharting.com')) {
        imageUrl = imageUrl.replace(/\/60\.jpg$/, '/1600.jpg');
      }
      card.variants.push({
        type: 'Energy',
        image: imageUrl || `images/cards/${card.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${cardNumber}-energy.jpg`
      });
      console.log(`  ${card.name} (#${cardNumber}): Added Energy (override)`);
    }
  }
  
  if (card.variants.length !== beforeCount) {
    cardsModified++;
  }
});

console.log(`\n✓ Removed ${removed} variants based on overrides`);
console.log(`✓ Modified ${cardsModified} cards`);

// Save updated data
fs.writeFileSync('data/sets.json', JSON.stringify(setsData, null, 2));
console.log(`\n✓ Saved to data/sets.json`);

// Create backup
const backupName = `data/sets_backup_${Date.now()}.json`;
fs.writeFileSync(backupName, JSON.stringify(setsData, null, 2));
console.log(`✓ Backup saved to ${backupName}`);

