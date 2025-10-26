// Settlement Service for PF2e Kingdom Lite
// Manages settlement operations and calculations

import { get } from 'svelte/store';
import { PLAYER_KINGDOM } from '../../types/ownership';
import { kingdomData } from '../../stores/KingdomStore';
import type { Settlement } from '../../models/Settlement';
import { SettlementTier, SettlementTierConfig, getDefaultSettlementImage } from '../../models/Settlement';
import { structuresService } from '../structures';
import { territoryService } from '../territory';
import { logger } from '../../utils/Logger';

export class SettlementService {
  /**
   * Filter settlements to only include those with valid map locations IN CLAIMED TERRITORY
   * Settlements at (0, 0) are considered unmapped
   * Settlements in unclaimed hexes (claimedBy !== PLAYER_KINGDOM) are excluded from kingdom calculations
   * 
   * @param settlements - All settlements
   * @param hexes - Kingdom hexes to check ownership
   */
  private getSettlementsWithLocations(settlements: Settlement[], hexes?: any[]): Settlement[] {
    return settlements.filter(s => {
      // Filter out unmapped settlements (at origin)
      if (s.location.x === 0 && s.location.y === 0) {
        return false;
      }
      
      // If hexes provided, also check if settlement is in claimed territory
      if (hexes) {
        const settlementHex = hexes.find(h => 
          h.row === s.location.x && h.col === s.location.y
        );
        
        // Settlement must be in a player-claimed hex (claimedBy === PLAYER_KINGDOM)
        if (!settlementHex || settlementHex.claimedBy !== PLAYER_KINGDOM) {
          return false;
        }
      }
      
      return true;
    });
  }
  
  /**
   * Calculate total gold income from all settlements
   * Only generates gold if settlements were fed last turn
   * Only includes settlements with valid map locations IN CLAIMED TERRITORY
   * 
   * This now sums the pre-calculated goldIncome property on each settlement.
   * The individual settlement gold income is calculated by recalculateSettlement().
   */
  calculateSettlementGoldIncome(settlements: Settlement[], hexes?: any[]): number {
    let totalGold = 0;
    
    // Only count settlements with valid locations in claimed territory
    const mappedSettlements = this.getSettlementsWithLocations(settlements, hexes);
    
    mappedSettlements.forEach(settlement => {
      if (settlement.wasFedLastTurn) {
        // Use pre-calculated gold income from settlement property
        totalGold += settlement.goldIncome || 0;
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
   * Calculate gold income for an individual settlement
   * Used to populate settlement.goldIncome property
   */
  private calculateIndividualSettlementGoldIncome(settlement: Settlement): number {
    // Base gold income by tier
    const baseIncome = this.getBaseGoldIncome(settlement.tier);
    
    // Additional gold from structures (markets, etc.)
    const structureIncome = this.getStructureGoldIncome(settlement);
    
    let settlementIncome = baseIncome + structureIncome;
    
    // Double income if settlement is the capital OR connected to capital by roads
    if (settlement.isCapital || settlement.connectedByRoads) {
      settlementIncome *= 2;
    }
    
    return settlementIncome;
  }
  
  /**
   * Calculate gold income from structures
   */
  private getStructureGoldIncome(settlement: Settlement): number {
    return structuresService.calculateGoldIncome(settlement);
  }
  
  /**
   * Calculate total food consumption for all settlements
   * Only includes settlements with valid map locations IN CLAIMED TERRITORY
   */
  calculateTotalFoodConsumption(settlements: Settlement[], hexes?: any[]): number {
    // Only count settlements with valid locations in claimed territory
    const mappedSettlements = this.getSettlementsWithLocations(settlements, hexes);
    
    return mappedSettlements.reduce((total, settlement) => {
      const config = SettlementTierConfig[settlement.tier];
      return total + (config?.foodConsumption || 0);
    }, 0);
  }
  
  /**
   * Get food consumption breakdown by settlement
   * Only includes settlements with valid map locations IN CLAIMED TERRITORY
   */
  getFoodConsumptionBreakdown(settlements: Settlement[], hexes?: any[]): Array<{settlement: Settlement, consumption: number}> {
    // Only count settlements with valid locations in claimed territory
    const mappedSettlements = this.getSettlementsWithLocations(settlements, hexes);
    
    return mappedSettlements.map(settlement => {
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
   * Only includes settlements with valid map locations IN CLAIMED TERRITORY
   */
  processFoodConsumption(settlements: Settlement[], availableFood: number, hexes?: any[]): {
    shortage: number,
    fedSettlements: Set<string>,
    unfedSettlements: Set<string>
  } {
    // Only count settlements with valid locations in claimed territory
    const mappedSettlements = this.getSettlementsWithLocations(settlements, hexes);
    
    const totalNeeded = this.calculateTotalFoodConsumption(settlements, hexes);
    const fedSettlements = new Set<string>();
    const unfedSettlements = new Set<string>();
    
    if (availableFood >= totalNeeded) {
      // All settlements are fed
      mappedSettlements.forEach(s => {
        fedSettlements.add(s.id);
        s.wasFedLastTurn = true;
      });
      return { shortage: 0, fedSettlements, unfedSettlements };
    } else {
      // Shortage - mark all as unfed for simplicity
      // Could implement priority system later
      const shortage = totalNeeded - availableFood;
      mappedSettlements.forEach(s => {
        unfedSettlements.add(s.id);
        s.wasFedLastTurn = false;
      });
      return { shortage, fedSettlements, unfedSettlements };
    }
  }
  
  
  /**
   * Check if a settlement can be upgraded
   * Based on Reignmaker Lite rules: structure requirements only
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
        if (settlement.structureIds.length < 2) requirements.push('2 structures required');
        break;
      case SettlementTier.TOWN:
        nextTier = SettlementTier.CITY;
        if (settlement.structureIds.length < 4) requirements.push('4 structures required');
        break;
      case SettlementTier.CITY:
        nextTier = SettlementTier.METROPOLIS;
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
    
    const kingdom = actor.getKingdomData();
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
    
    const kingdom = actor.getKingdomData();
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
      
      // Calculate gold income (base + structures + capital/road multiplier)
      s.goldIncome = this.calculateIndividualSettlementGoldIncome(s);
      
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
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      logger.warn('⚠️ [SettlementService] No kingdom data available');
      return;
    }
    
    // Aggregate capacities across ALL settlements with valid locations in claimed territory
    const mappedSettlements = this.getSettlementsWithLocations(kingdom.settlements, kingdom.hexes);
    
    const totals = mappedSettlements.reduce((acc, s) => ({
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
          diplomaticCapacity: 1,
          imprisonedUnrestCapacity: 0
        };
      }
      
      k.resources.foodCapacity = totals.foodCapacity;
      k.resources.armyCapacity = totals.armyCapacity;
      // Base diplomatic capacity is 1, plus any bonuses from structures
      k.resources.diplomaticCapacity = 1 + totals.diplomaticCapacity;
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
   * Update settlement image path
   * Convenience method for image updates
   * 
   * @param settlementId - Settlement ID
   * @param imagePath - New image path (empty string to use default)
   */
  async updateSettlementImage(settlementId: string, imagePath: string): Promise<void> {
    logger.debug(`🏰 [SettlementService] Updating settlement image: ${settlementId}`);
    
    const { getKingdomActor } = await import('../../stores/KingdomStore');
    
    const actor = getKingdomActor();
    if (!actor) {
      throw new Error('No kingdom actor available');
    }
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      throw new Error('No kingdom data available');
    }
    
    const settlement = kingdom.settlements.find(s => s.id === settlementId);
    if (!settlement) {
      throw new Error(`Settlement not found: ${settlementId}`);
    }
    
    // If empty string, use default tier image
    const finalImagePath = imagePath || undefined;
    
    await this.updateSettlement(settlementId, { imagePath: finalImagePath });
    
    logger.debug(`✅ [SettlementService] Updated image for ${settlement.name}`);
  }
  
  /**
   * Update settlement properties
   * 
   * @param settlementId - Settlement ID
   * @param updates - Partial settlement updates
   */
  async updateSettlement(settlementId: string, updates: Partial<Settlement>): Promise<void> {
    logger.debug(`🏰 [SettlementService] Updating settlement: ${settlementId}`);
    
    const { getKingdomActor, updateKingdom } = await import('../../stores/KingdomStore');
    
    const actor = getKingdomActor();
    if (!actor) {
      throw new Error('No kingdom actor available');
    }
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      throw new Error('No kingdom data available');
    }
    
    const settlement = kingdom.settlements.find(s => s.id === settlementId);
    if (!settlement) {
      throw new Error(`Settlement not found: ${settlementId}`);
    }
    
    // Track changes for Kingmaker map updates
    const nameChanged = updates.name && updates.name !== settlement.name;
    const tierChanged = updates.tier && updates.tier !== settlement.tier;
    const locationChanged = updates.location && 
      (updates.location.x !== settlement.location.x || updates.location.y !== settlement.location.y);
    const oldLocation = { ...settlement.location };
    
    let updatedSettlement: Settlement | undefined;
    
    await updateKingdom(k => {
      const s = k.settlements.find(s => s.id === settlementId);
      if (s) {
        Object.assign(s, updates);
        updatedSettlement = s;
        logger.debug(`✅ [SettlementService] Updated ${s.name}`);
      }
    });
    
    if (!updatedSettlement) return;
    
    // Handle Kingmaker map updates
    if (locationChanged) {
      // Location changed - remove from old location, add to new location
      const oldHasLocation = oldLocation.x !== 0 || oldLocation.y !== 0;
      const newHasLocation = updatedSettlement.location.x !== 0 || updatedSettlement.location.y !== 0;
      
      if (oldHasLocation) {
        // Remove settlement feature from old location
        await territoryService.deleteKingmakerSettlement(oldLocation);
        logger.debug(`🗺️ [SettlementService] Removed ${updatedSettlement.name} from Kingmaker map at ${oldLocation.x}:${oldLocation.y}`);
      }
      
      if (newHasLocation) {
        // Add settlement feature to new location
        await territoryService.updateKingmakerSettlement(updatedSettlement);
        logger.debug(`🗺️ [SettlementService] Added ${updatedSettlement.name} to Kingmaker map at ${updatedSettlement.location.x}:${updatedSettlement.location.y}`);
      }
    } else if ((nameChanged || tierChanged) && (updatedSettlement.location.x !== 0 || updatedSettlement.location.y !== 0)) {
      // Name or tier changed - update existing feature
      await territoryService.updateKingmakerSettlement(updatedSettlement);
      logger.debug(`🗺️ [SettlementService] Updated ${updatedSettlement.name} ${tierChanged ? 'tier' : 'name'} on Kingmaker map`);
    }
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
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      logger.warn('⚠️ [SettlementService] No kingdom data available');
      return;
    }
    
    // Calculate total food capacity across all settlements with valid locations in claimed territory
    const mappedSettlements = this.getSettlementsWithLocations(kingdom.settlements, kingdom.hexes);
    
    const totalFoodCapacity = mappedSettlements.reduce((total, settlement) => {
      return total + (settlement.foodStorageCapacity || 0);
    }, 0);
    
    // Calculate total army capacity across all settlements
    const totalArmyCapacity = mappedSettlements.reduce((total, settlement) => {
      return total + (settlement.armySupport || 0);
    }, 0);
    
    // Calculate total diplomatic capacity across all settlements
    const totalDiplomaticCapacity = mappedSettlements.reduce((total, settlement) => {
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
      // Base diplomatic capacity is 1, plus any bonuses from structures
      k.resources.diplomaticCapacity = 1 + totalDiplomaticCapacity;
      
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
    
    const kingdom = actor.getKingdomData();
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
    const settlementLocation = settlement.location;
    
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
    
    // Remove from Kingmaker map
    await territoryService.deleteKingmakerSettlement(settlementLocation);
    
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
    
    const kingdom = actor.getKingdomData();
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
    
    let upgradedSettlement: Settlement | undefined;
    
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
        
        upgradedSettlement = s;
      }
    });
    
    // Update Kingmaker map with new tier
    if (upgradedSettlement) {
      await territoryService.updateKingmakerSettlement(upgradedSettlement);
    }
    
    logger.debug(`✅ [SettlementService] Upgraded ${settlement.name} to ${nextTier}`);
  }
  
  
  /**
   * Update settlement level with automatic tier transitions
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
    
    const { getKingdomActor } = await import('../../stores/KingdomStore');
    const actor = getKingdomActor();
    if (!actor) {
      throw new Error('No kingdom actor available');
    }
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      throw new Error('No kingdom data available');
    }
    
    const settlement = kingdom.settlements.find(s => s.id === settlementId);
    if (!settlement) {
      throw new Error(`Settlement not found: ${settlementId}`);
    }
    
    const structureCount = settlement.structureIds?.length || 0;
    const oldTier = settlement.tier;
    
    // Determine new tier based on level and structure count
    let newTier = settlement.tier;
    
    if (newLevel >= 8 && structureCount >= 8 && oldTier !== SettlementTier.METROPOLIS) {
      newTier = SettlementTier.METROPOLIS;
      logger.info(`🎉 [SettlementService] ${settlement.name} transitions to Metropolis!`);
    } else if (newLevel >= 5 && structureCount >= 4 && oldTier === SettlementTier.TOWN) {
      newTier = SettlementTier.CITY;
      logger.info(`🎉 [SettlementService] ${settlement.name} transitions to City!`);
    } else if (newLevel >= 2 && structureCount >= 2 && oldTier === SettlementTier.VILLAGE) {
      newTier = SettlementTier.TOWN;
      logger.info(`🎉 [SettlementService] ${settlement.name} transitions to Town!`);
    }
    
    // Check if settlement is using the old tier's default image
    const isUsingDefaultImage = settlement.imagePath === getDefaultSettlementImage(oldTier);
    
    const updates: Partial<Settlement> = { level: newLevel };
    
    // Update tier if it changed
    if (newTier !== oldTier) {
      updates.tier = newTier;
      
      // Update to new tier's default image if settlement was using old default
      if (isUsingDefaultImage) {
        updates.imagePath = getDefaultSettlementImage(newTier);
        logger.debug(`🖼️ [SettlementService] Updated default image to ${newTier} tier`);
      }
    }
    
    await this.updateSettlement(settlementId, updates);
    
    logger.debug(`✅ [SettlementService] Settlement level updated to ${newLevel}${newTier !== oldTier ? ` (tier: ${newTier})` : ''}`);
  }
}

// Export singleton instance
export const settlementService = new SettlementService();
