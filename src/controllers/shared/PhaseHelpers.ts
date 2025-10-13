/**
 * Svelte-specific phase helpers
 * 
 * Provides composable utilities for phase components to reduce boilerplate
 * and standardize common patterns.
 */

import { writable, type Writable } from 'svelte/store';
import { logger } from '../../utils/Logger';

/**
 * Composable controller initialization helper
 * Returns a writable store for the controller and an initialized flag
 */
export function usePhaseController<T>(
  createController: () => Promise<T>
): {
  controller: Writable<T | null>;
  initialized: Writable<boolean>;
  initialize: () => Promise<void>;
} {
  const controller = writable<T | null>(null);
  const initialized = writable(false);

  const initialize = async () => {
    try {
      const ctrl = await createController();
      controller.set(ctrl);
      
      // Start the phase if the controller has a startPhase method
      if (ctrl && typeof (ctrl as any).startPhase === 'function') {
        await (ctrl as any).startPhase();
      }
      
      initialized.set(true);
    } catch (error) {
      logger.error('[PhaseHelpers] Error initializing controller:', error);
      initialized.set(false);
    }
  };

  return { controller, initialized, initialize };
}

/**
 * PF2e roll event handler setup
 * Returns a cleanup function to remove the event listener
 */
export function usePF2eRollHandler(
  checkType: string,
  checkId: () => string | null,
  onComplete: (result: any) => void
): () => void {
  const handleKingdomRoll = (event: Event) => {
    const customEvent = event as CustomEvent;
    const currentCheckId = checkId();
    
    if (!currentCheckId || customEvent.detail?.checkId !== currentCheckId) {
      return;
    }
    
    if (customEvent.detail?.checkType !== checkType) {
      return;
    }
    
    onComplete(customEvent.detail);
  };

  window.addEventListener('kingdomRollComplete', handleKingdomRoll);

  // Return cleanup function
  return () => {
    window.removeEventListener('kingdomRollComplete', handleKingdomRoll);
  };
}

/**
 * Helper to get step completion status by index
 * Reduces boilerplate reactive statements in components
 */
export function getStepCompletion(
  currentPhaseSteps: Array<{ completed: number }> | undefined,
  stepIndex: number
): boolean {
  return currentPhaseSteps?.[stepIndex]?.completed === 1 || false;
}

/**
 * Helper to check if all steps are complete
 */
export function areAllStepsComplete(
  currentPhaseSteps: Array<{ completed: number }> | undefined
): boolean {
  if (!currentPhaseSteps || currentPhaseSteps.length === 0) {
    return false;
  }
  return currentPhaseSteps.every(step => step.completed === 1);
}

/**
 * Helper to safely initialize a phase controller in onMount
 * Waits for kingdomActor to be available before proceeding
 */
export async function safePhaseInit(
  currentPhase: string,
  targetPhase: string,
  initialize: () => Promise<void>
): Promise<() => void> {
  const { kingdomActor } = await import('../../stores/KingdomStore');
  
  return new Promise((resolve) => {
    const unsubscribe = kingdomActor.subscribe(async (actor) => {
      if (actor && currentPhase === targetPhase) {
        unsubscribe();
        await initialize();
        resolve(() => {}); // Return empty cleanup function
      }
    });
    
    // Return the unsubscribe function as cleanup
    resolve(unsubscribe);
  });
}
