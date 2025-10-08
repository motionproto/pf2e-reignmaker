// Settlement model for PF2e Kingdom Lite
// Based on Reignmaker Lite rules

/**
 * Settlement tiers based on Reignmaker Lite rules
 */
export enum SettlementTier {
  VILLAGE = 'Village',
  TOWN = 'Town',
  CITY = 'City',
  METROPOLIS = 'Metropolis'
}

/**
 * Settlement tier configuration
 * Storage and capacity values now come from structures
 */
export const SettlementTierConfig = {
  [SettlementTier.VILLAGE]: { 
    displayName: 'Village', 
    maxStructures: 4, 
    foodConsumption: 1, 
    armySupport: 1
  },
  [SettlementTier.TOWN]: { 
    displayName: 'Town', 
    maxStructures: 8, 
    foodConsumption: 4, 
    armySupport: 2
  },
  [SettlementTier.CITY]: { 
    displayName: 'City', 
    maxStructures: 12, 
    foodConsumption: 8, 
    armySupport: 3
  },
  [SettlementTier.METROPOLIS]: { 
    displayName: 'Metropolis', 
    maxStructures: 20, 
    foodConsumption: 12, 
    armySupport: 4
  }
};

/**
 * Represents a settlement in the kingdom
 */
export interface Settlement {
  id: string;
  name: string;
  location: { x: number; y: number }; // Hex coordinates
  level: number; // Settlement level (1-20)
  tier: SettlementTier;
  structureIds: string[]; // IDs of built structures
  connectedByRoads: boolean;
  
  // Resources and state
  storedFood: number;
  imprisonedUnrest: number;
  supportedUnits: string[]; // Array of army IDs this settlement supports
  
  // Tracking
  wasFedLastTurn: boolean; // For gold generation tracking
  
  // Optional image
  imagePath?: string;
  
  // Computed properties (calculated by services dynamically)
  foodConsumption?: number;
  armySupport?: number;
  foodStorageCapacity?: number;
  imprisonedUnrestCapacityValue?: number; // Renamed to avoid confusion
  goldIncome?: number;
}

/**
 * Create a new settlement with defaults
 */
export function createSettlement(
  name: string,
  location: { x: number; y: number },
  tier: SettlementTier = SettlementTier.VILLAGE
): Settlement {
  return {
    id: `settlement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    location,
    level: 1,
    tier,
    structureIds: [],
    connectedByRoads: false,
    storedFood: 0,
    imprisonedUnrest: 0,
    supportedUnits: [],
    wasFedLastTurn: true // Assume fed initially
  };
}
