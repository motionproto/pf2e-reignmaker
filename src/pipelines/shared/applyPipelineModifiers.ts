/**
 * Shared helper for explicitly applying pipeline modifiers
 * 
 * This function provides a clear, self-documenting way for pipeline execute functions
 * to apply standard resource modifiers without implicit fall-through behavior.
 * 
 * Usage in pipeline execute functions:
 * ```typescript
 * case 'criticalFailure':
 *   await applyPipelineModifiers(ctx.pipeline, ctx.outcome, ctx);
 *   return { success: true };
 * ```
 */

import { createGameCommandsService, type OutcomeDegree } from '../../services/GameCommandsService';
import type { CheckPipeline } from '../../types/CheckPipeline';
import type { ResolutionData } from '../../types/modifiers';
import { logger } from '../../utils/Logger';

/**
 * Context type for apply modifiers
 */
interface ApplyModifiersContext {
  modifiersAlreadyApplied?: boolean;
  resolutionData?: ResolutionData;
}

/**
 * Apply modifiers from a pipeline's outcome definition
 *
 * @param pipeline - The pipeline containing outcome modifiers
 * @param outcome - The outcome degree to apply
 * @param ctx - Optional context with:
 *   - modifiersAlreadyApplied: if true, skips modifier application
 *   - resolutionData: contains pre-rolled values from OutcomeDisplay
 * @returns Result of applying the modifiers
 */
export async function applyPipelineModifiers(
  pipeline: CheckPipeline,
  outcome: OutcomeDegree,
  ctx?: ApplyModifiersContext
): Promise<{ success: boolean; error?: string }> {
  // Skip if modifiers were already applied by the controller (applyResolvedOutcome)
  // This prevents double-application when execute() is called after resolution
  if (ctx?.modifiersAlreadyApplied) {
    logger.info(`[applyPipelineModifiers] ${pipeline.id} ${outcome}: Skipping - modifiers already applied`);
    return { success: true };
  }

  // Get modifiers for this outcome
  const outcomeData = pipeline.outcomes?.[outcome];
  const modifiers = outcomeData?.modifiers || [];
  
  // If no modifiers, this is a no-op (but explicit)
  if (modifiers.length === 0) {
    logger.info(`[applyPipelineModifiers] ${pipeline.id} ${outcome}: No modifiers to apply`);
    return { success: true };
  }
  
  logger.info(`[applyPipelineModifiers] ${pipeline.id} ${outcome}: Applying ${modifiers.length} modifier(s)`);
  
  // ✅ CRITICAL: Build preRolledValues map from resolutionData.numericModifiers
  // This provides the pre-rolled dice values to GameCommandsService
  const preRolledValues = new Map<number | string, number>();
  
  if (ctx?.resolutionData?.numericModifiers) {
    // Map pre-rolled values by resource name (using state:resource pattern)
    for (const mod of ctx.resolutionData.numericModifiers) {
      preRolledValues.set(`state:${mod.resource}`, mod.value);
      logger.info(`[applyPipelineModifiers] Pre-rolled value: ${mod.resource} = ${mod.value}`);
    }
    
    // Also map by index for dice modifiers that match by position
    modifiers.forEach((modifier, index) => {
      if (modifier.type === 'dice' && modifier.resource) {
        const preRolled = ctx.resolutionData?.numericModifiers?.find(m => m.resource === modifier.resource);
        if (preRolled) {
          preRolledValues.set(index, preRolled.value);
        }
      }
    });
  }
  
  // Apply modifiers using GameCommandsService
  const gameCommandsService = await createGameCommandsService();
  const result = await gameCommandsService.applyOutcome({
    type: 'action',
    sourceId: pipeline.id,
    sourceName: pipeline.name,
    outcome,
    modifiers,
    preRolledValues: preRolledValues.size > 0 ? preRolledValues : undefined
  });
  
  if (!result.success) {
    logger.error(`[applyPipelineModifiers] ${pipeline.id} ${outcome}: Failed -`, result.error);
  } else {
    logger.info(`[applyPipelineModifiers] ${pipeline.id} ${outcome}: Success`);
  }
  
  return result;
}
