/**
 * Structure Selection Service
 * 
 * Handles structure selection logic, validation, and availability checks
 * for the build structures action and structure selector component.
 */

import type { Structure, ResourceCost } from '../../models/Structure';
import type { Settlement } from '../../models/Settlement';
import type { KingdomState } from '../../models/KingdomState';
import { structuresService } from './index';
import { getCategoryDisplayName } from '../../models/Structure';

export interface StructureAvailability {
  available: boolean;
  reasons: string[];
  missingResources: Map<string, number>;
  prerequisiteStructure?: string;
}

export interface CategoryAvailability {
  category: string;
  availableCount: number;
  totalCount: number;
  hasAvailable: boolean;
  structures: Structure[];
}

export class StructureSelectionService {
  /**
   * Get structures available for building in a specific settlement
   */
  getAvailableForSettlement(
    settlement: Settlement,
    kingdomState: KingdomState
  ): Structure[] {
    return structuresService.getAvailableStructures(settlement);
  }
  
  /**
   * Check if a specific structure can be built
   */
  canBuildStructure(
    structure: Structure,
    settlement: Settlement,
    resources: Map<string, number>
  ): StructureAvailability {
    const reasons: string[] = [];
    const missingResources = new Map<string, number>();
    
    // Check if already built
    if (settlement.structureIds.includes(structure.id)) {
      reasons.push('Structure already built in this settlement');
    }
    
    // Check tier requirements
    const settlementTier = this.getSettlementTierNumber(settlement.tier);
    if (structure.minimumSettlementTier && structure.minimumSettlementTier > settlementTier) {
      reasons.push(`Requires ${this.getTierName(structure.minimumSettlementTier)} or higher (current: ${settlement.tier})`);
    }
    
    // Check prerequisites
    if (structure.upgradeFrom && !settlement.structureIds.includes(structure.upgradeFrom)) {
      const prerequisite = structuresService.getStructure(structure.upgradeFrom);
      reasons.push(`Requires ${prerequisite?.name || structure.upgradeFrom} to be built first`);
    }
    
    // Check resources
    for (const [resource, cost] of Object.entries(structure.constructionCost)) {
      if (cost && cost > 0) {
        const available = resources.get(resource) || 0;
        if (available < cost) {
          missingResources.set(resource, cost - available);
          reasons.push(`Insufficient ${resource}: need ${cost}, have ${available}`);
        }
      }
    }
    
    // Check kingdom-wide uniqueness
    if (structure.uniqueKingdomWide) {
      const hasExisting = structuresService.hasKingdomWideStructure(
        structure.id,
        [] // Would need to pass all settlements from kingdom state
      );
      if (hasExisting) {
        reasons.push('Only one can exist in the entire kingdom');
      }
    }
    
    return {
      available: reasons.length === 0,
      reasons,
      missingResources,
      prerequisiteStructure: structure.upgradeFrom
    };
  }
  
  /**
   * Get all categories with availability information
   */
  getCategoriesWithAvailability(
    structures: Structure[],
    settlement: Settlement | null,
    resources: Map<string, number>
  ): CategoryAvailability[] {
    const categoriesMap = new Map<string, Structure[]>();
    
    // Group structures by category
    structures.forEach(structure => {
      const category = getCategoryDisplayName(structure.category) || 'Other';
      if (!categoriesMap.has(category)) {
        categoriesMap.set(category, []);
      }
      categoriesMap.get(category)!.push(structure);
    });
    
    // Build availability info for each category
    const categories: CategoryAvailability[] = [];
    
    categoriesMap.forEach((categoryStructures, category) => {
      let availableCount = 0;
      
      if (settlement) {
        categoryStructures.forEach(structure => {
          const availability = this.canBuildStructure(structure, settlement, resources);
          if (availability.available) {
            availableCount++;
          }
        });
      }
      
      categories.push({
        category,
        availableCount,
        totalCount: categoryStructures.length,
        hasAvailable: availableCount > 0,
        structures: categoryStructures.sort((a, b) => a.tier - b.tier)
      });
    });
    
    return categories.sort((a, b) => a.category.localeCompare(b.category));
  }
  
  /**
   * Get the next available structure in an upgrade path
   */
  getNextUpgradeInPath(
    structureId: string,
    settlement: Settlement
  ): Structure | null {
    const upgradePath = structuresService.getUpgradePath(structureId);
    
    for (const structure of upgradePath) {
      if (!settlement.structureIds.includes(structure.id)) {
        return structure;
      }
    }
    
    return null;
  }
  
  /**
   * Get all structures in a category that can be built
   */
  getAvailableInCategory(
    category: string,
    settlement: Settlement,
    resources: Map<string, number>
  ): Structure[] {
    const allInCategory = structuresService.getAllStructures()
      .filter(s => getCategoryDisplayName(s.category) === category);
    
    return allInCategory.filter(structure => {
      const availability = this.canBuildStructure(structure, settlement, resources);
      return availability.available;
    });
  }
  
  /**
   * Get build cost summary for a structure
   */
  getBuildCostSummary(structure: Structure): {
    resources: Array<{ type: string; amount: number }>;
    totalResources: number;
  } {
    const resources: Array<{ type: string; amount: number }> = [];
    let totalResources = 0;
    
    for (const [type, amount] of Object.entries(structure.constructionCost)) {
      if (amount && amount > 0) {
        resources.push({ type, amount });
        totalResources += amount;
      }
    }
    
    return { resources, totalResources };
  }
  
  /**
   * Check if player has enough resources for a structure
   */
  hasResourcesForStructure(
    structure: Structure,
    resources: Map<string, number>
  ): boolean {
    for (const [resource, cost] of Object.entries(structure.constructionCost)) {
      if (cost && cost > 0) {
        const available = resources.get(resource) || 0;
        if (available < cost) {
          return false;
        }
      }
    }
    return true;
  }
  
  /**
   * Get structures grouped by their build status
   */
  getStructuresByBuildStatus(
    structures: Structure[],
    settlement: Settlement,
    resources: Map<string, number>
  ): {
    buildable: Structure[];
    missingPrerequisites: Structure[];
    insufficientResources: Structure[];
    alreadyBuilt: Structure[];
  } {
    const result = {
      buildable: [] as Structure[],
      missingPrerequisites: [] as Structure[],
      insufficientResources: [] as Structure[],
      alreadyBuilt: [] as Structure[]
    };
    
    structures.forEach(structure => {
      // Check if already built
      if (settlement.structureIds.includes(structure.id)) {
        result.alreadyBuilt.push(structure);
        return;
      }
      
      // Check prerequisites
      const settlementTier = this.getSettlementTierNumber(settlement.tier);
      const meetsPrerequisites = 
        (!structure.minimumSettlementTier || structure.minimumSettlementTier <= settlementTier) &&
        (!structure.upgradeFrom || settlement.structureIds.includes(structure.upgradeFrom));
      
      if (!meetsPrerequisites) {
        result.missingPrerequisites.push(structure);
        return;
      }
      
      // Check resources
      const hasResources = this.hasResourcesForStructure(structure, resources);
      
      if (!hasResources) {
        result.insufficientResources.push(structure);
      } else {
        result.buildable.push(structure);
      }
    });
    
    return result;
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
   * Get settlement tier name from number
   */
  private getTierName(tier: number): string {
    switch (tier) {
      case 1: return 'Village';
      case 2: return 'Town';
      case 3: return 'City';
      case 4: return 'Metropolis';
      default: return `Tier ${tier}`;
    }
  }
}

// Export singleton instance
export const structureSelectionService = new StructureSelectionService();
