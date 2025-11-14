/**
 * destroyStructure execution function
 *
 * Extracted from immediate-execute pattern - pure execution logic only.
 * Preview logic has been moved to pipeline configuration.
 */

import { updateKingdom, getKingdomActor } from '../../stores/KingdomStore';
import { logger } from '../../utils/Logger';

/**
 * Execute structure destruction
 *
 * @param options - Destruction options
 */
export async function destroyStructureExecution(options: {
  category?: string;
  targetTier?: 'highest' | 'lowest' | number;
  count?: number;
}): Promise<{
  destroyedStructures: Array<{ name: string; settlement: string; action: string }>;
}> {
  const count = options.count || 1;
  logger.info(`💥 [destroyStructureExecution] Destroying ${count} structure(s)${options.category ? ` in category ${options.category}` : ''}`);

  const actor = getKingdomActor();
  if (!actor) {
    throw new Error('No kingdom actor available');
  }

  const kingdom = actor.getKingdomData();
  if (!kingdom) {
    throw new Error('No kingdom data available');
  }

  const { structuresService } = await import('../../services/structures/index');
  const { StructureCondition } = await import('../../models/Settlement');

  const destroyedStructures: Array<{ name: string; settlement: string; action: string }> = [];

  // Destroy 'count' structures
  for (let i = 0; i < count; i++) {
    // Find target structure based on criteria
    let targetStructure: any = null;
    let targetSettlement: any = null;

    // Search all settlements for matching structures
    for (const settlement of kingdom.settlements || []) {
      for (const structureId of settlement.structureIds || []) {
        const structure = structuresService.getStructure(structureId);
        if (!structure) continue;

        // Skip damaged structures
        if (settlement.structureConditions?.[structureId] === StructureCondition.DAMAGED) {
          continue;
        }

        // Apply category filter
        if (options.category && structure.category !== options.category) {
          continue;
        }

        // Apply tier filter
        if (options.targetTier !== undefined) {
          if (options.targetTier === 'highest') {
            if (!targetStructure || structure.tier > targetStructure.tier) {
              targetStructure = structure;
              targetSettlement = settlement;
            }
          } else if (options.targetTier === 'lowest') {
            if (!targetStructure || structure.tier < targetStructure.tier) {
              targetStructure = structure;
              targetSettlement = settlement;
            }
          } else if (typeof options.targetTier === 'number') {
            if (structure.tier === options.targetTier) {
              targetStructure = structure;
              targetSettlement = settlement;
              break;
            }
          }
        } else {
          // No tier filter - take first match
          targetStructure = structure;
          targetSettlement = settlement;
          break;
        }
      }
      if (targetStructure && typeof options.targetTier === 'number') break;
    }

    if (!targetStructure || !targetSettlement) {
      logger.warn(`💥 [destroyStructureExecution] No more structures available to destroy (destroyed ${i}/${count})`);
      break;
    }

    // Apply destruction based on tier
    let action = '';

    if (targetStructure.tier === 1) {
      // Tier 1: Remove entirely
      await updateKingdom(k => {
        const settlement = k.settlements.find(s => s.id === targetSettlement.id);
        if (settlement) {
          settlement.structureIds = settlement.structureIds.filter(id => id !== targetStructure.id);
          if (settlement.structureConditions) {
            delete settlement.structureConditions[targetStructure.id];
          }
        }
      });

      action = 'removed entirely';
      logger.info(`  💥 Removed tier 1 structure: ${targetStructure.name} from ${targetSettlement.name}`);

    } else {
      // Tier 2+: Downgrade to previous tier (damaged)
      const previousTierId = targetStructure.upgradeFrom;
      if (!previousTierId) {
        logger.error(`  ❌ Cannot downgrade - no upgradeFrom found: ${targetStructure.id}`);
        continue;
      }

      const previousStructure = structuresService.getStructure(previousTierId);
      if (!previousStructure) {
        logger.error(`  ❌ Previous tier structure not found: ${previousTierId}`);
        continue;
      }

      await updateKingdom(k => {
        const settlement = k.settlements.find(s => s.id === targetSettlement.id);
        if (settlement) {
          // Remove current tier
          settlement.structureIds = settlement.structureIds.filter(id => id !== targetStructure.id);

          // Add previous tier (damaged)
          settlement.structureIds.push(previousTierId);

          if (!settlement.structureConditions) {
            settlement.structureConditions = {};
          }
          settlement.structureConditions[previousTierId] = StructureCondition.DAMAGED;

          // Remove current tier from conditions
          delete settlement.structureConditions[targetStructure.id];
        }
      });

      action = `downgraded to ${previousStructure.name} (damaged)`;
      logger.info(`  💥 Downgraded: ${targetStructure.name} → ${previousStructure.name} (damaged) in ${targetSettlement.name}`);
    }

    destroyedStructures.push({
      name: targetStructure.name,
      settlement: targetSettlement.name,
      action
    });
  }

  if (destroyedStructures.length === 0) {
    throw new Error(`No structures available to destroy${options.category ? ` in category '${options.category}'` : ''}`);
  }

  logger.info(`✅ [destroyStructureExecution] Destroyed ${destroyedStructures.length} structure(s)`);

  return { destroyedStructures };
}
