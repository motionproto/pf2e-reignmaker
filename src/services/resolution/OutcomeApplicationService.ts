/**
 * OutcomeApplicationService - Shared service for applying outcome results
 * 
 * Centralizes the logic for:
 * - Applying ResolutionData from UI to kingdom state
 * - Automatic +1 fame bonus on critical success
 * - Consistent outcome application across Actions, Events, and Incidents
 */

import { createGameCommandsService, type OutcomeDegree } from '../GameCommandsService';
import type { ResolutionData } from '../../types/events';
/**
 * Apply a resolved outcome to the kingdom
 * 
 * This is the single source of truth for applying outcomes from:
 * - Player actions (ActionPhaseController)
 * - Random events (EventPhaseController)
 * - Unrest incidents (UnrestPhaseController)
 * 
 * @param resolutionData - Pre-computed resolution data from OutcomeDisplay
 * @param outcome - Outcome degree (for automatic fame bonus on critical success)
 * @returns Result with applied changes and any shortfalls
 */
export async function applyResolvedOutcome(
  resolutionData: ResolutionData,
  outcome: OutcomeDegree
) {

  const gameCommands = await createGameCommandsService();
  
  // Apply numeric modifiers with automatic critical success fame bonus
  const result = await gameCommands.applyNumericModifiers(
    resolutionData.numericModifiers,
    outcome  // Automatically applies +1 fame on critical success
  );
  
  // Log manual effects (displayed in UI, not executed here)
  if (resolutionData.manualEffects.length > 0) {

  }
  
  // Execute complex actions (Phase 3 - stub for now)
  if (resolutionData.complexActions.length > 0) {

    // await gameCommands.executeComplexActions(resolutionData.complexActions);
  }

  return result;
}
