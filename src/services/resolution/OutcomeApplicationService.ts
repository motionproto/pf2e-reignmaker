/**
 * OutcomeApplicationService - Shared service for applying outcome results
 * 
 * Centralizes the logic for:
 * - Applying ResolutionData from UI to kingdom state
 * - Automatic +1 fame bonus on critical success
 * - Consistent outcome application across Actions, Events, and Incidents
 */

import { createGameEffectsService, type OutcomeDegree } from '../GameEffectsService';
import type { ResolutionData } from '../../types/events';
import { logger } from '../../utils/Logger';

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
  logger.debug(`🎯 [OutcomeApplication] Applying ${outcome} with ${resolutionData.numericModifiers.length} modifiers`);
  
  const gameEffects = await createGameEffectsService();
  
  // Apply numeric modifiers with automatic critical success fame bonus
  const result = await gameEffects.applyNumericModifiers(
    resolutionData.numericModifiers,
    outcome  // Automatically applies +1 fame on critical success
  );
  
  // Log manual effects (displayed in UI, not executed here)
  if (resolutionData.manualEffects.length > 0) {
    logger.debug(`📋 [OutcomeApplication] Manual effects for GM:`, resolutionData.manualEffects);
  }
  
  // Execute complex actions (Phase 3 - stub for now)
  if (resolutionData.complexActions.length > 0) {
    logger.debug(`🔧 [OutcomeApplication] Complex actions to execute:`, resolutionData.complexActions);
    // await gameEffects.executeComplexActions(resolutionData.complexActions);
  }
  
  logger.debug(`✅ [OutcomeApplication] Outcome applied successfully`);
  
  return result;
}
