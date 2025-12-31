// Main Content Script - Orchestrates all modules
// This file imports player.js, sidebar.js, and logMonitor.js via manifest.json

console.log('Catan Resource Tracker - Main Content Script Loaded');

// Global players dictionary - shared across all modules
window.catanPlayers = {};

// Global dev card bank - tracks remaining development cards
window.devCardBank = {
  total: 25,
  remaining: 25,
  knights: 14,
  victoryPoints: 5,
  roadBuilding: 2,
  yearOfPlenty: 2,
  monopoly: 2
};

// Extract game ID from URL (colonist.io/#{gameId})
function getCurrentGameId() {
  const hash = window.location.hash;
  if (hash && hash.startsWith('#')) {
    const gameId = hash.substring(1);
    return gameId || null;
  }
  return null;
}

// Reset UI only (keep storage)
function resetUI() {
  console.log('Resetting UI (keeping storage for potential reconnect)...');
  window.catanPlayers = {};
  window.devCardBank = {
    total: 25,
    remaining: 25,
    knights: 14,
    victoryPoints: 5,
    roadBuilding: 2,
    yearOfPlenty: 2,
    monopoly: 2
  };
  clearProcessedLogs();
  updateResourceTable(window.catanPlayers);
}

// Reset both storage and UI
async function resetStorageAndUI() {
  console.log('Resetting storage and UI (new game detected)...');
  window.catanPlayers = {};
  window.devCardBank = {
    total: 25,
    remaining: 25,
    knights: 14,
    victoryPoints: 5,
    roadBuilding: 2,
    yearOfPlenty: 2,
    monopoly: 2
  };
  clearProcessedLogs();
  
  await chrome.storage.local.set({ 
    players: [],
    gameId: null
  });
  
  updateResourceTable(window.catanPlayers);
}

// Load players from storage if game ID matches
async function loadPlayersFromStorage(currentGameId) {
  console.log('Loading players from storage...');
  
  try {
    const data = await chrome.storage.local.get(['players', 'gameId']);
    
    // Check if stored game ID matches current game ID
    if (data.gameId !== currentGameId) {
      console.log(`Game ID mismatch. Stored: ${data.gameId}, Current: ${currentGameId}`);
      return false;
    }
    
    if (data.players && data.players.length > 0) {
      console.log(`Found ${data.players.length} players in storage for game ${currentGameId}`);
      
      // Reconstruct Player objects from stored data
      data.players.forEach(playerData => {
        if (!window.catanPlayers[playerData.name]) {
          const player = new Player(playerData.name);
          
          // Restore all player data
          player.resources = playerData.resources || player.resources;
          player.devCards = playerData.devCards || player.devCards;
          player.knightsPlayed = playerData.knightsPlayed || 0;
          player.tradesCompleted = playerData.tradesCompleted || 0;
          
          window.catanPlayers[playerData.name] = player;
          console.log(`Restored player from storage: ${playerData.name}`);
        }
      });
      
      // Update the UI with loaded data
      updateResourceTable(window.catanPlayers);
      
      return true;
    }
  } catch (error) {
    console.error('Error loading players from storage:', error);
  }
  
  return false;
}

// Initialize players from opponent rows in DOM
function loadPlayersFromDOM() {
  console.log('Searching for all players in DOM...');
  
  // Find current player (not opponent)
  const currentPlayerRow = document.querySelector('[class*="playerRow"]:not([class*="opponent"])');
  let currentPlayerName = null;
  
  if (currentPlayerRow) {
    const usernameElement = currentPlayerRow.querySelector('[class*="username"]');
    if (usernameElement) {
      currentPlayerName = usernameElement.textContent.trim();
      if (currentPlayerName && !window.catanPlayers[currentPlayerName]) {
        window.catanPlayers[currentPlayerName] = new Player(currentPlayerName);
        console.log(`Current player initialized from DOM: ${currentPlayerName}`);
        
        // Also map "You" to the same player object
        window.catanPlayers['You'] = window.catanPlayers[currentPlayerName];
        console.log(`Mapped "You" to ${currentPlayerName}`);
      }
    }
  }
  
  // Find all opponent player rows
  const opponentRows = document.querySelectorAll('[class*="opponentPlayerRow"]');
  
  opponentRows.forEach(row => {
    // Find username within the row
    const usernameElement = row.querySelector('[class*="username"]');
    
    if (usernameElement) {
      const playerName = usernameElement.textContent.trim();
      
      if (playerName && !window.catanPlayers[playerName]) {
        window.catanPlayers[playerName] = new Player(playerName);
        console.log(`Opponent initialized from DOM: ${playerName}`);
      }
    }
  });
  
  // Sync to storage and update UI if players were found
  if (Object.keys(window.catanPlayers).length > 0) {
    syncPlayerData(window.catanPlayers);
  }
}

// Initialize tracking system
async function initializeTracking() {
  console.log('Initializing Catan resource tracking...');
  
  const currentGameId = getCurrentGameId();
  console.log(`Current game ID: ${currentGameId}`);
  
  // Step 1: Create sidebar UI
  createSidebar();
  
  // Step 2: Handle different URL scenarios
  if (!currentGameId) {
    // On homepage or no game - reset UI only
    console.log('No game ID detected (homepage) - resetting UI only');
    resetUI();
    return;
  }
  
  // Step 3: Check stored game ID
  const data = await chrome.storage.local.get(['gameId']);
  
  if (data.gameId && data.gameId !== currentGameId) {
    // Different game detected - reset everything
    console.log(`New game detected! Old: ${data.gameId}, New: ${currentGameId}`);
    await resetStorageAndUI();
  }
  
  // Step 4: Try to load players from storage (if same game)
  const loadedFromStorage = await loadPlayersFromStorage(currentGameId);
  
  // Step 5: If no data in storage, load players from DOM
  if (!loadedFromStorage) {
    loadPlayersFromDOM();
  }
  
  // Step 6: Store current game ID
  await chrome.storage.local.set({ gameId: currentGameId });
  
  // Step 7: Activate log monitoring
  startLogMonitoring(window.catanPlayers);
}

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageInfo') {
    sendResponse({
      url: window.location.href,
      title: document.title,
      playersTracked: Object.keys(window.catanPlayers).length
    });
  }
  
  if (request.action === 'resetTracking') {
    window.catanPlayers = {};
    // Reset dev card bank
    window.devCardBank = {
      total: 25,
      remaining: 25,
      knights: 14,
      victoryPoints: 5,
      roadBuilding: 2,
      yearOfPlenty: 2,
      monopoly: 2
    };
    clearProcessedLogs();
    syncPlayerData(window.catanPlayers);
    sendResponse({ success: true });
  }
  
  if (request.action === 'getPlayers') {
    const playersArray = Object.values(window.catanPlayers).map(p => p.toJSON());
    sendResponse({ players: playersArray });
  }
  
  return true;
});

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTracking);
} else {
  initializeTracking();
}

// Re-initialize if URL changes (for SPAs)
let lastUrl = location.href;
let lastGameId = getCurrentGameId();

new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    const newGameId = getCurrentGameId();
    
    // Only re-initialize if game ID actually changed
    if (newGameId !== lastGameId) {
      console.log(`URL changed: ${lastGameId} -> ${newGameId}`);
      lastGameId = newGameId;
      setTimeout(initializeTracking, 1000);
    }
  }
}).observe(document, { subtree: true, childList: true });

// Also listen for hash changes (more reliable for colonist.io)
window.addEventListener('hashchange', () => {
  const newGameId = getCurrentGameId();
  if (newGameId !== lastGameId) {
    console.log(`Hash changed: ${lastGameId} -> ${newGameId}`);
    lastGameId = newGameId;
    setTimeout(initializeTracking, 500);
  }
});
