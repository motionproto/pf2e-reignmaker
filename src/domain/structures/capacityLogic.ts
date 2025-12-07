/**
 * Structure Capacity Logic - Pure Functions
 * 
 * Handles food storage, army support, and other capacities from structures.
 * For full structure data, use the StructuresService which loads from structures.json.
 */

import type { KingdomData, Settlement } from '../../actors/KingdomActor';

/**
 * Food storage values by structure ID
 * These match the values in structures.json
 */
export const FOOD_STORAGE_BY_STRUCTURE: Record<string, number> = {
  'granary': 4,
  'storehouses': 8,
  'warehouses': 16,
  'strategic-reserves': 36
};

/**
 * Army support values by structure ID
 */
export const ARMY_SUPPORT_BY_STRUCTURE: Record<string, number> = {
  'garrison': 1,
  'barracks': 2,
  'fortress': 3,
  'citadel': 4
};

/**
 * Calculate food storage capacity for a settlement
 * Only counts the highest tier storage structure (not cumulative)
 * 
 * @param settlement - Settlement to check
 * @returns Food storage capacity
 */
export function calculateSettlementFoodStorage(settlement: Settlement): number {
  let maxStorage = 0;
  
  for (const structure of settlement.structures || []) {
    const structureId = (structure.id || structure.name || '').toLowerCase();
    const storage = FOOD_STORAGE_BY_STRUCTURE[structureId] || 0;
    if (storage > maxStorage) {
      maxStorage = storage;
    }
  }
  
  return maxStorage;
}

/**
 * Calculate total food storage capacity for kingdom
 * 
 * @param kingdom - Kingdom data
 * @returns Total food storage capacity
 */
export function calculateTotalFoodStorage(kingdom: KingdomData): number {
  let total = 0;
  
  for (const settlement of kingdom.settlements || []) {
    total += calculateSettlementFoodStorage(settlement);
  }
  
  // Default minimum capacity if no storage structures
  return total > 0 ? total : 0;
}

/**
 * Calculate army support capacity for a settlement
 * Base support from tier + structure bonuses
 * 
 * @param settlement - Settlement to check
 * @returns Army support capacity
 */
export function calculateSettlementArmySupport(settlement: Settlement): number {
  // Base support from settlement tier
  const tierSupport: Record<string, number> = {
    'Village': 1,
    'Town': 2,
    'City': 3,
    'Metropolis': 4
  };
  
  let support = tierSupport[settlement.tier] || 1;
  
  // Add structure bonuses
  for (const structure of settlement.structures || []) {
    const structureId = (structure.id || structure.name || '').toLowerCase();
    support += ARMY_SUPPORT_BY_STRUCTURE[structureId] || 0;
  }
  
  return support;
}

/**
 * Calculate total army support capacity for kingdom
 * 
 * @param kingdom - Kingdom data
 * @returns Total army support capacity
 */
export function calculateTotalArmySupport(kingdom: KingdomData): number {
  let total = 0;
  
  for (const settlement of kingdom.settlements || []) {
    total += calculateSettlementArmySupport(settlement);
  }
  
  return total;
}

/**
 * Check if food exceeds storage capacity and apply spoilage (mutates kingdom)
 * 
 * Per production rules: if no storage structures, capacity is 0 and ALL food is lost.
 * This matches production UpkeepPhaseController behavior.
 * 
 * @param kingdom - Kingdom data to mutate
 * @returns Amount of food lost to spoilage
 */
export function applyFoodCapacityLimit(kingdom: KingdomData): number {
  const capacity = calculateTotalFoodStorage(kingdom);
  const currentFood = kingdom.resources.food || 0;
  
  // Match production: if food exceeds capacity, excess is lost
  // Note: if capacity is 0 (no storage), all food is lost
  if (currentFood > capacity) {
    const spoiled = currentFood - capacity;
    kingdom.resources.food = capacity;
    return spoiled;
  }
  
  return 0;
}

/**
 * Calculate number of unsupported armies
 * 
 * @param kingdom - Kingdom data
 * @returns Number of armies beyond support capacity
 */
export function calculateUnsupportedArmies(kingdom: KingdomData): number {
  const supportCapacity = calculateTotalArmySupport(kingdom);
  const armyCount = kingdom.armies?.length || 0;
  return Math.max(0, armyCount - supportCapacity);
}

