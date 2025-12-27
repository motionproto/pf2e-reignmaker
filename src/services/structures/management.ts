/**
 * Settlement Structure Management Service
 * 
 * Handles manual addition/removal of structures for GM override purposes.
 * Unlike the build structure service, this bypasses resource costs and requirements.
 */

import { get } from 'svelte/store';
import { kingdomData, updateKingdom } from '../../stores/KingdomStore';
import { structuresService } from './index';
import type { Settlement } from '../../models/Settlement';
import type { Structure } from '../../models/Structure';
import { SettlementTierConfig, StructureCondition } from '../../models/Settlement';
import { getCategoryDisplayName } from '../../models/Structure';

interface AddStructureResult {
  success: boolean;
  error?: string;
  addedStructures?: string[]; // IDs of structures that were added (including prerequisites)
}

interface RemoveStructureResult {
  success: boolean;
  error?: string;
  warning?: string; // Warning about dependent structures
}

interface StructureGroup {
  category: string;
  displayName: string;
  structures: Structure[];
}

export class SettlementStructureManagementService {
  /**
   * Add a structure to a settlement, automatically adding prerequisites if needed
   */
  async addStructureToSettlement(
    structureId: string,
    settlementId: string,
    options: { autoAddPrerequisites?: boolean } = { autoAddPrerequisites: true }
  ): Promise<AddStructureResult> {
    const state = get(kingdomData);
    const settlement = state.settlements.find(s => s.id === settlementId);
    const structure = structuresService.getStructure(structureId);

    if (!settlement) {
      return { success: false, error: 'Settlement not found' };
    }

    if (!structure) {
      return { success: false, error: 'Structure not found' };
    }

    // Check if already built
    if (settlement.structureIds.includes(structureId)) {
      return { success: false, error: `${structure.name} is already built in this settlement` };
    }

    // Check settlement capacity
    const maxStructures = SettlementTierConfig[settlement.tier].maxStructures;
    const currentCount = settlement.structureIds.length;

    // Get all structures that need to be added (including prerequisites)
    let structuresToAdd: string[] = [];
    
    if (options.autoAddPrerequisites) {
      // Get the full upgrade path
      const upgradePath = structuresService.getUpgradePath(structureId);
      
      // Find the index of the requested structure
      const requestedIndex = upgradePath.findIndex(s => s.id === structureId);
      
      // Only include structures up to and including the requested one (not higher tiers)
      const pathUpToRequested = requestedIndex >= 0 
        ? upgradePath.slice(0, requestedIndex + 1)
        : [structure];
      
      // Add any missing prerequisites
      for (const prereq of pathUpToRequested) {
        if (!settlement.structureIds.includes(prereq.id)) {
          structuresToAdd = [...structuresToAdd, prereq.id];
        }
      }
    } else {
      structuresToAdd = [...structuresToAdd, structureId];
    }

    // Check if we have room for all structures
    if (currentCount + structuresToAdd.length > maxStructures) {
      return {
        success: false,
        error: `Not enough space. Need ${structuresToAdd.length} slots, only ${maxStructures - currentCount} available`
      };
    }

    // Initialize conditions for new structures
    await updateKingdom(k => {
      const s = k.settlements.find(s => s.id === settlementId);
      if (s) {
        if (!s.structureConditions) {
          s.structureConditions = {};
        }
        // ✅ Immutable: Build new object with all conditions
        const newConditions = { ...s.structureConditions };
        for (const id of structuresToAdd) {
          newConditions[id] = StructureCondition.GOOD;
        }
        s.structureConditions = newConditions;
      }
    });

    // Add structures using centralized service (handles recalculation)
    const { settlementService } = await import('../settlements');
    for (const structureId of structuresToAdd) {
      await settlementService.addStructure(settlementId, structureId);
    }

    return {
      success: true,
      addedStructures: structuresToAdd
    };
  }

  /**
   * Remove a structure from a settlement
   */
  async removeStructureFromSettlement(
    structureId: string,
    settlementId: string,
    options: { checkDependents?: boolean } = { checkDependents: true }
  ): Promise<RemoveStructureResult> {
    const state = get(kingdomData);
    const settlement = state.settlements.find(s => s.id === settlementId);
    const structure = structuresService.getStructure(structureId);

    if (!settlement) {
      return { success: false, error: 'Settlement not found' };
    }

    if (!structure) {
      return { success: false, error: 'Structure not found' };
    }

    if (!settlement.structureIds.includes(structureId)) {
      return { success: false, error: `${structure.name} is not built in this settlement` };
    }

    // Check for dependent structures (higher tiers)
    let warning: string | undefined;
    if (options.checkDependents) {
      const dependents = settlement.structureIds.filter(id => {
        const s = structuresService.getStructure(id);
        return s?.upgradeFrom === structureId;
      });

      if (dependents.length > 0) {
        const dependentNames = dependents
          .map(id => structuresService.getStructure(id)?.name)
          .filter(Boolean)
          .join(', ');
        warning = `Warning: This will leave ${dependentNames} without their prerequisite`;
      }
    }

    // Remove condition entry first
    await updateKingdom(k => {
      const s = k.settlements.find(s => s.id === settlementId);
      if (s?.structureConditions) {
        delete s.structureConditions[structureId];
      }
    });

    // Remove the structure using proper service (handles all recalculation)
    const { settlementService } = await import('../settlements');
    await settlementService.removeStructure(settlementId, structureId);

    return { success: true, warning };
  }

  /**
   * Get all structures grouped by type (skill vs support) and category
   */
  getStructuresGroupedByTypeAndCategory(): {
    skill: StructureGroup[];
    support: StructureGroup[];
  } {
    const allStructures = structuresService.getAllStructures();
    
    // Separate by type
    const skillStructures = allStructures.filter(s => s.type === 'skill');
    const supportStructures = allStructures.filter(s => s.type === 'support');

    // Group by category
    const groupByCategory = (structures: Structure[]): StructureGroup[] => {
      const categoryMap = new Map<string, Structure[]>();
      
      structures.forEach(structure => {
        const category = structure.category;
        if (!categoryMap.has(category)) {
          categoryMap.set(category, []);
        }
        categoryMap.get(category)!.push(structure);
      });

      return Array.from(categoryMap.entries()).map(([category, structures]) => ({
        category,
        displayName: getCategoryDisplayName(category as any),
        structures: structures.sort((a, b) => a.tier - b.tier)
      }));
    };

    return {
      skill: groupByCategory(skillStructures),
      support: groupByCategory(supportStructures)
    };
  }

  /**
   * Get settlement's structures grouped by category with highest tier shown
   */
  getSettlementStructuresGrouped(settlement: Settlement): Array<{
    category: string;
    displayName: string;
    highestTier: Structure;
    lowerTiers: Structure[];
  }> {
    const categoryMap = new Map<string, Structure[]>();

    // Group structures by category
    settlement.structureIds.forEach(id => {
      const structure = structuresService.getStructure(id);
      if (structure) {
        const category = structure.category;
        if (!categoryMap.has(category)) {
          categoryMap.set(category, []);
        }
        categoryMap.get(category)!.push(structure);
      }
    });

    // For each category, identify highest tier and lower tiers
    return Array.from(categoryMap.entries())
      .map(([category, structures]) => {
        // Sort by tier descending
        const sorted = structures.sort((a, b) => b.tier - a.tier);
        
        return {
          category,
          displayName: getCategoryDisplayName(category as any),
          highestTier: sorted[0],
          lowerTiers: sorted.slice(1)
        };
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  /**
   * Get prerequisites needed for a structure
   */
  getPrerequisites(structureId: string, settlement: Settlement): Structure[] {
    const upgradePath = structuresService.getUpgradePath(structureId);
    
    return upgradePath.filter(s => 
      !settlement.structureIds.includes(s.id) && s.id !== structureId
    );
  }
  
  /**
   * Update a structure's condition
   */
  async updateStructureCondition(
    structureId: string,
    settlementId: string,
    condition: StructureCondition
  ): Promise<{ success: boolean; error?: string }> {
    const state = get(kingdomData);
    const settlement = state.settlements.find(s => s.id === settlementId);
    
    if (!settlement) {
      return { success: false, error: 'Settlement not found' };
    }
    
    if (!settlement.structureIds.includes(structureId)) {
      return { success: false, error: 'Structure not found in settlement' };
    }
    
    await updateKingdom(k => {
      const s = k.settlements.find(s => s.id === settlementId);
      if (s) {
        if (!s.structureConditions) {
          s.structureConditions = {};
        }
        // ✅ Immutable: Reassign object to trigger Svelte reactivity
        s.structureConditions = {
          ...s.structureConditions,
          [structureId]: condition
        };
      }
    });
    
    // Recalculate settlement skill bonuses (condition affects skill structures)
    // Note: Derived properties (food storage, etc.) will be recalculated automatically
    // when structures are added/removed via proper service methods
    const { settlementService } = await import('../settlements');
    await settlementService.updateSettlementSkillBonuses(settlementId);
    
    return { success: true };
  }
}

// Export singleton instance
export const settlementStructureManagement = new SettlementStructureManagementService();
