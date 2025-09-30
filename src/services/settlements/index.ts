// Settlement Service for PF2e Kingdom Lite
// Manages settlement operations and calculations

import { get } from 'svelte/store';
import { kingdomData } from '../../stores/kingdomActor';
import type { Settlement } from '../../models/Settlement';
import { SettlementTier, SettlementTierConfig } from '../../models/Settlement';
import { structuresService } from '../structures';

export class SettlementService {
  /**
   * Calculate total gold income from all settlements
   * Only generates gold if settlements were fed last turn
   */
  calculateSettlementGoldIncome(settlements: Settlement[]): number {
    let totalGold = 0;
    
    settlements.forEach(settlement => {
      if (settlement.wasFedLastTurn) {
        // Base gold income by tier
        const baseIncome = this.getBaseGoldIncome(settlement.tier);
        
        // Additional gold from structures (markets, etc.)
        const structureIncome = this.getStructureGoldIncome(settlement);
        
        totalGold += baseIncome + structureIncome;
      }
    });
    
    return totalGold;
  }
  
  /**
   * Get base gold income for a settlement tier
   */
  private getBaseGoldIncome(tier: SettlementTier): number {
    switch (tier) {
      case SettlementTier.VILLAGE:
        return 1;
      case SettlementTier.TOWN:
        return 2;
      case SettlementTier.CITY:
        return 4;
      case SettlementTier.METROPOLIS:
        return 6;
      default:
        return 0;
    }
  }
  
  /**
   * Calculate gold income from structures
   */
  private getStructureGoldIncome(settlement: Settlement): number {
    return structuresService.calculateGoldIncome(settlement);
  }
  
  /**
   * Calculate total food consumption for all settlements
   */
  calculateTotalFoodConsumption(settlements: Settlement[]): number {
    return settlements.reduce((total, settlement) => {
      const config = SettlementTierConfig[settlement.tier];
      return total + (config?.foodConsumption || 0);
    }, 0);
  }
  
  /**
   * Get food consumption breakdown by settlement
   */
  getFoodConsumptionBreakdown(settlements: Settlement[]): Array<{settlement: Settlement, consumption: number}> {
    return settlements.map(settlement => {
      const config = SettlementTierConfig[settlement.tier];
      return {
        settlement,
        consumption: config?.foodConsumption || 0
      };
    });
  }
  
  /**
   * Calculate total army support capacity
   * Base support from tier + bonuses from structures
   */
  calculateTotalArmySupport(settlements: Settlement[]): number {
    return settlements.reduce((total, settlement) => {
      const config = SettlementTierConfig[settlement.tier];
      const baseSupport = config?.armySupport || 0;
      const structureBonus = structuresService.calculateArmySupportBonus(settlement);
      return total + baseSupport + structureBonus;
    }, 0);
  }
  
  /**
   * Process food consumption and update fed status
   * Returns shortage amount if any
   */
  processFoodConsumption(settlements: Settlement[], availableFood: number): {
    shortage: number,
    fedSettlements: Set<string>,
    unfedSettlements: Set<string>
  } {
    const totalNeeded = this.calculateTotalFoodConsumption(settlements);
    const fedSettlements = new Set<string>();
    const unfedSettlements = new Set<string>();
    
    if (availableFood >= totalNeeded) {
      // All settlements are fed
      settlements.forEach(s => {
        fedSettlements.add(s.id);
        s.wasFedLastTurn = true;
      });
      return { shortage: 0, fedSettlements, unfedSettlements };
    } else {
      // Shortage - mark all as unfed for simplicity
      // Could implement priority system later
      const shortage = totalNeeded - availableFood;
      settlements.forEach(s => {
        unfedSettlements.add(s.id);
        s.wasFedLastTurn = false;
      });
      return { shortage, fedSettlements, unfedSettlements };
    }
  }
  
  /**
   * Get total food storage capacity across all settlements
   * Now calculated from structures only, not tier
   */
  getTotalFoodStorage(settlements: Settlement[]): number {
    return settlements.reduce((total, settlement) => {
      return total + structuresService.calculateFoodStorage(settlement);
    }, 0);
  }
  
  /**
   * Get total imprisoned unrest capacity
   * Now calculated from structures only, not tier
   */
  getTotalImprisonedUnrestCapacity(settlements: Settlement[]): number {
    return settlements.reduce((total, settlement) => {
      return total + structuresService.calculateImprisonedUnrestCapacity(settlement);
    }, 0);
  }
  
  /**
   * Check if a settlement can be upgraded
   */
  canUpgradeSettlement(settlement: Settlement, partyLevel: number): {
    canUpgrade: boolean,
    nextTier: SettlementTier | null,
    requirements: string[]
  } {
    const requirements: string[] = [];
    let nextTier: SettlementTier | null = null;
    
    switch (settlement.tier) {
      case SettlementTier.VILLAGE:
        nextTier = SettlementTier.TOWN;
        if (partyLevel < 2) requirements.push('Party level 2+ required');
        if (settlement.structureIds.length < 2) requirements.push('2+ structures required');
        break;
      case SettlementTier.TOWN:
        nextTier = SettlementTier.CITY;
        if (partyLevel < 5) requirements.push('Party level 5+ required');
        if (settlement.structureIds.length < 4) requirements.push('4+ structures required');
        break;
      case SettlementTier.CITY:
        nextTier = SettlementTier.METROPOLIS;
        if (partyLevel < 8) requirements.push('Party level 8+ required');
        if (settlement.structureIds.length < 8) requirements.push('8+ structures required');
        break;
      case SettlementTier.METROPOLIS:
        // Already at max tier
        break;
    }
    
    return {
      canUpgrade: requirements.length === 0 && nextTier !== null,
      nextTier,
      requirements
    };
  }
}

// Export singleton instance
export const settlementService = new SettlementService();
