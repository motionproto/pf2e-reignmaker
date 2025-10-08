// Settlement Service for PF2e Kingdom Lite
// Manages settlement operations and calculations

import { get } from 'svelte/store';
import { kingdomData } from '../../stores/KingdomStore';
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
   * Based on Reignmaker Lite rules: level + structure requirements
   */
  canUpgradeSettlement(settlement: Settlement): {
    canUpgrade: boolean,
    nextTier: SettlementTier | null,
    requirements: string[]
  } {
    const requirements: string[] = [];
    let nextTier: SettlementTier | null = null;
    
    switch (settlement.tier) {
      case SettlementTier.VILLAGE:
        nextTier = SettlementTier.TOWN;
        if (settlement.level < 2) requirements.push('Settlement level 2 required');
        if (settlement.structureIds.length < 2) requirements.push('2 structures required');
        break;
      case SettlementTier.TOWN:
        nextTier = SettlementTier.CITY;
        if (settlement.level < 5) requirements.push('Settlement level 5 required');
        if (settlement.structureIds.length < 4) requirements.push('4 structures required');
        break;
      case SettlementTier.CITY:
        nextTier = SettlementTier.METROPOLIS;
        if (settlement.level < 8) requirements.push('Settlement level 8 required');
        if (settlement.structureIds.length < 8) requirements.push('8 structures required');
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
  
  /**
   * Update settlement properties
   * 
   * @param settlementId - Settlement ID
   * @param updates - Partial settlement updates
   */
  async updateSettlement(settlementId: string, updates: Partial<Settlement>): Promise<void> {
    console.log(`🏰 [SettlementService] Updating settlement: ${settlementId}`);
    
    const { updateKingdom } = await import('../../stores/KingdomStore');
    
    await updateKingdom(kingdom => {
      const settlement = kingdom.settlements.find(s => s.id === settlementId);
      if (settlement) {
        Object.assign(settlement, updates);
        console.log(`✅ [SettlementService] Updated ${settlement.name}`);
      } else {
        console.warn(`⚠️ [SettlementService] Settlement not found: ${settlementId}`);
      }
    });
  }
  
  /**
   * Delete a settlement
   * Marks supported armies as unsupported and removes structures
   * 
   * @param settlementId - Settlement ID
   * @returns Settlement details and counts
   */
  async deleteSettlement(settlementId: string): Promise<{
    name: string;
    structuresRemoved: number;
    armiesMarkedUnsupported: number;
  }> {
    console.log(`🏰 [SettlementService] Deleting settlement: ${settlementId}`);
    
    const { getKingdomActor, updateKingdom } = await import('../../stores/KingdomStore');
    
    const actor = getKingdomActor();
    if (!actor) {
      throw new Error('No kingdom actor available');
    }
    
    const kingdom = actor.getKingdom();
    if (!kingdom) {
      throw new Error('No kingdom data available');
    }
    
    const settlement = kingdom.settlements.find(s => s.id === settlementId);
    if (!settlement) {
      throw new Error(`Settlement not found: ${settlementId}`);
    }
    
    const structuresRemoved = settlement.structureIds.length;
    const armiesMarkedUnsupported = settlement.supportedUnits.length;
    const settlementName = settlement.name;
    
    // Delete settlement and mark armies as unsupported
    await updateKingdom(k => {
      // Mark armies as unsupported
      settlement.supportedUnits.forEach(armyId => {
        const army = k.armies.find(a => a.id === armyId);
        if (army) {
          army.supportedBySettlementId = undefined;
          army.isSupported = false;
          // Don't increment turnsUnsupported yet - happens during Upkeep phase
        }
      });
      
      // Remove settlement
      k.settlements = k.settlements.filter(s => s.id !== settlementId);
    });
    
    console.log(`✅ [SettlementService] Deleted ${settlementName}: ${structuresRemoved} structures, ${armiesMarkedUnsupported} armies unsupported`);
    
    return {
      name: settlementName,
      structuresRemoved,
      armiesMarkedUnsupported
    };
  }
  
  /**
   * Upgrade settlement to next tier
   * Validates requirements before upgrading
   * 
   * @param settlementId - Settlement ID
   */
  async upgradeSettlement(settlementId: string): Promise<void> {
    console.log(`🏰 [SettlementService] Upgrading settlement: ${settlementId}`);
    
    const { getKingdomActor, updateKingdom } = await import('../../stores/KingdomStore');
    
    const actor = getKingdomActor();
    if (!actor) {
      throw new Error('No kingdom actor available');
    }
    
    const kingdom = actor.getKingdom();
    if (!kingdom) {
      throw new Error('No kingdom data available');
    }
    
    const settlement = kingdom.settlements.find(s => s.id === settlementId);
    if (!settlement) {
      throw new Error(`Settlement not found: ${settlementId}`);
    }
    
    // Validate upgrade requirements
    const { canUpgrade, nextTier, requirements } = this.canUpgradeSettlement(settlement);
    
    if (!canUpgrade) {
      throw new Error(`Cannot upgrade ${settlement.name}: ${requirements.join(', ')}`);
    }
    
    if (!nextTier) {
      throw new Error(`${settlement.name} is already at maximum tier`);
    }
    
    // Perform upgrade
    await updateKingdom(k => {
      const s = k.settlements.find(s => s.id === settlementId);
      if (s) {
        s.tier = nextTier;
      }
    });
    
    console.log(`✅ [SettlementService] Upgraded ${settlement.name} to ${nextTier}`);
  }
  
  /**
   * Update settlement image
   * 
   * @param settlementId - Settlement ID
   * @param imagePath - Path to image file
   */
  async updateSettlementImage(settlementId: string, imagePath: string): Promise<void> {
    console.log(`🏰 [SettlementService] Updating settlement image: ${settlementId}`);
    
    await this.updateSettlement(settlementId, { imagePath });
    
    console.log(`✅ [SettlementService] Updated settlement image`);
  }
  
  /**
   * Update settlement level
   * 
   * @param settlementId - Settlement ID
   * @param newLevel - New settlement level (1-20)
   */
  async updateSettlementLevel(settlementId: string, newLevel: number): Promise<void> {
    console.log(`🏰 [SettlementService] Updating settlement level: ${settlementId} → ${newLevel}`);
    
    // Validate level range
    if (newLevel < 1 || newLevel > 20) {
      throw new Error(`Invalid settlement level: ${newLevel} (must be 1-20)`);
    }
    
    await this.updateSettlement(settlementId, { level: newLevel });
    
    console.log(`✅ [SettlementService] Settlement level updated to ${newLevel}`);
  }
}

// Export singleton instance
export const settlementService = new SettlementService();
