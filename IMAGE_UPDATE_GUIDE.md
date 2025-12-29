# Image Update Guide

## Current Status ✅

**All cards now have PriceCharting image URLs!**

The images are hosted on Google Cloud Storage and should load directly in your website.

## Image Sources

### 1. PriceCharting Images (Current) ✅
- **Status**: Active - All 250 cards updated
- **Quality**: Good (60px thumbnails, but can be scaled)
- **URL Format**: `https://storage.googleapis.com/images.pricecharting.com/...`
- **Advantage**: Available now, works immediately

### 2. Pokémon TCG API Images (Future) 🔄
- **Status**: Not available yet (set not in API)
- **Quality**: Excellent (high-resolution images)
- **URL Format**: `https://images.pokemontcg.io/...`
- **Advantage**: Higher quality, official source

## Scripts Available

### `restore_pricecharting_images.js`
Restores PriceCharting image URLs from scraped data.
```bash
node restore_pricecharting_images.js
```
**Use when**: You want to use the PriceCharting images (already done)

### `update_images_smart.js`
Updates images from Pokémon TCG API when available.
```bash
node update_images_smart.js
```
**Use when**: 
- The MEGA Dream EX set is added to the API
- You want to try finding cards from other sets

### `update_images_from_api.js`
Original API updater (exact matches only).
```bash
node update_images_from_api.js
```
**Use when**: Set is confirmed in API

## When to Update to API Images

Once the MEGA Dream EX set is added to the API:

1. **Check if set is available:**
   ```bash
   node fetch_api_data_v2.js
   ```

2. **Update images:**
   ```bash
   node update_images_smart.js
   ```

3. **Verify:**
   - Check `data/sets.json` - image URLs should be `https://images.pokemontcg.io/...`
   - Test the website to see improved image quality

## Image URL Examples

**PriceCharting (current):**
```
https://storage.googleapis.com/images.pricecharting.com/fr6d6yojqvlzizse/60.jpg
```

**API (future):**
```
https://images.pokemontcg.io/swsh4/25_hires.png
```

## Notes

- PriceCharting images are 60px thumbnails but work well when scaled
- API images are high-resolution and look better
- Both sources are reliable and should work in your website
- The website automatically handles image loading errors with fallbacks

## Troubleshooting

**Images not loading?**
- Check browser console for CORS errors
- Verify image URLs are accessible
- Make sure you're running from a local server (not file://)

**Want to use local images?**
- Download images using the `download_images.js` script
- Update paths to `images/cards/...` format

