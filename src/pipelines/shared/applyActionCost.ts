/**
 * Shared helper for applying action costs
 * 
 * Deducts upfront resource costs when an action is executed.
 * Costs are applied regardless of outcome - the action was attempted.
 * 
 * Usage in pipeline execute functions:
 * ```typescript
 * execute: async (ctx) => {
 *   // Deduct cost first
 *   await applyActionCost(sendScoutsPipeline);
 *   
 *   // Then handle outcome
 *   switch (ctx.outcome) {
 *     // ...
 *   }
 * }
 * ```
 */

import { createGameCommandsService } from '../../services/GameCommandsService';
import type { CheckPipeline } from '../../types/CheckPipeline';
import type { ResourceType } from '../../types/modifiers';
import { logger } from '../../utils/Logger';

/**
 * Apply upfront costs from a pipeline
 * 
 * @param pipeline - The pipeline containing cost definition
 * @returns Result of applying the costs
 */
export async function applyActionCost(
  pipeline: CheckPipeline
): Promise<{ success: boolean; error?: string }> {
  // Check if pipeline has costs defined
  const cost = pipeline.cost;
  
  if (!cost || Object.keys(cost).length === 0) {
    logger.info(`[applyActionCost] ${pipeline.id}: No cost to apply`);
    return { success: true };
  }
  
  logger.info(`[applyActionCost] ${pipeline.id}: Applying costs`, cost);
  
  // Convert cost object to modifiers (filter out undefined values)
  const modifiers = Object.entries(cost)
    .filter(([_, amount]) => amount !== undefined && amount > 0)
    .map(([resource, amount]) => ({
      type: 'static' as const,
      resource: resource as ResourceType,
      value: -(amount as number),  // Negative to deduct
      duration: 'immediate' as const
    }));
  
  // Apply costs using GameCommandsService
  const gameCommandsService = await createGameCommandsService();
  const result = await gameCommandsService.applyOutcome({
    type: 'action',
    sourceId: pipeline.id,
    sourceName: `${pipeline.name} (cost)`,
    outcome: 'success',  // Costs apply regardless of outcome
    modifiers
  });
  
  if (!result.success) {
    logger.error(`[applyActionCost] ${pipeline.id}: Failed -`, result.error);
  } else {
    logger.info(`[applyActionCost] ${pipeline.id}: Successfully applied costs`);
  }
  
  return result;
}
