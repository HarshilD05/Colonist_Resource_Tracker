// Log Class - Represents a single game log entry

class GameLog {
  constructor(dataIndex, containerElement) {
    this.dataIndex = parseInt(dataIndex);
    this.containerElement = containerElement;
    
    // Navigate through DOM hierarchy: scrollItemContainer -> feedMessage -> messagePart
    const feedMessage = containerElement.querySelector('[class*="feedMessage"]');
    this.messageElement = feedMessage ? feedMessage.querySelector('[class*="messagePart"]') : null;
    
    if (!this.messageElement) {
      console.warn(`Log[${dataIndex}]: messagePart not found in DOM structure`);
    }
    
    // Parsed data
    this.player = null;
    this.playerColor = null;
    this.action = null;
    this.otherPlayersAffected = [];
    this.resourcesGained = {};
    this.resourcesLost = {};
    this.developmentCard = null;
    
    // Parse the log entry
    this.parse();
  }
  
  // Parse the log message
  parse() {
    if (!this.messageElement) return;
    
    const messageText = this.messageElement.textContent.trim();
    console.log(`Message text : ${messageText}`);
    
    // Skip empty messages or separators
    if (!messageText || messageText === '' || this.messageElement.querySelector('hr')) {
      this.action = 'separator';
      return;
    }
    
    // Extract player name and color (first bold/colored span)
    const playerSpan = this.messageElement.querySelector('span[style*="font-weight:600"]');
    if (playerSpan) {
      this.player = playerSpan.textContent.trim();
      
      // Extract color from style attribute
      const styleAttr = playerSpan.getAttribute('style');
      if (styleAttr) {
        const colorMatch = styleAttr.match(/color:\s*([^;]+)/);
        if (colorMatch) {
          this.playerColor = colorMatch[1].trim();
        }
      }
    }
    
    // Determine action type and parse accordingly
    const lowerText = messageText.toLowerCase();
    
    if (lowerText.includes('rolled')) {
      this.action = 'rolled_dice';
      this.parseDiceRoll();
    }
    else if (lowerText.includes('received starting resources')) {
      this.action = 'starting_resources';
      this.parseResourceGain();
    }
    else if (lowerText.includes('got') && !lowerText.includes('and got')) {
      this.action = 'received_resources';
      this.parseResourceGain();
    }
    else if (lowerText.includes('gave') && lowerText.includes('to bank') && lowerText.includes('and got')) {
      this.action = 'bank_trade';
      this.parseBankTrade();
    }
    else if (lowerText.includes('gave') && lowerText.includes('and got') && lowerText.includes('from')) {
      this.action = 'completed_trade';
      this.parseTrade();
    }
    else if (lowerText.includes('wants to give') && lowerText.includes('for')) {
      this.action = 'offered_trade';
      this.parseTradeOffer();
    }
    else if (lowerText.includes('placed a road')) {
      // Setup phase - free road, no cost
      this.action = 'placed_road_setup';
    }
    else if (lowerText.includes('built a road')) {
      this.action = 'built_road';
      this.resourcesLost = { wood: 1, brick: 1 };
    }
    else if (lowerText.includes('placed a settlement')) {
      // Setup phase - free settlement, no cost
      this.action = 'placed_settlement_setup';
    }
    else if (lowerText.includes('built a settlement')) {
      this.action = 'built_settlement';
      this.resourcesLost = { wood: 1, brick: 1, wool: 1, wheat: 1 };
    }
    else if (lowerText.includes('placed a city') || lowerText.includes('upgraded to city')) {
      // Cities are never "placed" in setup, they're always built
      this.action = 'built_city';
      this.resourcesLost = { wheat: 2, stone: 3 };
    }
    else if (lowerText.includes('built a city')) {
      this.action = 'built_city';
      this.resourcesLost = { wheat: 2, stone: 3 };
    }
    else if (lowerText.includes('bought') && lowerText.includes('development')) {
      this.action = 'bought_dev_card';
      this.resourcesLost = { wool: 1, wheat: 1, stone: 1 };
    }
    else if (lowerText.includes('stole') && lowerText.includes('from')) {
      // Robber steal: "Player stole [resource] from OtherPlayer"
      this.action = 'stole_resource';
      this.parseSteal();
    }
    else if (lowerText.includes('stole') && !lowerText.includes('from')) {
      // Monopoly: "Player stole [resources]" (no 'from')
      this.action = 'monopoly';
      this.parseMonopoly();
    }
    else if (lowerText.includes('discarded')) {
      this.action = 'discarded_resources';
      this.parseDiscard();
    }
    else if (lowerText.includes('played') || lowerText.includes('used')) {
      this.action = 'played_dev_card';
      this.parseDevCard();
    }
    else if (lowerText.includes('monopoly')) {
      this.action = 'monopoly';
      this.parseMonopoly();
    }
    else if (lowerText.includes('year of plenty')) {
      this.action = 'year_of_plenty';
      this.parseYearOfPlenty();
    }
    else {
      this.action = 'unknown';
    }
  }
  
  // Parse dice roll (no resource changes)
  parseDiceRoll() {
    // Dice rolls don't directly change resources in tracking
    // Resources are tracked when "got" messages appear
  }
  
  // Parse resource gain: "Player got [resource images]"
  parseResourceGain() {
    const html = this.messageElement.innerHTML;
    console.log(`parseResourceGain: Parsing HTML`);
    
    // Extract all alt="" attributes from the HTML
    const altMatches = html.matchAll(/alt="([^"]+)"/gi);
    for (const match of altMatches) {
      const alt = match[1];
      console.log(`  Image alt: "${alt}"`);
      const resourceType = identifyResourceFromAlt(alt);
      
      if (resourceType) {
        this.resourcesGained[resourceType] = (this.resourcesGained[resourceType] || 0) + 1;
        console.log(`  Identified as: ${resourceType}`);
      } else {
        console.log(`  Could not identify resource type`);
      }
    }
    
    console.log(`  Total resources gained:`, this.resourcesGained);
  }
  
  // Parse trade: "Player gave [resource] and got [resource] from OtherPlayer"
  parseTrade() {
    const text = this.messageElement.textContent;
    const html = this.messageElement.innerHTML;
    
    // Find "from" to identify other player
    const fromMatch = text.match(/from\s+(\w+)/i);
    if (fromMatch) {
      this.otherPlayersAffected.push(fromMatch[1]);
    }
    
    // Find positions of "gave" and "got" in the HTML
    const gaveIndex = html.toLowerCase().indexOf('gave');
    const gotIndex = html.toLowerCase().indexOf('got');
    
    if (gaveIndex === -1 || gotIndex === -1) {
      console.warn('Could not find "gave" or "got" in trade message');
      return;
    }
    
    // Extract HTML sections
    const gaveToGotSection = html.substring(gaveIndex, gotIndex);
    const afterGotSection = html.substring(gotIndex);
    
    // Extract all alt="" attributes from the "gave" to "got" section (resources lost)
    const lostAltMatches = gaveToGotSection.matchAll(/alt="([^"]+)"/gi);
    for (const match of lostAltMatches) {
      const alt = match[1];
      const resourceType = identifyResourceFromAlt(alt);
      if (resourceType) {
        this.resourcesLost[resourceType] = (this.resourcesLost[resourceType] || 0) + 1;
        console.log(`  Trade lost: ${resourceType} (alt: "${alt}")`);
      }
    }
    
    // Extract all alt="" attributes from after "got" section (resources gained)
    const gainedAltMatches = afterGotSection.matchAll(/alt="([^"]+)"/gi);
    for (const match of gainedAltMatches) {
      const alt = match[1];
      const resourceType = identifyResourceFromAlt(alt);
      if (resourceType) {
        this.resourcesGained[resourceType] = (this.resourcesGained[resourceType] || 0) + 1;
        console.log(`  Trade gained: ${resourceType} (alt: "${alt}")`);
      }
    }
  }
  
  // Parse bank trade: "Player gave [resource] to bank and got [resource]"
  parseBankTrade() {
    const html = this.messageElement.innerHTML;
    
    this.otherPlayersAffected.push('BANK');
    
    // Find positions of "gave" and "to bank" and "got" in the HTML
    const gaveIndex = html.toLowerCase().indexOf('gave');
    const toBankIndex = html.toLowerCase().indexOf('to bank');
    const gotIndex = html.toLowerCase().indexOf('got');
    
    if (gaveIndex === -1 || toBankIndex === -1 || gotIndex === -1) {
      console.warn('Could not find "gave", "to bank", or "got" in bank trade message');
      return;
    }
    
    // Extract HTML sections
    const gaveToToBankSection = html.substring(gaveIndex, toBankIndex);
    const afterGotSection = html.substring(gotIndex);
    
    // Extract all alt="" attributes from the "gave" to "to bank" section (resources lost)
    const lostAltMatches = gaveToToBankSection.matchAll(/alt="([^"]+)"/gi);
    for (const match of lostAltMatches) {
      const alt = match[1];
      const resourceType = identifyResourceFromAlt(alt);
      if (resourceType) {
        this.resourcesLost[resourceType] = (this.resourcesLost[resourceType] || 0) + 1;
        console.log(`  Bank trade lost: ${resourceType} (alt: "${alt}")`);
      }
    }
    
    // Extract all alt="" attributes from after "got" section (resources gained)
    const gainedAltMatches = afterGotSection.matchAll(/alt="([^"]+)"/gi);
    for (const match of gainedAltMatches) {
      const alt = match[1];
      const resourceType = identifyResourceFromAlt(alt);
      if (resourceType) {
        this.resourcesGained[resourceType] = (this.resourcesGained[resourceType] || 0) + 1;
        console.log(`  Bank trade gained: ${resourceType} (alt: "${alt}")`);
      }
    }
  }
  
  // Parse trade offer (no immediate resource changes)
  parseTradeOffer() {
    // Trade offers don't change resources until completed
  }
  
  // Parse stealing: "Player stole [resource] from you/OtherPlayer"
  parseSteal() {
    const text = this.messageElement.textContent;
    const html = this.messageElement.innerHTML;
    
    // Extract all alt="" attributes to check for resources
    const altMatches = html.matchAll(/alt="([^"]+)"/gi);
    let hasResourceImage = false;
    
    for (const match of altMatches) {
      const alt = match[1];
      const resourceType = identifyResourceFromAlt(alt);
      if (resourceType) {
        this.resourcesGained[resourceType] = (this.resourcesGained[resourceType] || 0) + 1;
        hasResourceImage = true;
      }
    }
    
    // If no resource image, it's an unknown card
    if (!hasResourceImage) {
      this.resourcesGained['unknown'] = 1;
    }
    
    // Determine victim - look for "from [name]" pattern
    // Pattern: "Player stole X from Victim" or "You stole X from Victim"
    const fromMatch = text.match(/from\s+([\w]+)/i);
    if (fromMatch) {
      const victimName = fromMatch[1].trim();
      // Check if victim is "you" (current player)
      if (victimName.toLowerCase() === 'you') {
        this.otherPlayersAffected = ['CURRENT_PLAYER'];
      } else {
        this.otherPlayersAffected.push(victimName);
      }
    }
  }
  
  // Parse discard: "Player discarded [resource images]"
  parseDiscard() {
    const html = this.messageElement.innerHTML;
    
    // Extract all alt="" attributes from the HTML
    const altMatches = html.matchAll(/alt="([^"]+)"/gi);
    for (const match of altMatches) {
      const alt = match[1];
      const resourceType = identifyResourceFromAlt(alt);
      if (resourceType) {
        this.resourcesLost[resourceType] = (this.resourcesLost[resourceType] || 0) + 1;
      }
    }
  }
  
  // Parse development card usage
  parseDevCard() {
    const text = this.messageElement.textContent.toLowerCase();
    if (text.includes('knight')) {
      this.developmentCard = 'knight';
    } else if (text.includes('road building')) {
      this.developmentCard = 'road_building';
    } else if (text.includes('monopoly')) {
      this.developmentCard = 'monopoly';
    } else if (text.includes('year of plenty')) {
      this.developmentCard = 'year_of_plenty';
    }
  }
  
  // Parse monopoly card
  parseMonopoly() {
    this.otherPlayersAffected = ['EVERYBODY_ELSE'];
    this.developmentCard = 'monopoly';
    this.parseResourceGain();
  }
  
  // Parse year of plenty
  parseYearOfPlenty() {
    this.developmentCard = 'year_of_plenty';
    this.parseResourceGain();
  }
  
  // Check if this log affects a specific player
  affectsPlayer(playerName) {
    if (this.player === playerName) return true;
    if (this.otherPlayersAffected.includes(playerName)) return true;
    if (this.otherPlayersAffected.includes('EVERYBODY_ELSE')) return true;
    return false;
  }
  
  // Get summary string for debugging
  toString() {
    return `Log[${this.dataIndex}]: ${this.player} - ${this.action} | Gained: ${JSON.stringify(this.resourcesGained)} | Lost: ${JSON.stringify(this.resourcesLost)}`;
  }
}
