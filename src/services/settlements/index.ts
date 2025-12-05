// Settlement Service for PF2e Kingdom Lite
// Manages settlement operations and calculations

import { get, derived } from 'svelte/store';
import { PLAYER_KINGDOM } from '../../types/ownership';
import { kingdomData } from '../../stores/KingdomStore';
import type { Settlement } from '../../models/Settlement';
import { SettlementTier, SettlementTierConfig, getDefaultSettlementImage } from '../../models/Settlement';
import { structuresService } from '../structures';
import { territoryService } from '../territory';
import { roadConnectivityService } from '../RoadConnectivityService';
import { logger } from '../../utils/Logger';

/**
 * Structure Demand - represents a citizen demand for a specific structure
 */
export interface StructureDemand {
  modifierId: string;
  eventInstanceId: string;
  structureId: string;
  structureName: string;
  settlementId: string;
  settlementName: string;
}

/**
 * Derived store: active structure demands from kingdom data
 * Automatically updates when activeModifiers changes
 */
export const structureDemands = derived(kingdomData, ($kingdom) => {
  return ($kingdom.activeModifiers || [])
    .filter((m: any) => m.sourceType === 'custom' && m.sourceName === 'Demand Structure Event')
    .map((m: any): StructureDemand => ({
      modifierId: m.id,
      eventInstanceId: m.sourceId,
      structureId: m.metadata?.demandedStructureId || '',
      structureName: m.metadata?.demandedStructureName || '',
      settlementId: m.metadata?.demandedSettlementId || '',
      settlementName: m.metadata?.demandedSettlementName || ''
    }));
});

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
        if (settlement.structureIds.length < 3) requirements.push('3 structures required');
        break;
      case SettlementTier.TOWN:
        nextTier = SettlementTier.CITY;
        if (settlement.structureIds.length < 6) requirements.push('6 structures required');
        break;
      case SettlementTier.CITY:
        nextTier = SettlementTier.METROPOLIS;
        if (settlement.structureIds.length < 9) requirements.push('9 structures required');
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
   * Get supplementary info for settlement display in dialogs
   * Shows structure progress and next tier requirements
   * 
   * Used by entity selection dialogs to provide context about settlement upgrade status
   * Does NOT repeat information already visible (settlement name shows tier, separate field shows level)
   * 
   * @param settlement - Settlement to get info for
   * @returns Formatted info string for display (structure progress only)
   */
  getSettlementUpgradeInfo(settlement: Settlement): string {
    const currentLevel = settlement.level;
    const currentTier = settlement.tier;
    const structureCount = settlement.structureIds?.length || 0;
    
    // Get tier thresholds
    const tierInfo: Record<string, { minStructures: number; nextTier: string; nextTierLevel: number }> = {
      'village': { minStructures: 3, nextTier: 'Town', nextTierLevel: 5 },
      'town': { minStructures: 6, nextTier: 'City', nextTierLevel: 10 },
      'city': { minStructures: 9, nextTier: 'Metropolis', nextTierLevel: 15 },
      'metropolis': { minStructures: 999, nextTier: '', nextTierLevel: 999 }
    };
    
    const info = tierInfo[currentTier.toLowerCase()];
    if (!info) return '';
    
    // Can't upgrade if at max level
    if (currentLevel >= 20) {
      return '(Max Level)';
    }
    
    // Only show structure progress for tiers that can upgrade
    if (currentTier.toLowerCase() === 'metropolis') {
      return '';
    }
    
    // Structure progress with next tier info
    const structureProgress = `${structureCount}/${info.minStructures} structures`;
    const canUpgradeTier = structureCount >= info.minStructures;
    const nextLevel = currentLevel + 1;
    
    if (canUpgradeTier && nextLevel >= info.nextTierLevel) {
      // Ready to become next tier
      return `${structureProgress} → ${info.nextTier} at level ${info.nextTierLevel}`;
    } else if (!canUpgradeTier) {
      // Need more structures
      const needed = info.minStructures - structureCount;
      return `${structureProgress} (need ${needed} more for ${info.nextTier})`;
    } else {
      // Has structures but level not high enough yet
      return `${structureProgress} (${info.nextTier} at level ${info.nextTierLevel})`;
    }
  }
  
  /**
   * Calculate skill bonuses from a settlement's structures
   * Returns a map of skill name -> highest bonus value
   * Only counts non-damaged structures
   * 
   * @param settlement - Settlement to calculate bonuses for
   * @returns Object with bonuses map and detailed bonus information
   */
  calculateSkillBonuses(settlement: Settlement): {
    bonuses: Record<string, number>;
    details: import('../../models/Settlement').SkillBonusDetail[];
  } {
    const bonuses: Record<string, number> = {};
    const details: import('../../models/Settlement').SkillBonusDetail[] = [];
    const skillToStructure: Record<string, { structureId: string; structureName: string; bonus: number }> = {};
    
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
          const currentBonus = bonuses[skill] || 0;
          if (bonus > currentBonus) {
            bonuses[skill] = bonus;
            skillToStructure[skill] = {
              structureId,
              structureName: structure.name,
              bonus
            };
          }
        }
      }
    }
    
    // Build details array from the highest bonuses
    for (const skill in skillToStructure) {
      const { structureId, structureName, bonus } = skillToStructure[skill];
      details.push({
        skill,
        bonus,
        structureId,
        structureName
      });
    }
    
    return { bonuses, details };
  }
  
  /**
   * Update a settlement's skill bonuses based on its current structures
   * Called automatically when structures are added/removed
   * 
   * @param settlementId - Settlement ID to update
   */
  async updateSettlementSkillBonuses(settlementId: string): Promise<void> {

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
    const { bonuses, details } = this.calculateSkillBonuses(settlement);
    
    // Update settlement
    await updateKingdom(k => {
      const s = k.settlements.find((s: Settlement) => s.id === settlementId);
      if (s) {
        s.skillBonuses = bonuses;
        s.skillBonusDetails = details;
      }
    });
  }
  
  /**
   * PUBLIC API: Add a structure to a settlement
   * Automatically recalculates settlement and kingdom capacities
   * Also checks for and fulfills any matching structure demands
   */
  async addStructure(settlementId: string, structureId: string): Promise<void> {

    const { updateKingdom } = await import('../../stores/KingdomStore');
    
    await updateKingdom(k => {
      const s = k.settlements.find((s: Settlement) => s.id === settlementId);
      if (s && !s.structureIds.includes(structureId)) {
        s.structureIds.push(structureId);
      }
    });
    
    await this.recalculateSettlement(settlementId);
    await this.recalculateKingdom();

    // Check for demand fulfillment (reactive - single point of truth)
    const demand = this.checkDemandFulfillment(settlementId, structureId);
    if (demand) {
      await this.fulfillDemand(demand);
    }
  }
  
  /**
   * PUBLIC API: Remove a structure from a settlement
   * Automatically recalculates settlement and kingdom capacities
   */
  async removeStructure(settlementId: string, structureId: string): Promise<void> {

    const { updateKingdom } = await import('../../stores/KingdomStore');
    
    await updateKingdom(k => {
      const s = k.settlements.find((s: Settlement) => s.id === settlementId);
      if (s) {
        s.structureIds = s.structureIds.filter(id => id !== structureId);
      }
    });
    
    await this.recalculateSettlement(settlementId);
    await this.recalculateKingdom();

  }
  
  /**
   * PUBLIC API: Trigger recalculation after structure damage/repair
   * This recalculates settlement and kingdom capacities without modifying structure lists
   */
  async recalculateAfterStructureChange(settlementId: string): Promise<void> {
    await this.recalculateSettlement(settlementId);
    await this.recalculateKingdom();
  }
  
  /**
   * INTERNAL: Recalculate all derived properties for a settlement
   * Called automatically when structures change
   */
  private async recalculateSettlement(settlementId: string): Promise<void> {

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
      const s = k.settlements.find((s: Settlement) => s.id === settlementId);
      if (!s) return;
      
      // Recalculate ALL derived properties from structures
      s.foodStorageCapacity = structuresService.calculateFoodStorage(s);
      s.imprisonedUnrestCapacityValue = structuresService.calculateImprisonedUnrestCapacity(s);
      
      // Calculate road connectivity (if not capital)
      if (!s.isCapital) {
        // Get this settlement's hex ownership (single source of truth)
        const currentHex = k.hexes.find((h: any) => 
          h.row === s.location.x && h.col === s.location.y
        );
        const currentOwner = currentHex?.claimedBy;
        
        // Find capital of the same faction (by hex ownership)
        const capital = k.settlements.find((set: Settlement) => {
          if (!set.isCapital) return false;
          const setHex = k.hexes.find((h: any) => 
            h.row === set.location.x && h.col === set.location.y
          );
          return setHex?.claimedBy === currentOwner;
        });
        
        s.connectedByRoads = capital
          ? roadConnectivityService.isConnectedToCapital(s, capital, k)
          : false;
      } else {
        // Capital doesn't need connectivity flag (uses isCapital instead)
        s.connectedByRoads = false;
      }
      
      // Calculate gold income (base + structures + capital/road multiplier)
      // This uses connectedByRoads flag calculated above
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
      const { bonuses, details } = this.calculateSkillBonuses(s);
      s.skillBonuses = bonuses;
      s.skillBonusDetails = details;
    });
  }
  
  /**
   * INTERNAL: Recalculate kingdom-level capacity aggregations
   * Called automatically when settlement capacities change
   */
  private async recalculateKingdom(): Promise<void> {

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
      
      // Handle food storage capacity reduction
      // If current food exceeds new capacity, excess food is lost (spoils)
      const currentFood = k.resources.food || 0;
      const newFoodCapacity = totals.foodCapacity;
      
      if (currentFood > newFoodCapacity) {
        const excess = currentFood - newFoodCapacity;
        k.resources.food = newFoodCapacity;
        
        logger.warn(`⚠️ [SettlementService] Food storage capacity reduced: ${excess} food spoiled (${currentFood} → ${newFoodCapacity})`);
      }

    });
  }
  
  /**
   * Update settlement image path
   * Convenience method for image updates
   * 
   * @param settlementId - Settlement ID
   * @param imagePath - New image path (empty string to use default)
   */
  async updateSettlementImage(settlementId: string, imagePath: string): Promise<void> {

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

  }
  
  /**
   * Update settlement map icon path
   * Convenience method for map icon updates
   * Also syncs the map icon to the hex feature in territory service
   * 
   * @param settlementId - Settlement ID
   * @param iconPath - New map icon path (undefined to use default tier icon)
   */
  async updateSettlementMapIcon(settlementId: string, iconPath: string | undefined): Promise<void> {

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
    
    // Update settlement's mapIconPath
    await this.updateSettlement(settlementId, { mapIconPath: iconPath });
    
    // Sync mapIconPath to hex feature
    const hexId = `${settlement.location.x}.${settlement.location.y}`;
    await updateKingdom(k => {
      // @ts-ignore - Hex features typing will be updated
      const hex = k.hexes.find((h: any) => h.id === hexId);
      if (hex) {
        // @ts-ignore - Hex features typing will be updated
        const settlementFeature = hex.features?.find((f: any) => 
          f.type === 'settlement' && f.settlementId === settlementId
        );
        if (settlementFeature) {
          settlementFeature.mapIconPath = iconPath;

        }
      }
    });

  }
  
  /**
   * Update settlement properties
   * 
   * @param settlementId - Settlement ID
   * @param updates - Partial settlement updates
   */
  async updateSettlement(settlementId: string, updates: Partial<Settlement>): Promise<void> {

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
      const s = k.settlements.find((s: Settlement) => s.id === settlementId);
      if (s) {
        Object.assign(s, updates);
        updatedSettlement = s;
        
        // SYNC: Update hex feature to keep settlement data consistent
        if (nameChanged || tierChanged) {
          const hexId = `${s.location.x}.${s.location.y}`;
          const hex = k.hexes.find((h: any) => h.id === hexId) as any;
          if (hex?.features) {
            const settlementFeature = hex.features.find((f: any) => 
              f.type === 'settlement' && f.settlementId === settlementId
            ) as any;
            if (settlementFeature) {
              if (nameChanged) settlementFeature.name = s.name;
              if (tierChanged) settlementFeature.tier = s.tier;

            }
          }
        }

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

      }
      
      if (newHasLocation) {
        // Add settlement feature to new location
        await territoryService.updateKingmakerSettlement(updatedSettlement);

      }
    } else if ((nameChanged || tierChanged) && (updatedSettlement.location.x !== 0 || updatedSettlement.location.y !== 0)) {
      // Name or tier changed - update existing feature
      await territoryService.updateKingmakerSettlement(updatedSettlement);

    }
  }
  
  /**
   * Update kingdom-level capacity resources by aggregating from all settlements
   * This should be called whenever settlement structures change
   */
  async updateKingdomCapacities(): Promise<void> {

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
      settlement.supportedUnits.forEach((armyId: string) => {
        const army = k.armies.find(a => a.id === armyId);
        if (army) {
          army.supportedBySettlementId = null;
          army.isSupported = false;
          // Don't increment turnsUnsupported yet - happens during Upkeep phase
        }
      });
      
      // Clear hasRoad flag from settlement hex
      // Note: If a road was explicitly built on this hex, hasRoad remains true
      // This check is no longer needed since hasRoad is the source of truth
      const settlementHexId = `${settlementLocation.x}.${settlementLocation.y}`;
      const hex = k.hexes.find((h: any) => h.id === settlementHexId);
      if (hex && hex.hasRoad) {
        // Keep hasRoad=true if a road was explicitly built here
        // Only clear if this was ONLY a settlement (not also a road)
        // Since we can't distinguish, we keep it safe and leave hasRoad as-is
        // TODO: Track explicitly-built roads separately if needed
      }
      
      // Remove settlement
      k.settlements = k.settlements.filter(s => s.id !== settlementId);
    });
    
    // Remove from Kingmaker map
    await territoryService.deleteKingmakerSettlement(settlementLocation);

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
      const s = k.settlements.find((s: Settlement) => s.id === settlementId);
      if (s) {
        s.tier = nextTier;
        
        // Update to new tier's default image if settlement was using old default
        if (isUsingDefaultImage) {
          s.imagePath = getDefaultSettlementImage(nextTier);

        }
        
        upgradedSettlement = s;
      }
    });
    
    // Update Kingmaker map with new tier
    if (upgradedSettlement) {
      await territoryService.updateKingmakerSettlement(upgradedSettlement);
    }

  }
  
  
  /**
   * Update settlement level with automatic tier transitions
   * 
   * Uses centralized tier requirements from SettlementTierConfig.
   * Tier transitions occur automatically when structure requirements are met.
   * Level is NOT a blocker - you can upgrade level freely (up to 20), tier upgrades require structures.
   * 
   * @param settlementId - Settlement ID
   * @param newLevel - New settlement level (1-20)
   */
  async updateSettlementLevel(settlementId: string, newLevel: number): Promise<void> {

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
    
    // Import helper functions from Settlement model
    const { getNextTier, getNextTierRequirements } = await import('../../models/Settlement');
    
    // Determine new tier based on structure count ONLY
    let newTier = settlement.tier;
    const nextTier = getNextTier(oldTier);
    
    if (nextTier) {
      const reqs = getNextTierRequirements(oldTier);
      // Only check structure count - level is not a blocker
      if (reqs && structureCount >= reqs.minStructures) {
        newTier = nextTier;
      }
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
      }
    }
    
    await this.updateSettlement(settlementId, updates);

  }

  // ============================================
  // STRUCTURE DEMAND MANAGEMENT
  // ============================================

  /**
   * Register a new structure demand from a Demand Structure event
   * Creates an activeModifier that tracks the demand
   * 
   * @param demand - The demand details (structure, settlement, event instance)
   * @returns The modifier ID created
   */
  async registerDemand(demand: {
    structureId: string;
    structureName: string;
    settlementId: string;
    settlementName: string;
    eventInstanceId: string;
    currentTurn: number;
  }): Promise<string> {
    const { updateKingdom } = await import('../../stores/KingdomStore');
    
    const modifierId = `demand-structure-${demand.structureId}-${Date.now()}`;
    
    logger.info(`[SettlementService] Registering structure demand: ${demand.structureName} in ${demand.settlementName}`);
    
    await updateKingdom(kingdom => {
      if (!kingdom.activeModifiers) {
        kingdom.activeModifiers = [];
      }
      
      kingdom.activeModifiers.push({
        id: modifierId,
        name: 'Citizen Demand Structure',
        description: `Citizens of ${demand.settlementName} demand a ${demand.structureName}.`,
        icon: 'fa-bullhorn',
        tier: 1,
        sourceType: 'custom',
        sourceId: demand.eventInstanceId,
        sourceName: 'Demand Structure Event',
        startTurn: demand.currentTurn,
        modifiers: [
          { type: 'static', resource: 'unrest', value: 1, duration: 'ongoing' }
        ],
        metadata: {
          demandedStructureId: demand.structureId,
          demandedStructureName: demand.structureName,
          demandedSettlementId: demand.settlementId,
          demandedSettlementName: demand.settlementName
        }
      });
    });
    
    logger.info(`[SettlementService] Created demand modifier: ${modifierId}`);
    return modifierId;
  }

  /**
   * Check if adding a structure fulfills any active demand
   * 
   * @param settlementId - The settlement where structure was added
   * @param structureId - The structure that was added
   * @returns The matching demand if found, null otherwise
   */
  checkDemandFulfillment(settlementId: string, structureId: string): StructureDemand | null {
    const demands = get(structureDemands);
    
    // Find a demand matching this structure and settlement
    const matchingDemand = demands.find(d => 
      d.structureId === structureId && d.settlementId === settlementId
    );
    
    if (matchingDemand) {
      logger.info(`[SettlementService] Found matching demand: ${matchingDemand.structureName} in ${matchingDemand.settlementName}`);
    }
    
    return matchingDemand || null;
  }

  /**
   * Fulfill a structure demand - show reward dialog and remove modifier
   * 
   * @param demand - The demand to fulfill
   */
  async fulfillDemand(demand: StructureDemand): Promise<void> {
    logger.info(`[SettlementService] Fulfilling demand: ${demand.structureName} in ${demand.settlementName}`);
    
    // Import and show dialog
    const { DemandStructureFulfilledDialog } = await import('../../ui/dialogs/DemandStructureFulfilledDialog');
    
    const result = await DemandStructureFulfilledDialog.show({
      structureId: demand.structureId,
      structureName: demand.structureName,
      settlementName: demand.settlementName,
      eventInstanceId: demand.eventInstanceId,
      modifierId: demand.modifierId
    });
    
    if (result) {
      await DemandStructureFulfilledDialog.applyRewards(
        demand.structureId,
        demand.structureName,
        result,
        demand.eventInstanceId,
        demand.modifierId,
        demand.settlementName
      );
    }
  }
}

// Export singleton instance
export const settlementService = new SettlementService();
