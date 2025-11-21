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
  isStepCompletedByIndex,
  resolvePhaseOutcome
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
        const allIncidents = kingdom.activeCheckInstances?.filter(i => i.checkType === 'incident') || [];
        const outdatedIncidents = allIncidents.filter(i => i.createdTurn < kingdom.currentTurn);
        
        if (outdatedIncidents.length > 0) {

          await outcomePreviewService.clearCompleted('incident', kingdom.currentTurn);
        }
        
        // Also clear completed/applied incidents from THIS turn on first entry
        const completedThisTurn = allIncidents.filter(i => 
          i.createdTurn === kingdom.currentTurn && (i.status === 'resolved' || i.status === 'applied')
        );
        if (completedThisTurn.length > 0) {

          await outcomePreviewService.clearCompleted('incident', kingdom.currentTurn);
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
          const { incidentLoader } = await import('./incidents/incident-loader');
          const severity = tier === 1 ? 'minor' : tier === 2 ? 'moderate' : 'major';
          const incident = incidentLoader.getRandomIncident(severity);
          incidentId = incident?.id || null;
          
          if (incident) {

            // NEW ARCHITECTURE: Create ActiveCheckInstance
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

    /**
     * Resolve a triggered incident (step 2)
     * NEW ARCHITECTURE: Receives ResolutionData with all values already computed
     * 
     * @deprecated TODO: This method duplicates PipelineCoordinator logic.
     * Should be replaced with: pipelineCoordinator.executePipeline(incidentId, actorData)
     * See Task B: Pipeline Unification Migration
     */
    async resolveIncident(
      incidentId: string, 
      outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
      resolutionData: import('../types/modifiers').ResolutionData
    ) {
      const actor = getKingdomActor();
      if (!actor) {
        logger.error('❌ [UnrestPhaseController] No kingdom actor available');
        return { success: false, error: 'No kingdom actor' };
      }

      // Validate incident exists
      const { incidentLoader } = await import('./incidents/incident-loader');
      const incident = incidentLoader.getIncidentById(incidentId);
      
      if (!incident) {
        logger.error(`❌ [UnrestPhaseController] Incident ${incidentId} not found`);
        return { success: false, error: 'Incident not found' };
      }

      // Get outcome data
      const outcomeData = incident?.effects[outcome];
      
      console.log('🔍 [resolveIncident] Incident:', incident?.id);
      console.log('🔍 [resolveIncident] Outcome:', outcome);
      console.log('🔍 [resolveIncident] OutcomeData:', outcomeData);
      console.log('🔍 [resolveIncident] GameCommands:', (outcomeData as any)?.gameCommands);
      
      // Execute game commands if present (structure damage, etc.)
      const { executeGameCommands } = await import('./shared/GameCommandHelpers');
      const gameCommandEffects = await executeGameCommands((outcomeData as any)?.gameCommands || []);
      
      // Merge gameCommand effects into resolutionData
      if (gameCommandEffects.length > 0) {
        resolutionData.specialEffects = [
          ...(resolutionData.specialEffects || []),
          ...gameCommandEffects
        ];
      }
      
      // Use unified resolution wrapper (consolidates duplicate logic)
      return await resolvePhaseOutcome(
        incidentId,
        'incident',
        outcome,
        resolutionData,
        [UnrestPhaseSteps.RESOLVE_INCIDENT]  // Type-safe step index
      );
    },


    /**
     * Store incident resolution in ActiveCheckInstance (synced across all clients)
     * NEW ARCHITECTURE ONLY - no legacy fallback
     */
    async storeIncidentResolution(
      incidentId: string,
      resolution: {
        outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
        actorName: string;
        skillName: string;
        effect: string;
        modifiers?: any[];
        manualEffects?: string[];
        rollBreakdown?: any;
        effectsApplied?: boolean;
      }
    ) {
      const kingdom = get(kingdomData);
      
      // NEW ARCHITECTURE: Store in ActiveCheckInstance
      const pendingIncidents = outcomePreviewService.getPendingInstances('incident', kingdom);
      const instance = pendingIncidents.find(i => i.checkId === incidentId);
      
      if (!instance) {
        logger.error('❌ [UnrestPhaseController] No pending incident instance found');
        return { success: false };
      }
      
      // Build ResolutionData format for service
      const resolutionData: import('../types/modifiers').ResolutionData = {
        numericModifiers: resolution.modifiers || [],
        manualEffects: resolution.manualEffects || [],
        complexActions: []  // Incidents don't have complex actions
      };
      
      await outcomePreviewService.storeOutcome(
        instance.instanceId,
        resolution.outcome,
        resolutionData,
        resolution.actorName,
        resolution.skillName,
        resolution.effect,
        resolution.rollBreakdown
      );

      return { success: true };
    },
    
    /**
     * Mark incident resolution as applied (after "Apply Result" clicked)
     * NEW ARCHITECTURE ONLY - no legacy fallback
     */
    async markIncidentApplied() {
      const kingdom = get(kingdomData);
      
      // NEW ARCHITECTURE: Find incident with status 'resolved' (has been rolled but not applied)
      const resolvedIncident = kingdom.activeCheckInstances?.find(i => 
        i.checkType === 'incident' && i.status === 'resolved'
      );
      
      if (!resolvedIncident) {
        logger.error('❌ [UnrestPhaseController] No resolved incident to mark as applied');
        return;
      }
      
      await outcomePreviewService.markApplied(resolvedIncident.instanceId);

    },

    /**
     * Clear incident resolution from ActiveCheckInstance
     * NEW ARCHITECTURE ONLY - no legacy fallback
     * ✅ FIX: Clears appliedOutcome AND resets status to 'pending' for rerolls
     */
    async clearIncidentResolution() {
      const kingdom = get(kingdomData);
      const actor = getKingdomActor();
      if (!actor) {
        logger.error('❌ [UnrestPhaseController] No kingdom actor available');
        return;
      }
      
      // ✅ FIX: Find ANY incident (pending, resolved, or applied) and reset it
      const allIncidents = kingdom.activeCheckInstances?.filter((i: any) => i.checkType === 'incident') || [];
      if (allIncidents.length > 0) {
        await actor.updateKingdomData((k: any) => {
          const instance = k.activeCheckInstances?.find((i: any) => 
            i.instanceId === allIncidents[0].instanceId
          );
          if (instance) {
            instance.appliedOutcome = undefined;  // Clear resolution
            instance.status = 'pending';  // Reset status for reroll

          }
        });
      }
    },

    /**
     * Get outcome modifiers for an incident
     * (Follows same pattern as ActionPhaseController.getActionModifiers)
     * NOTE: For incidents, criticalSuccess falls back to success (by design)
     */
    getIncidentModifiers(incident: any, outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure') {
      // For incidents, criticalSuccess falls back to success if not defined (by design)
      const effectiveOutcome = outcome === 'criticalSuccess' && !incident.outcomes.criticalSuccess 
        ? 'success' 
        : outcome;
      
      const outcomeData = incident.effects[effectiveOutcome];
      
      return {
        msg: outcomeData?.msg || '',
        modifiers: outcomeData?.modifiers || [],
        manualEffects: outcomeData?.manualEffects || []
      };
    },
    
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
