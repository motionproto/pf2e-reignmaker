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
 * Structure condition states
 */
export enum StructureCondition {
  GOOD = 'good',
  DAMAGED = 'damaged'
}

/**
 * Represents a settlement in the kingdom
 */
export interface Settlement {
  id: string;
  name: string;
  location: { x: number; y: number }; // RM usage coordinates (0,0 = not linked, otherwise active location)
  kingmakerLocation?: { x: number; y: number }; // Permanent Kingmaker map location (if from Kingmaker)
  level: number; // Settlement level (1-20)
  tier: SettlementTier;
  structureIds: string[]; // IDs of built structures
  structureConditions?: Record<string, StructureCondition>; // Map of structureId -> condition
  connectedByRoads: boolean;
  
  // Resources and state
  storedFood: number;
  imprisonedUnrest: number;
  supportedUnits: string[]; // Array of army IDs this settlement supports
  
  // Tracking
  wasFedLastTurn: boolean; // For gold generation tracking
  
  // Optional image
  imagePath?: string;
  
  // Skill bonuses from structures
  skillBonuses?: Record<string, number>; // Map of skill name -> bonus value (e.g. { athletics: 1, diplomacy: 2 })
  
  // Computed properties (calculated by services dynamically)
  foodConsumption?: number;
  armySupport?: number;
  foodStorageCapacity?: number;
  imprisonedUnrestCapacityValue?: number; // Renamed to avoid confusion
  goldIncome?: number;
}

/**
 * Get default image path for settlement tier
 */
export function getDefaultSettlementImage(tier: SettlementTier): string {
  switch (tier) {
    case SettlementTier.VILLAGE:
      return 'modules/pf2e-reignmaker/img/settlements/village.webp';
    case SettlementTier.TOWN:
      return 'modules/pf2e-reignmaker/img/settlements/town.webp';
    case SettlementTier.CITY:
      return 'modules/pf2e-reignmaker/img/settlements/city.webp';
    case SettlementTier.METROPOLIS:
      return 'modules/pf2e-reignmaker/img/settlements/metropolis.webp';
    default:
      return 'modules/pf2e-reignmaker/img/settlements/village.webp';
  }
}

/**
 * Create a location-based ID for Kingmaker settlements
 * This ensures consistent IDs across imports
 */
export function createKingmakerSettlementId(location: { x: number; y: number }): string {
  return `settlement_${location.x}.${location.y.toString().padStart(2, '0')}`;
}

/**
 * Create a new settlement with defaults
 * @param name Settlement name
 * @param location RM usage location (set to 0,0 for unlinked)
 * @param tier Settlement tier
 * @param kingmakerLocation Optional Kingmaker map location (for imported settlements)
 */
export function createSettlement(
  name: string,
  location: { x: number; y: number },
  tier: SettlementTier = SettlementTier.VILLAGE,
  kingmakerLocation?: { x: number; y: number }
): Settlement {
  // Use location-based ID if from Kingmaker, otherwise random
  const id = kingmakerLocation 
    ? createKingmakerSettlementId(kingmakerLocation)
    : `settlement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id,
    name,
    location,
    kingmakerLocation,
    level: 1,
    tier,
    structureIds: [],
    structureConditions: {},
    connectedByRoads: false,
    storedFood: 0,
    imprisonedUnrest: 0,
    supportedUnits: [],
    wasFedLastTurn: true, // Assume fed initially
    imagePath: getDefaultSettlementImage(tier), // Pre-populate with default tier image
    skillBonuses: {} // Initialize empty skill bonuses
  };
}
