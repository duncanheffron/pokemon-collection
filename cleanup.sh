#!/bin/bash
# Cleanup script for unused files

echo "Cleaning up old and unused files..."

# Remove old/unused scripts
echo "Removing old scripts..."
rm -f scrape_cards.js          # Old scraper, replaced by puppeteer version
rm -f scrape_cards.py          # Python version, not used
rm -f extract_cards.js          # Browser console script, not needed
rm -f test_api.js              # Test script
rm -f find_set.js              # Helper script, not needed
rm -f update_images_sample.js  # Test script
rm -f update_images_from_api.js # Old version
rm -f filter_actual_variants.js # Old version
rm -f filter_variants_by_actual.js # Old version
rm -f filter_variants.js       # Old version
rm -f filter_all_trainers.js   # Merged into filter_variants_correct.js

# Remove API-related files (API not available/not using)
echo "Removing API-related files..."
rm -f fetch_api_data.js
rm -f fetch_api_data_v2.js
rm -f update_images_smart.js
rm -f config.js
rm -f API_ERROR_HANDLING.md
rm -f API_STATUS.md
rm -f README_API.md

# Remove old backup files (keep only the latest 3)
echo "Cleaning up old backups..."
cd data
ls -t sets_backup_*.json 2>/dev/null | tail -n +4 | xargs rm -f 2>/dev/null
cd ..

# Remove log files
echo "Removing log files..."
rm -f scrape_output.log

echo ""
echo "✓ Cleanup complete!"
echo ""
echo "Files kept (still useful):"
echo "  - scrape_cards_puppeteer.js (main scraper)"
echo "  - process_cards.js (processes scraped data)"
echo "  - restore_real_variants.js (restores variants)"
echo "  - filter_variants_correct.js (current filter)"
echo "  - update_to_highres_images.js (updates images)"
echo "  - apply_variant_overrides.js (manual overrides)"
echo "  - restore_pricecharting_images.js (restores images)"
echo "  - scrape_pokebeach_images.js (PokéBeach scraper)"
echo "  - download_images.js (downloads images)"
echo "  - export_collection.html (collection export)"

