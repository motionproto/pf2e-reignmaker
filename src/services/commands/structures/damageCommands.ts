/**
 * Structure Damage Commands
 * 
 * Handles structural damage from incidents:
 * - destroyStructure: Remove or downgrade structures
 * - damageStructure: Mark structures as damaged
 */

import { updateKingdom, getKingdomActor } from '../../../stores/KingdomStore';
import { logger } from '../../../utils/Logger';
import type { ResolveResult } from '../types';

/**
 * Destroy Structure - Remove or downgrade structure(s)
 * Used by incidents that cause severe structural damage
 * 
 * @param category - Structure category to target (e.g., 'justice')
 * @param targetTier - Which tier to target ('highest', 'lowest', or specific tier number)
 * @param count - Number of structures to destroy (default: 1)
 * @returns ResolveResult with destroyed structure details
 */
export async function destroyStructure(
  category?: string,
  targetTier?: 'highest' | 'lowest' | number,
  count: number = 1
): Promise<ResolveResult> {
  logger.info(`💥 [destroyStructure] Destroying ${count} structure(s)${category ? ` in category ${category}` : ''}`);
  
  try {
    const actor = getKingdomActor();
    if (!actor) {
      return { success: false, error: 'No kingdom actor available' };
    }

    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      return { success: false, error: 'No kingdom data available' };
    }

    const { structuresService } = await import('../../structures/index');
    const { StructureCondition } = await import('../../../models/Settlement');
    
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
          if (category && structure.category !== category) {
            continue;
          }
          
          // Apply tier filter
          if (targetTier !== undefined) {
            if (targetTier === 'highest') {
              if (!targetStructure || structure.tier > targetStructure.tier) {
                targetStructure = structure;
                targetSettlement = settlement;
              }
            } else if (targetTier === 'lowest') {
              if (!targetStructure || structure.tier < targetStructure.tier) {
                targetStructure = structure;
                targetSettlement = settlement;
              }
            } else if (typeof targetTier === 'number') {
              if (structure.tier === targetTier) {
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
        if (targetStructure && typeof targetTier === 'number') break;
      }

      if (!targetStructure || !targetSettlement) {
        logger.warn(`💥 [destroyStructure] No more structures available to destroy (destroyed ${i}/${count})`);
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
      return {
        success: false,
        error: `No structures available to destroy${category ? ` in category '${category}'` : ''}`
      };
    }

    // Format message
    const structureList = destroyedStructures
      .map((s: { name: string; settlement: string; action: string }) => `${s.name} in ${s.settlement} (${s.action})`)
      .join(', ');

    return {
      success: true,
      data: {
        destroyedStructures,
        count: destroyedStructures.length,
        message: `Destroyed structure${destroyedStructures.length > 1 ? 's' : ''}: ${structureList}`
      }
    };

  } catch (error) {
    logger.error('❌ [destroyStructure] Failed to destroy structure:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Damage Structure - Apply damage to structure(s) in settlement
 * Used by events/incidents that cause structural damage
 * 
 * @param targetStructure - Optional specific structure ID to damage
 * @param settlementId - Optional settlement filter
 * @param count - Number of structures to damage (default: 1)
 * @returns ResolveResult with damaged structure details
 */
export async function damageStructure(
  targetStructure?: string,
  settlementId?: string,
  count: number = 1
): Promise<ResolveResult> {
  logger.info(`💥 [damageStructure] Damaging ${count} structure(s)${settlementId ? ` in settlement ${settlementId}` : ''}`);
  
  try {
    const actor = getKingdomActor();
    if (!actor) {
      return { success: false, error: 'No kingdom actor available' };
    }

    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      return { success: false, error: 'No kingdom data available' };
    }

    // Use structure targeting service to select structures
    const { structureTargetingService } = await import('../../structures/targeting');
    const { structuresService } = await import('../../structures/index');
    const { StructureCondition } = await import('../../../models/Settlement');
    
    const damagedStructures: Array<{ name: string; settlement: string; structureId: string; settlementId: string }> = [];

    // Damage 'count' structures using the targeting service
    for (let i = 0; i < count; i++) {
      const targetResult = structureTargetingService.selectStructureForDamage({
        type: 'random',
        fallbackToRandom: true
      });

      if (!targetResult) {
        logger.warn(`💥 [damageStructure] No more structures available to damage (damaged ${i}/${count})`);
        break;
      }

      // Apply damage by updating structure condition
      await updateKingdom(k => {
        const settlement = k.settlements.find((s: any) => s.id === targetResult.settlement.id);
        if (settlement) {
          if (!settlement.structureConditions) {
            settlement.structureConditions = {};
          }
          settlement.structureConditions[targetResult.structure.id] = StructureCondition.DAMAGED;
        }
      });

      damagedStructures.push({
        name: targetResult.structure.name,
        settlement: targetResult.settlement.name,
        structureId: targetResult.structure.id,
        settlementId: targetResult.settlement.id
      });

      logger.info(`💥 Damaged: ${targetResult.structure.name} in ${targetResult.settlement.name}`);
    }

    if (damagedStructures.length === 0) {
      return {
        success: false,
        error: 'No structures available to damage in the kingdom'
      };
    }

    // Format message for outcome display
    const structureList = damagedStructures
      .map((s: { name: string; settlement: string }) => `${s.name} in ${s.settlement}`)
      .join(', ');

    logger.info(`✅ [damageStructure] Damaged: ${structureList}`);

    return {
      success: true,
      data: {
        damagedStructures,
        count: damagedStructures.length,
        message: `Damaged structure${damagedStructures.length > 1 ? 's' : ''}: ${structureList}`
      }
    };

  } catch (error) {
    logger.error('❌ [damageStructure] Failed to damage structure:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
