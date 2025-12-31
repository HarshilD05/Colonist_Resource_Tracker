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
function initializeTracking() {
  console.log('Initializing Catan resource tracking...');
  
  // Step 1: Create sidebar UI
  createSidebar();
  
  // Step 2: Load players from DOM
  loadPlayersFromDOM();
  
  // Step 3: Activate log monitoring
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
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(initializeTracking, 1000);
  }
}).observe(document, { subtree: true, childList: true });
