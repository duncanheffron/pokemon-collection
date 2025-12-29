#!/usr/bin/env node
/**
 * Scrape PokéBeach for high-quality card images
 * Looks for images matching pattern: https://www.pokebeach.com/news/2025/11/[CARD-NUMBER]-[CARD-NAME]-[VARIANT]-Mega-Dream-ex.jpg
 */
const puppeteer = require('puppeteer');
const fs = require('fs');

const setsData = JSON.parse(fs.readFileSync('data/sets.json', 'utf8'));
const set = setsData[0];

console.log(`Scraping PokéBeach for better images...\n`);

async function scrapePokebeachImages() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Navigate to the PokéBeach article
  const url = 'https://www.pokebeach.com/2025/11/mega-dream-ex-secret-rares-revealed';
  
  console.log('Loading PokéBeach page...');
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  
  // Wait for images to load
  await new Promise(r => setTimeout(r, 3000));
  
  // Extract all image URLs from the page
  const images = await page.evaluate(() => {
    const imgElements = document.querySelectorAll('img');
    const imageUrls = [];
    
    imgElements.forEach(img => {
      const src = img.src || img.getAttribute('data-src');
      if (src && src.includes('pokebeach.com') && src.includes('Mega-Dream-ex')) {
        imageUrls.push(src);
      }
    });
    
    return imageUrls;
  });
  
  console.log(`Found ${images.length} PokéBeach images\n`);
  
  // Match images to cards
  let updated = 0;
  
  set.cards.forEach(card => {
    card.variants.forEach(variant => {
      // Try to find matching image
      const cardNameClean = card.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      const variantClean = variant.type
        .toLowerCase()
        .replace(/\s+/g, '-');
      
      // Look for images matching card number and name
      const matchingImage = images.find(img => {
        const imgLower = img.toLowerCase();
        return imgLower.includes(card.number) && 
               (imgLower.includes(cardNameClean) || 
                imgLower.includes(card.name.toLowerCase().split(' ')[0]));
      });
      
      if (matchingImage) {
        const oldImage = variant.image;
        variant.image = matchingImage;
        updated++;
        console.log(`✓ Updated: #${card.number} ${card.name} (${variant.type})`);
      }
    });
  });
  
  await browser.close();
  
  console.log(`\n✓ Updated ${updated} card images from PokéBeach`);
  
  if (updated > 0) {
    fs.writeFileSync('data/sets.json', JSON.stringify(setsData, null, 2));
    console.log('✓ Saved to data/sets.json');
  }
  
  return updated;
}

scrapePokebeachImages().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

