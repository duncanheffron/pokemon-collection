let allSets = [];
let collection = {};
let currentSetId = null;
let isRendering = false; // Guard to prevent multiple simultaneous renders

// Detect if we're on GitHub Pages (static hosting) or have a server
// GitHub Pages URLs are typically: username.github.io or *.github.io
const isGitHubPages = window.location.hostname.includes('github.io') || 
                      window.location.hostname.includes('github.dev') ||
                      window.location.protocol === 'file:';
const API_BASE_URL = isGitHubPages ? null : window.location.origin; // Use API only if not on GitHub Pages

// Collection management - using API with localStorage fallback
async function loadCollection(setId = null) {
  // Skip API if on GitHub Pages or no API URL
  if (!API_BASE_URL) {
    try {
      const stored = localStorage.getItem('pokemon_collection');
      const loaded = stored ? JSON.parse(stored) : {};
      collection = loaded;
      console.log('Collection loaded from localStorage:', Object.keys(collection).length, 'items');
      return collection;
    } catch (err) {
      console.error('Failed to load collection:', err);
      return {};
    }
  }

  try {
    // Try API first
    const url = setId ? `${API_BASE_URL}/api/collection/${setId}` : `${API_BASE_URL}/api/collection`;
    const response = await fetch(url);
    
    if (response.ok) {
      const data = await response.json();
      if (setId) {
        // For specific set, return just that set's collection
        collection[setId] = data;
      } else {
        // For all collections, merge into collection object
        collection = data;
      }
      console.log('Collection loaded from API:', Object.keys(collection).length, 'sets');
      return collection;
    } else {
      throw new Error('API not available');
    }
  } catch (e) {
    console.warn('API not available, falling back to localStorage:', e);
    // Fallback to localStorage
    try {
      const stored = localStorage.getItem('pokemon_collection');
      const loaded = stored ? JSON.parse(stored) : {};
      collection = loaded;
      console.log('Collection loaded from localStorage:', Object.keys(collection).length, 'items');
      return collection;
    } catch (err) {
      console.error('Failed to load collection:', err);
      return {};
    }
  }
}

async function saveCollection(setId = null) {
  // Skip API if on GitHub Pages or no API URL
  if (!API_BASE_URL) {
    try {
      localStorage.setItem('pokemon_collection', JSON.stringify(collection));
      console.log('Collection saved to localStorage');
      return true;
    } catch (err) {
      console.error('Failed to save collection:', err);
      return false;
    }
  }

  try {
    if (setId && collection[setId]) {
      // Save specific set
      const response = await fetch(`${API_BASE_URL}/api/collection/${setId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(collection[setId])
      });
      
      if (response.ok) {
        console.log('Collection saved to API for set:', setId);
        return true;
      } else {
        throw new Error('API save failed');
      }
    } else if (setId) {
      // Set ID provided but collection doesn't exist yet - initialize it
      collection[setId] = {};
      const response = await fetch(`${API_BASE_URL}/api/collection/${setId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (response.ok) {
        console.log('Collection initialized for set:', setId);
        return true;
      } else {
        throw new Error('API save failed');
      }
    } else {
      // No set ID - save all collections by saving each set individually
      // This is less efficient but works with current API
      const promises = Object.keys(collection).map(sId => 
        fetch(`${API_BASE_URL}/api/collection/${sId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(collection[sId])
        })
      );
      
      const results = await Promise.all(promises);
      if (results.every(r => r.ok)) {
        console.log('All collections saved to API');
        return true;
      } else {
        throw new Error('Some API saves failed');
      }
    }
  } catch (e) {
    console.warn('API not available, falling back to localStorage:', e);
    // Fallback to localStorage
    try {
      localStorage.setItem('pokemon_collection', JSON.stringify(collection));
      console.log('Collection saved to localStorage');
      return true;
    } catch (err) {
      console.error('Failed to save collection:', err);
      return false;
    }
  }
}

function isCollected(cardId) {
  if (!currentSetId) return false;
  return collection[currentSetId] && collection[currentSetId][cardId] === true;
}

async function toggleCollection(cardId) {
  if (!currentSetId) {
    console.error('No set ID available for collection toggle');
    return false;
  }
  
  // Skip API if on GitHub Pages or no API URL
  if (!API_BASE_URL) {
    if (!collection[currentSetId]) {
      collection[currentSetId] = {};
    }
    collection[currentSetId][cardId] = !collection[currentSetId][cardId];
    await saveCollection(currentSetId);
    return collection[currentSetId][cardId];
  }
  
  try {
    // Try API first
    const response = await fetch(`${API_BASE_URL}/api/collection/${currentSetId}/card/${encodeURIComponent(cardId)}`, {
      method: 'PUT'
    });
    
    if (response.ok) {
      const data = await response.json();
      // Update local collection state
      if (!collection[currentSetId]) {
        collection[currentSetId] = {};
      }
      collection[currentSetId][cardId] = data.collected;
      console.log('Collection toggle via API:', { cardId, collected: data.collected });
      return data.collected;
    } else {
      throw new Error('API toggle failed');
    }
  } catch (e) {
    console.warn('API not available, using localStorage:', e);
    // Fallback to localStorage
    if (!collection[currentSetId]) {
      collection[currentSetId] = {};
    }
    collection[currentSetId][cardId] = !collection[currentSetId][cardId];
    await saveCollection(currentSetId);
    return collection[currentSetId][cardId];
  }
}

function getCardId(card, variant) {
  return `${card.number}-${card.name}-${variant.type}`;
}

// Load sets data from local JSON or API
async function loadSetsData() {
  try {
    // Try to load from local JSON first (faster, works offline)
    const response = await fetch('data/sets.json');
    if (response.ok) {
      const sets = await response.json();
      allSets = sets;
      
      // Only render the appropriate page based on current URL
      const isSetPage = window.location.pathname.includes('set.html');
      if (isSetPage) {
        await renderSetPage();
      } else {
        await renderSetList();
      }
      return;
    }
  } catch (err) {
    console.warn('Could not load local sets.json, trying API...', err);
  }
  
  // Fallback: Try to load from API-generated file
  try {
    const apiResponse = await fetch('data/sets_api.json');
    if (apiResponse.ok) {
      const sets = await apiResponse.json();
      allSets = sets;
      
      // Only render the appropriate page based on current URL
      const isSetPage = window.location.pathname.includes('set.html');
      if (isSetPage) {
        await renderSetPage();
      } else {
        await renderSetList();
      }
      return;
    }
  } catch (err) {
    console.warn('Could not load sets_api.json', err);
  }
  
  // Show error if both fail
  showError('Could not load card data. Please run: node fetch_api_data.js YOUR_API_KEY');
}

function showError(message) {
  console.error('Error loading sets:', message);
  const errorMsg = document.createElement('div');
  errorMsg.style.cssText = 'padding: 20px; background: #333; border-radius: 8px; margin: 20px 0;';
  errorMsg.innerHTML = `
    <h2 style="color: #ff6b6b; margin-bottom: 10px;">Error loading sets</h2>
    <p style="color: #aaa; margin-bottom: 10px;">${message}</p>
    <p style="color: #aaa; font-size: 0.9rem;">
      <strong>Solution:</strong> This site needs to be run from a local server, not opened directly as a file.<br>
      Run: <code style="background: #222; padding: 4px 8px; border-radius: 4px;">python3 -m http.server 8000</code><br>
      Then open: <code style="background: #222; padding: 4px 8px; border-radius: 4px;">http://localhost:8000</code><br><br>
      <strong>To fetch data from API:</strong><br>
      <code style="background: #222; padding: 4px 8px; border-radius: 4px;">node fetch_api_data.js YOUR_API_KEY</code>
    </p>
  `;
  const list = document.getElementById('set-list');
  if (list) {
    list.appendChild(errorMsg);
  } else {
    document.body.appendChild(errorMsg);
  }
}

// Initialize
loadSetsData();

// Shared helper functions for card validation
function isCardExGlobal(card) {
  return card.name.toLowerCase().includes(' ex') || 
         card.name.toLowerCase().endsWith(' ex') ||
         (card.name.toLowerCase().includes('mega ') && card.name.toLowerCase().includes(' ex'));
}

function isCardTrainerGlobal(card) {
  const trainerCardNames = [
    "Ultra Ball", "Counter Catcher", "Glass Trumpet", "Canari", "Black Belt", 
    "Surfer", "N's PP Up", "Team Rocket's Transceiver", "Iris's Fighting Spirit",
    "Energy Recycler", "Ignition Energy", "Prism Energy", "Team Rocket's Energy",
    "Fighting Gong", "Premium Power Pro", "Hop's Bag", "Bug Catcher Set", "Mega Signal",
    "Light Ball", "Air Balloon", "Hop's Choice Band", "Acerola's Mischief",
    "Ethan's Adventure", "Lillie's Determination", "Enhanced Hammer", "Sacred Ash",
    "Tool Scrapper", "Tera Orb", "Buddy-Buddy Poffin", "Night Stretcher", "Counter Gain",
    "Cynthia's Power Weight", "Thick Scales", "Brave Bangle",
    "Hilda", "Anthea & Concordia", "Team Rocket's Ariana",
    "Team Rocket's Archer", "Team Rocket's Giovanni", "Team Rocket's Petrel",
    "Team Rocket's Proton",
    "N's Castle", "Team Rocket's Watchtower", "Team Rocket's Factory",
    "Forest of Vitality", "Gravity Mountain", "Area Zero Underdepths",
    "Levincia", "Postwick", "Mystery Garden", "Mine at Night"
  ];
  
  const isTrainerItem = card.name.includes("Ball") && !card.name.includes("'s") && 
                        !card.name.includes("Team Rocket's") && !card.name.includes("Hop's") &&
                        !card.name.includes("Cynthia's") && !card.name.includes("N's") &&
                        !card.name.includes("Ethan's") && !card.name.includes("Iono's");
  
  return trainerCardNames.includes(card.name) || isTrainerItem ||
         (card.name.includes("Training") && !card.name.includes("'s")) ||
         (card.name.includes("Catcher") && !card.name.includes("'s")) ||
         (card.name.includes("Tower") && !card.name.includes("'s")) ||
         (card.name.includes("Hammer") && !card.name.includes("'s")) ||
         (card.name.includes("Ash") && !card.name.includes("'s") && card.name.includes("Sacred")) ||
         (card.name.includes("Scrapper") && !card.name.includes("'s")) ||
         (card.name.includes("Orb") && !card.name.includes("'s")) ||
         (card.name.includes("Poffin") && !card.name.includes("'s")) ||
         (card.name.includes("Stretcher") && !card.name.includes("'s")) ||
         (card.name.includes("Gain") && !card.name.includes("'s")) ||
         (card.name.includes("Scales") && !card.name.includes("'s")) ||
         (card.name.includes("Bangle") && !card.name.includes("'s")) ||
         (card.name.includes("Vitality") && !card.name.includes("'s")) ||
         (card.name.includes("Mountain") && !card.name.includes("'s")) ||
         (card.name.includes("Underdepths") && !card.name.includes("'s")) ||
         (card.name.includes("Levincia") && !card.name.includes("'s")) ||
         (card.name.includes("Postwick") && !card.name.includes("'s")) ||
         (card.name.includes("Garden") && !card.name.includes("'s")) ||
         (card.name.includes("Mine") && !card.name.includes("'s"));
}

function isCardEnergyGlobal(card) {
  return card.name.toLowerCase().includes('energy') && 
         !card.name.toLowerCase().includes('reverse') &&
         !card.name.includes("'s") && 
         !card.name.includes("Team Rocket's");
}

function isValidVariantGlobal(card, variant) {
  // Always apply filtering - Energy, Ball, and Reverse Holo variants are only valid for regular (non-ex) Pokemon
  if (variant.type === 'Energy' || variant.type === 'Ball') {
    return !isCardExGlobal(card) && !isCardTrainerGlobal(card) && !isCardEnergyGlobal(card);
  }
  
  // Reverse Holo variants are NOT valid for Trainer cards, Energy cards, or ex Pokemon
  if (variant.type === 'Reverse Holo') {
    return !isCardExGlobal(card) && !isCardTrainerGlobal(card) && !isCardEnergyGlobal(card);
  }
  
  return true;
}

// Render set list on index page
async function renderSetList() {
  const list = document.getElementById('set-list');
  if (!list) {
    // Not on index page, don't render
    return;
  }

  // Prevent multiple simultaneous renders
  if (isRendering) {
    return;
  }

  // Wait for sets to be loaded if they haven't been yet
  if (!allSets || allSets.length === 0) {
    // Sets not loaded yet, wait a bit and try again (only once)
    if (!isRendering) {
      setTimeout(() => renderSetList(), 100);
    }
    return;
  }

  isRendering = true;

  try {
    // Load all collections for progress calculation
    try {
      await loadCollection();
    } catch (err) {
      console.error('Error loading collection:', err);
      // Continue anyway with empty collection
    }

  list.innerHTML = '';
  allSets.forEach(set => {
    const div = document.createElement('div');
    div.className = 'set-card';
    const cardCount = set.cards ? set.cards.length : 0;
    
    // Count total variants (valid ones only) and collected count
    let totalVariants = 0;
    let collectedVariants = 0;
    
    if (set.cards) {
      set.cards.forEach(card => {
        card.variants.forEach(variant => {
          // Only count valid variants (same logic as set page)
          if (isValidVariantGlobal(card, variant)) {
            totalVariants++;
            
            // Check if this variant is collected
            const cardId = getCardId(card, variant);
            // Need to check collection for this specific set
            if (collection[set.id] && collection[set.id][cardId]) {
              collectedVariants++;
            }
          }
        });
      });
    }
    
    const percentage = totalVariants > 0 ? Math.round((collectedVariants / totalVariants) * 100) : 0;
    
    // Get logo URL if available
    let logoHtml = '';
    if (set.id === 'mega-dream-ex' || set.name === 'MEGA Dream ex') {
      logoHtml = '<img src="https://archives.bulbagarden.net/media/upload/thumb/6/65/M2a_MEGA_Dream_ex_Logo.png/360px-M2a_MEGA_Dream_ex_Logo.png" alt="MEGA Dream ex Logo" class="set-card-logo">';
    }
    else if (set.id === 'greninja-collection' || set.name === 'Greninja Collection') {
      logoHtml = '<img src="https://www.pokemon.com/static-assets/content-assets/cms2/img/pokedex/full/658.png" alt="Greninja Logo" class="set-card-logo">';
    }
    else if (set.id === 'miltank-collection' || set.name === 'Miltank Collection') {
      logoHtml = '<img src="https://marriland.com/wp-content/plugins/marriland-core/images/pokemon/sprites/home/full/miltank.png" alt="Miltank Logo" class="set-card-logo">';
    }
    
    div.innerHTML = `
      ${logoHtml}
      <a href="set.html?set=${set.id}">${set.name}</a>
      <div class="release-date">Released: ${formatDate(set.releaseDate)}</div>
      <div class="card-count">${cardCount} cards • ${totalVariants} variants</div>
      <div class="set-progress">
        <div class="set-progress-info">
          <span class="set-progress-text">${collectedVariants} / ${totalVariants} (${percentage}%)</span>
        </div>
        <div class="set-progress-bar-container">
          <div class="set-progress-bar" style="width: ${percentage}%"></div>
        </div>
      </div>
    `;
    
    // Make entire card clickable
    div.addEventListener('click', (e) => {
      if (e.target.tagName !== 'A' && e.target.tagName !== 'IMG') {
        window.location.href = `set.html?set=${set.id}`;
      }
    });
    
    list.appendChild(div);
  });
  } finally {
    isRendering = false;
  }
}

// Render set page with cards
async function renderSetPage() {
  // Check if we're actually on the set page
  const setNameEl = document.getElementById('set-name');
  if (!setNameEl) {
    // Not on set page, don't render
    return;
  }

  // Prevent multiple simultaneous renders
  if (isRendering) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const setId = params.get('set');
  if (!setId) {
    setNameEl.textContent = 'No set specified';
    return;
  }

  // Wait for sets to be loaded if they haven't been yet
  if (!allSets || allSets.length === 0) {
    // Sets not loaded yet, wait a bit and try again (only once)
    if (!isRendering) {
      setTimeout(() => renderSetPage(), 100);
    }
    return;
  }

  isRendering = true;

  try {
    const set = allSets.find(s => s.id === setId);
    if (!set) {
      setNameEl.textContent = 'Set not found';
      return;
    }

    // Set current set ID for collection operations
    currentSetId = setId;

    if (setNameEl) {
      setNameEl.textContent = set.name;
    }

    // Reload collection to ensure it's up to date
    try {
      await loadCollection(setId);
    } catch (err) {
      console.error('Error loading collection:', err);
      // Continue anyway with empty collection
    }

  // Set logo if available
  const setLogo = document.getElementById('set-logo');
  if (setLogo) {
    // MEGA Dream ex logo
    if (set.id === 'mega-dream-ex' || set.name === 'MEGA Dream ex') {
      setLogo.src = 'https://archives.bulbagarden.net/media/upload/thumb/6/65/M2a_MEGA_Dream_ex_Logo.png/360px-M2a_MEGA_Dream_ex_Logo.png';
      setLogo.style.display = 'block';
      setLogo.alt = 'MEGA Dream ex Logo';
    }
    // Greninja Collection logo
    else if (set.id === 'greninja-collection' || set.name === 'Greninja Collection') {
      setLogo.src = 'https://www.pokemon.com/static-assets/content-assets/cms2/img/pokedex/full/658.png';
      setLogo.style.display = 'block';
      setLogo.alt = 'Greninja Logo';
    }
    // Miltank Collection logo
    else if (set.id === 'miltank-collection' || set.name === 'Miltank Collection') {
      setLogo.src = 'https://marriland.com/wp-content/plugins/marriland-core/images/pokemon/sprites/home/full/miltank.png';
      setLogo.style.display = 'block';
      setLogo.alt = 'Miltank Logo';
    }
  }

  const grid = document.getElementById('card-grid');
  const collectionFilter = document.getElementById('collectionFilter');
  const typeFilter = document.getElementById('typeFilter');
  const variantFilter = document.getElementById('variantFilter');
  const rarityFilter = document.getElementById('rarityFilter');
  const sortBy = document.getElementById('sortBy');

  if (!grid) return;

  // Populate filters dynamically based on set data
  function populateFilters() {
    // Get unique variants in the set
    const variants = new Set();
    const rarities = new Set();
    const types = new Set();
    
    set.cards.forEach(card => {
      card.variants.forEach(variant => {
        variants.add(variant.type);
      });
      rarities.add(card.rarity);
      const cardType = getCardType(card);
      types.add(cardType);
    });
    
    // Populate variant filter
    variantFilter.innerHTML = '<option value="all">All Variants</option>';
    Array.from(variants).sort().forEach(variant => {
      const option = document.createElement('option');
      option.value = variant;
      option.textContent = variant;
      variantFilter.appendChild(option);
    });
    
    // Populate rarity filter
    rarityFilter.innerHTML = '<option value="all">All Rarities</option>';
    Array.from(rarities).sort().forEach(rarity => {
      const option = document.createElement('option');
      option.value = rarity;
      option.textContent = rarity;
      rarityFilter.appendChild(option);
    });
    
    // Populate type filter
    typeFilter.innerHTML = '<option value="all">All Types</option>';
    Array.from(types).sort().forEach(type => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = type;
      typeFilter.appendChild(option);
    });
  }

  // Get Pokemon type from card name (basic inference)
  function getCardType(card) {
    if (isCardTrainer(card) || isCardEnergy(card)) {
      return 'Trainer';
    }
    
    const name = card.name.toLowerCase();
    // Basic type inference based on Pokemon names
    const typeMap = {
      'water': ['squirtle', 'wartortle', 'blastoise', 'psyduck', 'golduck', 'poliwag', 'poliwhirl', 'poliwrath', 'tentacool', 'tentacruel', 'slowpoke', 'slowbro', 'seel', 'dewgong', 'shellder', 'cloyster', 'krabby', 'kingler', 'horsea', 'seadra', 'goldeen', 'seaking', 'staryu', 'starmie', 'magikarp', 'gyarados', 'lapras', 'vaporeon', 'omanyte', 'omastar', 'kabuto', 'kabutops', 'totodile', 'croconaw', 'feraligatr', 'chinchou', 'lanturn', 'marill', 'azumarill', 'politoed', 'wooper', 'quagsire', 'qwilfish', 'corsola', 'remoraid', 'octillery', 'mantine', 'kingdra', 'mudkip', 'marshtomp', 'swampert', 'lotad', 'lombre', 'ludicolo', 'wingull', 'pelipper', 'surskit', 'masquerain', 'carvanha', 'sharpedo', 'wailmer', 'wailord', 'barboach', 'whiscash', 'corphish', 'crawdaunt', 'feebas', 'milotic', 'clamperl', 'huntail', 'gorebyss', 'relicanth', 'luvdisc', 'piplup', 'prinplup', 'empoleon', 'bidoof', 'bibarel', 'buizel', 'floatzel', 'shellos', 'gastrodon', 'finneon', 'lumineon', 'oshawott', 'dewott', 'samurott', 'panpour', 'simipour', 'tympole', 'palpitoad', 'seismitoad', 'basculin', 'tirtouga', 'carracosta', 'ducklett', 'swanna', 'alomomola', 'froakie', 'frogadier', 'greninja', 'binacle', 'barbaracle', 'skrelp', 'dragalge', 'clauncher', 'clawitzer', 'popplio', 'brionne', 'primarina', 'wishiwashi', 'mareanie', 'toxapex', 'dewpider', 'araquanid', 'pyukumuku', 'sobble', 'drizzile', 'inteleon', 'chewtle', 'drednaw', 'arrokuda', 'barraskewda', 'cramorant', 'quaxly', 'quaxwell', 'quaquaval', 'wiglett', 'wugtrio', 'veluza', 'dondozo', 'tatsugiri', 'finizen', 'palafin', 'cetoddle', 'cetitan', 'frigibax', 'arctibax', 'baxcalibur'],
      'fire': ['charmander', 'charmeleon', 'charizard', 'vulpix', 'ninetales', 'growlithe', 'arcanine', 'ponyta', 'rapidash', 'magmar', 'flareon', 'moltres', 'cyndaquil', 'quilava', 'typhlosion', 'slugma', 'magcargo', 'houndour', 'houndoom', 'magby', 'entei', 'torchic', 'combusken', 'blaziken', 'numel', 'camerupt', 'torkoal', 'chimchar', 'monferno', 'infernape', 'magmortar', 'heatran', 'tepig', 'pignite', 'emboar', 'pansear', 'simisear', 'darumaka', 'darmanitan', 'litwick', 'lampent', 'chandelure', 'larvesta', 'volcarona', 'fennekin', 'braixen', 'delphox', 'litleo', 'pyroar', 'fletchling', 'fletchinder', 'talonflame', 'litten', 'torracat', 'incineroar', 'salandit', 'salazzle', 'turtonator', 'togedemaru', 'scorbunny', 'raboot', 'cinderace', 'sizzlipede', 'centiskorch', 'fuecoco', 'crocalor', 'skeledirge', 'charcadet', 'armarouge', 'ceruledge'],
      'grass': ['bulbasaur', 'ivysaur', 'venusaur', 'oddish', 'gloom', 'vileplume', 'paras', 'parasect', 'bellsprout', 'weepinbell', 'victreebel', 'exeggcute', 'exeggutor', 'tangela', 'chikorita', 'bayleef', 'meganium', 'hoppip', 'skiploom', 'jumpluff', 'sunkern', 'sunflora', 'treecko', 'grovyle', 'sceptile', 'seedot', 'nuzleaf', 'shiftry', 'shroomish', 'breloom', 'roselia', 'roserade', 'cacnea', 'cacturne', 'tropius', 'turtwig', 'grotle', 'torterra', 'budew', 'cherubi', 'cherrim', 'carnivine', 'snover', 'abomasnow', 'tangrowth', 'leafeon', 'snivy', 'servine', 'serperior', 'petilil', 'lilligant', 'maractus', 'deerling', 'sawsbuck', 'cottonee', 'whimsicott', 'foongus', 'amoonguss', 'ferroseed', 'ferrothorn', 'chespin', 'quilladin', 'chesnaught', 'skiddo', 'gogoat', 'phantump', 'trevenant', 'pumpkaboo', 'gourgeist', 'rowlet', 'dartrix', 'decidueye', 'fomantis', 'lurantis', 'bounsweet', 'steenee', 'tsareena', 'comfey', 'dhelmise', 'grookey', 'thwackey', 'rillaboom', 'gossifleur', 'eldegoss', 'applin', 'flapple', 'appletun', 'sprigatito', 'floragato', 'meowscarada', 'smoliv', 'dolliv', 'arboliva', 'bramblin', 'brambleghast', 'toedscool', 'toedscruel', 'capsakid', 'scovillain'],
      'electric': ['pikachu', 'raichu', 'voltorb', 'electrode', 'electabuzz', 'jolteon', 'zapdos', 'chinchou', 'lanturn', 'pichu', 'mareep', 'flaaffy', 'ampharos', 'elekid', 'raikou', 'electrike', 'manectric', 'plusle', 'minun', 'electrike', 'manectric', 'shinx', 'luxio', 'luxray', 'pachirisu', 'electivire', 'rotom', 'blitzle', 'zebstrika', 'emolga', 'joltik', 'galvantula', 'tynamo', 'eelektrik', 'eelektross', 'stunfisk', 'helioptile', 'heliolisk', 'dedenne', 'charjabug', 'vikavolt', 'togedemaru', 'morpeko', 'yamper', 'boltund', 'toxel', 'toxtricity', 'pincurchin', 'pawmi', 'pawmo', 'pawmot', 'tadbulb', 'bellibolt', 'wattrel', 'kilowattrel', 'sandy shocks'],
      'psychic': ['abra', 'kadabra', 'alakazam', 'slowpoke', 'slowbro', 'drowzee', 'hypno', 'exeggcute', 'exeggutor', 'starmie', 'mr. mime', 'jynx', 'mewtwo', 'mew', 'natu', 'xatu', 'espeon', 'wobbuffet', 'girafarig', 'smoochum', 'ralts', 'kirlia', 'gardevoir', 'meditite', 'medicham', 'spoink', 'grumpig', 'lunatone', 'solrock', 'baltoy', 'claydol', 'chimecho', 'wynaut', 'beldum', 'metang', 'metagross', 'deoxys', 'chimecho', 'bronzor', 'bronzong', 'mime jr.', 'gallade', 'uxie', 'mesprit', 'azelf', 'cresselia', 'munna', 'musharna', 'woobat', 'swoobat', 'gothita', 'gothorita', 'gothitelle', 'solosis', 'duosion', 'reuniclus', 'elgyem', 'beheeyem', 'inkay', 'malamar', 'espurr', 'meowstic', 'honedge', 'doublade', 'aegislash', 'hoopa', 'indeedee', 'hatenna', 'hattrem', 'hatterene', 'sinistcha', 'poltchageist'],
      'fighting': ['mankey', 'primeape', 'machop', 'machoke', 'machamp', 'hitmonlee', 'hitmonchan', 'tyrogue', 'hitmontop', 'makuhita', 'hariyama', 'meditite', 'medicham', 'riolu', 'lucario', 'croagunk', 'toxicroak', 'gible', 'gabite', 'garchomp', 'mienfoo', 'mienshao', 'pancham', 'pangoro', 'hawlucha', 'crabrawler', 'crabominable', 'passimian', 'hakamo-o', 'kommo-o', 'kubfu', 'urshifu', 'falinks', 'clobbopus', 'grapploct', 'kubfu', 'urshifu', 'pawmo', 'pawmot', 'iron hands', 'iron valiant'],
      'dark': ['umbreon', 'murkrow', 'sneasel', 'houndour', 'houndoom', 'tyranitar', 'poochyena', 'mightyena', 'nuzleaf', 'shiftry', 'sableye', 'carvanha', 'sharpedo', 'cacturne', 'crawdaunt', 'absol', 'honchkrow', 'stunky', 'skuntank', 'spiritomb', 'drapion', 'weavile', 'darkrai', 'purrloin', 'liepard', 'scraggy', 'scrafty', 'zorua', 'zoroark', 'pawniard', 'bisharp', 'vullaby', 'mandibuzz', 'inkay', 'malamar', 'yveltal', 'greninja', 'pangoro', 'yungoos', 'gumshoos', 'alolan rattata', 'alolan raticate', 'alolan meowth', 'alolan persian', 'alolan grimer', 'alolan muk', 'nickit', 'thievul', 'impidimp', 'morgrem', 'grimmsnarl', 'obstagoon', 'zarude', 'maschiff', 'mabosstiff', 'shroodle', 'grafaiai', 'bramblin', 'brambleghast', 'charcadet', 'ceruledge', 'chien-pao', 'ting-lu', 'chi-yu', 'wo-chien', 'roaring moon', 'iron jugulis', 'iron thorns'],
      'steel': ['magnemite', 'magneton', 'magnezone', 'forretress', 'steelix', 'scizor', 'skarmory', 'mawile', 'aron', 'lairon', 'aggron', 'beldum', 'metang', 'metagross', 'registeel', 'jirachi', 'shieldon', 'bastiodon', 'bronzor', 'bronzong', 'lucario', 'probopass', 'dialga', 'heatran', 'excadrill', 'ferroseed', 'ferrothorn', 'klink', 'klang', 'klinklang', 'pawniard', 'bisharp', 'durant', 'cobalion', 'genesect', 'honedge', 'doublade', 'aegislash', 'klefki', 'togedemaru', 'dhelmise', 'meltan', 'melmetal', 'copperajah', 'cufant', 'zamazenta', 'perrserker', 'corviknight', 'duraludon', 'glimmet', 'glimmora', 'varoom', 'revavroom', 'gimmighoul', 'gholdengo', 'tinkatink', 'tinkatuff', 'tinkaton', 'orthworm', 'iron treads', 'iron bundle', 'iron hands', 'iron jugulis', 'iron moth', 'iron thorns', 'iron valiant', 'archaludon'],
      'fairy': ['clefairy', 'clefable', 'jigglypuff', 'wigglytuff', 'mr. mime', 'snubbull', 'granbull', 'togepi', 'togetic', 'togekiss', 'marill', 'azumarill', 'mime jr.', 'azurill', 'ralts', 'kirlia', 'gardevoir', 'flabebe', 'floette', 'florges', 'spritzee', 'aromatisse', 'swirlix', 'slurpuff', 'sylveon', 'dedenne', 'carbink', 'klefki', 'xerneas', 'cutiefly', 'ribombee', 'morelull', 'shiinotic', 'comfey', 'mimikyu', 'alcremie', 'milcery', 'hatenna', 'hattrem', 'hatterene', 'impidimp', 'morgrem', 'grimmsnarl', 'zacian', 'zamazenta', 'tinkatink', 'tinkatuff', 'tinkaton', 'flittle', 'espathra', 'wiglett', 'wugtrio'],
      'dragon': ['dratini', 'dragonair', 'dragonite', 'kingdra', 'vibrava', 'flygon', 'bagon', 'shelgon', 'salamence', 'gible', 'gabite', 'garchomp', 'dialga', 'palkia', 'giratina', 'axew', 'fraxure', 'haxorus', 'druddigon', 'deino', 'zweilous', 'hydreigon', 'reshiram', 'zekrom', 'kyurem', 'goomy', 'sliggoo', 'goodra', 'noibat', 'noivern', 'tyrunt', 'tyrantrum', 'amaura', 'aurorus', 'turfwig', 'drampa', 'jangmo-o', 'hakamo-o', 'kommo-o', 'tapu bulu', 'tapu fini', 'tapu lele', 'tapu koko', 'applin', 'flapple', 'appletun', 'dreepy', 'drakloak', 'dragapult', 'regidrago', 'frigibax', 'arctibax', 'baxcalibur', 'cyclizar', 'roaring moon', 'koraidon', 'miraidon', 'archaludon'],
      'normal': ['rattata', 'raticate', 'pidgey', 'pidgeotto', 'pidgeot', 'spearow', 'fearow', 'jigglypuff', 'wigglytuff', 'meowth', 'persian', 'farfetch\'d', 'doduo', 'dodrio', 'lickitung', 'chansey', 'kangaskhan', 'tauros', 'ditto', 'eevee', 'porygon', 'snorlax', 'sentret', 'furret', 'hoothoot', 'noctowl', 'ledyba', 'ledian', 'spinarak', 'ariados', 'togepi', 'togetic', 'natu', 'xatu', 'aipom', 'dunsparce', 'teddiursa', 'ursaring', 'porygon2', 'stantler', 'smeargle', 'miltank', 'blissey', 'zigzagoon', 'linoone', 'taillow', 'swellow', 'slakoth', 'vigoroth', 'slaking', 'whismur', 'loudred', 'exploud', 'azurill', 'skitty', 'delcatty', 'spinda', 'zangoose', 'castform', 'kecleon', 'starly', 'staravia', 'staraptor', 'bidoof', 'bibarel', 'ambipom', 'buneary', 'lopunny', 'glameow', 'purugly', 'happiny', 'chatot', 'munchlax', 'lickilicky', 'porygon-z', 'regigigas', 'arceus', 'patrat', 'watchog', 'lillipup', 'herdier', 'stoutland', 'pidove', 'tranquill', 'unfezant', 'audino', 'minccino', 'cinccino', 'deerling', 'sawsbuck', 'bouffalant', 'rufflet', 'braviary', 'furfrou', 'bunnelby', 'diggersby', 'fletchling', 'fletchinder', 'talonflame', 'litleo', 'pyroar', 'yungoos', 'gumshoos', 'stufful', 'bewear', 'komala', 'type: null', 'silvally', 'skwovet', 'greedent', 'wooloo', 'dubwool', 'obstagoon', 'indeedee', 'cufant', 'copperajah', 'wyrdeer', 'ursaluna', 'lechonk', 'oinkologne', 'tarountula', 'spidops', 'nymble', 'lokix', 'pawmi', 'pawmo', 'pawmot', 'lechonk', 'oinkologne', 'tandemaus', 'maushold', 'fidough', 'dachsbun', 'smoliv', 'dolliv', 'arboliva', 'squawkabilly', 'nacli', 'naclstack', 'garganacl', 'charcadet', 'armarouge', 'ceruledge', 'tadbulb', 'bellibolt', 'wattrel', 'kilowattrel', 'maschiff', 'mabosstiff', 'shroodle', 'grafaiai', 'bramblin', 'brambleghast', 'toedscool', 'toedscruel', 'klawf', 'capsakid', 'scovillain', 'rellor', 'rabsca', 'flittle', 'espathra', 'tinkatink', 'tinkatuff', 'tinkaton', 'wiglett', 'wugtrio', 'bombirdier', 'finizen', 'palafin', 'varoom', 'revavroom', 'cyclizar', 'orthworm', 'glimmet', 'glimmora', 'greavard', 'houndstone', 'flamigo', 'cetoddle', 'cetitan', 'veluza', 'dondozo', 'tatsugiri', 'frigibax', 'arctibax', 'baxcalibur', 'gimmighoul', 'gholdengo', 'wo-chien', 'chien-pao', 'ting-lu', 'chi-yu', 'roaring moon', 'iron treads', 'iron bundle', 'iron hands', 'iron jugulis', 'iron moth', 'iron thorns', 'iron valiant', 'walking wake', 'iron leaves'],
      'ice': ['jynx', 'lapras', 'articuno', 'sneasel', 'swinub', 'piloswine', 'delibird', 'smoochum', 'snorunt', 'glalie', 'spheal', 'sealeo', 'walrein', 'regice', 'snover', 'abomasnow', 'glaceon', 'vanillite', 'vanillish', 'vanilluxe', 'cubchoo', 'beartic', 'cryogonal', 'amaura', 'aurorus', 'bergmite', 'avalugg', 'sandshrew', 'sandslash', 'vulpix', 'ninetales', 'dewgong', 'cloyster', 'articuno', 'delibird', 'sneasel', 'weavile', 'snorunt', 'glalie', 'froslass', 'snover', 'abomasnow', 'vanillite', 'vanillish', 'vanilluxe', 'cubchoo', 'beartic', 'cryogonal', 'bergmite', 'avalugg', 'amaura', 'aurorus', 'crabrawler', 'crabominable', 'sandshrew', 'sandslash', 'vulpix', 'ninetales', 'cetoddle', 'cetitan', 'frigibax', 'arctibax', 'baxcalibur'],
      'bug': ['caterpie', 'metapod', 'butterfree', 'weedle', 'kakuna', 'beedrill', 'paras', 'parasect', 'venonat', 'venomoth', 'scyther', 'pinsir', 'ledyba', 'ledian', 'spinarak', 'ariados', 'yanma', 'yanmega', 'pineco', 'forretress', 'scizor', 'heracross', 'wurmple', 'silcoon', 'beautifly', 'cascoon', 'dustox', 'surskit', 'masquerain', 'nincada', 'ninjask', 'shedinja', 'volbeat', 'illumise', 'trapinch', 'vibrava', 'flygon', 'anorith', 'armaldo', 'kricketot', 'kricketune', 'burmy', 'wormadam', 'mothim', 'combee', 'vespiquen', 'pachirisu', 'buizel', 'floatzel', 'shellos', 'gastrodon', 'drifloon', 'drifblim', 'buneary', 'lopunny', 'mismagius', 'honchkrow', 'glameow', 'purugly', 'chingling', 'stunky', 'skuntank', 'bronzor', 'bronzong', 'bonsly', 'mime jr.', 'happiny', 'chatot', 'spiritomb', 'gible', 'gabite', 'garchomp', 'munchlax', 'riolu', 'lucario', 'hippopotas', 'hippowdon', 'skorupi', 'drapion', 'croagunk', 'toxicroak', 'carnivine', 'finneon', 'lumineon', 'mantyke', 'snover', 'abomasnow', 'weavile', 'magnezone', 'lickilicky', 'rhyperior', 'tangrowth', 'electivire', 'magmortar', 'togekiss', 'yanmega', 'leafeon', 'glaceon', 'gliscor', 'mamoswine', 'porygon-z', 'gallade', 'probopass', 'dusknoir', 'froslass', 'rotom', 'phione', 'manaphy', 'darkrai', 'shaymin', 'arceus', 'victini', 'snivy', 'servine', 'serperior', 'tepig', 'pignite', 'emboar', 'oshawott', 'dewott', 'samurott', 'patrat', 'watchog', 'lillipup', 'herdier', 'stoutland', 'purrloin', 'liepard', 'pansage', 'simisage', 'pansear', 'simisear', 'panpour', 'simipour', 'munna', 'musharna', 'pidove', 'tranquill', 'unfezant', 'blitzle', 'zebstrika', 'roggenrola', 'boldore', 'gigalith', 'woobat', 'swoobat', 'drilbur', 'excadrill', 'audino', 'timburr', 'gurdurr', 'conkeldurr', 'tympole', 'palpitoad', 'seismitoad', 'throh', 'sawk', 'sewaddle', 'swadloon', 'leavanny', 'venipede', 'whirlipede', 'scolipede', 'cottonee', 'whimsicott', 'petilil', 'lilligant', 'basculin', 'sandile', 'krokorok', 'krookodile', 'darumaka', 'darmanitan', 'maractus', 'dwebble', 'crustle', 'scraggy', 'scrafty', 'sigilyph', 'yamask', 'cofagrigus', 'tirtouga', 'carracosta', 'archen', 'archeops', 'trubbish', 'garbodor', 'zorua', 'zoroark', 'minccino', 'cinccino', 'gothita', 'gothorita', 'gothitelle', 'solosis', 'duosion', 'reuniclus', 'ducklett', 'swanna', 'vanillite', 'vanillish', 'vanilluxe', 'deerling', 'sawsbuck', 'emolga', 'karrablast', 'escavalier', 'foongus', 'amoonguss', 'frillish', 'jellicent', 'alomomola', 'joltik', 'galvantula', 'ferroseed', 'ferrothorn', 'klink', 'klang', 'klinklang', 'tynamo', 'eelektrik', 'eelektross', 'elgyem', 'beheeyem', 'litwick', 'lampent', 'chandelure', 'axew', 'fraxure', 'haxorus', 'cubchoo', 'beartic', 'cryogonal', 'shelmet', 'accelgor', 'stunfisk', 'mienfoo', 'mienshao', 'druddigon', 'golett', 'golurk', 'pawniard', 'bisharp', 'bouffalant', 'rufflet', 'braviary', 'vullaby', 'mandibuzz', 'heatmor', 'durant', 'deino', 'zweilous', 'hydreigon', 'larvesta', 'volcarona', 'cobalion', 'terrakion', 'virizion', 'tornadus', 'thundurus', 'reshiram', 'zekrom', 'landorus', 'kyurem', 'keldeo', 'meloetta', 'genesect', 'chespin', 'quilladin', 'chesnaught', 'fennekin', 'braixen', 'delphox', 'froakie', 'frogadier', 'greninja', 'bunnelby', 'diggersby', 'fletchling', 'fletchinder', 'talonflame', 'scatterbug', 'spewpa', 'vivillon', 'litleo', 'pyroar', 'flabebe', 'floette', 'florges', 'skiddo', 'gogoat', 'pancham', 'pangoro', 'furfrou', 'espurr', 'meowstic', 'honedge', 'doublade', 'aegislash', 'spritzee', 'aromatisse', 'swirlix', 'slurpuff', 'inkay', 'malamar', 'binacle', 'barbaracle', 'skrelp', 'dragalge', 'clauncher', 'clawitzer', 'helioptile', 'heliolisk', 'tyrunt', 'tyrantrum', 'amaura', 'aurorus', 'hawlucha', 'dedenne', 'carbink', 'goomy', 'sliggoo', 'goodra', 'klefki', 'phantump', 'trevenant', 'pumpkaboo', 'gourgeist', 'bergmite', 'avalugg', 'noibat', 'noivern', 'xerneas', 'yveltal', 'zygarde', 'diancie', 'hoopa', 'volcanion', 'rowlet', 'dartrix', 'decidueye', 'litten', 'torracat', 'incineroar', 'popplio', 'brionne', 'primarina', 'pikipek', 'trumbeak', 'toucannon', 'yungoos', 'gumshoos', 'grubbin', 'charjabug', 'vikavolt', 'crabrawler', 'crabominable', 'oricorio', 'cutiefly', 'ribombee', 'rockruff', 'lycanroc', 'wishiwashi', 'mareanie', 'toxapex', 'mudbray', 'mudsdale', 'dewpider', 'araquanid', 'fomantis', 'lurantis', 'morelull', 'shiinotic', 'salandit', 'salazzle', 'stufful', 'bewear', 'bounsweet', 'steenee', 'tsareena', 'comfey', 'oranguru', 'passimian', 'wimpod', 'golisopod', 'sandygast', 'palossand', 'pyukumuku', 'type: null', 'silvally', 'minior', 'komala', 'turtonator', 'togedemaru', 'mimikyu', 'bruxish', 'drampa', 'dhelmise', 'jangmo-o', 'hakamo-o', 'kommo-o', 'tapu koko', 'tapu lele', 'tapu bulu', 'tapu fini', 'cosmog', 'cosmoem', 'solgaleo', 'lunala', 'nihilego', 'buzzwole', 'pheromosa', 'xurkitree', 'celesteela', 'kartana', 'guzzlord', 'necrozma', 'magearna', 'marshadow', 'poipole', 'naganadel', 'stakataka', 'blacephalon', 'zeraora', 'meltan', 'melmetal', 'grookey', 'thwackey', 'rillaboom', 'scorbunny', 'raboot', 'cinderace', 'sobble', 'drizzile', 'inteleon', 'skwovet', 'greedent', 'rookidee', 'corvisquire', 'corviknight', 'blipbug', 'dottler', 'orbeetle', 'nickit', 'thievul', 'gossifleur', 'eldegoss', 'wooloo', 'dubwool', 'chewtle', 'drednaw', 'yamper', 'boltund', 'rolycoly', 'carkol', 'coalossal', 'applin', 'flapple', 'appletun', 'silicobra', 'sandaconda', 'cramorant', 'arrokuda', 'barraskewda', 'toxel', 'toxtricity', 'sizzlipede', 'centiskorch', 'clobbopus', 'grapploct', 'sinistea', 'polteageist', 'hatenna', 'hattrem', 'hatterene', 'impidimp', 'morgrem', 'grimmsnarl', 'obstagoon', 'perrserker', 'cursola', 'sirfetch\'d', 'mr. rime', 'runerigus', 'milcery', 'alcremie', 'falinks', 'pincurchin', 'snom', 'frosmoth', 'stonjourner', 'eiscue', 'indeedee', 'morpeko', 'cufant', 'copperajah', 'dracozolt', 'arctozolt', 'dracovish', 'arctovish', 'duraludon', 'dreepy', 'drakloak', 'dragapult', 'zacian', 'zamazenta', 'eternatus', 'kubfu', 'urshifu', 'zarude', 'regieleki', 'regidrago', 'glastrier', 'spectrier', 'calyrex', 'wyrdeer', 'kleavor', 'ursaluna', 'basculegion', 'sneasler', 'overqwil', 'enamorus', 'sprigatito', 'floragato', 'meowscarada', 'fuecoco', 'crocalor', 'skeledirge', 'quaxly', 'quaxwell', 'quaquaval', 'lechonk', 'oinkologne', 'tarountula', 'spidops', 'nymble', 'lokix', 'pawmi', 'pawmo', 'pawmot', 'tandemaus', 'maushold', 'fidough', 'dachsbun', 'smoliv', 'dolliv', 'arboliva', 'squawkabilly', 'nacli', 'naclstack', 'garganacl', 'charcadet', 'armarouge', 'ceruledge', 'tadbulb', 'bellibolt', 'wattrel', 'kilowattrel', 'maschiff', 'mabosstiff', 'shroodle', 'grafaiai', 'bramblin', 'brambleghast', 'toedscool', 'toedscruel', 'klawf', 'capsakid', 'scovillain', 'rellor', 'rabsca', 'flittle', 'espathra', 'tinkatink', 'tinkatuff', 'tinkaton', 'wiglett', 'wugtrio', 'bombirdier', 'finizen', 'palafin', 'varoom', 'revavroom', 'cyclizar', 'orthworm', 'glimmet', 'glimmora', 'greavard', 'houndstone', 'flamigo', 'cetoddle', 'cetitan', 'veluza', 'dondozo', 'tatsugiri', 'frigibax', 'arctibax', 'baxcalibur', 'gimmighoul', 'gholdengo', 'wo-chien', 'chien-pao', 'ting-lu', 'chi-yu', 'roaring moon', 'iron treads', 'iron bundle', 'iron hands', 'iron jugulis', 'iron moth', 'iron thorns', 'iron valiant', 'walking wake', 'iron leaves', 'okidogi', 'munkidori', 'fezandipiti', 'ogerpon', 'pecharunt']
    };
    
    for (const [type, pokemon] of Object.entries(typeMap)) {
      if (pokemon.some(p => name.includes(p))) {
        return type.charAt(0).toUpperCase() + type.slice(1);
      }
    }
    
    return 'Normal'; // Default fallback
  }

  function isCardEx(card) {
    return card.name.toLowerCase().includes(' ex') || 
           card.name.toLowerCase().endsWith(' ex') ||
           (card.name.toLowerCase().includes('mega ') && card.name.toLowerCase().includes(' ex'));
  }

  function isCardTrainer(card) {
    // Trainer CARDS (items, supporters, stadiums) - NOT trainer Pokemon
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
    const isTrainerItem = card.name.includes("Ball") && !card.name.includes("'s") && 
                          !card.name.includes("Team Rocket's") && !card.name.includes("Hop's") &&
                          !card.name.includes("Cynthia's") && !card.name.includes("N's") &&
                          !card.name.includes("Ethan's") && !card.name.includes("Iono's");
    
    // ALL Trainer cards (Items, Supporters, Stadiums) don't have reverse holos
    return trainerCardNames.includes(card.name) || isTrainerItem ||
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
  }

  function isCardEnergy(card) {
    // ALL Energy cards are Trainer cards and don't have reverse holos
    return card.name.toLowerCase().includes('energy') && 
           !card.name.toLowerCase().includes('reverse') &&
           !card.name.includes("'s") && 
           !card.name.includes("Team Rocket's");
  }

  function isValidVariant(card, variant) {
    // Always apply filtering - Energy, Ball, and Reverse Holo variants are only valid for regular (non-ex) Pokemon
    if (variant.type === 'Energy' || variant.type === 'Ball') {
      return !isCardEx(card) && !isCardTrainer(card) && !isCardEnergy(card);
    }
    
    // Reverse Holo variants are NOT valid for Trainer cards, Energy cards, or ex Pokemon
    // According to PokéBeach: "Trainers, Energy, and Pokemon ex do not have reverse holos"
    if (variant.type === 'Reverse Holo') {
      return !isCardEx(card) && !isCardTrainer(card) && !isCardEnergy(card);
    }
    
    return true;
  }

  function updateCompletionStats() {
    let totalCards = 0;
    let collectedCards = 0;
    
    set.cards.forEach(card => {
      card.variants.forEach(variant => {
        // Only count valid variants
        if (isValidVariant(card, variant)) {
          totalCards++;
          const cardId = getCardId(card, variant);
          if (isCollected(cardId)) {
            collectedCards++;
          }
        }
      });
    });
    
    const percentage = totalCards > 0 ? Math.round((collectedCards / totalCards) * 100) : 0;
    
    const completionText = document.getElementById('completion-text');
    const progressBar = document.getElementById('progress-bar');
    
    if (completionText) {
      completionText.textContent = `${collectedCards} / ${totalCards} (${percentage}%)`;
    }
    
    if (progressBar) {
      progressBar.style.width = `${percentage}%`;
      // Add percentage text inside bar if there's room
      if (percentage > 10) {
        progressBar.textContent = `${percentage}%`;
      } else {
        progressBar.textContent = '';
      }
    }
  }

  function renderCards() {
    const collectionValue = collectionFilter?.value || 'all';
    const typeValue = typeFilter?.value || 'all';
    const variantValue = variantFilter?.value || 'all';
    const rarityValue = rarityFilter?.value || 'all';
    const sortValue = sortBy?.value || 'number-desc';

    grid.innerHTML = '';
    
    // Update completion stats
    updateCompletionStats();

    // Collect all card-variant combinations
    let cardVariants = [];
    set.cards.forEach(card => {
      card.variants.forEach(variant => {
        const cardId = getCardId(card, variant);
        const collected = isCollected(cardId);
        
        // Apply filters
        const matchesType = typeValue === 'all' || getCardType(card) === typeValue;
        const matchesVariant = variantValue === 'all' || variant.type === variantValue;
        const matchesRarity = rarityValue === 'all' || card.rarity === rarityValue;
        const matchesCollection = collectionValue === 'all' || 
                                  (collectionValue === 'collected' && collected) ||
                                  (collectionValue === 'uncollected' && !collected);
        const isValid = isValidVariant(card, variant);
        
        if (matchesType && matchesVariant && matchesRarity && matchesCollection && isValid) {
          cardVariants.push({ card, variant });
        }
      });
    });

    // Sort card variants
    cardVariants.sort((a, b) => {
      if (sortValue === 'number-desc') {
        return parseInt(b.card.number) - parseInt(a.card.number);
      } else if (sortValue === 'number-asc') {
        return parseInt(a.card.number) - parseInt(b.card.number);
      } else if (sortValue === 'name') {
        return a.card.name.localeCompare(b.card.name);
      }
      return 0;
    });

    // Render cards
    if (cardVariants.length === 0) {
      grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #aaa; padding: 40px;">No cards found matching the selected filters.</div>';
      return;
    }

    cardVariants.forEach(({ card, variant }) => {
      const cardId = getCardId(card, variant);
      const collected = isCollected(cardId);
      
      const cardDiv = document.createElement('div');
      cardDiv.className = `card ${collected ? 'collected' : 'uncollected'}`;
      cardDiv.dataset.cardId = cardId;
      
      // Update image URL to high-res if it's a PriceCharting URL
      let imageUrl = variant.image;
      if (imageUrl && imageUrl.includes('storage.googleapis.com/images.pricecharting.com')) {
        imageUrl = imageUrl.replace(/\/60\.jpg$/, '/1600.jpg');
      }
      
      cardDiv.innerHTML = `
        <img src="${imageUrl}" alt="${card.name} - ${variant.type}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'180\' height=\'250\'%3E%3Crect fill=\'%231a1a1a\' width=\'180\' height=\'250\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' fill=\'%23444\' font-size=\'14\'%3ENo Image%3C/text%3E%3C/svg%3E'">
        <div class="card-number">#${card.number}</div>
        <div class="card-name">${card.name}</div>
        <div class="variant-type">${variant.type}</div>
        ${card.rarity ? `<div class="rarity">${card.rarity}</div>` : ''}
        ${collected ? '<div class="collected-badge">✓ Collected</div>' : ''}
      `;
      
      // Add click handler to toggle collection
      cardDiv.addEventListener('click', async () => {
        const isNowCollected = await toggleCollection(cardId);
        
        // Debug logging
        console.log('Collection toggle:', {
          cardId,
          isNowCollected,
          collectionSize: Object.keys(collection).length
        });
        
        // Update card appearance
        cardDiv.className = `card ${isNowCollected ? 'collected' : 'uncollected'}`;
        
        if (isNowCollected) {
          if (!cardDiv.querySelector('.collected-badge')) {
            const badge = document.createElement('div');
            badge.className = 'collected-badge';
            badge.textContent = '✓ Collected';
            cardDiv.appendChild(badge);
          }
        } else {
          const badge = cardDiv.querySelector('.collected-badge');
          if (badge) badge.remove();
        }
        
        // Update completion stats
        updateCompletionStats();
        
        // Re-render if collection filter is active
        const collectionValue = collectionFilter?.value || 'all';
        if (collectionValue !== 'all') {
          renderCards();
        }
      });
      
      grid.appendChild(cardDiv);
    });
  }

  // Populate filters on page load
  populateFilters();

  // Add event listeners
  if (collectionFilter) {
    collectionFilter.addEventListener('change', renderCards);
  }
  if (typeFilter) {
    typeFilter.addEventListener('change', renderCards);
  }
  if (variantFilter) {
    variantFilter.addEventListener('change', renderCards);
  }
  if (rarityFilter) {
    rarityFilter.addEventListener('change', renderCards);
  }
  if (sortBy) {
    sortBy.addEventListener('change', renderCards);
  }

  // Initial render
  renderCards();
  } finally {
    isRendering = false;
  }
}

// Format date for display
function formatDate(dateString) {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

