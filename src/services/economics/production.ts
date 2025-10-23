/**
 * Production Calculations
 * 
 * Handles all resource production calculations for the kingdom
 */

import type { Hex } from '../../models/Hex';
import type { ProductionResult, EconomicModifier } from './types';

/**
 * Calculate total resource production from all hexes
 * 
 * @param hexes - All kingdom hexes
 * @param modifiers - Optional economic modifiers
 * @returns Detailed production breakdown
 */
export function calculateProduction(
  hexes: Hex[], 
  modifiers: EconomicModifier[] = []
): ProductionResult {
  const baseProduction = new Map<string, number>();
  const bonuses = new Map<string, number>();
  const byHex: ProductionResult['byHex'] = [];
  
  // Calculate base production from each hex
  hexes.forEach(hex => {
    if (hex.worksite) {
      const hexProduction = hex.getProduction();
      
      // Add to total base production
      hexProduction.forEach((amount, resource) => {
        baseProduction.set(resource, (baseProduction.get(resource) || 0) + amount);
      });
      
      // Track by hex for detailed reporting
      byHex.push({ hex, production: hexProduction });
    }
  });
  
  // Apply modifiers
  const totalProduction = new Map(baseProduction);
  
  modifiers.forEach(modifier => {
    if (modifier.type === 'production' || modifier.type === 'both') {
      applyModifier(totalProduction, modifier, bonuses);
    }
  });
  
  return {
    baseProduction,
    bonuses,
    totalProduction,
    byHex
  };
}

/**
 * Apply an economic modifier to production
 * 
 * @param production - Current production map to modify
 * @param modifier - The modifier to apply
 * @param bonusTracker - Map to track bonuses for reporting
 */
function applyModifier(
  production: Map<string, number>,
  modifier: EconomicModifier,
  bonusTracker: Map<string, number>
): void {
  // Determine which resources to affect
  const resourcesToModify = modifier.affectedResources.length > 0
    ? modifier.affectedResources
    : Array.from(production.keys());
  
  resourcesToModify.forEach(resource => {
    const currentAmount = production.get(resource) || 0;
    let bonus = 0;
    
    // Apply multiplier
    if (modifier.multiplier && modifier.multiplier !== 1.0) {
      bonus += Math.floor(currentAmount * (modifier.multiplier - 1));
    }
    
    // Apply flat bonus
    if (modifier.flatBonus) {
      bonus += modifier.flatBonus;
    }
    
    if (bonus !== 0) {
      production.set(resource, currentAmount + bonus);
      bonusTracker.set(resource, (bonusTracker.get(resource) || 0) + bonus);
    }
  });
}

/**
 * Calculate production from a specific worksite type
 * 
 * @param worksiteType - Type of worksite
 * @param quantity - Number of worksites
 * @returns Map of resource to production amount
 */
export function calculateWorksiteProduction(
  worksiteType: string,
  quantity: number
): Map<string, number> {
  const production = new Map<string, number>();
  
  switch (worksiteType) {
    case 'farmlands':
      production.set('food', quantity * 2); // Each farmland produces 2 food
      break;
    case 'lumberCamps':
      production.set('lumber', quantity * 2); // Each lumber camp produces 2 lumber
      break;
    case 'quarries':
      production.set('stone', quantity); // Each quarry produces 1 stone
      break;
    case 'mines':
      production.set('ore', quantity); // Each mine produces 1 ore
      break;
    // Add other worksite types as needed
  }
  
  return production;
}

/**
 * Calculate potential gold income from settlements
 * (Only collected if settlements are properly fed)
 * 
 * @param settlementTiers - Map of tier name to count
 * @returns Potential gold income
 */
export function calculateSettlementGoldIncome(
  settlementTiers: Map<string, number>
): number {
  let goldIncome = 0;
  
  // According to rules: settlements generate gold equal to their tier
  settlementTiers.forEach((count, tier) => {
    const tierValue = getTierGoldValue(tier);
    goldIncome += tierValue * count;
  });
  
  return goldIncome;
}

/**
 * Get gold value for a settlement tier
 * Based on Reignmaker Lite rules: Village=1, Town=2, City=4, Metropolis=6
 */
function getTierGoldValue(tier: string): number {
  switch (tier.toLowerCase()) {
    case 'village': return 1;
    case 'town': return 2;
    case 'city': return 4;
    case 'metropolis': return 6;
    default: return 0;
  }
}
