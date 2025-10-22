/**
 * Shared helper functions for phase controllers
 * 
 * Provides consistent logging, error handling, and phase completion
 * functionality across all phase controllers.
 */

import { getKingdomActor } from '../../stores/KingdomStore';
import { TurnPhase } from '../../actors/KingdomActor';
import { logger } from '../../utils/Logger';

/**
 * Standardized logging for phase start
 */
export function reportPhaseStart(phaseName: string): void {
  logger.debug(`🟡 [${phaseName}] Starting phase...`);
}

/**
 * Standardized logging for phase completion
 */
export function reportPhaseComplete(phaseName: string): void {
  logger.debug(`✅ [${phaseName}] Phase complete`);
}

/**
 * Standardized logging for phase errors
 */
export function reportPhaseError(phaseName: string, error: Error): void {
  logger.error(`❌ [${phaseName}] Phase failed:`, error);
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
 * Phase guard - prevents phase controllers from initializing when not in their phase
 * 
 * @param phaseName - The phase name to guard (e.g., TurnPhase.EVENTS, TurnPhase.UNREST)
 * @param controllerName - Controller name for logging
 * @returns null if guard passes (should proceed with initialization), 
 *          PhaseResult if guard blocks (should return early)
 */
export function checkPhaseGuard(
  phaseName: TurnPhase,
  controllerName: string
): { success: boolean; error?: string } | null {
  const actor = getKingdomActor();
  const kingdom = actor?.getKingdomData();
  const hasSteps = kingdom?.currentPhaseSteps && kingdom.currentPhaseSteps.length > 0;
  
  // No steps yet - guard passes, allow initialization
  if (!hasSteps) {
    return null;
  }
  
  // Steps exist - check if we're in the WRONG phase
  if (kingdom?.currentPhase !== phaseName) {
    logger.debug(`⏭️ [${controllerName}] Not in ${phaseName} phase, skipping initialization`);
    return createPhaseResult(true);
  }
  
  // Steps exist and we're in the CORRECT phase
  // Check if we're mid-phase (any steps completed)
  const hasCompletedSteps = kingdom.currentPhaseSteps?.some((s: any) => s.completed === 1);
  if (hasCompletedSteps) {
    // We're mid-phase, don't re-initialize (would clear component state/progress)
    logger.debug(`⏭️ [${controllerName}] Mid-phase with progress, skipping re-initialization`);
    return createPhaseResult(true);
  }
  
  // No completed steps yet - allow initialization
  // This handles the case where we just navigated to this phase with stale steps
  logger.debug(`✅ [${controllerName}] In correct phase, allowing initialization`);
  return null;
}

/**
 * Initialize phase with predefined steps
 * Uses TurnManager singleton with modular phase-handler
 */
export async function initializePhaseSteps(steps: Array<{ name: string }>): Promise<void> {
  logger.debug(`[PhaseControllerHelpers] Using TurnManager singleton for step initialization`);
  
  // Use TurnManager singleton for step management (business logic)
  const { TurnManager } = await import('../../models/turn-manager');
  const turnManager = TurnManager.getInstance();
  await turnManager.initializePhaseSteps(steps);
}

/**
 * Complete a phase step by index and auto-advance if all done
 * Uses TurnManager singleton with modular phase-handler
 */
export async function completePhaseStepByIndex(stepIndex: number): Promise<{ phaseComplete: boolean }> {
  logger.debug(`[PhaseControllerHelpers] Using TurnManager singleton to complete step at index: ${stepIndex}`);
  
  try {
    // Use TurnManager singleton for step completion (business logic)
    const { TurnManager } = await import('../../models/turn-manager');
    const turnManager = TurnManager.getInstance();
    const result = await turnManager.completePhaseStepByIndex(stepIndex);
    
    logger.debug(`✅ [PhaseControllerHelpers] Step ${stepIndex} completed via TurnManager singleton`);
    return result;
  } catch (error) {
    logger.error('❌ [PhaseControllerHelpers] Error completing step:', error);
    return { phaseComplete: false };
  }
}

/**
 * Check if a specific step is completed by index - delegates to PhaseHandler
 */
export async function isStepCompletedByIndex(stepIndex: number): Promise<boolean> {
  logger.debug(`[PhaseControllerHelpers] Using TurnManager singleton to check step completion at index: ${stepIndex}`);
  
  try {
    // Use TurnManager singleton for step status checking
    const { TurnManager } = await import('../../models/turn-manager');
    const turnManager = TurnManager.getInstance();
    return await turnManager.isStepCompletedByIndex(stepIndex);
  } catch (error) {
    logger.error('❌ [PhaseControllerHelpers] Error checking step completion:', error);
    return false;
  }
}

/**
 * Unified resolution wrapper for Event/Unrest/Action outcomes
 * 
 * Consolidates the duplicate resolution logic from Event, Unrest, and Action controllers.
 * Handles validation, outcome application, step completion, and error handling.
 * 
 * @param itemId - ID of the event/incident/action being resolved
 * @param itemType - Type of item ('event' | 'incident' | 'action')
 * @param outcome - Outcome degree (criticalSuccess, success, failure, criticalFailure)
 * @param resolutionData - Pre-computed resolution data from UI
 * @param stepIndicesToComplete - Array of step indices to complete after successful resolution
 * @returns Result object with success flag and applied changes or error message
 */
export async function resolvePhaseOutcome(
  itemId: string,
  itemType: 'event' | 'incident' | 'action',
  outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
  resolutionData: any, // ResolutionData from types/events
  stepIndicesToComplete: number[]
): Promise<{ success: boolean; applied?: any; error?: string }> {
  logger.debug(`🎯 [PhaseControllerHelpers.resolvePhaseOutcome] Resolving ${itemType} ${itemId} with ${outcome}`);
  logger.debug(`📋 [PhaseControllerHelpers] ResolutionData:`, resolutionData);
  
  try {
    // Apply outcome using shared resolution service
    const { applyResolvedOutcome } = await import('../../services/resolution');
    const result = await applyResolvedOutcome(resolutionData, outcome);
    
    // NEW ARCHITECTURE: Mark instance as applied BEFORE completing steps
    // This must happen while instance still has status 'resolved'
    const { checkInstanceService } = await import('../../services/CheckInstanceService');
    const { get } = await import('svelte/store');
    const { kingdomData } = await import('../../stores/KingdomStore');
    const kingdom = get(kingdomData);
    
    // Find the resolved instance (status = 'resolved')
    const resolvedInstance = kingdom.activeCheckInstances?.find((i: any) => 
      i.checkType === itemType && i.checkId === itemId && i.status === 'resolved'
    );
    
    if (resolvedInstance) {
      await checkInstanceService.markApplied(resolvedInstance.instanceId);
      logger.debug(`✅ [PhaseControllerHelpers] Marked ${itemType} instance as applied`);
    } else {
      logger.warn(`⚠️ [PhaseControllerHelpers] No resolved ${itemType} instance found to mark as applied`);
    }
    
    // Complete phase steps in order
    for (const stepIndex of stepIndicesToComplete) {
      await completePhaseStepByIndex(stepIndex);
      logger.debug(`✅ [PhaseControllerHelpers] Completed step ${stepIndex}`);
    }
    
    logger.debug(`✅ [PhaseControllerHelpers] ${itemType} resolved successfully`);
    
    return {
      success: true,
      applied: result
    };
  } catch (error) {
    logger.error(`❌ [PhaseControllerHelpers] Error resolving ${itemType}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
