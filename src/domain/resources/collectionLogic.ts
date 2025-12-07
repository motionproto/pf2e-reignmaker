/**
 * Resource Collection Logic - Pure Functions
 * 
 * Handles resource production and collection calculations.
 * For detailed worksite production, see services/economics/production.ts
 */

import type { KingdomData } from '../../actors/KingdomActor';
import { PLAYER_KINGDOM } from '../../types/ownership';

export interface ResourceTotals {
  gold: number;
  food: number;
  lumber: number;
  stone: number;
  ore: number;
}

/**
 * Settlement tier to gold income mapping
 */
export const SETTLEMENT_GOLD_INCOME: Record<string, number> = {
  'Village': 1,
  'Town': 2,
  'City': 4,
  'Metropolis': 6
};

/**
 * Settlement tier to food consumption mapping
 */
export const SETTLEMENT_FOOD_CONSUMPTION: Record<string, number> = {
  'Village': 1,
  'Town': 2,
  'City': 4,
  'Metropolis': 6
};

/**
 * Calculate gold income from settlements
 * Only fed settlements generate gold
 * 
 * @param kingdom - Kingdom data
 * @returns Total gold income
 */
export function calculateSettlementGoldIncome(kingdom: KingdomData): number {
  let gold = 0;
  
  for (const settlement of kingdom.settlements || []) {
    if (settlement.wasFedLastTurn) {
      gold += SETTLEMENT_GOLD_INCOME[settlement.tier] || 0;
    }
  }
  
  return gold;
}

/**
 * Calculate total food consumption for settlements
 * 
 * @param kingdom - Kingdom data
 * @returns Total food needed
 */
export function calculateTotalFoodConsumption(kingdom: KingdomData): number {
  let food = 0;
  
  for (const settlement of kingdom.settlements || []) {
    food += SETTLEMENT_FOOD_CONSUMPTION[settlement.tier] || 0;
  }
  
  return food;
}

/**
 * Apply resource collection to kingdom (mutates kingdom)
 * 
 * @param kingdom - Kingdom data to mutate
 * @param income - Resources to add
 * @returns Resources actually added (may differ due to caps)
 */
export function applyResourceCollection(
  kingdom: KingdomData,
  income: Partial<ResourceTotals>
): Partial<ResourceTotals> {
  const added: Partial<ResourceTotals> = {};
  
  for (const [resource, amount] of Object.entries(income)) {
    if (amount && amount > 0) {
      const current = kingdom.resources[resource as keyof typeof kingdom.resources] || 0;
      kingdom.resources[resource as keyof typeof kingdom.resources] = current + amount;
      added[resource as keyof ResourceTotals] = amount;
    }
  }
  
  return added;
}

/**
 * Apply resource costs to kingdom (mutates kingdom)
 * 
 * @param kingdom - Kingdom data to mutate
 * @param costs - Resources to deduct
 * @returns True if all costs were paid, false if insufficient
 */
export function applyResourceCosts(
  kingdom: KingdomData,
  costs: Partial<ResourceTotals>
): boolean {
  // First check if we can afford it
  for (const [resource, amount] of Object.entries(costs)) {
    if (amount && amount > 0) {
      const current = kingdom.resources[resource as keyof typeof kingdom.resources] || 0;
      if (current < amount) {
        return false;
      }
    }
  }
  
  // Deduct costs
  for (const [resource, amount] of Object.entries(costs)) {
    if (amount && amount > 0) {
      const current = kingdom.resources[resource as keyof typeof kingdom.resources] || 0;
      kingdom.resources[resource as keyof typeof kingdom.resources] = current - amount;
    }
  }
  
  return true;
}

/**
 * Check if kingdom can afford a cost
 * 
 * @param kingdom - Kingdom data
 * @param costs - Resource costs to check
 * @returns True if affordable
 */
export function canAfford(
  kingdom: KingdomData,
  costs: Partial<ResourceTotals>
): boolean {
  for (const [resource, amount] of Object.entries(costs)) {
    if (amount && amount > 0) {
      const current = kingdom.resources[resource as keyof typeof kingdom.resources] || 0;
      if (current < amount) {
        return false;
      }
    }
  }
  return true;
}

