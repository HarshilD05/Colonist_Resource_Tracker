// Resource Table UI - Draggable and Resizable Floating Window

let tableElement = null;
let isDragging = false;
let isResizing = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let isDarkMode = false;

// Create and inject floating resource table into page
function createResourceTable() {
  // Check if table already exists
  if (document.getElementById('catan-tracker-window')) {
    tableElement = document.getElementById('catan-tracker-window');
    return;
  }

  // Create floating window container
  const floatingWindow = document.createElement('div');
  floatingWindow.id = 'catan-tracker-window';
  floatingWindow.className = 'catan-tracker-theme'; // Add theme class
  floatingWindow.innerHTML = `
    <div class="tracker-header" id="tracker-drag-handle">
      <div class="header-title">
        <h2>🎲 Resource Tracker</h2>
        <span class="dev-cards-counter" id="dev-cards-counter">Dev Cards: 25</span>
      </div>
      <div class="header-controls">
        <button class="theme-toggle-btn" id="tracker-theme-toggle" title="Toggle Dark Mode">
          <span class="theme-icon">🌙</span>
        </button>
        <button class="minimize-btn" id="tracker-minimize-btn" title="Minimize">−</button>
        <button class="close-btn" id="tracker-close-btn" title="Close">×</button>
      </div>
    </div>
    <div class="tracker-content" id="tracker-content">
      <div id="tracker-players-container" class="players-container">
        <div class="empty-state">No players tracked yet...</div>
      </div>
    </div>
    <div class="tracker-footer" id="tracker-footer">
      <div class="dev-footer-row" id="dev-footer-row">
        <div class="dev-footer-item">
          <img src="${chrome.runtime.getURL('images/knight.svg')}" alt="Knight" class="dev-footer-icon">
          <span class="dev-footer-count" data-dev-card-key="knights">${window.devCardBank?.knights ?? 0}</span>
        </div>
        <div class="dev-footer-item">
          <img src="${chrome.runtime.getURL('images/road_building.svg')}" alt="Road Building" class="dev-footer-icon">
          <span class="dev-footer-count" data-dev-card-key="roadBuilding">${window.devCardBank?.roadBuilding ?? 0}</span>
        </div>
        <div class="dev-footer-item">
          <img src="${chrome.runtime.getURL('images/year_of_plenty.svg')}" alt="Year of Plenty" class="dev-footer-icon">
          <span class="dev-footer-count" data-dev-card-key="yearOfPlenty">${window.devCardBank?.yearOfPlenty ?? 0}</span>
        </div>
        <div class="dev-footer-item">
          <img src="${chrome.runtime.getURL('images/monopoly.svg')}" alt="Monopoly" class="dev-footer-icon">
          <span class="dev-footer-count" data-dev-card-key="monopoly">${window.devCardBank?.monopoly ?? 0}</span>
        </div>
        <div class="dev-footer-item">
          <img src="${chrome.runtime.getURL('images/victory_point.svg')}" alt="Victory Point" class="dev-footer-icon">
          <span class="dev-footer-count" data-dev-card-key="victoryPoints">${window.devCardBank?.victoryPoints ?? 0}</span>
        </div>
      </div>
    </div>
    <div class="resize-handle" id="tracker-resize-handle"></div>
  `;

  // Append to body
  document.body.appendChild(floatingWindow);
  tableElement = floatingWindow;

  // Create sidebar button (hidden by default)
  createSidebarButton();

  // Setup drag functionality
  setupDragFunctionality(floatingWindow);
  
  // Setup resize functionality
  setupResizeFunctionality(floatingWindow);

  // Add event listeners for buttons
  document.getElementById('tracker-minimize-btn').addEventListener('click', toggleMinimize);
  document.getElementById('tracker-close-btn').addEventListener('click', closeWindowToSidebar);
  document.getElementById('tracker-theme-toggle').addEventListener('click', toggleTheme);

  console.log('Floating resource table created and injected');
}

// Create sidebar button for reopening
function createSidebarButton() {
  if (document.getElementById('catan-tracker-sidebar-btn')) return;
  
  const sidebarBtn = document.createElement('button');
  sidebarBtn.id = 'catan-tracker-sidebar-btn';
  sidebarBtn.className = 'catan-tracker-theme';
  sidebarBtn.innerHTML = '🎲';
  sidebarBtn.title = 'Open Resource Tracker';
  sidebarBtn.style.display = 'none'; // Hidden initially
  
  sidebarBtn.addEventListener('click', () => {
    showWindow();
    sidebarBtn.style.display = 'none';
  });
  
  document.body.appendChild(sidebarBtn);
}

// Setup drag functionality
function setupDragFunctionality(windowElement) {
  const dragHandle = document.getElementById('tracker-drag-handle');
  
  dragHandle.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return; // Don't drag when clicking buttons
    
    isDragging = true;
    
    // Get current window position
    const rect = windowElement.getBoundingClientRect();
    
    // Calculate offset from mouse position to window's top-left corner
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    
    dragHandle.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragOffsetX;
    const newY = e.clientY - dragOffsetY;
    
    // Keep window within viewport bounds
    const maxX = window.innerWidth - windowElement.offsetWidth;
    const maxY = window.innerHeight - windowElement.offsetHeight;
    
    windowElement.style.left = Math.max(0, Math.min(newX, maxX)) + 'px';
    windowElement.style.top = Math.max(0, Math.min(newY, maxY)) + 'px';
    windowElement.style.transform = 'none'; // Remove centering transform
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      dragHandle.style.cursor = 'grab';
    }
  });
}

// Setup resize functionality
function setupResizeFunctionality(windowElement) {
  const resizeHandle = document.getElementById('tracker-resize-handle');
  let startX, startY, startWidth, startHeight;
  
  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    startWidth = windowElement.offsetWidth;
    startHeight = windowElement.offsetHeight;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    
    const newWidth = Math.max(320, startWidth + deltaX);
    const newHeight = Math.max(200, startHeight + deltaY);
    
    windowElement.style.width = newWidth + 'px';
    windowElement.style.height = newHeight + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
    }
  });
}

// Toggle minimize state
function toggleMinimize() {
  const windowElement = document.getElementById('catan-tracker-window');
  const content = windowElement.querySelector('.tracker-content');
  const footer = windowElement.querySelector('.tracker-footer');
  const minimizeBtn = document.getElementById('tracker-minimize-btn');
  
  if (windowElement.classList.contains('minimized')) {
    windowElement.classList.remove('minimized');
    content.style.display = 'block';
    if (footer) footer.style.display = 'flex';
    minimizeBtn.textContent = '-';
  } else {
    windowElement.classList.add('minimized');
    content.style.display = 'none';
    if (footer) footer.style.display = 'none';
    minimizeBtn.textContent = '+';
  }
}

// Close window and show sidebar button
function closeWindowToSidebar() {
  const windowElement = document.getElementById('catan-tracker-window');
  const sidebarBtn = document.getElementById('catan-tracker-sidebar-btn');
  
  if (windowElement) {
    windowElement.style.display = 'none';
  }
  
  if (sidebarBtn) {
    sidebarBtn.style.display = 'flex';
    // Sync dark mode class
    if (isDarkMode) {
      sidebarBtn.classList.add('dark-mode');
    }
  }
}

// Close window (old function for compatibility)
function closeWindow() {
  closeWindowToSidebar();
}

// Show window
function showWindow() {
  const windowElement = document.getElementById('catan-tracker-window');
  if (windowElement) {
    windowElement.style.display = 'flex';
  }
}

// Toggle theme between light and dark mode
function toggleTheme() {
  isDarkMode = !isDarkMode;
  const windowElement = document.getElementById('catan-tracker-window');
  const sidebarBtn = document.getElementById('catan-tracker-sidebar-btn');
  const themeBtn = document.getElementById('tracker-theme-toggle');
  
  if (isDarkMode) {
    windowElement?.classList.add('dark-mode');
    sidebarBtn?.classList.add('dark-mode');
    if (themeBtn) {
      themeBtn.querySelector('.theme-icon').textContent = '☀️';
      themeBtn.title = 'Toggle Light Mode';
    }
  } else {
    windowElement?.classList.remove('dark-mode');
    sidebarBtn?.classList.remove('dark-mode');
    if (themeBtn) {
      themeBtn.querySelector('.theme-icon').textContent = '🌙';
      themeBtn.title = 'Toggle Dark Mode';
    }
  }
}

// Update table with current player data
function updateResourceTable(players) {
  console.log('updateResourceTable called with players:', players);
  
  const container = document.getElementById('tracker-players-container');
  if (!container) {
    console.error('tracker-players-container not found in DOM!');
    return;
  }

  const playersList = Object.values(players);
  console.log('Players list:', playersList);

  // Remove duplicates (e.g., "You" mapped to same object as actual player name)
  const uniquePlayers = [];
  const seenPlayers = new Set();
  playersList.forEach(player => {
    if (!seenPlayers.has(player.name)) {
      uniquePlayers.push(player);
      seenPlayers.add(player.name);
    }
  });

  if (uniquePlayers.length === 0) {
    container.innerHTML = '<div class="empty-state">No players tracked yet...</div>';
    updateDevCardDisplays();
    return;
  }

  // Build player cards
  container.innerHTML = uniquePlayers.map(player => {
    const resources = [
      { type: 'wheat', icon: chrome.runtime.getURL('images/wheat.svg'), count: player.resources.wheat },
      { type: 'stone', icon: chrome.runtime.getURL('images/stone.svg'), count: player.resources.stone },
      { type: 'brick', icon: chrome.runtime.getURL('images/brick.svg'), count: player.resources.brick },
      { type: 'wood', icon: chrome.runtime.getURL('images/wood.svg'), count: player.resources.wood },
      { type: 'wool', icon: chrome.runtime.getURL('images/wool.svg'), count: player.resources.wool },
      { type: 'unknown', icon: chrome.runtime.getURL('images/unknown.svg'), count: player.resources.unknown }
    ].filter(r => r.count > 0); // Only show resources they have

    const resourcesHTML = resources.length > 0 
      ? resources.map(r => `
          <div class="resource-item">
            <img src="${r.icon}" alt="${r.type}" class="resource-icon">
            <span class="resource-count">${r.count}</span>
          </div>
        `).join('')
      : '<div class="no-resources">No resources</div>';

    return `
      <div class="player-card">
        <div class="player-name" style="color: ${player.color}; text-shadow: 0 0 10px ${player.color}40;">${player.name}</div>
        <div class="player-resources">
          ${resourcesHTML}
        </div>
      </div>
    `;
  }).join('');
  
  updateDevCardDisplays();

  console.log('Table updated successfully');
}

function updateDevCardDisplays() {
  const devCardCounter = document.getElementById('dev-cards-counter');
  if (devCardCounter && window.devCardBank) {
    devCardCounter.textContent = `Dev Cards: ${window.devCardBank.remaining}`;
  }

  const footerRow = document.getElementById('dev-footer-row');
  if (footerRow && window.devCardBank) {
    const countSpans = footerRow.querySelectorAll('[data-dev-card-key]');
    countSpans.forEach(span => {
      const key = span.getAttribute('data-dev-card-key');
      if (key && key in window.devCardBank) {
        span.textContent = window.devCardBank[key];
      }
    });
  }
}

// Legacy function names for backwards compatibility
function createSidebar() {
  createResourceTable();
}

function updateSidebarDisplay(players) {
  updateResourceTable(players);
}
