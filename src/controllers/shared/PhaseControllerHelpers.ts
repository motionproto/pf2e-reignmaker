/**
 * Shared helper functions for phase controllers
 * 
 * Provides consistent logging, error handling, and phase completion
 * functionality across all phase controllers.
 */

import { getKingdomActor, getTurnManager } from '../../stores/KingdomStore';

/**
 * Standardized logging for phase start
 */
export function reportPhaseStart(phaseName: string): void {
  console.log(`🟡 [${phaseName}] Starting phase...`);
}

/**
 * Standardized logging for phase completion
 */
export function reportPhaseComplete(phaseName: string): void {
  console.log(`✅ [${phaseName}] Phase complete`);
}

/**
 * Standardized logging for phase errors
 */
export function reportPhaseError(phaseName: string, error: Error): void {
  console.error(`❌ [${phaseName}] Phase failed:`, error);
}

/**
 * Create standardized phase result object
 */
export function createPhaseResult(success: boolean, error?: string): { success: boolean; error?: string } {
  const result: { success: boolean; error?: string } = { success };
  if (error) {
    result.error = error;
  }
  return result;
}

/**
 * Initialize phase with predefined steps
 * Uses TurnManager with modular phase-handler
 */
export async function initializePhaseSteps(steps: Array<{ name: string }>): Promise<void> {
  console.log(`[PhaseControllerHelpers] Using TurnManager for step initialization`);
  
  // Use TurnManager for step management (business logic)
  const { TurnManager } = await import('../../models/turn-manager');
  const turnManager = new TurnManager();
  await turnManager.initializePhaseSteps(steps);
}

/**
 * Complete a phase step by index and auto-advance if all done
 * Uses TurnManager with modular phase-handler
 */
export async function completePhaseStepByIndex(stepIndex: number): Promise<{ phaseComplete: boolean }> {
  console.log(`[PhaseControllerHelpers] Using TurnManager to complete step at index: ${stepIndex}`);
  
  try {
    // Use TurnManager for step completion (business logic)
    const { TurnManager } = await import('../../models/turn-manager');
    const turnManager = new TurnManager();
    const result = await turnManager.completePhaseStepByIndex(stepIndex);
    
    console.log(`✅ [PhaseControllerHelpers] Step ${stepIndex} completed via TurnManager`);
    return result;
  } catch (error) {
    console.error('❌ [PhaseControllerHelpers] Error completing step:', error);
    return { phaseComplete: false };
  }
}

/**
 * Check if a specific step is completed by index
 * Uses TurnManager with modular phase-handler
 */
export async function isStepCompletedByIndex(stepIndex: number): Promise<boolean> {
  console.log(`[PhaseControllerHelpers] Using TurnManager to check step completion at index: ${stepIndex}`);
  
  try {
    // Use TurnManager for step status checking
    const { TurnManager } = await import('../../models/turn-manager');
    const turnManager = new TurnManager();
    return await turnManager.isStepCompletedByIndex(stepIndex);
  } catch (error) {
    console.error('❌ [PhaseControllerHelpers] Error checking step completion:', error);
    return false;
  }
}
