// Log Monitoring - Watches game logs and processes events by data-index

let logObserver = null;
// Initialize currLogIdx - will be restored from storage if available
if (typeof window.currLogIdx === 'undefined') {
  window.currLogIdx = 0;
}

// Local reference to the global currLogIdx for easier access
function getCurrLogIdx() {
  return window.currLogIdx || 0;
}

function setCurrLogIdx(value) {
  window.currLogIdx = value;
}

// Find the virtual scroller element
function findVirtualScroller() {
  const elements = document.querySelectorAll('[class*="virtualScroller"]');
  return elements.length > 0 ? elements[0] : null;
}

// Process existing log messages
function processExistingLogs(container, players) {
  const scrollItems = container.querySelectorAll('[class*="scrollItemContainer"]');
  
  scrollItems.forEach(item => {
    const dataIndex = item.getAttribute('data-index');
    if (dataIndex) {
      processLogByIndex(parseInt(dataIndex), item, players);
    }
  });
  
  console.log(`Finished processing existing logs. Current log index: ${getCurrLogIdx()}`);
}

// Observe game logs for new messages
function observeGameLogs(container, players) {
  if (logObserver) {
    logObserver.disconnect();
  }

  logObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          // Check if it's a scroll item container (matches class containing 'scrollItemContainer')
          if (node.classList && Array.from(node.classList).some(c => c.includes('scrollItemContainer'))) {
            
            const dataIndex = node.getAttribute('data-index');
            if (dataIndex) {
              processLogByIndex(parseInt(dataIndex), node, players);
            }
          }
        }
      });
    });
  });

  logObserver.observe(container, {
    childList: true,
    subtree: true
  });
}

// Process a log by its data-index
function processLogByIndex(dataIndex, containerElement, players) {
  const currLogIdx = getCurrLogIdx();
  
  // Skip if already processed (data-index less than current index)
  if (dataIndex < currLogIdx) {
    return;
  }
  
  // Create GameLog object
  const gameLog = new GameLog(dataIndex, containerElement);
  
  // Update current log index to the next one
  setCurrLogIdx(dataIndex + 1);
  
  console.log(gameLog.toString());
  
  // Skip if no action or separator
  if (!gameLog.action || gameLog.action === 'separator' || gameLog.action === 'unknown') {
    return;
  }
  
  // Skip actions that don't affect resources (like dice rolls, trade offers, setup placements)
  if (gameLog.action === 'rolled_dice' || 
      gameLog.action === 'offered_trade' ||
      gameLog.action === 'placed_road_setup' ||
      gameLog.action === 'placed_settlement_setup') {
    return;
  }
  
  // Apply log effects to players
  applyLogToPlayers(gameLog, players);
}

// Handle stealing when we don't know which card
function handleUnknownSteal(victim) {
  const knownTypes = victim.getKnownResourceTypes();
  const numTypes = knownTypes.length;
  
  // If only one type of resource (and no unknowns), we know what was stolen
  const deterministic = victim.getDeterministicResource();
  if (deterministic) {
    victim.removeResource(deterministic, 1);
    console.log(`Deterministic steal from ${victim.name}: ${deterministic}`);
    return;
  }
  
  // Multiple resource types - reduce each by 1 and add (n-1) unknown
  if (numTypes > 0) {
    knownTypes.forEach(resourceType => {
      victim.removeResource(resourceType, 1);
    });
    
    // Add (n-1) unknown cards
    const unknownToAdd = numTypes - 1;
    if (unknownToAdd > 0) {
      victim.addResource('unknown', unknownToAdd);
    }
    
    console.log(`Unknown steal from ${victim.name}: reduced ${numTypes} types, added ${unknownToAdd} unknown`);
  }
}

// Apply log effects to player resources
function applyLogToPlayers(gameLog, players) {
  // Auto-create player if they don't exist yet
  if (!players[gameLog.player]) {
    players[gameLog.player] = new Player(gameLog.player);
    console.log(`Auto-created player from log: ${gameLog.player}`);
  }
  
  const player = players[gameLog.player];
  
  // Set player color if available and not already frozen
  if (gameLog.playerColor && !player.colorFrozen) {
    player.setColor(gameLog.playerColor);
  }
  
  let updated = false;
  
  // Apply resource gains
  for (const [resource, amount] of Object.entries(gameLog.resourcesGained)) {
    if (amount > 0) {
      player.addResource(resource, amount);
      updated = true;
    }
  }
  
  // Apply resource losses (with deduction for unknown resources)
  if (Object.keys(gameLog.resourcesLost).length > 0) {
    // First, check if we need to deduce unknown resources
    player.deduceUnknownFromAction(gameLog.resourcesLost);
    
    // Then apply the resource losses
    for (const [resource, amount] of Object.entries(gameLog.resourcesLost)) {
      if (amount > 0) {
        player.removeResource(resource, amount);
        updated = true;
      }
    }
  }
  
  // Track development card plays (bank decreases when a card is used)
  if (gameLog.action === 'played_dev_card' || gameLog.action === 'monopoly' || gameLog.action === 'year_of_plenty') {
    const cardType = gameLog.developmentCard || (gameLog.action === 'monopoly' ? 'monopoly' : gameLog.action === 'year_of_plenty' ? 'year_of_plenty' : null);
    if (window.devCardBank && cardType) {
      const mapping = {
        knight: 'knights',
        road_building: 'roadBuilding',
        monopoly: 'monopoly',
        year_of_plenty: 'yearOfPlenty'
      };
      const bankKey = mapping[cardType];
      if (bankKey && window.devCardBank[bankKey] > 0) {
        window.devCardBank[bankKey]--;
        if (window.devCardBank.remaining > 0) {
          window.devCardBank.remaining--;
        }
        console.log(`Dev card played (${cardType}). Remaining: ${window.devCardBank.remaining}/25`);
        updated = true;
      }
    }
  }
  
  // Handle trades - apply to other player as well
  if (gameLog.action === 'completed_trade' && gameLog.otherPlayersAffected.length > 0) {
    const otherPlayerName = gameLog.otherPlayersAffected[0];
    const otherPlayer = players[otherPlayerName];
    
    if (otherPlayer) {
      // Other player receives what this player gave
      for (const [resource, amount] of Object.entries(gameLog.resourcesLost)) {
        if (amount > 0) {
          otherPlayer.addResource(resource, amount);
        }
      }
      
      // Other player gives what this player received
      for (const [resource, amount] of Object.entries(gameLog.resourcesGained)) {
        if (amount > 0) {
          otherPlayer.removeResource(resource, amount);
        }
      }
      updated = true;
    }
  }
  
  // Handle stealing - smart unknown resource handling
  if (gameLog.action === 'stole_resource' && gameLog.otherPlayersAffected.length > 0) {
    const victimName = gameLog.otherPlayersAffected[0];
    if (victimName !== 'CURRENT_PLAYER') {
      const victim = players[victimName];
      if (victim) {
        // Check if we know what was stolen (from thief's perspective)
        const stolenResources = Object.keys(gameLog.resourcesGained);
        
        if (stolenResources.length > 0 && !stolenResources.includes('unknown')) {
          // We can see what was stolen - deterministic
          for (const [resource, amount] of Object.entries(gameLog.resourcesGained)) {
            if (amount > 0) {
              victim.removeResource(resource, amount);
            }
          }
        } else {
          // Unknown card stolen - apply smart logic
          handleUnknownSteal(victim);
        }
        updated = true;
      }
    }
  }
  
  // Sync to storage and update UI if changes were made
  if (updated) {
    syncPlayerData(players);
  }
}

// Sync player data to storage
async function syncPlayerData(players) {
  const playersArray = Object.values(players).map(p => p.toJSON());
  
  console.log('Syncing player data...', playersArray);
  
  try {
    // Get current game ID and store it with players
    const currentGameId = window.location.hash ? window.location.hash.substring(1) : null;
    const currLogIdx = getCurrLogIdx();
    await chrome.storage.local.set({ 
      players: playersArray,
      gameId: currentGameId,
      currLogIdx: currLogIdx
    });
    console.log(`Player data synced to storage (currLogIdx: ${currLogIdx})`);
    
    // Update resource table display
    console.log('Updating resource table UI...');
    updateResourceTable(players);
    
    // Notify background script
    chrome.runtime.sendMessage({
      action: 'playersUpdated',
      players: playersArray
    });
  } catch (error) {
    console.error('Error syncing player data:', error);
  }
}

// Start log monitoring
function startLogMonitoring(players) {
  console.log('Starting log monitoring...');
  
  const virtualScroller = findVirtualScroller();
  
  if (virtualScroller) {
    console.log('Virtual scroller found, setting up observer...');
    observeGameLogs(virtualScroller, players);
    // Process existing messages
    processExistingLogs(virtualScroller, players);
  } else {
    console.log('Virtual scroller not found, will retry...');
    // Retry after a delay
    setTimeout(() => startLogMonitoring(players), 2000);
  }
}

// Clear processed logs (useful for debugging or reset)
function clearProcessedLogs() {
  setCurrLogIdx(0);
  console.log('Processed logs cleared - currLogIdx reset to 0');
}

