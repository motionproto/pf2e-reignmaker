/**
 * damageStructure execution function
 *
 * Extracted from immediate-execute pattern - pure execution logic only.
 * Preview logic has been moved to pipeline configuration.
 */

import { updateKingdom, getKingdomActor } from '../../stores/KingdomStore';
import { logger } from '../../utils/Logger';

/**
 * Execute structure damage
 *
 * @param count - Number of structures to damage (default: 1)
 */
export async function damageStructureExecution(count: number = 1): Promise<{
  damagedStructures: Array<{ name: string; settlement: string; structureId: string; settlementId: string }>;
}> {
  logger.info(`💥 [damageStructureExecution] Damaging ${count} structure(s)`);

  const actor = getKingdomActor();
  if (!actor) {
    throw new Error('No kingdom actor available');
  }

  const kingdom = actor.getKingdomData();
  if (!kingdom) {
    throw new Error('No kingdom data available');
  }

  // Use structure targeting service to select structures
  const { structureTargetingService } = await import('../../services/structures/targeting');
  const { StructureCondition } = await import('../../models/Settlement');

  const damagedStructures: Array<{ name: string; settlement: string; structureId: string; settlementId: string }> = [];

  // Damage 'count' structures using the targeting service
  for (let i = 0; i < count; i++) {
    const targetResult = structureTargetingService.selectStructureForDamage({
      type: 'random',
      fallbackToRandom: true
    });

    if (!targetResult) {
      logger.warn(`💥 [damageStructureExecution] No more structures available to damage (damaged ${i}/${count})`);
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
    throw new Error('No structures available to damage in the kingdom');
  }

  logger.info(`✅ [damageStructureExecution] Damaged ${damagedStructures.length} structure(s)`);

  return { damagedStructures };
}
