#!/usr/bin/env node
/**
 * Scrape all Pokémon cards using Puppeteer to handle dynamic loading
 */
const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeAllCards() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Navigating to PriceCharting...');
  await page.goto('https://www.pricecharting.com/console/pokemon-japanese-mega-dream-ex', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });
  
  // Wait for table to load
  await page.waitForSelector('table tbody tr', { timeout: 10000 });
  
  // Check if there's a "Show All" or pagination option
  try {
    const showAllButton = await page.$('a:has-text("Show All"), button:has-text("Show All"), a[href*="all"]');
    if (showAllButton) {
      console.log('Clicking "Show All" button...');
      await showAllButton.click();
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  } catch (e) {
    console.log('No "Show All" button found, trying scrolling...');
  }
  
  console.log('Scrolling to load all cards...');
  let previousCount = 0;
  let stableCount = 0;
  
  // Scroll to bottom multiple times to trigger lazy loading
  for (let i = 0; i < 50; i++) {
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Count current rows
    const currentCount = await page.evaluate(() => {
      return document.querySelectorAll('table tbody tr').length;
    });
    
    console.log(`Scroll ${i + 1}: Found ${currentCount} rows`);
    
    if (currentCount === previousCount) {
      stableCount++;
      if (stableCount >= 3) {
        console.log(`Row count stable at ${currentCount} after ${i + 1} scrolls`);
        break;
      }
    } else {
      stableCount = 0;
    }
    
    previousCount = currentCount;
    
    // Check if we've reached the bottom
    const isAtBottom = await page.evaluate(() => {
      return window.innerHeight + window.scrollY >= document.body.scrollHeight - 100;
    });
    
    if (isAtBottom && stableCount >= 2) {
      console.log(`Reached bottom and count is stable`);
      break;
    }
  }
  
  // Wait a bit more for any final loading
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('Extracting card data...');
  const cards = await page.evaluate(() => {
    const results = [];
    const seen = new Set();
    
    const rows = document.querySelectorAll('table tbody tr');
    console.log(`Found ${rows.length} rows`);
    
    rows.forEach((row) => {
      try {
        const link = row.querySelector('a[href*="/game/"]');
        if (!link) return;
        
        const href = link.getAttribute('href');
        if (!href) return;
        
        // Extract card number
        const numberMatch = href.match(/-(\d+)$/);
        if (!numberMatch) return;
        
        const cardNumber = numberMatch[1].padStart(3, '0');
        
        // Get card name
        const nameCell = row.querySelector('td:nth-of-type(2)');
        let cardName = nameCell ? nameCell.textContent.trim() : link.textContent.trim();
        cardName = cardName.replace(/\s+/g, ' ').trim();
        
        // Remove "#XXX" suffix if present
        cardName = cardName.replace(/\s*#\d+\s*$/, '').trim();
        
        const key = `${cardNumber}-${cardName}`;
        if (seen.has(key)) return;
        seen.add(key);
        
        // Get image
        const img = row.querySelector('img');
        let imageUrl = null;
        if (img) {
          imageUrl = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
        }
        
        // Determine rarity
        let rarity = "Common";
        const rowText = row.textContent.toLowerCase();
        if (rowText.includes('ultra rare') || cardName.toLowerCase().includes(' ex')) {
          rarity = "Ultra Rare";
        } else if (rowText.includes('secret rare')) {
          rarity = "Secret Rare";
        } else if (rowText.includes('rare') && !rowText.includes('ultra') && !rowText.includes('secret')) {
          rarity = "Rare";
        } else if (rowText.includes('uncommon')) {
          rarity = "Uncommon";
        }
        
        // Check for variants
        const isVariant = href.includes('-ball-') || href.includes('-energy-') || 
                         href.includes('reverse-holo') || href.includes("'s-");
        
        results.push({
          number: cardNumber,
          name: cardName,
          rarity: rarity,
          image_url: imageUrl,
          url: 'https://www.pricecharting.com' + href,
          is_variant: isVariant
        });
      } catch (e) {
        console.error('Error processing row:', e);
      }
    });
    
    // Sort by number
    results.sort((a, b) => parseInt(a.number) - parseInt(b.number));
    
    return results;
  });
  
  console.log(`\nExtracted ${cards.length} unique cards`);
  
  await browser.close();
  
  // Save raw data
  fs.writeFileSync('scraped_cards_raw.json', JSON.stringify(cards, null, 2));
  console.log('Saved to scraped_cards_raw.json');
  
  // Show sample
  console.log('\nFirst 10 cards:');
  cards.slice(0, 10).forEach(card => {
    console.log(`  #${card.number} ${card.name} (${card.rarity})`);
  });
  
  return cards;
}

scrapeAllCards().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

