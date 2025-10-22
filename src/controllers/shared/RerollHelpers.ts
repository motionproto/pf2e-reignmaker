/**
 * Shared reroll functionality for kingdom checks (Actions, Events, Incidents)
 * 
 * Provides consistent fame-based reroll logic across all phase types.
 */

import { getKingdomActor } from '../../stores/KingdomStore';
import { logger } from '../../utils/Logger';

export interface RerollContext {
  checkId: string;
  checkType: 'action' | 'event' | 'incident';
  checkName: string;
  skill: string;
  character: any;
  dc: number;
  checkEffects?: any;
}

export interface RerollResult {
  success: boolean;
  error?: string;
  previousFame?: number;
}

/**
 * Check if the kingdom has enough fame for a reroll
 */
export async function canRerollWithFame(): Promise<{ canReroll: boolean; currentFame: number; error?: string }> {
  const actor = getKingdomActor();
  
  if (!actor) {
    return { canReroll: false, currentFame: 0, error: 'Kingdom actor not found' };
  }
  
  const kingdom = actor.getKingdomData();
  const currentFame = kingdom?.fame || 0;
  
  if (currentFame < 1) {
    return { canReroll: false, currentFame, error: 'Not enough fame to reroll (requires 1 fame)' };
  }
  
  return { canReroll: true, currentFame };
}

/**
 * Deduct 1 fame for a reroll
 * Returns the previous fame value for potential restoration
 */
export async function deductFameForReroll(): Promise<RerollResult> {
  const actor = getKingdomActor();
  
  if (!actor) {
    return { success: false, error: 'Kingdom actor not found' };
  }
  
  const kingdom = actor.getKingdomData();
  const previousFame = kingdom?.fame || 0;
  
  if (previousFame < 1) {
    return { success: false, error: 'Not enough fame to reroll', previousFame };
  }
  
  try {
    await actor.updateKingdomData((k) => {
      k.fame = previousFame - 1;
    });
    
    logger.debug(`💎 [RerollHelpers] Deducted 1 fame for reroll (${previousFame} → ${previousFame - 1})`);
    
    return { success: true, previousFame };
  } catch (error) {
    logger.error('❌ [RerollHelpers] Error deducting fame:', error);
    return { success: false, error: 'Failed to deduct fame', previousFame };
  }
}

/**
 * Restore fame after a failed reroll operation
 */
export async function restoreFameAfterFailedReroll(previousFame: number): Promise<void> {
  const actor = getKingdomActor();
  
  if (!actor) {
    logger.error('❌ [RerollHelpers] Cannot restore fame - actor not found');
    return;
  }
  
  try {
    await actor.updateKingdomData((k) => {
      k.fame = previousFame;
    });
    
    logger.debug(`🔄 [RerollHelpers] Restored fame to ${previousFame} after failed reroll`);
  } catch (error) {
    logger.error('❌ [RerollHelpers] Error restoring fame:', error);
  }
}

/**
 * Validate reroll context before proceeding
 */
export function validateRerollContext(context: Partial<RerollContext>): { valid: boolean; error?: string } {
  if (!context.checkId) {
    return { valid: false, error: 'Missing check ID' };
  }
  
  if (!context.checkType) {
    return { valid: false, error: 'Missing check type' };
  }
  
  if (!context.skill) {
    return { valid: false, error: 'Missing skill for reroll' };
  }
  
  if (!context.character) {
    return { valid: false, error: 'Missing character for reroll' };
  }
  
  return { valid: true };
}

/**
 * Generic reroll handler for Svelte components
 * Handles the complete reroll flow: fame check, deduction, UI reset, roll, and error recovery
 */
export async function handleRerollWithFame(options: {
  currentItem: any;
  selectedSkill: string;
  phaseName: string;
  resetUiState: () => void;
  triggerRoll: (skill: string) => Promise<void>;
}): Promise<void> {
  const { currentItem, selectedSkill, phaseName, resetUiState, triggerRoll } = options;
  
  if (!currentItem || !selectedSkill) {
    logger.error(`[${phaseName}] Cannot reroll - missing item or skill`);
    return;
  }
  
  // Check if reroll is possible
  const fameCheck = await canRerollWithFame();
  if (!fameCheck.canReroll) {
    ui.notifications?.warn(fameCheck.error || 'Not enough fame to reroll');
    return;
  }
  
  // Deduct fame
  const deductResult = await deductFameForReroll();
  if (!deductResult.success) {
    ui.notifications?.error(deductResult.error || 'Failed to deduct fame');
    return;
  }
  
  logger.debug(`💎 [${phaseName}] Rerolling with fame (${fameCheck.currentFame} → ${fameCheck.currentFame - 1})`);
  
  // Reset UI state for new roll
  resetUiState();
  
  // Small delay to ensure UI updates
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Trigger new roll with same skill
  try {
    await triggerRoll(selectedSkill);
  } catch (error) {
    logger.error(`[${phaseName}] Error during reroll:`, error);
    
    // Restore fame on error
    if (deductResult.previousFame !== undefined) {
      await restoreFameAfterFailedReroll(deductResult.previousFame);
    }
    
    ui.notifications?.error('Failed to reroll. Fame has been restored.');
  }
}
