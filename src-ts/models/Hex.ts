// Territory hex management for PF2e Kingdom Lite
// Auto-converted and fixed from Hex.kt

/**
 * Types of worksites that can be built according to Kingdom Rules
 */
export enum WorksiteType {
  FARMSTEAD = 'Farmstead',
  LOGGING_CAMP = 'Logging Camp',
  QUARRY = 'Quarry',
  MINE = 'Mine',
  BOG_MINE = 'Bog Mine',
  HUNTING_FISHING_CAMP = 'Hunting/Fishing Camp',
  OASIS_FARM = 'Oasis Farm'
}

/**
 * Worksite configuration
 */
export const WorksiteConfig = {
  [WorksiteType.FARMSTEAD]: { displayName: 'Farmstead', icon: 'fa-wheat-awn' },
  [WorksiteType.LOGGING_CAMP]: { displayName: 'Logging Camp', icon: 'fa-tree' },
  [WorksiteType.QUARRY]: { displayName: 'Quarry', icon: 'fa-cube' },
  [WorksiteType.MINE]: { displayName: 'Mine', icon: 'fa-gem' },
  [WorksiteType.BOG_MINE]: { displayName: 'Bog Mine', icon: 'fa-tint' },
  [WorksiteType.HUNTING_FISHING_CAMP]: { displayName: 'Hunting/Fishing Camp', icon: 'fa-fish' },
  [WorksiteType.OASIS_FARM]: { displayName: 'Oasis Farm', icon: 'fa-water' }
};

/**
 * Represents a worksite built on a hex
 */
export class Worksite {
  type: WorksiteType;
  
  constructor(type: WorksiteType) {
    this.type = type;
  }
  
  /**
   * Get base production based on terrain type according to Kingdom Rules
   * Each hex can hold ONE worksite, and terrain determines what it can produce
   */
  getBaseProduction(terrain: string): Map<string, number> {
    switch (this.type) {
      case WorksiteType.FARMSTEAD:
        switch (terrain) {
          case 'Plains':
            return new Map([['food', 2]]);
          case 'Hills':
            return new Map([['food', 1]]); // Alternative option for Hills
          default:
            return new Map();
        }
        
      case WorksiteType.LOGGING_CAMP:
        switch (terrain) {
          case 'Forest':
            return new Map([['lumber', 2]]);
          default:
            return new Map();
        }
        
      case WorksiteType.QUARRY:
        switch (terrain) {
          case 'Hills':
            return new Map([['stone', 1]]);
          case 'Mountains':
            return new Map([['stone', 1]]); // Alternative option for Mountains
          default:
            return new Map();
        }
        
      case WorksiteType.MINE:
        switch (terrain) {
          case 'Mountains':
            return new Map([['ore', 1]]);
          default:
            return new Map();
        }
        
      case WorksiteType.BOG_MINE:
        switch (terrain) {
          case 'Swamp':
            return new Map([['ore', 1]]); // Alternative option for Swamp
          default:
            return new Map();
        }
        
      case WorksiteType.HUNTING_FISHING_CAMP:
        switch (terrain) {
          case 'Swamp':
            return new Map([['food', 1]]);
          default:
            return new Map();
        }
        
      case WorksiteType.OASIS_FARM:
        switch (terrain) {
          case 'Desert':
            return new Map([['food', 1]]); // Special case: only if Oasis trait is present
          default:
            return new Map();
        }
        
      default:
        return new Map();
    }
  }
  
  /**
   * Check if this worksite type is valid for the given terrain
   */
  isValidForTerrain(terrain: string): boolean {
    return this.getBaseProduction(terrain).size > 0;
  }
}

/**
 * Represents a hex of territory controlled by the kingdom
 */
export class Hex {
  id: string;
  terrain: string;
  worksite: Worksite | null;
  hasSpecialTrait: boolean;
  name: string | null;
  
  constructor(
    id: string,
    terrain: string,
    worksite: Worksite | null = null,
    hasSpecialTrait: boolean = false,
    name: string | null = null
  ) {
    this.id = id;
    this.terrain = terrain;
    this.worksite = worksite;
    this.hasSpecialTrait = hasSpecialTrait;
    this.name = name;
  }
  
  /**
   * Calculate the production from this hex
   */
  getProduction(): Map<string, number> {
    if (!this.worksite) {
      return new Map();
    }
    
    const baseProduction = new Map(this.worksite.getBaseProduction(this.terrain));
    
    // Special traits add +1 to production
    if (this.hasSpecialTrait) {
      baseProduction.forEach((amount, resource) => {
        baseProduction.set(resource, amount + 1);
      });
    }
    
    return baseProduction;
  }
}

/**
 * Get valid worksite types for a specific terrain
 */
export function getValidWorksitesForTerrain(terrain: string, hasOasisTrait: boolean = false): WorksiteType[] {
  switch (terrain) {
    case 'Plains':
      return [WorksiteType.FARMSTEAD];
      
    case 'Forest':
      return [WorksiteType.LOGGING_CAMP];
      
    case 'Hills':
      return [WorksiteType.QUARRY, WorksiteType.FARMSTEAD];
      
    case 'Mountains':
      return [WorksiteType.MINE, WorksiteType.QUARRY];
      
    case 'Swamp':
      return [WorksiteType.HUNTING_FISHING_CAMP, WorksiteType.BOG_MINE];
      
    case 'Desert':
      return hasOasisTrait ? [WorksiteType.OASIS_FARM] : [];
      
    default:
      return [];
  }
}
