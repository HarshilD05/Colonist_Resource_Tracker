// Player Class - Manages individual player resources

// Global resource mapping - Maps all alternative names to standard resource types
const RESOURCE_MAP = {
  // Wheat and alternatives
  'wheat': 'wheat',
  'grain': 'wheat',
  
  // Stone and alternatives
  'stone': 'stone',
  'ore': 'stone',
  'rock': 'stone',
  
  // Brick and alternatives
  'brick': 'brick',
  'clay': 'brick',
  
  // Wood and alternatives
  'wood': 'wood',
  'lumber': 'wood',
  'tree': 'wood',
  
  // Wool and alternatives
  'wool': 'wool',
  'sheep': 'wool'
};

// Helper function to identify resource from image alt text
function identifyResourceFromAlt(altText) {
  const alt = altText.toLowerCase();
  for (const key in RESOURCE_MAP) {
    if (alt.includes(key)) {
      return RESOURCE_MAP[key];
    }
  }
  return null;
}

// Player Class to manage resources
class Player {
  constructor(name, color = '#ffffff') {
    this.name = name;
    this.color = color; // Player's assigned color from game
    this.colorFrozen = false; // Once color is assigned from log, freeze it
    this.resources = {
      wheat: 0,
      stone: 0,
      brick: 0,
      wood: 0,
      wool: 0,
      unknown: 0
    };
  }
  
  // Set player color (only if not frozen)
  setColor(color) {
    if (!this.colorFrozen && color) {
      this.color = color;
      this.colorFrozen = true;
      console.log(`${this.name} color set to ${color}`);
    }
  }

  // Add resources
  addResource(resourceType, amount = 1) {
    const mappedResource = RESOURCE_MAP[resourceType.toLowerCase()];
    if (mappedResource && this.resources.hasOwnProperty(mappedResource)) {
      this.resources[mappedResource] += amount;
      console.log(`${this.name} gained ${amount} ${mappedResource}`);
    }
  }

  // Remove resources
  removeResource(resourceType, amount = 1) {
    const mappedResource = RESOURCE_MAP[resourceType.toLowerCase()];
    if (mappedResource && this.resources.hasOwnProperty(mappedResource)) {
      this.resources[mappedResource] = Math.max(0, this.resources[mappedResource] - amount);
      console.log(`${this.name} spent ${amount} ${mappedResource}`);
    }
  }

  // Built a Road: -1 wood, -1 brick
  builtRoad() {
    this.removeResource('wood', 1);
    this.removeResource('brick', 1);
    console.log(`${this.name} built a road`);
  }

  // Bought Development Card: -1 wool, -1 wheat, -1 stone
  boughtDevCard() {
    this.removeResource('wool', 1);
    this.removeResource('wheat', 1);
    this.removeResource('stone', 1);
    console.log(`${this.name} bought a development card`);
  }

  // Built a Settlement: -1 wood, -1 brick, -1 wool, -1 wheat
  builtSettlement() {
    this.removeResource('wood', 1);
    this.removeResource('brick', 1);
    this.removeResource('wool', 1);
    this.removeResource('wheat', 1);
    console.log(`${this.name} built a settlement`);
  }

  // Built a City: -2 wheat, -3 stone
  builtCity() {
    this.removeResource('wheat', 2);
    this.removeResource('stone', 3);
    console.log(`${this.name} built a city`);
  }

  // Stole a resource from another player: +1 resource
  stoleResource(resourceType) {
    this.addResource(resourceType, 1);
    console.log(`${this.name} stole ${resourceType}`);
  }

  // Discarded resources (e.g., when 7 is rolled)
  discardedResources(resourcesList) {
    resourcesList.forEach(resourceType => {
      this.removeResource(resourceType, 1);
    });
    console.log(`${this.name} discarded ${resourcesList.length} resources`);
  }

  // Get total resource count
  getTotalResources() {
    return Object.values(this.resources).reduce((sum, count) => sum + count, 0);
  }

  // Deduce unknown resources when player performs action
  deduceUnknownFromAction(requiredResources) {
    if (this.resources.unknown === 0) return;

    let unknownUsed = 0;

    // Check each required resource
    for (const [resource, needed] of Object.entries(requiredResources)) {
      const available = this.resources[resource] || 0;
      if (available < needed) {
        // We're short on this resource, must have been from unknown
        const shortage = needed - available;
        unknownUsed += shortage;
        // Don't actually remove yet, will be handled by removeResource
      }
    }

    // If we used unknown resources, reduce the unknown count
    if (unknownUsed > 0 && this.resources.unknown >= unknownUsed) {
      this.resources.unknown -= unknownUsed;
    }
  }

  // Get count of known resource types (excluding unknown)
  getKnownResourceTypes() {
    const types = [];
    for (const [resource, count] of Object.entries(this.resources)) {
      if (resource !== 'unknown' && count > 0) {
        types.push(resource);
      }
    }
    return types;
  }

  // Check if we can deterministically know what was stolen
  getDeterministicResource() {
    const knownTypes = this.getKnownResourceTypes();
    
    // If only one type of known resource, we know what was stolen
    if (knownTypes.length === 1 && this.resources.unknown === 0) {
      return knownTypes[0];
    }
    
    return null;
  }

  // Convert to plain object for storage
  toJSON() {
    return {
      name: this.name,      color: this.color,
      colorFrozen: this.colorFrozen,      resources: { ...this.resources }
    };
  }
}
