// Territory hex management for PF2e Kingdom Lite
// Auto-converted and fixed from Hex.kt

import type { TerrainType, TravelDifficulty } from '../types/terrain';
import type { OwnershipValue } from '../types/ownership';

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
  [WorksiteType.MINE]: { displayName: 'Mine', icon: 'fa-mountain' },
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
    // Normalize terrain for case-insensitive comparison
    const normalizedTerrain = terrain.toLowerCase();
    
    switch (this.type) {
      case WorksiteType.FARMSTEAD:
        // Farmsteads (farmland features) produce food based on terrain
        // According to Kingdom Rules, each terrain has specific yields
        switch (normalizedTerrain) {
          case 'plains':
            return new Map([['food', 2]]); // Plains farmstead produces 2 food
          case 'hills':
            return new Map([['food', 1]]); // Hills farmstead produces 1 food
          case 'forest':
            return new Map([['food', 2]]); // Assuming cleared forest is similar to plains
          case 'swamp':
            return new Map([['food', 1]]); // Hunting/fishing camp produces 1 food
          case 'desert':
            return new Map([['food', 1]]); // Oasis farm produces 1 food
          case 'water':
            return new Map([['food', 1]]); // Fishing boats produce 1 food
          default:
            // Any terrain with farmland should produce something
            // This ensures farmland features always work
            console.warn(`Farmstead on unexpected terrain: ${terrain}, defaulting to 1 food`);
            return new Map([['food', 1]]);
        }
        
      case WorksiteType.LOGGING_CAMP:
        switch (normalizedTerrain) {
          case 'forest':
            return new Map([['lumber', 2]]);
          default:
            return new Map();
        }
        
      case WorksiteType.QUARRY:
        switch (normalizedTerrain) {
          case 'hills':
            return new Map([['stone', 1]]);
          case 'mountains':
            return new Map([['stone', 1]]); // Alternative option for Mountains
          default:
            return new Map();
        }
        
      case WorksiteType.MINE:
        switch (normalizedTerrain) {
          case 'mountains':
            return new Map([['ore', 1]]);
          case 'swamp':
            // Bog Mine is a type of mine that works in swamps
            return new Map([['ore', 1]]);
          default:
            return new Map();
        }
        
      case WorksiteType.BOG_MINE:
        switch (normalizedTerrain) {
          case 'swamp':
            return new Map([['ore', 1]]); // Alternative option for Swamp
          default:
            return new Map();
        }
        
      case WorksiteType.HUNTING_FISHING_CAMP:
        switch (normalizedTerrain) {
          case 'swamp':
            return new Map([['food', 1]]);
          default:
            return new Map();
        }
        
      case WorksiteType.OASIS_FARM:
        switch (normalizedTerrain) {
          case 'desert':
            return new Map([['food', 1]]); // Special case: only if Oasis trait instanceof present
          default:
            return new Map();
        }
        
      default:
        return new Map();
    }
  }
  
  /**
   * Check if this worksite type instanceof valid for the given terrain
   */
  isValidForTerrain(terrain: string): boolean {
    return this.getBaseProduction(terrain).size > 0;
  }
}

/**
 * Hex Feature - Our own feature system (NOT Kingmaker)
 * Extensible for future features like roads, landmarks, etc.
 */
export interface HexFeature {
  type: 'settlement' | 'road' | 'landmark' | 'other';
  
  // Settlement-specific fields (when type = 'settlement')
  linked?: boolean;          // true = has Settlement object, false = vacant marker
  settlementId?: string | null;  // ID linking to Settlement, null if unlinked
  tier?: string;             // Village/Town/City/Metropolis (for display on vacant settlements)
  name?: string;             // Settlement/landmark name (preserved from Kingmaker import)
  
  // Extensible for future feature types
  [key: string]: any;
}

/**
 * Represents a hex of territory controlled by the kingdom
 */
export class Hex {
  // Coordinates (primary identifiers)
  row: number;
  col: number;
  
  // Basic properties
  terrain: TerrainType;
  travel: TravelDifficulty; // Movement difficulty (for future movement mechanics)
  name: string | null;
  
  // Ownership
  // - "player" = Owned by player kingdom
  // - string = Owned by named faction (e.g., "Pitax", "Brevoy")
  // - null = Wilderness/unclaimed
  claimedBy: OwnershipValue;
  
  // Infrastructure
  worksite: Worksite | null;
  hasRoad: boolean;
  fortified: number; // 0-4, represents fortification level
  
  // Game mechanics
  hasCommodityBonus: boolean; // Hex has matching commodity for worksite (e.g., lumber commodity + logging camp)
  
  // Our own features (NOT Kingmaker)
  features: HexFeature[];
  
  constructor(
    row: number,
    col: number,
    terrain: TerrainType,
    travel: TravelDifficulty = 'open', // Default to open terrain
    worksite: Worksite | null = null,
    hasCommodityBonus: boolean = false,
    name: string | null = null,
    claimedBy: OwnershipValue = null,
    hasRoad: boolean = false,
    fortified: number = 0, // Default to 0 (unfortified)
    features: HexFeature[] = []
  ) {
    this.row = row;
    this.col = col;
    this.terrain = terrain;
    this.travel = travel;
    this.worksite = worksite;
    this.hasCommodityBonus = hasCommodityBonus;
    this.name = name;
    this.claimedBy = claimedBy;
    this.hasRoad = hasRoad;
    this.fortified = fortified;
    this.features = features;
  }
  
  /**
   * Get hex ID in dot notation (for backwards compatibility)
   */
  get id(): string {
    return `${this.row}.${this.col.toString().padStart(2, '0')}`;
  }
  
  /**
   * Calculate the production from this hex
   */
  getProduction(): Map<string, number> {
    if (!this.worksite) {
      return new Map();
    }
    
    const baseProduction = new Map(this.worksite.getBaseProduction(this.terrain));
    
    // Commodity bonus adds +1 to production
    if (this.hasCommodityBonus) {
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
  // Normalize terrain for case-insensitive comparison
  const normalizedTerrain = terrain.toLowerCase();
  
  switch (normalizedTerrain) {
    case 'plains':
      return [WorksiteType.FARMSTEAD];
      
    case 'forest':
      return [WorksiteType.LOGGING_CAMP];
      
    case 'hills':
      return [WorksiteType.QUARRY, WorksiteType.FARMSTEAD];
      
    case 'mountains':
      return [WorksiteType.MINE, WorksiteType.QUARRY];
      
    case 'swamp':
      // Both regular Mine and Bog Mine work in swamps (they produce the same)
      return [WorksiteType.HUNTING_FISHING_CAMP, WorksiteType.MINE, WorksiteType.BOG_MINE];
      
    case 'desert':
      return hasOasisTrait ? [WorksiteType.OASIS_FARM] : [];
      
    case 'water':
      return [WorksiteType.FARMSTEAD]; // Fishing boats = farmstead on water
      
    default:
      return [];
  }
}
