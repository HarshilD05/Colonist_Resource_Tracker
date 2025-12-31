// Background service worker for Catan Resource Tracker

// Initialize storage on installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Catan Resource Tracker installed');
  
  // Initialize default storage
  chrome.storage.local.set({
    players: [],
    settings: {
      autoTrack: false,
      notifications: true
    }
  });
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'playersUpdated') {
    // Forward player updates to popup
    chrome.runtime.sendMessage(request);
    updateBadge(request.players.length);
  }
  
  if (request.action === 'getSettings') {
    // Return current settings
    chrome.storage.local.get('settings', (result) => {
      sendResponse(result.settings);
    });
    return true;
  }
});

// Optional: Add badge to show active tracking
function updateBadge(count) {
  chrome.action.setBadgeText({ text: count.toString() });
  chrome.action.setBadgeBackgroundColor({ color: '#4caf50' });
}

// Listen for tab updates (useful for detecting when user navigates to Catan game)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    // You can add logic here to detect if the user is on a Catan game page
    // For example, check if URL matches known Catan game sites
    
    // Example: colonist.io, catan.com, etc.
    const catanUrls = ['colonist.io', 'catanuniverse.com', 'playcatan.com'];
    const isCatanSite = catanUrls.some(url => tab.url && tab.url.includes(url));
    
    if (isCatanSite) {
      console.log('Catan game detected on tab:', tabId);
      // You can show a notification or update badge
    }
  }
});
