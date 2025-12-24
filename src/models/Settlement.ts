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
import type { NotablePerson } from './Faction';

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
 * Tier upgrade requirements interface
 */
export interface TierUpgradeRequirements {
  minLevel: number;
  minStructures: number;
}

/**
 * Settlement tier configuration
 * Storage and capacity values now come from structures
 *
 * HARD STRUCTURE CAPS (from Reignmaker rules):
 * - Village: Max 2 structures (must upgrade to Town for more)
 * - Town: Max 5 structures (must upgrade to City for more)
 * - City: Max 8 structures (must upgrade to Metropolis for more)
 * - Metropolis: Unlimited structures (endgame tier)
 *
 * TIER UPGRADE REQUIREMENTS (BOTH level AND structures required):
 * - Village → Town: 2 structures AND Level 2+
 * - Town → City: 5 structures AND Level 5+
 * - City → Metropolis: 8 structures AND Level 8+
 *
 * Note: Both requirements must be met. You cannot upgrade tier if either is missing.
 * Tier transitions happen automatically when you upgrade settlement level while meeting both requirements.
 */
export const SettlementTierConfig = {
  [SettlementTier.VILLAGE]: {
    displayName: 'Village',
    maxStructures: 2,
    upgradeRequirements: null, // Starting tier - no upgrade needed
    foodConsumption: 1,
    armySupport: 1
  },
  [SettlementTier.TOWN]: {
    displayName: 'Town',
    maxStructures: 5,
    upgradeRequirements: { minLevel: 2, minStructures: 2 },
    foodConsumption: 4,
    armySupport: 2
  },
  [SettlementTier.CITY]: {
    displayName: 'City',
    maxStructures: 8,
    upgradeRequirements: { minLevel: 5, minStructures: 5 },
    foodConsumption: 8,
    armySupport: 3
  },
  [SettlementTier.METROPOLIS]: {
    displayName: 'Metropolis',
    maxStructures: Infinity,
    upgradeRequirements: { minLevel: 8, minStructures: 8 },
    foodConsumption: 12,
    armySupport: 4
  }
};

/**
 * Get next tier for a settlement
 * @param currentTier - Current settlement tier
 * @returns Next tier, or null if already at max tier
 */
export function getNextTier(currentTier: SettlementTier): SettlementTier | null {
  switch (currentTier) {
    case SettlementTier.VILLAGE: return SettlementTier.TOWN;
    case SettlementTier.TOWN: return SettlementTier.CITY;
    case SettlementTier.CITY: return SettlementTier.METROPOLIS;
    case SettlementTier.METROPOLIS: return null; // Max tier
  }
}

/**
 * Get upgrade requirements for a settlement's next tier
 * @param currentTier - Current settlement tier
 * @returns Upgrade requirements, or null if already at max tier
 */
export function getNextTierRequirements(currentTier: SettlementTier): TierUpgradeRequirements | null {
  const nextTier = getNextTier(currentTier);
  if (!nextTier) return null;
  
  return SettlementTierConfig[nextTier].upgradeRequirements;
}

/**
 * Check if settlement meets requirements to upgrade to next tier
 * @param settlement - Settlement to check
 * @returns True if settlement meets both level and structure requirements
 */
export function canUpgradeToNextTier(settlement: Settlement): boolean {
  const reqs = getNextTierRequirements(settlement.tier);
  if (!reqs) return false; // Already at max tier
  
  return settlement.level >= reqs.minLevel && 
         settlement.structureIds.length >= reqs.minStructures;
}

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
  
  /**
   * @deprecated Settlement ownership is now derived from hex.claimedBy (single source of truth).
   * Use getSettlementOwner() from src/utils/settlementOwnership.ts to get the actual owner.
   * This field is kept for backward compatibility but should not be relied upon.
   */
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

  // Notable NPCs
  notablePeople?: NotablePerson[]; // Important NPCs associated with this settlement

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
 * @param ownedBy @deprecated - Ownership is now derived from hex.claimedBy. 
 *                This parameter is kept for backward compatibility but the actual 
 *                ownership source of truth is the hex the settlement occupies.
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
    skillBonuses: {}, // Initialize empty skill bonuses
    notablePeople: [] // Initialize empty notable people list
  };
}
