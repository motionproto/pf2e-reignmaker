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
 * Mark a phase step as completed (uses completePhaseStep)
 */
export async function markPhaseCompleted(stepName: string): Promise<void> {
  await completePhaseStep(stepName);
}

/**
 * Notify TurnManager that phase is complete
 */
export async function notifyTurnManagerComplete(): Promise<void> {
  const turnManager = getTurnManager();
  if (turnManager) {
    await turnManager.markPhaseComplete();
  } else {
    throw new Error('No TurnManager available');
  }
}

/**
 * Initialize phase with predefined steps
 */
export async function initializePhaseSteps(steps: Array<{ id: string; name: string }>): Promise<void> {
  // Wait for stores to be initialized
  let actor = getKingdomActor();
  let retries = 0;
  const maxRetries = 10;
  
  while (!actor && retries < maxRetries) {
    console.log(`[PhaseControllerHelpers] Waiting for KingdomActor to be available (attempt ${retries + 1}/${maxRetries})`);
    await new Promise(resolve => setTimeout(resolve, 100));
    actor = getKingdomActor();
    retries++;
  }
  
  if (!actor) {
    console.error('❌ [PhaseControllerHelpers] No KingdomActor available for initializePhaseSteps after waiting');
    throw new Error('No KingdomActor available');
  }

  // Check if the actor has our custom method, if not implement it directly
  if (typeof actor.initializePhaseSteps === 'function') {
    await actor.initializePhaseSteps(steps);
  } else {
    // Fallback implementation using the actor's flag system directly
    console.log(`[PhaseControllerHelpers] Using fallback implementation for initializePhaseSteps`);
    
    const kingdomData = actor.getFlag('pf2e-reignmaker', 'kingdom-data') as any;
    if (kingdomData) {
      // Set up current phase steps array
      kingdomData.currentPhaseSteps = steps.map(step => ({
        id: step.id,
        name: step.name,
        completed: false
      }));
      
      await actor.setFlag('pf2e-reignmaker', 'kingdom-data', kingdomData);
      console.log(`✅ [PhaseControllerHelpers] Fallback initialized ${steps.length} steps:`, 
        steps.map(s => s.name));
    } else {
      console.error('❌ [PhaseControllerHelpers] No kingdom data found for fallback initialization');
      throw new Error('No kingdom data found');
    }
  }
}

/**
 * Complete a phase step and auto-advance if all done
 */
export async function completePhaseStep(stepId: string): Promise<{ phaseComplete: boolean }> {
  const actor = getKingdomActor();
  if (!actor) {
    console.error('❌ [PhaseControllerHelpers] No KingdomActor available for completePhaseStep');
    return { phaseComplete: false };
  }

  if (typeof actor.completePhaseStep === 'function') {
    const result = await actor.completePhaseStep(stepId);
    
    // If phase is complete, notify TurnManager
    if (result.phaseComplete) {
      await notifyTurnManagerComplete();
    }
    
    return result;
  } else {
    // Fallback implementation
    console.log(`[PhaseControllerHelpers] Using fallback implementation for completePhaseStep`);
    
    const kingdomData = actor.getFlag('pf2e-reignmaker', 'kingdom-data') as any;
    if (kingdomData && kingdomData.currentPhaseSteps) {
      const step = kingdomData.currentPhaseSteps.find((s: any) => s.id === stepId);
      if (step) {
        step.completed = true;
        console.log(`[PhaseControllerHelpers] Completed step '${step.name}' (${stepId})`);
        
        // Check if all steps are completed
        const phaseComplete = kingdomData.currentPhaseSteps.every((s: any) => s.completed);
        if (phaseComplete) {
          console.log(`✅ [PhaseControllerHelpers] All steps completed for current phase`);
        }
        
        await actor.setFlag('pf2e-reignmaker', 'kingdom-data', kingdomData);
        
        // If phase is complete, notify TurnManager
        if (phaseComplete) {
          await notifyTurnManagerComplete();
        }
        
        return { phaseComplete };
      } else {
        console.warn(`[PhaseControllerHelpers] Step '${stepId}' not found in current phase steps`);
        return { phaseComplete: false };
      }
    } else {
      console.error('❌ [PhaseControllerHelpers] No kingdom data or phase steps found');
      return { phaseComplete: false };
    }
  }
}

/**
 * Get remaining steps for current phase
 */
export function getRemainingSteps(): Array<{ id: string; name: string; completed: boolean }> {
  const actor = getKingdomActor();
  return actor?.getRemainingSteps() || [];
}

/**
 * Get all steps for current phase (completed and incomplete)
 */
export function getAllSteps(): Array<{ id: string; name: string; completed: boolean }> {
  const actor = getKingdomActor();
  return actor?.getAllSteps() || [];
}

/**
 * Check if a specific step is completed
 */
export function isStepCompleted(stepId: string): boolean {
  const actor = getKingdomActor();
  if (!actor) {
    console.error('❌ [PhaseControllerHelpers] No KingdomActor available for isStepCompleted');
    return false;
  }

  // Check if custom method exists, use fallback if not
  if (typeof actor.isStepCompleted === 'function') {
    return actor.isStepCompleted(stepId);
  } else {
    console.log('🔄 [PhaseControllerHelpers] Using fallback for isStepCompleted');
    
    // Fallback: Read from kingdom data directly
    const kingdomData = actor.getFlag('pf2e-reignmaker', 'kingdom-data') as any;
    if (!kingdomData?.currentPhaseSteps) {
      return false;
    }
    
    const step = kingdomData.currentPhaseSteps.find((s: any) => s.id === stepId);
    return step?.completed || false;
  }
}
