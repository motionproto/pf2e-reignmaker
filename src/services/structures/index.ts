// Structures Service for PF2e Kingdom Lite
// Manages structure definitions and calculations

import { get } from 'svelte/store';
import { kingdomData, getKingdomActor } from '../../stores/KingdomStore';
import type { Settlement } from '../../models/Settlement';
import { StructureCondition } from '../../models/Settlement';
import type { Structure, ResourceCost, StructureFamily, StructureType } from '../../models/Structure';
import { parseStructureFromJSON, SpecialAbility, StructureCategory } from '../../models/Structure';
import structuresData from '../../data-compiled/structures.json';
import { logger } from '../../utils/Logger';

// Type for repairable structure information
export interface RepairableStructure {
  structureId: string;
  structureName: string;
  structureCategory: string;
  structureTier: number;
  settlementId: string;
  settlementName: string;
  halfCost: ResourceCost;
}

export class StructuresService {
  private structures: Map<string, Structure> = new Map();
  private families: StructureFamily[] = [];
  private structuresLoaded: boolean = false;
  
  /**
   * Initialize structures from imported JSON data (hierarchical families format)
   */
  initializeStructures(): void {
    if (this.structuresLoaded) return;
    
    try {
      // Load structure families from the imported JSON data
      const data = structuresData as any;
      
      if (data.families && Array.isArray(data.families)) {
        this.families = data.families;
        
        // Flatten families into individual structures
        for (const family of this.families) {
          if (!family.tiers || !Array.isArray(family.tiers)) {
            continue;
          }
          
          let previousStructureId: string | null = null;
          
          for (let tierIndex = 0; tierIndex < family.tiers.length; tierIndex++) {
            const structureData = family.tiers[tierIndex];
            
            // Add metadata from family context
            structureData.type = family.type;
            structureData.category = family.category;
            structureData.tier = tierIndex + 1; // Convert 0-based index to 1-based tier
            structureData.upgradeFrom = previousStructureId;
            
            // Generate traits
            structureData.traits = [
              'building',
              `${family.type}-structure`,
              `tier-${tierIndex + 1}`
            ];
            
            // Parse into Structure object
            const structure = parseStructureFromJSON(structureData);
            this.structures.set(structure.id, structure);
            
            // Track for next tier's upgradeFrom
            previousStructureId = structure.id;
          }
        }

      } else {
        logger.error('Invalid structures data format - expected families array');
      }
      
      this.structuresLoaded = true;
    } catch (error) {
      logger.error('Failed to load structures:', error);
    }
  }
  
  /**
   * Get a structure by ID
   */
  getStructure(id: string): Structure | undefined {
    return this.structures.get(id);
  }
  
  /**
   * Get all structures
   */
  getAllStructures(): Structure[] {
    return Array.from(this.structures.values());
  }
  
  /**
   * Get structures by category
   */
  getStructuresByCategory(category: StructureCategory): Structure[] {
    return this.getAllStructures().filter(s => s.category === category);
  }
  
  /**
   * Get structures grouped by category as families
   */
  getStructureFamilies(): Map<string, Structure[]> {
    const families = new Map<string, Structure[]>();
    
    for (const structure of this.getAllStructures()) {
      const category = structure.category;
      if (!families.has(category)) {
        families.set(category, []);
      }
      families.get(category)!.push(structure);
    }
    
    // Sort each family by tier
    for (const [category, structures] of families) {
      structures.sort((a, b) => a.tier - b.tier);
    }
    
    return families;
  }
  
  /**
   * Get structures grouped by type (skill vs support)
   */
  getStructuresByType(): { skill: Structure[], support: Structure[] } {
    const structures = this.getAllStructures();
    return {
      skill: structures.filter(s => s.type === 'skill'),
      support: structures.filter(s => s.type === 'support')
    };
  }
  
  /**
   * Get the upgrade path for a structure
   */
  getUpgradePath(structureId: string): Structure[] {
    const path: Structure[] = [];
    let current = this.getStructure(structureId);
    
    // First, trace backwards to find the root
    while (current && current.upgradeFrom) {
      const previous = this.getStructure(current.upgradeFrom);
      if (previous) {
        path.unshift(previous);
        current = previous;
      } else {
        break;
      }
    }
    
    // Add the requested structure
    const requestedStructure = this.getStructure(structureId);
    if (requestedStructure) {
      path.push(requestedStructure);
    }
    
    // Then trace forward to find upgrades
    current = requestedStructure;
    while (current) {
      const upgrade = this.getAllStructures().find(s => s.upgradeFrom === current!.id);
      if (upgrade) {
        path.push(upgrade);
        current = upgrade;
      } else {
        break;
      }
    }
    
    return path;
  }
  
  /**
   * Get the next upgrade for a structure
   */
  getNextUpgrade(structureId: string): Structure | null {
    return this.getAllStructures().find(s => s.upgradeFrom === structureId) || null;
  }
  
  /**
   * Get all tier 1 structures (base structures)
   */
  getBaseStructures(): Structure[] {
    return this.getAllStructures().filter(s => s.tier === 1);
  }
  
  /**
   * Get structures available at a specific tier
   */
  getStructuresByTier(tier: number): Structure[] {
    return this.getAllStructures().filter(s => s.tier === tier);
  }
  
  /**
   * Check if a structure is part of a skill-based family
   */
  isSkillStructure(structureId: string): boolean {
    const structure = this.getStructure(structureId);
    return structure ? structure.type === 'skill' : false;
  }
  
  /**
   * Check if a structure is part of a support family
   */
  isSupportStructure(structureId: string): boolean {
    const structure = this.getStructure(structureId);
    return structure ? structure.type === 'support' : false;
  }
  
  /**
   * Check if a structure is damaged in a settlement
   */
  isStructureDamaged(settlement: Settlement, structureId: string): boolean {
    if (!settlement.structureConditions) {
      return false;
    }
    return settlement.structureConditions[structureId] === StructureCondition.DAMAGED;
  }
  
  /**
   * Get the active (non-damaged) structure in a category
   * Returns the highest-tier GOOD structure in the category
   */
  getActiveStructureInCategory(settlement: Settlement, category: string): Structure | null {
    // Get all structures in this category
    const categoryStructures = settlement.structureIds
      .map(id => this.getStructure(id))
      .filter(s => s && s.category === category) as Structure[];
    
    if (categoryStructures.length === 0) {
      return null;
    }
    
    // Filter out damaged structures
    const goodStructures = categoryStructures.filter(s => 
      !this.isStructureDamaged(settlement, s.id)
    );
    
    if (goodStructures.length === 0) {
      return null;
    }
    
    // Return highest tier
    goodStructures.sort((a, b) => b.tier - a.tier);
    return goodStructures[0];
  }
  
  /**
   * Calculate half of the original build cost for repair
   */
  calculateHalfBuildCost(structure: Structure): ResourceCost {
    const cost = structure.constructionCost;
    const halfCost: ResourceCost = {};
    
    for (const [resource, amount] of Object.entries(cost)) {
      (halfCost as any)[resource] = Math.ceil(amount / 2);
    }
    
    return halfCost;
  }
  
  /**
   * Get structures available for a settlement
   */
  getAvailableStructures(settlement: Settlement): Structure[] {
    const settlementTier = this.getSettlementTierNumber(settlement.tier);
    const state = get(kingdomData);
    
    return this.getAllStructures().filter(structure => {
      // Check tier requirement
      if (structure.minimumSettlementTier && structure.minimumSettlementTier > settlementTier) {
        return false;
      }
      
      // Check if already built
      if (settlement.structureIds.includes(structure.id)) {
        return false;
      }
      
      // Check prerequisites
      if (structure.upgradeFrom && !settlement.structureIds.includes(structure.upgradeFrom)) {
        return false;
      }
      
      // Check kingdom-wide uniqueness for revenue structures
      if (structure.uniqueKingdomWide) {
        const hasExisting = this.hasKingdomWideStructure(structure.id, state.settlements);
        if (hasExisting) {
          return false;
        }
      }
      
      return true;
    });
  }
  
  /**
   * Calculate total food storage capacity for a settlement
   * Only counts non-damaged structures
   */
  calculateFoodStorage(settlement: Settlement): number {
    let total = 0;
    
    for (const structureId of settlement.structureIds) {
      // Skip damaged structures
      if (this.isStructureDamaged(settlement, structureId)) {
        continue;
      }
      
      const structure = this.getStructure(structureId);
      if (structure?.modifiers) {
        // Look for foodCapacity modifier in the modifiers array
        for (const modifier of structure.modifiers) {
          if (modifier.resource === 'foodCapacity' && modifier.type === 'static') {
            total += modifier.value;
          }
        }
      }
    }
    
    return total;
  }
  
  /**
   * Calculate total imprisoned unrest capacity for a settlement
   * Only counts non-damaged structures
   */
  calculateImprisonedUnrestCapacity(settlement: Settlement): number {
    let total = 0;
    
    for (const structureId of settlement.structureIds) {
      // Skip damaged structures
      if (this.isStructureDamaged(settlement, structureId)) {
        continue;
      }
      
      const structure = this.getStructure(structureId);
      if (structure?.modifiers) {
        // Look for imprisonedUnrestCapacity modifier in the modifiers array
        for (const modifier of structure.modifiers) {
          if (modifier.resource === 'imprisonedUnrestCapacity' && modifier.type === 'static') {
            total += modifier.value;
          }
        }
      }
    }
    
    return total;
  }
  
  /**
   * Calculate gold income from structures in a settlement
   * Only counts non-damaged structures
   */
  calculateGoldIncome(settlement: Settlement): number {
    let total = 0;
    
    for (const structureId of settlement.structureIds) {
      // Skip damaged structures
      if (this.isStructureDamaged(settlement, structureId)) {
        continue;
      }
      
      const structure = this.getStructure(structureId);
      if (structure?.modifiers) {
        // Look for gold modifier in the modifiers array
        for (const modifier of structure.modifiers) {
          if (modifier.resource === 'gold' && modifier.type === 'static') {
            total += modifier.value;
          }
        }
      }
    }
    
    return total;
  }
  
  /**
   * Calculate army support bonus from structures in a settlement
   * Only counts non-damaged structures
   */
  calculateArmySupportBonus(settlement: Settlement): number {
    let total = 0;
    
    for (const structureId of settlement.structureIds) {
      // Skip damaged structures
      if (this.isStructureDamaged(settlement, structureId)) {
        continue;
      }
      
      const structure = this.getStructure(structureId);
      if (structure?.modifiers) {
        // Look for armyCapacity modifier in the modifiers array
        for (const modifier of structure.modifiers) {
          if (modifier.resource === 'armyCapacity' && modifier.type === 'static') {
            total += modifier.value;
          }
        }
      }
    }
    
    return total;
  }
  
  /**
   * Calculate diplomatic capacity from structures in a settlement
   * Only counts non-damaged structures
   */
  calculateDiplomaticCapacity(settlement: Settlement): number {
    let total = 0;

    for (const structureId of settlement.structureIds) {
      // Skip damaged structures
      if (this.isStructureDamaged(settlement, structureId)) {
        continue;
      }
      
      const structure = this.getStructure(structureId);
      if (structure?.modifiers) {
        // Look for diplomaticCapacity modifier in the modifiers array
        for (const modifier of structure.modifiers) {
          if (modifier.resource === 'diplomaticCapacity' && modifier.type === 'static') {

            total += modifier.value;
          }
        }
      }
    }

    return total;
  }
  
  /**
   * Calculate unrest reduction per turn from all settlements
   * Only counts non-damaged structures
   */
  calculateTotalUnrestReduction(settlements: Settlement[]): number {
    let total = 0;
    
    for (const settlement of settlements) {
      for (const structureId of settlement.structureIds) {
        // Skip damaged structures
        if (this.isStructureDamaged(settlement, structureId)) {
          continue;
        }
        
        const structure = this.getStructure(structureId);
        if (structure?.effects.unrestReductionPerTurn) {
          total += structure.effects.unrestReductionPerTurn;
        }
      }
    }
    
    return total;
  }
  
  /**
   * Calculate fame per turn from all settlements
   * Only counts non-damaged structures
   */
  calculateTotalFameGeneration(settlements: Settlement[]): number {
    let total = 0;
    
    for (const settlement of settlements) {
      for (const structureId of settlement.structureIds) {
        // Skip damaged structures
        if (this.isStructureDamaged(settlement, structureId)) {
          continue;
        }
        
        const structure = this.getStructure(structureId);
        if (structure?.effects.famePerTurn) {
          total += structure.effects.famePerTurn;
        }
      }
    }
    
    return total;
  }
  
  /**
   * Get the best trade ratios from all structures
   */
  getBestTradeRatios(settlements: Settlement[]): {
    sellRatio: { resources: number; gold: number } | null;
    buyRatio: { gold: number; resources: number } | null;
  } {
    let bestSellRatio: { resources: number; gold: number } | null = null;
    let bestBuyRatio: { gold: number; resources: number } | null = null;
    
    for (const settlement of settlements) {
      for (const structureId of settlement.structureIds) {
        const structure = this.getStructure(structureId);
        
        // Check sell ratio (lower resources per gold is better)
        if (structure?.effects.sellRatio) {
          if (!bestSellRatio || 
              structure.effects.sellRatio.resources / structure.effects.sellRatio.gold <
              bestSellRatio.resources / bestSellRatio.gold) {
            bestSellRatio = structure.effects.sellRatio;
          }
        }
        
        // Check buy ratio (lower gold per resource is better)
        if (structure?.effects.buyRatio) {
          if (!bestBuyRatio ||
              structure.effects.buyRatio.gold / structure.effects.buyRatio.resources <
              bestBuyRatio.gold / bestBuyRatio.resources) {
            bestBuyRatio = structure.effects.buyRatio;
          }
        }
      }
    }
    
    // Default ratios if no structures provide them
    if (!bestSellRatio) {
      bestSellRatio = { resources: 2, gold: 1 }; // Default 2:1
    }
    if (!bestBuyRatio) {
      bestBuyRatio = { gold: 2, resources: 1 }; // Default 2:1
    }
    
    return { sellRatio: bestSellRatio, buyRatio: bestBuyRatio };
  }
  
  /**
   * Check if any settlement has a structure allowing personal income
   */
  hasPersonalIncomeStructure(settlements: Settlement[]): boolean {
    for (const settlement of settlements) {
      for (const structureId of settlement.structureIds) {
        const structure = this.getStructure(structureId);
        // Check gameEffects for unlock of personalIncome action
        if (structure?.gameEffects) {
          for (const effect of structure.gameEffects) {
            if (effect.type === 'unlock' && effect.actions?.includes('personalIncome')) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }
  
  /**
   * Check if any settlement has a structure allowing pardon action
   */
  hasPardonCapability(settlements: Settlement[]): boolean {
    for (const settlement of settlements) {
      for (const structureId of settlement.structureIds) {
        const structure = this.getStructure(structureId);
        if (structure?.effects.allowsPardonAction) {
          return true;
        }
      }
    }
    return false;
  }
  
  /**
   * Convert settlement tier to number
   */
  private getSettlementTierNumber(tier: string): number {
    switch (tier.toLowerCase()) {
      case 'village': return 1;
      case 'town': return 2;
      case 'city': return 3;
      case 'metropolis': return 4;
      default: return 1;
    }
  }
  
  /**
   * Calculate total construction cost for a structure
   */
  getConstructionCost(structureId: string): ResourceCost {
    const structure = this.getStructure(structureId);
    return structure?.constructionCost || {};
  }
  
  /**
   * Check if a kingdom can afford to build a structure
   */
  canAffordStructure(structureId: string): boolean {
    const structure = this.getStructure(structureId);
    if (!structure) return false;
    
    const state = get(kingdomData);
    const cost = structure.constructionCost;
    
    for (const [resource, amount] of Object.entries(cost)) {
      const available = state.resources[resource] || 0;
      if (available < amount) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Get all damaged structures that can be repaired
   * Returns only the lowest tier damaged structure per category per settlement
   */
  getRepairableStructures(): RepairableStructure[] {
    const actor = getKingdomActor();
    if (!actor) return [];
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) return [];
    
    const repairableList: RepairableStructure[] = [];
    
    for (const settlement of kingdom.settlements) {
      // Get damaged structures grouped by category
      const damagedByCategory = new Map<string, Structure[]>();
      
      for (const structureId of settlement.structureIds) {
        if (this.isStructureDamaged(settlement, structureId)) {
          const structure = this.getStructure(structureId);
          if (structure) {
            if (!damagedByCategory.has(structure.category)) {
              damagedByCategory.set(structure.category, []);
            }
            damagedByCategory.get(structure.category)!.push(structure);
          }
        }
      }
      
      // For each category, only include the lowest tier
      damagedByCategory.forEach(structures => {
        const lowestTier = Math.min(...structures.map(s => s.tier));
        const lowestStructure = structures.find(s => s.tier === lowestTier);
        
        if (lowestStructure) {
          repairableList.push({
            structureId: lowestStructure.id,
            structureName: lowestStructure.name,
            structureCategory: lowestStructure.category,
            structureTier: lowestStructure.tier,
            settlementId: settlement.id,
            settlementName: settlement.name,
            halfCost: this.calculateHalfBuildCost(lowestStructure)
          });
        }
      });
    }
    
    return repairableList;
  }
  
  /**
   * Check if a kingdom-wide unique structure exists
   */
  hasKingdomWideStructure(structureId: string, settlements: Settlement[]): boolean {
    for (const settlement of settlements) {
      if (settlement.structureIds.includes(structureId)) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * Validate that kingdom-wide unique structures aren't duplicated
   */
  validateKingdomWideUnique(structureId: string, excludeSettlementId?: string): boolean {
    const structure = this.getStructure(structureId);
    if (!structure?.uniqueKingdomWide) {
      return true; // Not a unique structure, so valid
    }
    
    const state = get(kingdomData);
    
    for (const settlement of state.settlements) {
      // Skip the settlement we're checking for (in case of upgrade)
      if (excludeSettlementId && settlement.id === excludeSettlementId) {
        continue;
      }
      
      // Check if this settlement has any revenue structure (they're all mutually exclusive)
      for (const existingId of settlement.structureIds) {
        const existing = this.getStructure(existingId);
        if (existing?.uniqueKingdomWide && existing.category === structure.category) {
          return false; // Another kingdom-wide unique structure of same category exists
        }
      }
    }
    
    return true;
  }
  
  /**
   * Get all active special abilities in the kingdom
   */
  getActiveSpecialAbilities(settlements: Settlement[]): Map<SpecialAbility, Settlement[]> {
    const abilities = new Map<SpecialAbility, Settlement[]>();
    
    for (const settlement of settlements) {
      for (const structureId of settlement.structureIds) {
        const structure = this.getStructure(structureId);
        if (structure?.effects.specialAbilities) {
          for (const ability of structure.effects.specialAbilities) {
            if (!abilities.has(ability)) {
              abilities.set(ability, []);
            }
            abilities.get(ability)!.push(settlement);
          }
        }
      }
    }
    
    return abilities;
  }
  
  /**
   * Process automatic turn-start effects from structures
   */
  processAutomaticEffects(settlements: Settlement[]): {
    unrestReduction: number,
    fameGain: number,
    convertedUnrest: number
  } {
    let unrestReduction = 0;
    let fameGain = 0;
    let convertedUnrest = 0;
    
    const abilities = this.getActiveSpecialAbilities(settlements);
    
    // Process auto-reduce unrest (Citadel, Auditorium)
    if (abilities.has(SpecialAbility.AUTO_REDUCE_UNREST)) {
      unrestReduction += abilities.get(SpecialAbility.AUTO_REDUCE_UNREST)!.length;
    }
    
    // Process auto-gain fame (Auditorium)
    if (abilities.has(SpecialAbility.AUTO_GAIN_FAME)) {
      fameGain += abilities.get(SpecialAbility.AUTO_GAIN_FAME)!.length;
    }
    
    // Process convert unrest (Donjon)
    if (abilities.has(SpecialAbility.CONVERT_UNREST)) {
      // Each Donjon can convert 1 unrest per turn
      convertedUnrest += abilities.get(SpecialAbility.CONVERT_UNREST)!.length;
    }
    
    return { unrestReduction, fameGain, convertedUnrest };
  }
  
  /**
   * Check if kingdom has food spoilage protection (Strategic Reserves)
   */
  hasFoodSpoilageProtection(settlements: Settlement[]): boolean {
    const abilities = this.getActiveSpecialAbilities(settlements);
    return abilities.has(SpecialAbility.NEGATE_FOOD_SPOILAGE);
  }
  
  /**
   * Check if any settlement has defender recovery (Grand Battlements)
   */
  getSettlementsWithDefenderRecovery(settlements: Settlement[]): Settlement[] {
    const abilities = this.getActiveSpecialAbilities(settlements);
    return abilities.get(SpecialAbility.DEFENDER_RECOVERY) || [];
  }
}

// Export singleton instance
export const structuresService = new StructuresService();

// Initialize structures on module load
if (typeof window !== 'undefined') {
  structuresService.initializeStructures();
}

// Re-export selection service for convenience
export { structureSelectionService } from './selection';
export type { StructureAvailability, CategoryAvailability } from './selection';
