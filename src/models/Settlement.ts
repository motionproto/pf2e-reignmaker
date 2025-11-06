// Settlement model for PF2e Kingdom Lite
// Based on Reignmaker Lite rules

// Import settlement tier images
import villageImg from '../img/settlements/village.webp';
import townImg from '../img/settlements/town.webp';
import cityImg from '../img/settlements/city.webp';
import metropolisImg from '../img/settlements/metropolis.webp';

// Import map icon images
import villageMapIcon from '../img/map_icons/settlement_village.webp';
import townMapIcon from '../img/map_icons/settlement_town.webp';
import cityMapIcon from '../img/map_icons/settlement_city.webp';
import metropolisMapIcon from '../img/map_icons/settlement_metropolis.webp';

// Import ownership types
import type { OwnershipValue } from '../types/ownership';
import { PLAYER_KINGDOM } from '../types/ownership';

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
  location: { x: number; y: number }; // SOURCE OF TRUTH for settlement location
  kingmakerLocation?: { x: number; y: number }; // TEMPORARY - Only used during Kingmaker import, then discarded
  level: number; // Settlement level (1-20)
  tier: SettlementTier;
  structureIds: string[]; // IDs of built structures
  structureConditions?: Record<string, StructureCondition>; // Map of structureId -> condition
  connectedByRoads: boolean;
  isCapital?: boolean; // Whether this settlement is the faction's capital
  
  // Ownership tracking
  // - PLAYER_KINGDOM = Owned by player kingdom
  // - string = Owned by named faction (e.g., "Pitax", "Brevoy")
  // - null = Unowned/neutral
  ownedBy: OwnershipValue;
  
  // Resources and state
  storedFood: number;
  imprisonedUnrest: number;
  supportedUnits: string[]; // Array of army IDs this settlement supports
  
  // Tracking
  wasFedLastTurn: boolean; // For gold generation tracking
  
  // Optional image
  imagePath?: string;
  
  // Optional custom map icon (falls back to default tier icon)
  mapIconPath?: string;
  
  // Skill bonuses from structures (enhanced with source tracking)
  skillBonuses?: Record<string, number>; // Map of skill name -> bonus value (e.g. { athletics: 1, diplomacy: 2 })
  skillBonusDetails?: SkillBonusDetail[]; // Detailed tracking of which structures provide bonuses
  
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
      return villageImg;
    case SettlementTier.TOWN:
      return townImg;
    case SettlementTier.CITY:
      return cityImg;
    case SettlementTier.METROPOLIS:
      return metropolisImg;
    default:
      return villageImg;
  }
}

/**
 * Get default map icon path for settlement tier
 */
export function getDefaultMapIcon(tier: SettlementTier): string {
  switch (tier) {
    case SettlementTier.VILLAGE:
      return villageMapIcon;
    case SettlementTier.TOWN:
      return townMapIcon;
    case SettlementTier.CITY:
      return cityMapIcon;
    case SettlementTier.METROPOLIS:
      return metropolisMapIcon;
    default:
      return villageMapIcon;
  }
}

/**
 * Get map icon for settlement with automatic fallback
 * Returns custom icon if set, otherwise returns default tier icon
 * 
 * @param settlement - Settlement to get icon for
 * @returns Map icon path (always returns a valid path)
 * 
 * @example
 * ```typescript
 * // In Svelte components:
 * const iconPath = getSettlementMapIcon(settlement);
 * 
 * // In HTML with error fallback:
 * <img 
 *   src={getSettlementMapIcon(settlement)} 
 *   alt={settlement.name}
 *   on:error={(e) => e.target.src = getDefaultMapIcon(settlement.tier)}
 * />
 * ```
 */
export function getSettlementMapIcon(settlement: Settlement): string {
  return settlement.mapIconPath || getDefaultMapIcon(settlement.tier);
}

/**
 * Detailed skill bonus information with source tracking
 */
export interface SkillBonusDetail {
  skill: string;
  bonus: number;
  structureId: string;
  structureName: string;
}

/**
 * Create a location-based ID for Kingmaker settlements
 * This ensures consistent IDs across imports
 */
export function createKingmakerSettlementId(location: { x: number; y: number }): string {
  return `settlement_${location.x}.${location.y}`;
}

/**
 * Create a new settlement with defaults
 * @param name Settlement name
 * @param location Settlement location (source of truth)
 * @param tier Settlement tier
 * @param kingmakerLocation Optional - Only used during import, will be removed by sync service
 * @param ownedBy Optional - Faction that owns this settlement (defaults to PLAYER_KINGDOM)
 */
export function createSettlement(
  name: string,
  location: { x: number; y: number },
  tier: SettlementTier = SettlementTier.VILLAGE,
  kingmakerLocation?: { x: number; y: number },
  ownedBy: OwnershipValue = PLAYER_KINGDOM
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
    isCapital: false, // Initialize as not a capital
    ownedBy, // Use the provided ownedBy value
    storedFood: 0,
    imprisonedUnrest: 0,
    supportedUnits: [],
    wasFedLastTurn: true, // Assume fed initially
    imagePath: getDefaultSettlementImage(tier), // Pre-populate with default tier image
    skillBonuses: {} // Initialize empty skill bonuses
  };
}
