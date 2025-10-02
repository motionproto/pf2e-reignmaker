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
 * Mark a phase step as completed by index
 */
export async function markPhaseCompleted(stepIndex: number): Promise<void> {
  await completePhaseStepByIndex(stepIndex);
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
 * NEW: Uses TurnManager with modular phase-handler
 */
export async function initializePhaseSteps(steps: Array<{ name: string }>): Promise<void> {
  console.log(`[PhaseControllerHelpers] Using TurnManager for step initialization`);
  
  // Use TurnManager for step management (business logic)
  const { TurnManager } = await import('../../models/turn-manager');
  const turnManager = new TurnManager();
  await turnManager.initializePhaseSteps(steps);
}

/**
 * Get step index from step ID by reading current phase steps directly
 */
function getStepIndex(stepId: string): number {
  const actor = getKingdomActor();
  if (!actor) {
    console.error('❌ [PhaseControllerHelpers] No KingdomActor available for step mapping');
    return -1;
  }
  
  const kingdomData = actor.getFlag('pf2e-reignmaker', 'kingdom-data') as any;
  if (!kingdomData?.currentPhaseSteps) {
    console.error('❌ [PhaseControllerHelpers] No currentPhaseSteps found for step mapping');
    return -1;
  }
  
  // Find step by name (since we store name, not ID)
  const index = kingdomData.currentPhaseSteps.findIndex((step: any) => 
    step.name === getStepNameFromId(stepId)
  );
  
  if (index === -1) {
    console.warn(`[PhaseControllerHelpers] Step ID '${stepId}' not found in current phase steps`);
    console.log(`[PhaseControllerHelpers] Available steps:`, 
      kingdomData.currentPhaseSteps.map((s: any, i: number) => `${i}: ${s.name}`));
  }
  
  return index;
}

/**
 * Map step IDs to step names for consistency
 */
function getStepNameFromId(stepId: string): string {
  const mapping: Record<string, string> = {
    'calculate-unrest': 'Calculate Unrest',
    'check-incidents': 'Check for Incidents', 
    'resolve-incident': 'Resolve Incident',
    'status': 'Status',
    'collect-resources': 'Collect Kingdom Resources',
    'perform-actions': 'Perform Kingdom Actions',
    'event-check': 'Check for Events',
    'resolve-event': 'Resolve Event',
    'feed-settlements': 'Feed Settlements',
    'support-military': 'Support Military',
    'process-builds': 'Process Build Queue'
  };
  
  return mapping[stepId] || stepId;
}

/**
 * Store step ID to index mapping (no longer needed but kept for compatibility)
 */
function storeStepMapping(steps: Array<{ id: string; name: string }>): void {
  console.log(`[PhaseControllerHelpers] Step mapping stored (using direct lookup now)`);
}

/**
 * Promise-based waiting for KingdomActor to be available
 * NEW: Event-driven approach using store subscription instead of polling
 */
async function waitForKingdomActor(): Promise<any> {
  const actor = getKingdomActor();
  if (actor) {
    return actor;
  }

  // Use store subscription to wait for actor to become available
  return new Promise((resolve, reject) => {
    // Import the kingdomActor store
    import('../../stores/KingdomStore').then(({ kingdomActor }) => {
      const unsubscribe = kingdomActor.subscribe((actor) => {
        if (actor) {
          unsubscribe();
          console.log('✅ [PhaseControllerHelpers] KingdomActor became available via store subscription');
          resolve(actor);
        }
      });
      
      // Set a reasonable timeout to prevent infinite waiting
      setTimeout(() => {
        unsubscribe();
        reject(new Error('Timeout waiting for KingdomActor to be available'));
      }, 5000); // 5 second timeout
    }).catch(reject);
  });
}

/**
 * Complete a phase step by index and auto-advance if all done
 * NEW: Uses TurnManager with modular phase-handler
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
 * NEW: Uses TurnManager with modular phase-handler
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

/**
 * Get remaining steps for current phase
 * NEW: Uses TurnManager data format
 */
export function getRemainingSteps(): Array<{ id: string; name: string; completed: boolean }> {
  const actor = getKingdomActor();
  if (!actor) return [];
  
  const kingdomData = actor.getFlag('pf2e-reignmaker', 'kingdom-data') as any;
  if (!kingdomData?.currentPhaseSteps) return [];
  
  // Convert new format back to old format for compatibility
  return kingdomData.currentPhaseSteps
    .filter((step: any, index: number) => step.completed === 0)
    .map((step: any, index: number) => ({
      id: getStepIdFromIndex(kingdomData.currentPhaseSteps.indexOf(step)),
      name: step.name,
      completed: false
    }));
}

/**
 * Get all steps for current phase (completed and incomplete)
 * NEW: Uses TurnManager data format
 */
export function getAllSteps(): Array<{ id: string; name: string; completed: boolean }> {
  const actor = getKingdomActor();
  if (!actor) return [];
  
  const kingdomData = actor.getFlag('pf2e-reignmaker', 'kingdom-data') as any;
  if (!kingdomData?.currentPhaseSteps) return [];
  
  // Convert new format back to old format for compatibility
  return kingdomData.currentPhaseSteps.map((step: any, index: number) => ({
    id: getStepIdFromIndex(index),
    name: step.name,
    completed: step.completed === 1
  }));
}

/**
 * Get step ID from index (reverse mapping)
 */
function getStepIdFromIndex(index: number): string {
  // Reverse lookup using the step name mapping
  const actor = getKingdomActor();
  if (!actor) return `step-${index}`;
  
  const kingdomData = actor.getFlag('pf2e-reignmaker', 'kingdom-data') as any;
  if (!kingdomData?.currentPhaseSteps?.[index]) {
    return `step-${index}`;
  }
  
  const stepName = kingdomData.currentPhaseSteps[index].name;
  
  // Reverse lookup in our step name mapping
  const reverseMapping: Record<string, string> = {
    'Calculate Unrest': 'calculate-unrest',
    'Check for Incidents': 'check-incidents',
    'Resolve Incident': 'resolve-incident',
    'Status': 'status',
    'Collect Kingdom Resources': 'collect-resources',
    'Perform Kingdom Actions': 'perform-actions',
    'Check for Events': 'event-check',
    'Resolve Event': 'resolve-event',
    'Feed Settlements': 'feed-settlements',
    'Support Military': 'support-military',
    'Process Build Queue': 'process-builds'
  };
  
  return reverseMapping[stepName] || `step-${index}`;
}
