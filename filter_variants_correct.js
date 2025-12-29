#!/usr/bin/env node
/**
 * Filter variants based on PokéBeach information:
 * - Only non-ex Pokemon have Energy and Ball reverse holos
 * - Trainers, Energy, and Pokemon ex do NOT have reverse holos
 * - Keep Energy/Ball variants only for regular Pokemon
 */
const fs = require('fs');

const setsData = JSON.parse(fs.readFileSync('data/sets.json', 'utf8'));
const set = setsData[0];

console.log(`Filtering variants based on PokéBeach rules...\n`);
console.log(`Rules:`);
console.log(`  - Only non-ex Pokemon have Energy/Ball reverse holos`);
console.log(`  - Pokemon ex, Trainers, and Energy cards do NOT have reverse holos\n`);

let removed = 0;
let cardsModified = 0;

set.cards.forEach(card => {
  const originalCount = card.variants.length;
  
  // Check if this card should have Energy/Ball variants
  // Ex cards have " ex" in the name
  const isEx = card.name.toLowerCase().includes(' ex') || 
               card.name.toLowerCase().endsWith(' ex') ||
               card.name.toLowerCase().includes('mega ') && card.name.toLowerCase().includes(' ex');
  
  // Trainer CARDS (not trainer Pokemon) - items, supporters, stadiums
  // Trainer Pokemon like "Ethan's Pinsir" ARE regular Pokemon and should keep variants
  const trainerCardNames = [
    // Items
    "Ultra Ball", "Counter Catcher", "Glass Trumpet", "Canari", "Black Belt", 
    "Surfer", "N's PP Up", "Team Rocket's Transceiver", "Iris's Fighting Spirit",
    "Energy Recycler", "Ignition Energy", "Prism Energy", "Team Rocket's Energy",
    "Fighting Gong", "Premium Power Pro", "Hop's Bag", "Bug Catcher Set", "Mega Signal",
    "Light Ball", "Air Balloon", "Hop's Choice Band", "Acerola's Mischief",
    "Ethan's Adventure", "Lillie's Determination", "Enhanced Hammer", "Sacred Ash",
    "Tool Scrapper", "Tera Orb", "Buddy-Buddy Poffin", "Night Stretcher", "Counter Gain",
    "Cynthia's Power Weight", "Thick Scales", "Brave Bangle",
    // Supporters
    "Hilda", "Anthea & Concordia", "Team Rocket's Ariana",
    "Team Rocket's Archer", "Team Rocket's Giovanni", "Team Rocket's Petrel",
    "Team Rocket's Proton",
    // Stadiums
    "N's Castle", "Team Rocket's Watchtower", "Team Rocket's Factory",
      "Forest of Vitality", "Gravity Mountain", "Area Zero Underdepths",
      "Levincia", "Postwick", "Mystery Garden", "Mine at Night"
  ];
  
  // Items/Tools - ALL Ball cards are Trainer cards (Love Ball, Friend Ball, Quick Ball, Dusk Ball, Ultra Ball, etc.)
  // They don't have reverse holos
  const isTrainerItem = card.name.includes("Ball") && !card.name.includes("'s") && 
                        !card.name.includes("Team Rocket's") && !card.name.includes("Hop's") &&
                        !card.name.includes("Cynthia's") && !card.name.includes("N's") &&
                        !card.name.includes("Ethan's") && !card.name.includes("Iono's");
  
  // Check for trainer card patterns
  // ALL Trainer cards (Items, Supporters, Stadiums) don't have reverse holos
  const isTrainer = trainerCardNames.includes(card.name) || isTrainerItem ||
                    // Items
                    (card.name.includes("Training") && !card.name.includes("'s")) ||
                    (card.name.includes("Catcher") && !card.name.includes("'s")) ||
                    (card.name.includes("Tower") && !card.name.includes("'s")) ||
                    (card.name.includes("Trumpet") && !card.name.includes("'s")) ||
                    (card.name.includes("Gong") && !card.name.includes("'s")) ||
                    (card.name.includes("Signal") && !card.name.includes("'s")) ||
                    (card.name.includes("Set") && !card.name.includes("'s") && (card.name.includes("Catcher") || card.name.includes("Bug"))) ||
                    (card.name.includes("Bag") && !card.name.includes("'s")) ||
                    (card.name.includes("Power") && !card.name.includes("'s") && card.name.includes("Premium")) ||
                    (card.name.includes("Up") && card.name.includes("PP")) ||
                    (card.name.includes("Transceiver") && !card.name.includes("'s")) ||
                    (card.name.includes("Fighting Spirit") && !card.name.includes("'s")) ||
                    (card.name.includes("Adventure") && !card.name.includes("'s")) ||
                    (card.name.includes("Determination") && !card.name.includes("'s")) ||
                    (card.name.includes("Mischief") && !card.name.includes("'s")) ||
                    (card.name.includes("Hammer") && !card.name.includes("'s")) ||
                    (card.name.includes("Ash") && !card.name.includes("'s") && card.name.includes("Sacred")) ||
                    (card.name.includes("Scrapper") && !card.name.includes("'s")) ||
                    (card.name.includes("Orb") && !card.name.includes("'s")) ||
                    (card.name.includes("Poffin") && !card.name.includes("'s")) ||
                    (card.name.includes("Stretcher") && !card.name.includes("'s")) ||
                    (card.name.includes("Gain") && !card.name.includes("'s")) ||
                    (card.name.includes("Scales") && !card.name.includes("'s")) ||
                    (card.name.includes("Bangle") && !card.name.includes("'s")) ||
                    // Supporters (names without 's are typically supporters)
                    (card.name.length > 0 && !card.name.includes("'s") && !card.name.includes("Team Rocket's") &&
                     !card.name.includes("Hop's") && !card.name.includes("Cynthia's") && 
                     !card.name.includes("N's") && !card.name.includes("Ethan's") && 
                     !card.name.includes("Iono's") && 
                     (card.name === "Hilda" || card.name.includes(" & ") || card.name.includes("Anthea"))) ||
                    // Stadiums
                    (card.name.includes("Castle") && !card.name.includes("'s")) ||
                    (card.name.includes("Watchtower") && !card.name.includes("'s")) ||
                    (card.name.includes("Factory") && !card.name.includes("'s")) ||
                    (card.name.includes("Vitality") && !card.name.includes("'s")) ||
                    (card.name.includes("Mountain") && !card.name.includes("'s")) ||
                    (card.name.includes("Underdepths") && !card.name.includes("'s")) ||
                    (card.name.includes("Levincia") && !card.name.includes("'s")) ||
                    (card.name.includes("Postwick") && !card.name.includes("'s")) ||
                    (card.name.includes("Garden") && !card.name.includes("'s")) ||
                    (card.name.includes("Mine") && !card.name.includes("'s")) ||
                    (card.name.includes("Energy") && !card.name.includes("'s") && 
                     !card.name.includes("Team Rocket's") && !card.name.includes("Hop's") &&
                     !card.name.includes("Cynthia's") && !card.name.includes("N's") &&
                     !card.name.includes("Ethan's") && !card.name.includes("Iono's"));
  
  // Energy cards - ALL Energy cards are Trainer cards and don't have reverse holos
  const isEnergy = card.name.toLowerCase().includes('energy') && 
                   !card.name.toLowerCase().includes('reverse') &&
                   !card.name.includes("'s") && 
                   !card.name.includes("Team Rocket's");
  
  // Remove Energy, Ball, and Reverse Holo variants if card is ex, Trainer, or Energy
  // According to PokéBeach: "Trainers, Energy, and Pokemon ex do not have reverse holos"
  if (isEx || isTrainer || isEnergy) {
    const beforeCount = card.variants.length;
    card.variants = card.variants.filter(variant => {
      if (variant.type === 'Energy' || variant.type === 'Ball' || variant.type === 'Reverse Holo') {
        removed++;
        return false;
      }
      return true;
    });
    
    if (card.variants.length < beforeCount) {
      cardsModified++;
      console.log(`  Removed from: ${card.name} (${isEx ? 'ex' : isTrainer ? 'Trainer' : 'Energy'})`);
    }
  }
});

console.log(`✓ Removed ${removed} Energy/Ball variants from ex/Trainer/Energy cards`);
console.log(`✓ Modified ${cardsModified} cards`);

// Count remaining Energy/Ball variants (should only be on regular Pokemon)
const cardsWithBall = set.cards.filter(c => c.variants.some(v => v.type === 'Ball')).length;
const cardsWithEnergy = set.cards.filter(c => c.variants.some(v => v.type === 'Energy')).length;

console.log(`\nRemaining variants:`);
console.log(`  - Cards with Ball variants: ${cardsWithBall} (should be regular Pokemon only)`);
console.log(`  - Cards with Energy variants: ${cardsWithEnergy} (should be regular Pokemon only)`);

// Save updated data
fs.writeFileSync('data/sets.json', JSON.stringify(setsData, null, 2));
console.log(`\n✓ Saved to data/sets.json`);

// Create backup
const backupName = `data/sets_backup_${Date.now()}.json`;
fs.writeFileSync(backupName, JSON.stringify(setsData, null, 2));
console.log(`✓ Backup saved to ${backupName}`);

