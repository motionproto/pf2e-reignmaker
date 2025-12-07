/**
 * Unrest Logic - Pure Functions
 * 
 * Handles unrest thresholds, size-based unrest generation,
 * and unrest management.
 */

import type { KingdomData } from '../../actors/KingdomActor';

/**
 * Unrest tier thresholds and their effects
 */
export const UNREST_TIERS = {
  NONE: { min: 0, max: 2, tier: 0, skillPenalty: 0 },
  LOW: { min: 3, max: 5, tier: 1, skillPenalty: -1 },
  MODERATE: { min: 6, max: 8, tier: 2, skillPenalty: -2 },
  HIGH: { min: 9, max: Infinity, tier: 3, skillPenalty: -3 }
} as const;

/**
 * Get unrest tier (0-3) based on current unrest
 * 
 * @param unrest - Current unrest level
 * @returns Tier number (0-3)
 */
export function getUnrestTier(unrest: number): number {
  if (unrest < 3) return 0;
  if (unrest <= 5) return 1;
  if (unrest <= 8) return 2;
  return 3;
}

/**
 * Get unrest tier name
 * 
 * @param unrest - Current unrest level
 * @returns Tier name
 */
export function getUnrestTierName(unrest: number): 'NONE' | 'LOW' | 'MODERATE' | 'HIGH' {
  if (unrest < 3) return 'NONE';
  if (unrest <= 5) return 'LOW';
  if (unrest <= 8) return 'MODERATE';
  return 'HIGH';
}

/**
 * Calculate size-based unrest generation
 * Default: 1 unrest per 8 hexes (configurable)
 * 
 * @param hexCount - Number of claimed hexes
 * @param hexesPerUnrest - Hexes per point of unrest (default: 8)
 * @returns Unrest to add
 */
export function calculateSizeBasedUnrest(
  hexCount: number,
  hexesPerUnrest: number = 8
): number {
  if (hexesPerUnrest <= 0 || hexesPerUnrest >= 1000) {
    return 0; // Disabled if set to very high number
  }
  return Math.floor(hexCount / hexesPerUnrest);
}

/**
 * Apply unrest change to kingdom (mutates kingdom)
 * 
 * @param kingdom - Kingdom data to mutate
 * @param change - Amount to change (positive or negative)
 * @returns New unrest level
 */
export function applyUnrestChange(
  kingdom: KingdomData,
  change: number
): number {
  const current = kingdom.unrest || 0;
  kingdom.unrest = Math.max(0, current + change);
  return kingdom.unrest;
}

/**
 * Check if kingdom is in collapse state (unrest >= 10)
 * 
 * @param kingdom - Kingdom data
 * @returns True if collapsed
 */
export function isKingdomCollapsed(kingdom: KingdomData): boolean {
  return (kingdom.unrest || 0) >= 10;
}

/**
 * Calculate passive unrest reduction from structures
 * 
 * @param kingdom - Kingdom data
 * @returns Total passive unrest reduction
 */
export function calculatePassiveUnrestReduction(kingdom: KingdomData): number {
  let reduction = 0;
  
  // Check all settlements for unrest-reducing structures
  for (const settlement of kingdom.settlements || []) {
    for (const structure of settlement.structures || []) {
      // Common unrest-reducing structures
      const structureReduction = getStructureUnrestReduction(structure.id || structure.name);
      reduction += structureReduction;
    }
  }
  
  return reduction;
}

/**
 * Get unrest reduction for a structure ID/name
 * Based on production structure definitions
 * 
 * @param structureId - Structure identifier
 * @returns Unrest reduction value
 */
function getStructureUnrestReduction(structureId: string): number {
  const reductions: Record<string, number> = {
    // Tier 1
    'tavern': 1,
    'shrine': 1,
    'park': 1,
    // Tier 2
    'temple': 1,
    'theater': 1,
    'arena': 1,
    // Tier 3
    'cathedral': 2,
    'grand-theater': 2,
    'colosseum': 2,
    // Tier 4
    'grand-cathedral': 3,
    'royal-theater': 3
  };
  
  return reductions[structureId.toLowerCase()] || 0;
}

/**
 * Apply passive unrest reduction from structures (mutates kingdom)
 * Called during Upkeep phase
 * 
 * @param kingdom - Kingdom data to mutate
 * @returns Amount reduced
 */
export function applyPassiveUnrestReduction(kingdom: KingdomData): number {
  const reduction = calculatePassiveUnrestReduction(kingdom);
  if (reduction > 0) {
    const oldUnrest = kingdom.unrest || 0;
    kingdom.unrest = Math.max(0, oldUnrest - reduction);
    return Math.min(reduction, oldUnrest); // Actual amount reduced
  }
  return 0;
}

