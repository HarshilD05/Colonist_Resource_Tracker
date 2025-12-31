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
