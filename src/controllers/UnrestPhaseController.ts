/**
 * UnrestPhaseController - Handles unrest calculation and incident resolution
 * 
 * NEW: Uses static-length step system with CONDITIONAL auto-completion
 * - Step 0: Calculate Unrest (auto-complete immediately)
 * - Step 1: Check for Incidents (MANUAL - user must roll)
 * - Step 2: Resolve Incident (CONDITIONAL - auto if no incident, manual if incident)
 */

import { getIncidentDisplayName } from '../types/event-helpers';
import { logger } from '../utils/Logger';
import { getKingdomActor } from '../stores/KingdomStore'
import { get } from 'svelte/store'
import { kingdomData } from '../stores/KingdomStore'
import {
  reportPhaseStart,
  reportPhaseComplete,
  reportPhaseError,
  createPhaseResult,
  checkPhaseGuard,
  initializePhaseSteps,
  completePhaseStepByIndex,
  isStepCompletedByIndex
} from './shared/PhaseControllerHelpers'
import { TurnPhase } from '../actors/KingdomActor'
import { UnrestPhaseSteps } from './shared/PhaseStepConstants'
import { 
  getUnrestTierInfo,
  getUnrestStatus,
  getUnrestTier,
  getIncidentChance,
  getIncidentSeverity,
  type UnrestTierInfo
} from '../services/domain/unrest/UnrestService'
import { createOutcomePreviewService } from '../services/OutcomePreviewService'

// Re-export for backwards compatibility
export { type UnrestTierInfo, getUnrestTierInfo, getUnrestStatus };

export async function createUnrestPhaseController() {
  // Initialize OutcomePreviewService once per controller instance
  const outcomePreviewService = await createOutcomePreviewService();
  
  return {
    async startPhase() {
      reportPhaseStart('UnrestPhaseController')
      
      try {
        // Phase guard - prevents initialization when not in Unrest phase or already initialized
        const guardResult = checkPhaseGuard(TurnPhase.UNREST, 'UnrestPhaseController');
        if (guardResult) return guardResult;
        
        // ✅ FIX: Clear incidents from previous turns using createdTurn comparison
        const kingdom = get(kingdomData);
        // CRITICAL: Use pendingOutcomes (where OutcomePreviewService stores data), NOT activeCheckInstances
        const allIncidents = kingdom.pendingOutcomes?.filter(i => i.checkType === 'incident') || [];
        const outdatedIncidents = allIncidents.filter(i => i.createdTurn < kingdom.currentTurn);
        
        if (outdatedIncidents.length > 0) {
          console.log('[UnrestPhaseController] Clearing', outdatedIncidents.length, 'outdated incidents from previous turns');
          // Clear each outdated incident individually
          for (const incident of outdatedIncidents) {
            await outcomePreviewService.clearInstance(incident.previewId);
          }
        }
        
        // Also clear completed/applied incidents from THIS turn on first entry
        const completedThisTurn = allIncidents.filter(i => 
          i.createdTurn === kingdom.currentTurn && (i.status === 'resolved' || i.status === 'applied')
        );
        if (completedThisTurn.length > 0) {
          console.log('[UnrestPhaseController] Clearing', completedThisTurn.length, 'completed incidents from this turn');
          for (const incident of completedThisTurn) {
            await outcomePreviewService.clearInstance(incident.previewId);
          }
        }
        
        // Read state from activeCheckInstances (new) OR turnState (legacy fallback)
        const pendingIncidents = outcomePreviewService.getPendingInstances('incident', kingdom);
        const incidentRolled = kingdom.turnState?.unrestPhase?.incidentRolled ?? false;
        const incidentTriggered = pendingIncidents.length > 0 || (kingdom.turnState?.unrestPhase?.incidentTriggered ?? false);
        
        // Check if incident has been resolved (has appliedOutcome)
        const incidentInstance = pendingIncidents[0];
        const effectsApplied = incidentInstance?.appliedOutcome?.effectsApplied ?? 
                               kingdom.turnState?.unrestPhase?.incidentResolution?.effectsApplied ?? 
                               false;
        
        // Check unrest tier - if tier 0 (stable), auto-complete all steps
        const unrest = kingdom.unrest || 0;
        const tier = getUnrestTier(unrest);
        const isStable = tier === 0;
        
        // Initialize steps with CORRECT completion state (using type-safe constants)
        // No workarounds needed - steps reflect KingdomActor state directly
        const steps = [
          { name: 'Calculate Unrest', completed: 1 },  // UnrestPhaseSteps.CALCULATE_UNREST = 0 (always complete)
          { name: 'Incident Check', completed: (isStable || incidentRolled) ? 1 : 0 },  // UnrestPhaseSteps.INCIDENT_CHECK = 1 (auto-complete if stable)
          { name: 'Resolve Incident', completed: (isStable || (incidentRolled && !incidentTriggered) || effectsApplied) ? 1 : 0 }  // UnrestPhaseSteps.RESOLVE_INCIDENT = 2 (auto-complete if stable, no incident, or effects applied)
        ];
        
        await initializePhaseSteps(steps);

        return createPhaseResult(true)
      } catch (error) {
        reportPhaseError('UnrestPhaseController', error instanceof Error ? error : new Error(String(error)))
        return createPhaseResult(false, error instanceof Error ? error.message : 'Unknown error')
      }
    },

    /**
     * Roll for incident occurrence based on current unrest level
     */
    async rollForIncident() {
      const actor = getKingdomActor();
      if (!actor) {
        logger.error('❌ [UnrestPhaseController] No kingdom actor available');
        return { incidentTriggered: false };
      }

      // Check if incident check step is already completed (using type-safe constant)
      if (await isStepCompletedByIndex(UnrestPhaseSteps.INCIDENT_CHECK)) {

        return { incidentTriggered: false };
      }

      const kingdom = get(kingdomData);
      const unrest = kingdom.unrest || 0;
      
      // Get unrest tier and incident chance using centralized service
      const tier = getUnrestTier(unrest);
      const incidentChance = getIncidentChance(unrest);
      
      // Roll for incident occurrence
      const roll = Math.random();
      const incidentTriggered = roll < incidentChance;

      let incidentId: string | null = null;
      let instanceId: string | null = null;
      if (incidentTriggered) {
        try {
          // ✅ ARCHITECTURE FIX: Load from pipeline registry instead of JSON
          // Pipelines have outcomeBadges, gameCommands, execute() functions - JSON doesn't
          const { pipelineRegistry } = await import('../pipelines/PipelineRegistry');
          // Convert unrest tier (1, 2, 3) to severity string
          const severity = tier === 1 ? 'minor' : tier === 2 ? 'moderate' : 'major';
          
          // Get all incidents matching the severity
          const allIncidents = pipelineRegistry.getPipelinesByType('incident');
          const incidentsForSeverity = allIncidents.filter((p: any) => p.severity === severity);
          
          // Pick random incident from matching severity
          const incident = incidentsForSeverity[Math.floor(Math.random() * incidentsForSeverity.length)];
          incidentId = incident?.id || null;
          
          if (incident) {

            // NEW ARCHITECTURE: Create OutcomePreview
            instanceId = await outcomePreviewService.createInstance(
              'incident',
              incident.id,
              incident,
              kingdom.currentTurn
            );
            
            // MINIMAL turnState update (only for roll display in UI)
            await actor.updateKingdomData((kingdom: any) => {
              if (kingdom.turnState) {
                kingdom.turnState.unrestPhase.incidentRolled = true;
                kingdom.turnState.unrestPhase.incidentRoll = Math.round(roll * 100);
                kingdom.turnState.unrestPhase.incidentChance = Math.round(incidentChance * 100);
                kingdom.turnState.unrestPhase.incidentTriggered = true;
              }
            });

          }
        } catch (error) {
          logger.error('❌ [UnrestPhaseController] Error loading incident:', error);
        }
      } else {

        // MINIMAL turnState update (only for roll display in UI)
        await actor.updateKingdomData((kingdom: any) => {
          if (kingdom.turnState) {
            kingdom.turnState.unrestPhase.incidentRolled = true;
            kingdom.turnState.unrestPhase.incidentRoll = Math.round(roll * 100);
            kingdom.turnState.unrestPhase.incidentChance = Math.round(incidentChance * 100);
            kingdom.turnState.unrestPhase.incidentTriggered = false;
          }
        });
        
        // Complete resolve incident step (using type-safe constant)
        await completePhaseStepByIndex(UnrestPhaseSteps.RESOLVE_INCIDENT);

      }
      
      // Complete incident check step (using type-safe constant)
      await completePhaseStepByIndex(UnrestPhaseSteps.INCIDENT_CHECK);
      
      return { 
        incidentTriggered,
        roll: Math.round(roll * 100),
        chance: Math.round(incidentChance * 100),
        incidentId,
        instanceId  // Return instance ID for UI
      };
    },

    // Legacy methods removed - now handled by PipelineCoordinator:
    // - resolveIncident()
    // - storeIncidentResolution()
    // - markIncidentApplied()
    // - clearIncidentResolution()
    // - getIncidentModifiers()


    /**
     * Get display data for the UI (delegates to static helper)
     */
    getDisplayData() {
      const kingdom = get(kingdomData);
      const unrest = kingdom.unrest || 0;
      const tierInfo = getUnrestTierInfo(unrest);
      
      return {
        currentUnrest: unrest,
        incidentThreshold: tierInfo.incidentThreshold,
        incidentChance: tierInfo.incidentChance,
        incidentSeverity: tierInfo.incidentSeverity,
        status: getUnrestStatus(unrest)
      };
    },

    /**
     * Check if incident rolling is allowed (business logic)
     */
    canRollForIncident(): { allowed: boolean; reason?: string } {
      const kingdom = get(kingdomData);
      const unrest = kingdom.unrest || 0;
      const tier = getUnrestTier(unrest);
      
      // Check if unrest tier is 0
      if (tier === 0) {
        return { allowed: false, reason: 'Unrest tier is 0 - no incidents occur' };
      }
      
      // Check if step is already complete
      const stepComplete = kingdom.currentPhaseSteps?.[1]?.completed === 1;
      if (stepComplete) {
        return { allowed: false, reason: 'Incident check already completed' };
      }
      
      return { allowed: true };
    },

  };
}
