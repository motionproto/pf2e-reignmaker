/**
 * Shared reroll functionality for kingdom checks (Actions, Events, Incidents)
 * 
 * Provides consistent fame-based reroll logic across all phase types.
 */

import { getKingdomActor } from '../../stores/KingdomStore';

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
  
  const kingdom = actor.getKingdom();
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
  
  const kingdom = actor.getKingdom();
  const previousFame = kingdom?.fame || 0;
  
  if (previousFame < 1) {
    return { success: false, error: 'Not enough fame to reroll', previousFame };
  }
  
  try {
    await actor.updateKingdom((k) => {
      k.fame = previousFame - 1;
    });
    
    console.log(`💎 [RerollHelpers] Deducted 1 fame for reroll (${previousFame} → ${previousFame - 1})`);
    
    return { success: true, previousFame };
  } catch (error) {
    console.error('❌ [RerollHelpers] Error deducting fame:', error);
    return { success: false, error: 'Failed to deduct fame', previousFame };
  }
}

/**
 * Restore fame after a failed reroll operation
 */
export async function restoreFameAfterFailedReroll(previousFame: number): Promise<void> {
  const actor = getKingdomActor();
  
  if (!actor) {
    console.error('❌ [RerollHelpers] Cannot restore fame - actor not found');
    return;
  }
  
  try {
    await actor.updateKingdom((k) => {
      k.fame = previousFame;
    });
    
    console.log(`🔄 [RerollHelpers] Restored fame to ${previousFame} after failed reroll`);
  } catch (error) {
    console.error('❌ [RerollHelpers] Error restoring fame:', error);
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
