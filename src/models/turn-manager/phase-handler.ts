// Phase Handler - Manages phase step logic for TurnManager
// Handles step initialization, completion, and progression logic
// while keeping KingdomActor as data-only storage.

import { getKingdomActor, updateKingdom } from '../../stores/KingdomStore';
import type { PhaseStep } from '../../actors/KingdomActor';

export interface StepCompletionResult {
  success: boolean;
  phaseComplete: boolean;
  error?: string;
}

// Phase Step Management - Business logic for TurnManager
export class PhaseHandler {
  
  // Initialize phase with step definitions
  // Sets up currentPhaseSteps and currentStepName in KingdomActor
  static async initializePhaseSteps(steps: Array<{ name: string; completed?: 0 | 1 }>): Promise<void> {
    await updateKingdom(kingdom => {
      // Set up phase steps array
      kingdom.currentPhaseSteps = steps.map(step => ({
        name: step.name,
        completed: (step.completed || 0) as 0 | 1
      }));

      // Set step index to first incomplete step
      const firstIncompleteIndex = kingdom.currentPhaseSteps.findIndex(s => s.completed === 0);
      kingdom.currentPhaseStepIndex = firstIncompleteIndex >= 0 ? firstIncompleteIndex : 0;
      kingdom.currentStepName = kingdom.currentPhaseSteps[kingdom.currentPhaseStepIndex]?.name || 'Unknown Step';
    });

    console.log(`✅ [PhaseHandler] Initialized ${steps.length} steps:`, 
      steps.map(s => s.name));
  }

  // Complete a step by index and handle progression logic
  static async completePhaseStepByIndex(stepIndex: number): Promise<StepCompletionResult> {
    const actor = getKingdomActor();
    if (!actor) {
      return { success: false, phaseComplete: false, error: 'No KingdomActor available' };
    }

    const kingdom = actor.getKingdom();
    if (!kingdom) {
      return { success: false, phaseComplete: false, error: 'No kingdom data available' };
    }

    if (stepIndex < 0 || stepIndex >= kingdom.currentPhaseSteps.length) {
      console.warn(`[PhaseHandler] Invalid step index: ${stepIndex} (array length: ${kingdom.currentPhaseSteps.length})`);
      return { success: false, phaseComplete: false, error: `Invalid step index: ${stepIndex}` };
    }

    // Complete the step - use KingdomActor data methods only
    await updateKingdom(kingdom => {
      // Mark step as completed
      kingdom.currentPhaseSteps[stepIndex].completed = 1;
      
      // Find next incomplete step
      const nextIncompleteIndex = kingdom.currentPhaseSteps.findIndex((s, i) => 
        i > stepIndex && s.completed === 0
      );
      
      if (nextIncompleteIndex >= 0) {
        // Advance to next incomplete step
        kingdom.currentPhaseStepIndex = nextIncompleteIndex;
        kingdom.currentStepName = kingdom.currentPhaseSteps[nextIncompleteIndex].name;
      } else {
        // No more steps - phase might be complete
        kingdom.currentPhaseStepIndex = kingdom.currentPhaseSteps.length;
        kingdom.currentStepName = 'Phase Complete';
      }
    });

    // Get updated kingdom data to check completion
    const updatedKingdom = actor.getKingdom();
    const stepName = updatedKingdom?.currentPhaseSteps[stepIndex]?.name || 'Unknown Step';
    console.log(`[PhaseHandler] Completed step ${stepIndex}: '${stepName}'`);

    // Check if all steps are completed
    const totalSteps = updatedKingdom?.currentPhaseSteps.length || 0;
    const completedCount = updatedKingdom?.currentPhaseSteps.filter(s => s.completed === 1).length || 0;
    const phaseComplete = totalSteps > 0 && completedCount === totalSteps;

    if (phaseComplete) {
      console.log(`✅ [PhaseHandler] All ${totalSteps} steps completed for phase`);
    } else {
      console.log(`[PhaseHandler] Progress: ${completedCount}/${totalSteps} steps complete`);
    }

    return { success: true, phaseComplete };
  }

  // Check if a specific step is completed by index
  static async isStepCompletedByIndex(stepIndex: number): Promise<boolean> {
    const actor = getKingdomActor();
    if (!actor) return false;

    const kingdom = actor.getKingdom();
    if (!kingdom) return false;

    const step = kingdom.currentPhaseSteps[stepIndex];
    return step?.completed === 1 || false;
  }

  // Check if current phase is complete
  static async isCurrentPhaseComplete(): Promise<boolean> {
    const actor = getKingdomActor();
    if (!actor) return false;

    const kingdom = actor.getKingdom();
    if (!kingdom) return false;

    const totalSteps = kingdom.currentPhaseSteps.length;
    const completedCount = kingdom.currentPhaseSteps.filter(s => s.completed === 1).length;
    const allComplete = totalSteps > 0 && completedCount === totalSteps;

    console.log(`[PhaseHandler] Phase completion: ${completedCount}/${totalSteps} steps`);
    return allComplete;
  }

  // Get current step information
  static getCurrentStepInfo(): { index: number; name: string; totalSteps: number } {
    const actor = getKingdomActor();
    if (!actor) {
      return { index: 0, name: 'Unknown', totalSteps: 0 };
    }

    const kingdom = actor.getKingdom();
    if (!kingdom) {
      return { index: 0, name: 'Unknown', totalSteps: 0 };
    }

    return {
      index: kingdom.currentPhaseStepIndex || 0,
      name: kingdom.currentStepName || 'Unknown Step',
      totalSteps: kingdom.currentPhaseSteps?.length || 0
    };
  }

  // Get phase completion status
  static getPhaseStatus(): { completed: number; total: number; isComplete: boolean } {
    const actor = getKingdomActor();
    if (!actor) {
      return { completed: 0, total: 0, isComplete: false };
    }

    const kingdom = actor.getKingdom();
    if (!kingdom) {
      return { completed: 0, total: 0, isComplete: false };
    }

    const total = kingdom.currentPhaseSteps?.length || 0;
    const completed = kingdom.currentPhaseSteps?.filter(s => s.completed === 1).length || 0;
    const isComplete = total > 0 && completed === total;

    return { completed, total, isComplete };
  }
}
