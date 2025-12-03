/**
 * Structure Targeting Service
 * 
 * Handles intelligent selection of structures for damage/destruction based on:
 * - Category preferences (e.g., raiders target commerce structures)
 * - Tier safety constraint (only targets highest tier per category)
 * - Fallback to random selection when preferred categories unavailable
 */

import { get } from 'svelte/store';
import { kingdomData } from '../../stores/KingdomStore';
import type { Settlement } from '../../models/Settlement';
import type { Structure } from '../../models/Structure';
import { structuresService } from './index';
import { logger } from '../../utils/Logger';

/**
 * Structure targeting configuration
 */
export interface StructureTargetingConfig {
  type: 'random' | 'category-filtered';
  preferredCategories?: string[];
  fallbackToRandom: boolean;
  /** If specified, only target structures in this settlement */
  settlementId?: string;
  /** Structure IDs to exclude from selection (e.g., already selected) */
  excludeStructureIds?: string[];
}

/**
 * Result of structure selection
 */
export interface StructureTargetResult {
  settlement: Settlement;
  structure: Structure;
}

export class StructureTargetingService {
  /**
   * Select a structure for damage/destruction
   * 
   * Algorithm:
   * 1. Get all undamaged structures from all settlements
   * 2. Filter by category if specified (with fallback to random)
   * 3. Group by category
   * 4. Keep only highest tier per category (tier safety constraint)
   * 5. Randomly select from eligible structures
   */
  selectStructureForDamage(
    config: StructureTargetingConfig
  ): StructureTargetResult | null {
    const kingdom = get(kingdomData);
    
    if (!kingdom || !kingdom.settlements || kingdom.settlements.length === 0) {
      logger.warn('[StructureTargeting] No settlements found');
      return null;
    }

    // Step 1: Collect all undamaged structures with their settlements
    const candidateStructures: Array<{ settlement: Settlement; structure: Structure }> = [];
    
    // Filter settlements if settlementId is specified
    const settlements = config.settlementId 
      ? kingdom.settlements.filter(s => s.id === config.settlementId)
      : kingdom.settlements;
    
    if (config.settlementId && settlements.length === 0) {
      logger.warn(`[StructureTargeting] Settlement not found: ${config.settlementId}`);
      return null;
    }
    
    for (const settlement of settlements) {
      for (const structureId of settlement.structureIds) {
        // Skip damaged structures
        if (structuresService.isStructureDamaged(settlement, structureId)) {
          continue;
        }
        
        // Skip excluded structures (e.g., already selected in this batch)
        if (config.excludeStructureIds?.includes(structureId)) {
          continue;
        }
        
        const structure = structuresService.getStructure(structureId);
        if (structure) {
          candidateStructures.push({ settlement, structure });
        }
      }
    }

    if (candidateStructures.length === 0) {
      logger.warn('[StructureTargeting] No undamaged structures found');
      return null;
    }

    // Step 2: Filter by category if specified
    let filteredCandidates = candidateStructures;
    
    if (config.type === 'category-filtered' && config.preferredCategories && config.preferredCategories.length > 0) {
      const categoryFiltered = candidateStructures.filter(({ structure }) =>
        config.preferredCategories!.includes(structure.category)
      );
      
      if (categoryFiltered.length > 0) {
        logger.info(`[StructureTargeting] Found ${categoryFiltered.length} structures in preferred categories: ${config.preferredCategories.join(', ')}`);
        filteredCandidates = categoryFiltered;
      } else if (config.fallbackToRandom) {
        logger.info(`[StructureTargeting] No structures in preferred categories, falling back to random selection`);
        filteredCandidates = candidateStructures;
      } else {
        logger.warn('[StructureTargeting] No structures in preferred categories and fallback disabled');
        return null;
      }
    }

    // Step 3: Group by settlement and category
    const groupedBySettlementAndCategory = new Map<string, Map<string, Array<{ settlement: Settlement; structure: Structure }>>>();
    
    for (const candidate of filteredCandidates) {
      const settlementId = candidate.settlement.id;
      const category = candidate.structure.category;
      
      if (!groupedBySettlementAndCategory.has(settlementId)) {
        groupedBySettlementAndCategory.set(settlementId, new Map());
      }
      
      const settlementMap = groupedBySettlementAndCategory.get(settlementId)!;
      
      if (!settlementMap.has(category)) {
        settlementMap.set(category, []);
      }
      
      settlementMap.get(category)!.push(candidate);
    }

    // Step 4: Keep only highest tier per category per settlement (tier safety constraint)
    const eligibleStructures: Array<{ settlement: Settlement; structure: Structure }> = [];
    
    for (const [settlementId, categoryMap] of groupedBySettlementAndCategory) {
      for (const [category, structures] of categoryMap) {
        // Find highest tier in this category for this settlement
        const highestTier = Math.max(...structures.map(s => s.structure.tier));
        const highestTierStructures = structures.filter(s => s.structure.tier === highestTier);
        
        // Add all highest-tier structures (there might be multiple at the same tier)
        eligibleStructures.push(...highestTierStructures);
      }
    }

    if (eligibleStructures.length === 0) {
      logger.warn('[StructureTargeting] No eligible structures after tier filtering');
      return null;
    }

    // Step 5: Randomly select from eligible structures
    const selectedIndex = Math.floor(Math.random() * eligibleStructures.length);
    const result = eligibleStructures[selectedIndex];

    logger.info(`[StructureTargeting] Selected: ${result.structure.name} (Tier ${result.structure.tier}) in ${result.settlement.name}`);
    
    return result;
  }
}

// Export singleton instance
export const structureTargetingService = new StructureTargetingService();
