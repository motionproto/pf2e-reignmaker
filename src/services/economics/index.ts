/**
 * Economics Service
 * 
 * Main service for handling kingdom economics calculations.
 * This service provides pure functions for economic calculations
 * without managing state directly.
 * 
 * ## Usage
 * ```typescript
 * import { EconomicsService } from './services/economics';
 * 
 * const economics = new EconomicsService();
 * const production = economics.calculateProduction(hexes);
 * const consumption = economics.calculateConsumption(settlements, armies);
 * const net = economics.calculateNetResources(production, consumption, currentResources);
 * ```
 */

import type { Hex } from '../../models/Hex';
import type { Settlement, Army } from '../../actors/KingdomActor';
import type { 
  ProductionResult, 
  ConsumptionResult, 
  NetResourceResult,
  EconomicModifier,
  LeadershipBonus
} from './types';

import { calculateProduction, calculateSettlementGoldIncome } from './production';
import { 
  calculateConsumption, 
  calculateArmySupportCapacity,
  calculateUnsupportedArmies,
  checkFoodSupply
} from './consumption';
import { 
  calculateLeadershipBonuses,
  bonusesToModifiers,
  getActiveModifiers,
  calculateEconomicEfficiency
} from './bonuses';

export interface ResourceCollectionResult {
  hexProduction: Map<string, number>;
  goldIncome: number;
  fedSettlementsCount: number;
  unfedSettlementsCount: number;
  totalCollected: Map<string, number>;
  // Separate resource collections for clarity
  resourceCollection: {
    territoryResources: Map<string, number>;
    settlementGold: number;
  };
  details: {
    hexCount: number;
    productionByHex: Array<{ hexId: string; hexName: string; terrain: string; production: Map<string, number> }>;
  };
}

export class EconomicsService {
  /**
   * Calculate total resource production from all sources
   */
  calculateProduction(
    hexes: Hex[],
    modifiers: EconomicModifier[] = []
  ): ProductionResult {
    return calculateProduction(hexes, modifiers);
  }
  
  /**
   * Calculate resource consumption for the kingdom
   */
  calculateConsumption(
    settlements: Settlement[],
    armies: Army[],
    modifiers: EconomicModifier[] = []
  ): ConsumptionResult {
    return calculateConsumption(settlements, armies, modifiers);
  }
  
  /**
   * Calculate net resource changes for the turn
   */
  calculateNetResources(
    production: ProductionResult,
    consumption: ConsumptionResult,
    currentResources: Map<string, number>
  ): NetResourceResult {
    const gains = new Map(production.totalProduction);
    const losses = new Map<string, number>();
    const netChange = new Map<string, number>();
    const shortages = new Map<string, number>();
    
    // Add food consumption to losses
    losses.set('food', consumption.totalFood);
    
    // Add other consumption (future expansion)
    consumption.otherResources.forEach((amount, resource) => {
      losses.set(resource, (losses.get(resource) || 0) + amount);
    });
    
    // Calculate net changes and detect shortages
    const allResources = new Set([...gains.keys(), ...losses.keys()]);
    
    allResources.forEach(resource => {
      const gain = gains.get(resource) || 0;
      const loss = losses.get(resource) || 0;
      const net = gain - loss;
      
      netChange.set(resource, net);
      
      // Check for shortage
      const current = currentResources.get(resource) || 0;
      const afterChange = current + net;
      
      if (afterChange < 0) {
        shortages.set(resource, Math.abs(afterChange));
      }
    });
    
    return {
      gains,
      losses,
      netChange,
      shortages
    };
  }
  
  /**
   * Get potential gold income from settlements
   * (Only collected if settlements are properly fed)
   */
  calculateSettlementGoldIncome(settlements: Settlement[]): number {
    const tierCounts = new Map<string, number>();
    
    // Only count settlements that were fed last turn
    settlements
      .filter(s => s.wasFedLastTurn)
      .forEach(settlement => {
        const count = tierCounts.get(settlement.tier) || 0;
        tierCounts.set(settlement.tier, count + 1);
      });
    
    return calculateSettlementGoldIncome(tierCounts);
  }

  /**
   * Collect all resources for the current turn
   * This is the main method to be called during the Resources Phase
   */
  collectTurnResources(
    state: {
      hexes: Hex[];
      settlements: Settlement[];
      cachedProduction: Map<string, number>;
      cachedProductionByHex: Array<[Hex, Map<string, number>]>;
      modifiers?: EconomicModifier[];
    }
  ): ResourceCollectionResult {
    console.log('🏭 [EconomicsService] Collecting turn resources with state:', {
      hexCount: state.hexes.length,
      settlementCount: state.settlements.length,
      cachedProductionSize: state.cachedProduction.size,
      cachedProduction: Object.fromEntries(state.cachedProduction),
      settlements: state.settlements.map(s => ({ 
        name: s.name, 
        tier: s.tier, 
        wasFedLastTurn: s.wasFedLastTurn ?? 'undefined' 
      }))
    });
    
    // Use cached production from KingdomState (calculated once when hexes change)
    const hexProduction = new Map(state.cachedProduction);
    
    // Calculate gold income from fed settlements
    const fedSettlements = state.settlements.filter(s => s.wasFedLastTurn);
    const unfedSettlements = state.settlements.filter(s => !s.wasFedLastTurn);
    const goldIncome = this.calculateSettlementGoldIncome(state.settlements);
    
    console.log('💰 [EconomicsService] Settlement analysis:', {
      totalSettlements: state.settlements.length,
      fedSettlements: fedSettlements.length,
      unfedSettlements: unfedSettlements.length,
      goldIncome,
      fedSettlementDetails: fedSettlements.map(s => ({ name: s.name, tier: s.tier }))
    });
    
    // Create separate collections for clarity
    const territoryResources = new Map(hexProduction);
    const settlementGold = goldIncome;
    
    // Combine all resources collected (maintaining backward compatibility)
    const totalCollected = new Map(hexProduction);
    if (goldIncome > 0) {
      totalCollected.set('gold', (totalCollected.get('gold') || 0) + goldIncome);
    }
    
    // Prepare detailed breakdown for UI
    const productionByHex = state.cachedProductionByHex.map(([hex, production]) => ({
      hexId: hex.id,
      hexName: hex.name || `Hex ${hex.id}`,
      terrain: hex.terrain,
      production: new Map(production)
    }));
    
    console.log('📊 [EconomicsService] Final collection result:', {
      territoryResources: Object.fromEntries(territoryResources),
      settlementGold,
      totalCollected: Object.fromEntries(totalCollected),
      productionByHexCount: productionByHex.length
    });
    
    return {
      hexProduction,
      goldIncome,
      fedSettlementsCount: fedSettlements.length,
      unfedSettlementsCount: unfedSettlements.length,
      totalCollected,
      // New separate resource collections for clarity
      resourceCollection: {
        territoryResources,
        settlementGold
      },
      details: {
        hexCount: state.cachedProductionByHex.length,
        productionByHex
      }
    };
  }
  
  /**
   * Calculate army support and unsupported armies
   */
  calculateMilitarySupport(settlements: Settlement[], armies: Army[]) {
    const supportCapacity = calculateArmySupportCapacity(settlements);
    const unsupported = calculateUnsupportedArmies(armies, settlements);
    
    return {
      capacity: supportCapacity,
      current: armies.length,
      unsupported
    };
  }
  
  /**
   * Check food supply status
   */
  checkFoodSupply(availableFood: number, consumption: ConsumptionResult) {
    return checkFoodSupply(availableFood, consumption);
  }
  
  /**
   * Get leadership bonuses as modifiers
   */
  getLeadershipModifiers(leadershipSkills: Map<string, number>): EconomicModifier[] {
    const bonuses = calculateLeadershipBonuses(leadershipSkills);
    return bonusesToModifiers(bonuses);
  }
  
  /**
   * Get all active modifiers for current kingdom state
   */
  getActiveModifiers(state: {
    isAtWar?: boolean;
    season?: string;
    economy?: number;
    unrest?: number;
    leadershipSkills?: Map<string, number>;
  }): EconomicModifier[] {
    const modifiers = getActiveModifiers(state);
    
    // Add leadership modifiers if available
    if (state.leadershipSkills) {
      modifiers.push(...this.getLeadershipModifiers(state.leadershipSkills));
    }
    
    return modifiers;
  }
  
  /**
   * Calculate economic efficiency based on kingdom stats
   */
  calculateEconomicEfficiency(economy: number, unrest: number): number {
    return calculateEconomicEfficiency(economy, unrest);
  }
  
  /**
   * Get resources that can be stored between turns
   * (Only Food and Gold are storable)
   */
  getStorableResources(): string[] {
    return ['food', 'gold'];
  }
  
  /**
   * Get resources that are cleared at end of turn
   */
  getNonStorableResources(): string[] {
    return ['lumber', 'stone', 'ore'];
  }
}

// Export singleton instance
export const economicsService = new EconomicsService();

// Re-export types for convenience
export type {
  ProductionResult,
  ConsumptionResult,
  NetResourceResult,
  EconomicModifier,
  LeadershipBonus
} from './types';
