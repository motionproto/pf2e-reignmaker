// Settlement Service for PF2e Kingdom Lite
// Manages settlement operations and calculations

import { get } from 'svelte/store';
import { kingdomData } from '../../stores/KingdomStore';
import type { Settlement } from '../../models/Settlement';
import { SettlementTier, SettlementTierConfig, getDefaultSettlementImage } from '../../models/Settlement';
import { structuresService } from '../structures';
import { logger } from '../../utils/Logger';

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
        
        let settlementIncome = baseIncome + structureIncome;
        
        // Double income if connected to Capitol by roads
        if (settlement.connectedByRoads) {
          settlementIncome *= 2;
        }
        
        totalGold += settlementIncome;
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
   * Calculate skill bonuses from a settlement's structures
   * Returns a map of skill name -> highest bonus value
   * Only counts non-damaged structures
   * 
   * @param settlement - Settlement to calculate bonuses for
   * @returns Map of skill name to bonus value
   */
  calculateSkillBonuses(settlement: Settlement): Record<string, number> {
    const bonuses: Record<string, number> = {};
    
    for (const structureId of settlement.structureIds) {
      // Skip damaged structures
      if (structuresService.isStructureDamaged(settlement, structureId)) {
        continue;
      }
      
      const structure = structuresService.getStructure(structureId);
      if (structure?.type === 'skill' && structure.effects.skillsSupported) {
        const bonus = structure.effects.skillBonus || 0;
        for (const skill of structure.effects.skillsSupported) {
          // Keep highest bonus per skill (multiple structures of same type)
          bonuses[skill] = Math.max(bonuses[skill] || 0, bonus);
        }
      }
    }
    
    return bonuses;
  }
  
  /**
   * Update a settlement's skill bonuses based on its current structures
   * Called automatically when structures are added/removed
   * 
   * @param settlementId - Settlement ID to update
   */
  async updateSettlementSkillBonuses(settlementId: string): Promise<void> {
    logger.debug(`🎯 [SettlementService] Updating skill bonuses for settlement: ${settlementId}`);
    
    const { getKingdomActor, updateKingdom } = await import('../../stores/KingdomStore');
    
    const actor = getKingdomActor();
    if (!actor) {
      logger.warn('⚠️ [SettlementService] No kingdom actor available');
      return;
    }
    
    const kingdom = actor.getKingdom();
    if (!kingdom) {
      logger.warn('⚠️ [SettlementService] No kingdom data available');
      return;
    }
    
    const settlement = kingdom.settlements.find(s => s.id === settlementId);
    if (!settlement) {
      logger.warn(`⚠️ [SettlementService] Settlement not found: ${settlementId}`);
      return;
    }
    
    // Calculate new bonuses
    const newBonuses = this.calculateSkillBonuses(settlement);
    
    // Update settlement
    await updateKingdom(k => {
      const s = k.settlements.find(s => s.id === settlementId);
      if (s) {
        s.skillBonuses = newBonuses;
        logger.debug(`✅ [SettlementService] Updated skill bonuses:`, newBonuses);
      }
    });
  }
  
  /**
   * PUBLIC API: Add a structure to a settlement
   * Automatically recalculates settlement and kingdom capacities
   */
  async addStructure(settlementId: string, structureId: string): Promise<void> {
    logger.info(`🏗️ [SettlementService] Adding structure ${structureId} to settlement ${settlementId}`);
    
    const { updateKingdom } = await import('../../stores/KingdomStore');
    
    await updateKingdom(k => {
      const s = k.settlements.find(s => s.id === settlementId);
      if (s && !s.structureIds.includes(structureId)) {
        s.structureIds.push(structureId);
      }
    });
    
    await this.recalculateSettlement(settlementId);
    await this.recalculateKingdom();
    
    logger.info(`✅ [SettlementService] Structure added and capacities recalculated`);
  }
  
  /**
   * PUBLIC API: Remove a structure from a settlement
   * Automatically recalculates settlement and kingdom capacities
   */
  async removeStructure(settlementId: string, structureId: string): Promise<void> {
    logger.debug(`🏗️ [SettlementService] Removing structure ${structureId} from settlement ${settlementId}`);
    
    const { updateKingdom } = await import('../../stores/KingdomStore');
    
    await updateKingdom(k => {
      const s = k.settlements.find(s => s.id === settlementId);
      if (s) {
        s.structureIds = s.structureIds.filter(id => id !== structureId);
      }
    });
    
    await this.recalculateSettlement(settlementId);
    await this.recalculateKingdom();
    
    logger.debug(`✅ [SettlementService] Structure removed and capacities recalculated`);
  }
  
  /**
   * INTERNAL: Recalculate all derived properties for a settlement
   * Called automatically when structures change
   */
  private async recalculateSettlement(settlementId: string): Promise<void> {
    logger.info(`🔄 [SettlementService] Recalculating settlement: ${settlementId}`);
    
    const { getKingdomActor, updateKingdom } = await import('../../stores/KingdomStore');
    
    const actor = getKingdomActor();
    if (!actor) {
      logger.warn('⚠️ [SettlementService] No kingdom actor available');
      return;
    }
    
    const kingdom = actor.getKingdom();
    if (!kingdom) {
      logger.warn('⚠️ [SettlementService] No kingdom data available');
      return;
    }
    
    const settlement = kingdom.settlements.find(s => s.id === settlementId);
    if (!settlement) {
      logger.warn(`⚠️ [SettlementService] Settlement not found: ${settlementId}`);
      return;
    }
    
    await updateKingdom(k => {
      const s = k.settlements.find(s => s.id === settlementId);
      if (!s) return;
      
      // Recalculate ALL derived properties from structures
      s.foodStorageCapacity = structuresService.calculateFoodStorage(s);
      s.imprisonedUnrestCapacityValue = structuresService.calculateImprisonedUnrestCapacity(s);
      s.goldIncome = structuresService.calculateGoldIncome(s);
      
      // Handle imprisoned unrest capacity reduction
      // If current imprisoned unrest exceeds new capacity, return excess to kingdom unrest
      const currentImprisoned = s.imprisonedUnrest || 0;
      const newCapacity = s.imprisonedUnrestCapacityValue || 0;
      
      if (currentImprisoned > newCapacity) {
        const excess = currentImprisoned - newCapacity;
        s.imprisonedUnrest = newCapacity;
        k.unrest = (k.unrest || 0) + excess;
        
        logger.warn(`⚠️ [SettlementService] Imprisoned capacity reduced in ${s.name}: ${excess} unrest returned to kingdom (${currentImprisoned} → ${newCapacity})`);
      }
      
      // Army support = base tier + structure bonuses
      const baseTier = SettlementTierConfig[s.tier]?.armySupport || 0;
      const bonus = structuresService.calculateArmySupportBonus(s);
      s.armySupport = baseTier + bonus;
      
      // Skill bonuses
      s.skillBonuses = this.calculateSkillBonuses(s);
      
      logger.debug(`✅ [SettlementService] Settlement recalculated:`, {
        foodStorageCapacity: s.foodStorageCapacity,
        imprisonedUnrestCapacity: s.imprisonedUnrestCapacityValue,
        goldIncome: s.goldIncome,
        armySupport: s.armySupport,
        skillBonuses: Object.keys(s.skillBonuses).length
      });
    });
  }
  
  /**
   * INTERNAL: Recalculate kingdom-level capacity aggregations
   * Called automatically when settlement capacities change
   */
  private async recalculateKingdom(): Promise<void> {
    logger.info(`🔄 [SettlementService] Recalculating kingdom capacities`);
    
    const { getKingdomActor, updateKingdom } = await import('../../stores/KingdomStore');
    
    const actor = getKingdomActor();
    if (!actor) {
      logger.warn('⚠️ [SettlementService] No kingdom actor available');
      return;
    }
    
    const kingdom = actor.getKingdom();
    if (!kingdom) {
      logger.warn('⚠️ [SettlementService] No kingdom data available');
      return;
    }
    
    // Aggregate capacities across ALL settlements
    const totals = kingdom.settlements.reduce((acc, s) => ({
      foodCapacity: acc.foodCapacity + (s.foodStorageCapacity || 0),
      armyCapacity: acc.armyCapacity + (s.armySupport || 0),
      diplomaticCapacity: acc.diplomaticCapacity + structuresService.calculateDiplomaticCapacity(s),
      imprisonedUnrestCapacity: acc.imprisonedUnrestCapacity + (s.imprisonedUnrestCapacityValue || 0)
    }), {
      foodCapacity: 0,
      armyCapacity: 0,
      diplomaticCapacity: 0,
      imprisonedUnrestCapacity: 0
    });
    
    // Update kingdom resources
    await updateKingdom(k => {
      if (!k.resources) {
        k.resources = {
          gold: 0,
          food: 0,
          lumber: 0,
          stone: 0,
          ore: 0,
          luxuries: 0,
          foodCapacity: 0,
          armyCapacity: 0,
          diplomaticCapacity: 0,
          imprisonedUnrestCapacity: 0
        };
      }
      
      k.resources.foodCapacity = totals.foodCapacity;
      k.resources.armyCapacity = totals.armyCapacity;
      k.resources.diplomaticCapacity = totals.diplomaticCapacity;
      k.resources.imprisonedUnrestCapacity = totals.imprisonedUnrestCapacity;
      
      logger.debug(`✅ [SettlementService] Kingdom capacities updated:`, totals);
    });
  }
  
  /**
   * @deprecated Use addStructure() instead
   * Update a settlement's derived properties based on its current structures
   */
  async updateSettlementDerivedProperties(settlementId: string): Promise<void> {
    logger.warn(`⚠️ [SettlementService] updateSettlementDerivedProperties is deprecated, use addStructure/removeStructure`);
    await this.recalculateSettlement(settlementId);
    await this.recalculateKingdom();
  }
  
  /**
   * Update settlement properties
   * 
   * @param settlementId - Settlement ID
   * @param updates - Partial settlement updates
   */
  async updateSettlement(settlementId: string, updates: Partial<Settlement>): Promise<void> {
    logger.debug(`🏰 [SettlementService] Updating settlement: ${settlementId}`);
    
    const { updateKingdom } = await import('../../stores/KingdomStore');
    
    await updateKingdom(kingdom => {
      const settlement = kingdom.settlements.find(s => s.id === settlementId);
      if (settlement) {
        Object.assign(settlement, updates);
        logger.debug(`✅ [SettlementService] Updated ${settlement.name}`);
      } else {
        logger.warn(`⚠️ [SettlementService] Settlement not found: ${settlementId}`);
      }
    });
  }
  
  /**
   * Update kingdom-level capacity resources by aggregating from all settlements
   * This should be called whenever settlement structures change
   */
  async updateKingdomCapacities(): Promise<void> {
    logger.debug(`🎯 [SettlementService] Updating kingdom-level capacities`);
    
    const { getKingdomActor, updateKingdom } = await import('../../stores/KingdomStore');
    
    const actor = getKingdomActor();
    if (!actor) {
      logger.warn('⚠️ [SettlementService] No kingdom actor available');
      return;
    }
    
    const kingdom = actor.getKingdom();
    if (!kingdom) {
      logger.warn('⚠️ [SettlementService] No kingdom data available');
      return;
    }
    
    // Calculate total food capacity across all settlements
    const totalFoodCapacity = kingdom.settlements.reduce((total, settlement) => {
      return total + (settlement.foodStorageCapacity || 0);
    }, 0);
    
    // Calculate total army capacity across all settlements
    const totalArmyCapacity = kingdom.settlements.reduce((total, settlement) => {
      return total + (settlement.armySupport || 0);
    }, 0);
    
    // Calculate total diplomatic capacity across all settlements
    const totalDiplomaticCapacity = kingdom.settlements.reduce((total, settlement) => {
      return total + structuresService.calculateDiplomaticCapacity(settlement);
    }, 0);
    
    // Update kingdom resources
    await updateKingdom(k => {
      if (!k.resources) {
        k.resources = {
          gold: 0,
          food: 0,
          lumber: 0,
          stone: 0,
          ore: 0,
          foodCapacity: 0,
          armyCapacity: 0,
          diplomaticCapacity: 0,
          imprisonedUnrestCapacity: 0
        };
      }
      
      k.resources.foodCapacity = totalFoodCapacity;
      k.resources.armyCapacity = totalArmyCapacity;
      k.resources.diplomaticCapacity = totalDiplomaticCapacity;
      
      logger.debug(`✅ [SettlementService] Updated kingdom capacities:`, {
        foodCapacity: totalFoodCapacity,
        armyCapacity: totalArmyCapacity,
        diplomaticCapacity: totalDiplomaticCapacity
      });
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
    logger.debug(`🏰 [SettlementService] Deleting settlement: ${settlementId}`);
    
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
    
    logger.debug(`✅ [SettlementService] Deleted ${settlementName}: ${structuresRemoved} structures, ${armiesMarkedUnsupported} armies unsupported`);
    
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
    logger.debug(`🏰 [SettlementService] Upgrading settlement: ${settlementId}`);
    
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
    
    // Check if settlement is using the old tier's default image
    const oldDefaultImage = getDefaultSettlementImage(settlement.tier);
    const isUsingDefaultImage = settlement.imagePath === oldDefaultImage;
    
    // Perform upgrade
    await updateKingdom(k => {
      const s = k.settlements.find(s => s.id === settlementId);
      if (s) {
        s.tier = nextTier;
        
        // Update to new tier's default image if settlement was using old default
        if (isUsingDefaultImage) {
          s.imagePath = getDefaultSettlementImage(nextTier);
          logger.debug(`🖼️ [SettlementService] Updated default image to ${nextTier} tier`);
        }
      }
    });
    
    logger.debug(`✅ [SettlementService] Upgraded ${settlement.name} to ${nextTier}`);
  }
  
  
  /**
   * Update settlement level
   * 
   * @param settlementId - Settlement ID
   * @param newLevel - New settlement level (1-20)
   */
  async updateSettlementLevel(settlementId: string, newLevel: number): Promise<void> {
    logger.debug(`🏰 [SettlementService] Updating settlement level: ${settlementId} → ${newLevel}`);
    
    // Validate level range
    if (newLevel < 1 || newLevel > 20) {
      throw new Error(`Invalid settlement level: ${newLevel} (must be 1-20)`);
    }
    
    await this.updateSettlement(settlementId, { level: newLevel });
    
    logger.debug(`✅ [SettlementService] Settlement level updated to ${newLevel}`);
  }
}

// Export singleton instance
export const settlementService = new SettlementService();
