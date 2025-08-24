/**
 * Store Name Normalizer - Groups similar store names to improve analytics
 * Handles common variations like "Starbucks" vs "Starbucks Coffee"
 */

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1, str2) {
  const matrix = Array(str2.length + 1).fill().map(() => Array(str1.length + 1).fill(0));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Calculate similarity percentage between two strings
 */
function similarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Common store name mappings - manually curated for high accuracy
 */
const STORE_MAPPINGS = {
  // Coffee chains
  'starbucks coffee': 'Starbucks',
  'starbucks': 'Starbucks',
  
  // Restaurants
  'peng chu mid valley': 'Peng Chu',
  'peng chu': 'Peng Chu',
  
  // Supermarkets
  'tesco extra': 'Tesco',
  'tesco express': 'Tesco',
  'tesco': 'Tesco',
  
  // Gas stations
  'shell gas station': 'Shell',
  'shell': 'Shell',
  'petron gas station': 'Petron',
  'petron': 'Petron',
  
  // Fast food
  'mcdonald\'s': 'McDonald\'s',
  'mcdonalds': 'McDonald\'s',
  'kfc': 'KFC',
  'burger king': 'Burger King',
  
  // Cinema
  'gsc cinema': 'GSC',
  'gsc': 'GSC'
};

/**
 * Normalize a store name to its canonical form
 */
export function normalizeStoreName(storeName) {
  if (!storeName || typeof storeName !== 'string') {
    return storeName;
  }
  
  const normalized = storeName.toLowerCase().trim();
  
  // Check manual mappings first (most accurate)
  if (STORE_MAPPINGS[normalized]) {
    return STORE_MAPPINGS[normalized];
  }
  
  // Check for partial matches in mappings
  for (const [key, value] of Object.entries(STORE_MAPPINGS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      // Only match if similarity is high enough
      if (similarity(normalized, key) >= 0.7) {
        return value;
      }
    }
  }
  
  // Return original with proper capitalization
  return storeName.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Group expenses by normalized store names
 */
export function groupExpensesByNormalizedStore(expenses) {
  const groupedStores = {};
  
  expenses.forEach(expense => {
    const normalizedName = normalizeStoreName(expense.store_name);
    
    if (!groupedStores[normalizedName]) {
      groupedStores[normalizedName] = {
        normalizedName,
        originalNames: new Set(),
        expenses: [],
        totalAmount: 0,
        visitCount: 0
      };
    }
    
    groupedStores[normalizedName].originalNames.add(expense.store_name);
    groupedStores[normalizedName].expenses.push(expense);
    groupedStores[normalizedName].totalAmount += parseFloat(expense.total_amount);
    groupedStores[normalizedName].visitCount += 1;
  });
  
  // Convert originalNames Set to Array for easier handling
  Object.values(groupedStores).forEach(group => {
    group.originalNames = Array.from(group.originalNames);
  });
  
  return groupedStores;
}

/**
 * Get top stores with normalized names
 */
export function getTopStoresNormalized(expenses, limit = 5) {
  const grouped = groupExpensesByNormalizedStore(expenses);
  
  return Object.values(grouped)
    .map(group => ({
      store: group.normalizedName,
      total: parseFloat(group.totalAmount.toFixed(2)),
      count: group.visitCount,
      originalNames: group.originalNames
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

/**
 * Auto-detect potential store groups using fuzzy matching
 * This is for discovering new patterns not in the manual mappings
 */
export function detectStoreGroups(storeNames, similarityThreshold = 0.8) {
  const potentialGroups = [];
  const processed = new Set();
  
  for (let i = 0; i < storeNames.length; i++) {
    if (processed.has(storeNames[i])) continue;
    
    const group = [storeNames[i]];
    processed.add(storeNames[i]);
    
    for (let j = i + 1; j < storeNames.length; j++) {
      if (processed.has(storeNames[j])) continue;
      
      const sim = similarity(storeNames[i].toLowerCase(), storeNames[j].toLowerCase());
      if (sim >= similarityThreshold) {
        group.push(storeNames[j]);
        processed.add(storeNames[j]);
      }
    }
    
    if (group.length > 1) {
      potentialGroups.push(group);
    }
  }
  
  return potentialGroups;
}