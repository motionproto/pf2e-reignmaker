/**
 * Consumption Calculations
 * 
 * Handles resource consumption and upkeep for the kingdom
 */

import type { Settlement, Army } from '../../actors/KingdomActor';
import { SettlementTierConfig } from '../../models/Settlement';
import type { ConsumptionResult, EconomicModifier } from './types';

/**
 * Calculate total resource consumption for the kingdom
 * 
 * @param settlements - All kingdom settlements
 * @param armies - All kingdom armies  
 * @param modifiers - Optional economic modifiers
 * @returns Detailed consumption breakdown
 */
export function calculateConsumption(
  settlements: Settlement[],
  armies: Army[],
  modifiers: EconomicModifier[] = []
): ConsumptionResult {
  // Calculate base food consumption
  const settlementFood = calculateSettlementFoodConsumption(settlements);
  const armyFood = calculateArmyFoodConsumption(armies);
  let totalFood = settlementFood + armyFood;
  
  // Other resources (for future expansion)
  const otherResources = new Map<string, number>();
  
  // Apply consumption modifiers
  modifiers.forEach(modifier => {
    if (modifier.type === 'consumption' || modifier.type === 'both') {
      totalFood = applyConsumptionModifier(totalFood, modifier, 'food');
    }
  });
  
  return {
    settlementFood,
    armyFood,
    totalFood,
    otherResources
  };
}

/**
 * Calculate food consumption for all settlements
 * Only includes settlements with valid map locations
 * 
 * According to Kingdom Rules:
 * - Village: 1 Food
 * - Town: 4 Food
 * - City: 8 Food
 * - Metropolis: 12 Food
 */
function calculateSettlementFoodConsumption(settlements: Settlement[]): number {
  // Only count settlements with valid locations (exclude unmapped at 0,0)
  const mappedSettlements = settlements.filter(s => s.location.x !== 0 || s.location.y !== 0);
  
  return mappedSettlements.reduce((total, settlement) => {
    const config = SettlementTierConfig[settlement.tier];
    return total + (config ? config.foodConsumption : 0);
  }, 0);
}

/**
 * Calculate food consumption for all armies
 * 
 * Each army consumes 1 food per turn
 */
function calculateArmyFoodConsumption(armies: Army[]): number {
  return armies.length; // 1 food per army
}

/**
 * Apply a modifier to consumption
 */
function applyConsumptionModifier(
  baseAmount: number,
  modifier: EconomicModifier,
  resource: string
): number {
  // Check if this modifier affects this resource
  if (modifier.affectedResources.length > 0 && 
      !modifier.affectedResources.includes(resource)) {
    return baseAmount;
  }
  
  let modifiedAmount = baseAmount;
  
  // Apply multiplier
  if (modifier.multiplier) {
    modifiedAmount = Math.ceil(baseAmount * modifier.multiplier);
  }
  
  // Apply flat bonus/penalty
  if (modifier.flatBonus) {
    modifiedAmount += modifier.flatBonus;
  }
  
  return Math.max(0, modifiedAmount); // Never negative consumption
}

/**
 * Calculate army support capacity from settlements
 * Only includes settlements with valid map locations
 * 
 * According to Kingdom Rules:
 * - Village: 1 Army
 * - Town: 2 Armies
 * - City: 3 Armies
 * - Metropolis: 4 Armies
 * 
 * Plus any structure bonuses (e.g., Barracks, Military Academy)
 */
export function calculateArmySupportCapacity(settlements: Settlement[]): number {
  // Only count settlements with valid locations (exclude unmapped at 0,0)
  const mappedSettlements = settlements.filter(s => s.location.x !== 0 || s.location.y !== 0);
  
  return mappedSettlements.reduce((total, settlement) => {
    // Use calculated armySupport if available (includes structure bonuses)
    // Otherwise fall back to base tier value
    const capacity = settlement.armySupport || SettlementTierConfig[settlement.tier]?.armySupport || 0;
    return total + capacity;
  }, 0);
}

/**
 * Calculate number of unsupported armies
 */
export function calculateUnsupportedArmies(
  armies: Army[],
  settlements: Settlement[]
): number {
  const supportCapacity = calculateArmySupportCapacity(settlements);
  return Math.max(0, armies.length - supportCapacity);
}

/**
 * Check if settlements can be fed with available food
 * 
 * @param availableFood - Current food in storage
 * @param consumption - Total food consumption
 * @returns Object with fed status and shortage amount
 */
export function checkFoodSupply(
  availableFood: number,
  consumption: ConsumptionResult
): { canFeed: boolean; shortage: number } {
  const shortage = Math.max(0, consumption.totalFood - availableFood);
  return {
    canFeed: shortage === 0,
    shortage
  };
}
