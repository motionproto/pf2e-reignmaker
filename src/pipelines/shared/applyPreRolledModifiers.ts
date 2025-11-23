/**
 * Shared helper for applying pre-rolled dice modifiers from context
 * 
 * This helper applies dice modifiers that were already rolled in the UI (Step 6)
 * and stored in ctx.resolutionData.numericModifiers.
 * 
 * **When to use this:**
 * - Action has dice modifiers in JSON (e.g., "2d6 gold", "1d4+1 unrest")
 * - Dice are rolled by user clicking dice buttons in OutcomeDisplay
 * - Execute function needs to apply the rolled values
 * 
 * **When NOT to use this:**
 * - Action has only static modifiers (use applyPipelineModifiers instead)
 * - Action has no modifiers at all
 * - Custom logic handles modifiers differently
 * 
 * Usage in pipeline execute functions:
 * ```typescript
 * execute: async (ctx) => {
 *   if (ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess') {
 *     // Apply pre-rolled dice modifiers
 *     const result = await applyPreRolledModifiers(ctx);
 *     if (!result.success) {
 *       return { success: false, error: result.error };
 *     }
 *     
 *     // Custom logic here...
 *     return { success: true };
 *   }
 * }
 * ```
 */

import type { CheckContext } from '../../types/CheckContext';
import type { ResourceType } from '../../types/events';
import { createGameCommandsService } from '../../services/GameCommandsService';

/**
 * Apply pre-rolled dice modifiers from context
 * 
 * @param ctx - Check context containing resolutionData with numericModifiers
 * @returns Result of applying the modifiers
 */
export async function applyPreRolledModifiers(
  ctx: CheckContext
): Promise<{ success: boolean; error?: string }> {
  // Extract pre-rolled values from context
  const numericModifiers = (ctx.resolutionData?.numericModifiers || []) as Array<{
    resource: ResourceType;
    value: number;
  }>;
  
  // If no modifiers, this is a no-op (but explicit)
  if (numericModifiers.length === 0) {
    console.log('[applyPreRolledModifiers] No pre-rolled modifiers to apply');
    return { success: true };
  }
  
  console.log(`[applyPreRolledModifiers] Applying ${numericModifiers.length} pre-rolled modifier(s)`);
  
  // Apply modifiers using GameCommandsService
  const gameCommandsService = await createGameCommandsService();
  const result = await gameCommandsService.applyNumericModifiers(
    numericModifiers,
    ctx.outcome
  );
  
  if (!result.success) {
    console.error('[applyPreRolledModifiers] Failed to apply modifiers:', result.error);
  } else {
    console.log('[applyPreRolledModifiers] Successfully applied modifiers');
  }
  
  return result;
}
