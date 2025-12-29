#!/usr/bin/env node
/**
 * Scrape Greninja-related cards from PriceCharting
 * Searches for: Greninja, Froakie, Frogadier
 */
const puppeteer = require('puppeteer');
const fs = require('fs');

const searchQueries = [
  { name: 'Greninja', url: 'https://www.pricecharting.com/search-products?type=prices&q=Greninja&go=Go' },
  { name: 'Froakie', url: 'https://www.pricecharting.com/search-products?q=Froakie&type=prices' },
  { name: 'Frogadier', url: 'https://www.pricecharting.com/search-products?q=Frogadier&type=prices' }
];

async function scrapeCards(query) {
  console.log(`\nScraping ${query.name} cards...`);
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto(query.url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Wait for results to load
    await page.waitForSelector('table tbody tr', { timeout: 10000 }).catch(() => {
      console.log(`  No results found for ${query.name}`);
    });
    
    // Scroll to load all results
    let previousHeight = 0;
    let scrollAttempts = 0;
    const maxScrolls = 10;
    
    while (scrollAttempts < maxScrolls) {
      previousHeight = await page.evaluate(() => document.body.scrollHeight);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(resolve => setTimeout(resolve, 2000));
      const newHeight = await page.evaluate(() => document.body.scrollHeight);
      
      if (newHeight === previousHeight) break;
      scrollAttempts++;
    }
    
    // Extract card data
    const searchTerm = query.name;
    const cards = await page.evaluate((term) => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      return rows.map(row => {
        try {
          const img = row.querySelector('img');
          const link = row.querySelector('a[href*="/game/"]');
          const titleCell = row.querySelector('td:nth-child(2)');
          const setCell = row.querySelector('td:nth-child(3)');
          
          if (!link || !titleCell) return null;
          
          const title = titleCell.textContent.trim();
          const set = setCell ? setCell.textContent.trim() : '';
          const imageUrl = img ? img.src : '';
          const cardUrl = link.href;
          
          // Extract card number from title - look for patterns like #123, #XY133, etc.
          let number = '';
          // Try to find card number - prefer format like #214, #123, etc.
          const numberMatches = title.matchAll(/#([A-Z]*\d+)/g);
          const numbers = Array.from(numberMatches).map(m => m[1]);
          if (numbers.length > 0) {
            // Use the last number found (usually the card number, not set codes)
            const lastNum = numbers[numbers.length - 1];
            // Extract just digits if it has letters
            const digits = lastNum.replace(/\D/g, '');
            if (digits) {
              number = digits.padStart(3, '0');
            }
          }
          
          // Clean card name - get just the card name part (before set name)
          // The title often has format: "Card Name #123\n\n\nSet Name"
          let name = title
            .split('\n')[0] // Get first line (card name)
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .replace(/\s*\[.*?\]\s*/g, '') // Remove [variant] indicators
            .replace(/\s*#([A-Z]*\d+)\s*/g, ' ') // Remove all #number patterns
            .replace(/Pokemon\s+\w+.*$/i, '') // Remove any trailing "Pokemon SetName"
            .replace(/\s+/g, ' ') // Clean up extra spaces
            .trim();
          
          // If name still contains set info, try to extract from link text
          if (name.includes('Pokemon') && link.textContent) {
            const linkText = link.textContent.trim();
            if (linkText && !linkText.includes('\n')) {
              name = linkText
                .replace(/\s*\[.*?\]\s*/g, '')
                .replace(/\s*#([A-Z]*\d+)\s*/g, ' ')
                .trim();
            }
          }
          
          // Final cleanup
          name = name
            .replace(/\s*\(#\d+\)\s*/g, '') // Remove (#000) patterns
            .replace(/\s+/g, ' ')
            .trim();
          
          return {
            name,
            number: number || '000',
            set,
            image_url: imageUrl,
            url: cardUrl,
            search_term: term
          };
        } catch (e) {
          return null;
        }
      }).filter(card => card && card.name);
    }, searchTerm);
    
    console.log(`  Found ${cards.length} cards for ${query.name}`);
    return cards;
    
  } catch (error) {
    console.error(`  Error scraping ${query.name}:`, error.message);
    return [];
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('Starting Greninja Collection scrape...\n');
  
  let allCards = [];
  
  for (const query of searchQueries) {
    const cards = await scrapeCards(query);
    allCards = allCards.concat(cards);
    // Small delay between searches
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Remove duplicates based on URL
  const uniqueCards = [];
  const seenUrls = new Set();
  
  allCards.forEach(card => {
    if (!seenUrls.has(card.url)) {
      seenUrls.add(card.url);
      uniqueCards.push(card);
    }
  });
  
  console.log(`\n✓ Total unique cards found: ${uniqueCards.length}`);
  
  // Save raw data
  fs.writeFileSync('greninja_collection_raw.json', JSON.stringify(uniqueCards, null, 2));
  console.log('✓ Saved raw data to greninja_collection_raw.json');
  
  // Process into set format
  processGreninjaCollection(uniqueCards);
}

function processGreninjaCollection(cards) {
  console.log('\nProcessing cards into set format...');
  
  // Group by card name and number, but include set in key to preserve cards from different sets
  const cardMap = new Map();
  
  cards.forEach(card => {
    // Include set name in key to keep cards from different sets separate
    // But still group same card from same set together
    const setName = card.set || 'Unknown';
    const key = `${card.number}-${card.name}-${setName}`;
    
    if (!cardMap.has(key)) {
      cardMap.set(key, {
        number: card.number,
        name: card.name,
        rarity: 'Common', // Default, can be updated later
        variants: []
      });
    }
    
    const cardData = cardMap.get(key);
    
    // Determine variant type from card name
    let variantType = 'Regular';
    const originalTitle = card.name;
    
    if (originalTitle.includes('[Ball]')) {
      variantType = 'Ball';
    } else if (originalTitle.includes('[Energy]')) {
      variantType = 'Energy';
    } else if (originalTitle.includes('[Reverse Holo]') || originalTitle.includes('Reverse Holo')) {
      variantType = 'Reverse Holo';
    } else if (originalTitle.includes('[Holo]') || originalTitle.includes('Holo')) {
      variantType = 'Holo';
    } else if (originalTitle.includes('Secret Rare') || originalTitle.includes('Secret')) {
      variantType = 'Secret Rare';
    } else if (originalTitle.includes('Full Art')) {
      variantType = 'Full Art';
    } else if (originalTitle.includes('Rainbow')) {
      variantType = 'Rainbow Rare';
    } else if (originalTitle.includes('Alternate Art')) {
      variantType = 'Alternate Art';
    } else if (originalTitle.includes('Radiant')) {
      variantType = 'Radiant';
    } else if (originalTitle.includes('V-Union')) {
      variantType = 'V-Union';
    }
    
    // Update image URL to high-res if it's PriceCharting
    let imageUrl = card.image_url;
    if (imageUrl && imageUrl.includes('storage.googleapis.com/images.pricecharting.com')) {
      imageUrl = imageUrl.replace(/\/60\.jpg$/, '/1600.jpg');
    }
    
    // Use URL as unique identifier to avoid duplicate variants
    const urlKey = card.url.split('/').pop();
    
    // Check if this exact variant (from this URL) already exists
    const variantExists = cardData.variants.some(v => v.urlKey === urlKey);
    if (!variantExists) {
      cardData.variants.push({
        type: variantType,
        image: imageUrl || `images/cards/${card.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${card.number}-${variantType.toLowerCase().replace(/\s+/g, '-')}.jpg`,
        urlKey: urlKey // Store URL key for deduplication
      });
    }
  });
  
  const processedCards = Array.from(cardMap.values())
    .sort((a, b) => {
      // Sort by number if available, otherwise by name
      if (a.number !== '000' && b.number !== '000') {
        return parseInt(a.number) - parseInt(b.number);
      }
      return a.name.localeCompare(b.name);
    });
  
  // Create the set
  const greninjaSet = {
    id: 'greninja-collection',
    name: 'Greninja Collection',
    releaseDate: new Date().toISOString().split('T')[0],
    cards: processedCards
  };
  
  // Load existing sets
  let allSets = [];
  if (fs.existsSync('data/sets.json')) {
    allSets = JSON.parse(fs.readFileSync('data/sets.json', 'utf8'));
  }
  
  // Remove existing Greninja Collection if present
  allSets = allSets.filter(s => s.id !== 'greninja-collection');
  
  // Add new set
  allSets.push(greninjaSet);
  
  // Save
  fs.writeFileSync('data/sets.json', JSON.stringify(allSets, null, 2));
  console.log(`✓ Created "Greninja Collection" set with ${processedCards.length} unique cards`);
  console.log(`✓ Total variants: ${processedCards.reduce((sum, c) => sum + c.variants.length, 0)}`);
  console.log('✓ Saved to data/sets.json');
}

main().catch(console.error);

