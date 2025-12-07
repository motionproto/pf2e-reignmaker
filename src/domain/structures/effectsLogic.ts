/**
 * Structure Effects Logic - Pure Functions
 * 
 * Handles applying structure effects to kingdom state.
 * For full structure data and catalog, use StructuresService.
 */

import type { KingdomData, Settlement } from '../../actors/KingdomActor';

/**
 * Structure effect types
 */
export interface StructureEffects {
  goldPerTurn?: number;
  foodStorage?: number;
  unrestReduction?: number;
  famePerTurn?: number;
  skillBonus?: number;
  skills?: string[];
  armySupport?: number;
  diplomaticCapacity?: number;
  imprisonedCapacity?: number;
}

/**
 * Basic structure effects lookup
 * For complete data, use StructuresService which loads from structures.json
 */
export const STRUCTURE_EFFECTS: Record<string, StructureEffects> = {
  // Storage
  'granary': { foodStorage: 4 },
  'storehouses': { foodStorage: 8 },
  'warehouses': { foodStorage: 16 },
  'strategic-reserves': { foodStorage: 36 },
  
  // Unrest reduction
  'tavern': { unrestReduction: 1 },
  'shrine': { unrestReduction: 1 },
  'park': { unrestReduction: 1 },
  'temple': { unrestReduction: 1 },
  'theater': { unrestReduction: 1 },
  'arena': { unrestReduction: 1 },
  'cathedral': { unrestReduction: 2 },
  'grand-theater': { unrestReduction: 2 },
  'colosseum': { unrestReduction: 2 },
  'grand-cathedral': { unrestReduction: 3 },
  
  // Gold generation
  'marketplace': { goldPerTurn: 1 },
  'trade-hall': { goldPerTurn: 2 },
  'merchant-guild': { goldPerTurn: 3 },
  'imperial-exchange': { goldPerTurn: 4 },
  
  // Army support
  'garrison': { armySupport: 1 },
  'barracks': { armySupport: 2 },
  'fortress': { armySupport: 3 },
  'citadel': { armySupport: 4 },
  
  // Fame generation
  'monument': { famePerTurn: 1 },
  'grand-monument': { famePerTurn: 2 }
};

/**
 * Get effects for a structure
 * 
 * @param structureId - Structure identifier
 * @returns Structure effects or empty object
 */
export function getStructureEffects(structureId: string): StructureEffects {
  return STRUCTURE_EFFECTS[structureId.toLowerCase()] || {};
}

/**
 * Calculate total passive effects from all structures in kingdom
 * 
 * @param kingdom - Kingdom data
 * @returns Combined effects
 */
export function calculateTotalStructureEffects(kingdom: KingdomData): StructureEffects {
  const total: StructureEffects = {
    goldPerTurn: 0,
    foodStorage: 0,
    unrestReduction: 0,
    famePerTurn: 0,
    armySupport: 0
  };
  
  for (const settlement of kingdom.settlements || []) {
    for (const structure of settlement.structures || []) {
      const effects = getStructureEffects(structure.id || structure.name || '');
      total.goldPerTurn! += effects.goldPerTurn || 0;
      total.foodStorage! += effects.foodStorage || 0;
      total.unrestReduction! += effects.unrestReduction || 0;
      total.famePerTurn! += effects.famePerTurn || 0;
      total.armySupport! += effects.armySupport || 0;
    }
  }
  
  return total;
}

/**
 * Apply passive structure effects during upkeep (mutates kingdom)
 * 
 * @param kingdom - Kingdom data to mutate
 * @returns Effects that were applied
 */
export function applyPassiveStructureEffects(kingdom: KingdomData): {
  goldGenerated: number;
  fameGenerated: number;
  unrestReduced: number;
} {
  const effects = calculateTotalStructureEffects(kingdom);
  
  const result = {
    goldGenerated: effects.goldPerTurn || 0,
    fameGenerated: effects.famePerTurn || 0,
    unrestReduced: Math.min(effects.unrestReduction || 0, kingdom.unrest || 0)
  };
  
  // Apply effects
  kingdom.resources.gold = (kingdom.resources.gold || 0) + result.goldGenerated;
  kingdom.fame = (kingdom.fame || 0) + result.fameGenerated;
  kingdom.unrest = Math.max(0, (kingdom.unrest || 0) - result.unrestReduced);
  
  return result;
}

/**
 * Check if a structure can be built in a settlement
 * Based on settlement tier and existing structures
 * 
 * @param structureId - Structure to check
 * @param structureTier - Structure's tier requirement
 * @param settlement - Target settlement
 * @returns True if buildable
 */
export function canBuildStructure(
  structureId: string,
  structureTier: number,
  settlement: Settlement
): boolean {
  // Get settlement tier number
  const tierNumbers: Record<string, number> = {
    'Village': 1, 'Town': 2, 'City': 3, 'Metropolis': 4
  };
  const settlementTier = tierNumbers[settlement.tier] || 1;
  
  // Check tier requirement
  if (structureTier > settlementTier) return false;
  
  // Check if already built
  const existingIds = (settlement.structures || []).map(s => 
    (s.id || s.name || '').toLowerCase()
  );
  if (existingIds.includes(structureId.toLowerCase())) return false;
  
  return true;
}

