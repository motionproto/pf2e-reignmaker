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
import { PLAYER_KINGDOM } from '../../types/ownership';
import type { 
  ProductionResult, 
  ConsumptionResult, 
  NetResourceResult,
  EconomicModifier,
  LeadershipBonus
} from './types';

import { calculateProduction, calculateSettlementGoldIncome } from './production';
import { logger } from '../../utils/Logger';
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
    hexes?: any[],
    modifiers: EconomicModifier[] = []
  ): ConsumptionResult {
    return calculateConsumption(settlements, armies, hexes, modifiers);
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
   * (Only collected if settlements are properly fed and in claimed territory)
   */
  calculateSettlementGoldIncome(settlements: Settlement[], hexes?: any[]): number {
    const tierCounts = new Map<string, number>();
    
    // Only count settlements that were fed last turn AND are in claimed territory
    settlements
      .filter(s => {
        // Must be fed
        if (!s.wasFedLastTurn) return false;
        
        // Must have valid location
        if (s.location.x === 0 && s.location.y === 0) return false;
        
        // If hexes provided, must be in claimed territory
        if (hexes) {
          const settlementHex = hexes.find((h: any) => 
            h.row === s.location.x && h.col === s.location.y
          );
          
          // Settlement must be in a player-claimed hex (claimedBy === PLAYER_KINGDOM)
          if (!settlementHex || settlementHex.claimedBy !== PLAYER_KINGDOM) {
            return false;
          }
        }
        
        return true;
      })
      .forEach(settlement => {
        const count = tierCounts.get(settlement.tier) || 0;
        tierCounts.set(settlement.tier, count + 1);
        logger.debug(`💰 [EconomicsService] Settlement "${settlement.name}" (${settlement.tier}): wasFedLastTurn=${settlement.wasFedLastTurn}`);
      });
    
    logger.debug(`💰 [EconomicsService] Tier counts for gold calculation:`, Object.fromEntries(tierCounts));
    const goldIncome = calculateSettlementGoldIncome(tierCounts);
    logger.debug(`💰 [EconomicsService] Calculated gold income from settlements: ${goldIncome}`);
    
    return goldIncome;
  }

  /**
   * Collect all resources for the current turn
   * This is the main method to be called during the Resources Phase
   */
  collectTurnResources(
    state: {
      hexes: Hex[];
      settlements: Settlement[];
      worksiteProduction: Map<string, number>;
      worksiteProductionByHex: Array<[Hex, Map<string, number>]>;
      modifiers?: EconomicModifier[];
    }
  ): ResourceCollectionResult {
    logger.debug('🏭 [EconomicsService] Collecting turn resources with state:', {
      hexCount: state.hexes.length,
      settlementCount: state.settlements.length,
      worksiteProductionSize: state.worksiteProduction.size,
      worksiteProduction: Object.fromEntries(state.worksiteProduction),
      settlements: state.settlements.map(s => ({ 
        name: s.name, 
        tier: s.tier, 
        wasFedLastTurn: s.wasFedLastTurn ?? 'undefined',
        connectedByRoads: s.connectedByRoads ?? 'undefined',
        structureCount: s.structureIds?.length || 0
      }))
    });
    
    // Use worksite production from KingdomState (calculated once when hexes change)
    const hexProduction = new Map(state.worksiteProduction);
    logger.debug('🏞️ [EconomicsService] Hex production from stored state:', Object.fromEntries(hexProduction));
    
    // Check if there's any gold in hex production (shouldn't be, but let's verify)
    const hexGold = hexProduction.get('gold') || 0;
    if (hexGold > 0) {
      logger.warn(`⚠️ [EconomicsService] WARNING: Hex production contains ${hexGold} gold (should only come from settlements)`);
    }
    
    // Calculate gold income from fed settlements in claimed territory
    const fedSettlements = state.settlements.filter(s => s.wasFedLastTurn);
    const unfedSettlements = state.settlements.filter(s => !s.wasFedLastTurn);
    const goldIncome = this.calculateSettlementGoldIncome(state.settlements, state.hexes);
    
    logger.debug('💰 [EconomicsService] Settlement analysis:', {
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
    const productionByHex = state.worksiteProductionByHex.map(([hex, production]) => ({
      hexId: hex.id,
      hexName: hex.name || `Hex ${hex.id}`,
      terrain: hex.terrain,
      production: new Map(production)
    }));
    
    logger.debug('📊 [EconomicsService] Final collection result:', {
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
        hexCount: state.worksiteProductionByHex.length,
        productionByHex
      }
    };
  }
  
  /**
   * Calculate army support and unsupported armies
   */
  calculateMilitarySupport(settlements: Settlement[], armies: Army[], hexes?: any[]) {
    const supportCapacity = calculateArmySupportCapacity(settlements, hexes);
    const unsupported = calculateUnsupportedArmies(armies, settlements, hexes);
    
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
