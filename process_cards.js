#!/usr/bin/env node
/**
 * Process scraped cards and create sets.json format
 */
const fs = require('fs');

// Read scraped cards
const scrapedCards = JSON.parse(fs.readFileSync('scraped_cards_raw.json', 'utf8'));

console.log(`Processing ${scrapedCards.length} cards...`);

// Group cards by number and create variants
const cardsByNumber = {};

scrapedCards.forEach(card => {
  const num = card.number;
  
  // Clean card name - remove [#XXX] suffix and extra whitespace
  let cleanName = card.name.replace(/\s*\[.*?\]\s*/g, '').replace(/\s*#\d+\s*$/, '').trim();
  
  // Extract base name (without variant indicators)
  const baseName = cleanName.replace(/\s*\[Ball\]\s*/gi, '')
                            .replace(/\s*\[Energy\]\s*/gi, '')
                            .replace(/\s*\[Reverse Holo\]\s*/gi, '')
                            .trim();
  
  // Group by number and base name
  const key = `${num}-${baseName}`;
  
  if (!cardsByNumber[key]) {
    cardsByNumber[key] = {
      number: num,
      name: baseName,
      rarity: card.rarity,
      variants: []
    };
  }
  
  // Determine variant type
  let variantType = "Regular";
  if (card.name.includes('[Ball]')) {
    variantType = "Ball";
  } else if (card.name.includes('[Energy]')) {
    variantType = "Energy";
  } else if (card.name.includes('[Reverse Holo]') || card.url.includes('reverse-holo')) {
    variantType = "Reverse Holo";
  } else if (card.rarity === "Secret Rare") {
    variantType = "Secret Rare";
  } else if (card.rarity === "Ultra Rare" && card.name.toLowerCase().includes('ex')) {
    // For EX cards, check if there might be Full Art variants later
    variantType = "Regular";
  } else if (!card.is_variant) {
    variantType = "Regular";
  }
  
  // Use the actual image URL if available, otherwise create a placeholder path
  const imagePath = card.image_url || 
    `images/cards/${baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${num}-${variantType.toLowerCase().replace(/\s+/g, '-')}.jpg`;
  
  // Check if this variant already exists
  const variantExists = cardsByNumber[key].variants.some(v => v.type === variantType);
  if (!variantExists) {
    cardsByNumber[key].variants.push({
      type: variantType,
      image: imagePath
    });
  }
});

// Convert to array and sort
const processedCards = Object.values(cardsByNumber).sort((a, b) => parseInt(a.number) - parseInt(b.number));

// Create the sets.json structure
const setsData = [
  {
    id: "mega-dream-ex",
    name: "MEGA Dream EX",
    releaseDate: "2025-11-01",
    cards: processedCards
  }
];

// Write to sets.json
fs.writeFileSync('data/sets.json', JSON.stringify(setsData, null, 2));

console.log(`\n✓ Processed ${processedCards.length} unique cards`);
console.log(`✓ Created data/sets.json`);
console.log(`\nSample cards:`);
processedCards.slice(0, 5).forEach(card => {
  console.log(`  #${card.number} ${card.name} - ${card.variants.length} variant(s)`);
});

