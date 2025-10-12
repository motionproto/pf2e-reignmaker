/**
 * UnrestPhaseController - Handles unrest calculation and incident resolution
 * 
 * NEW: Uses static-length step system with CONDITIONAL auto-completion
 * - Step 0: Calculate Unrest (auto-complete immediately)
 * - Step 1: Check for Incidents (MANUAL - user must roll)
 * - Step 2: Resolve Incident (CONDITIONAL - auto if no incident, manual if incident)
 */

import { getIncidentDisplayName } from '../types/event-helpers';
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

// Re-export for backwards compatibility
export { type UnrestTierInfo, getUnrestTierInfo, getUnrestStatus };

export async function createUnrestPhaseController() {
  return {
    async startPhase() {
      reportPhaseStart('UnrestPhaseController')
      
      try {
        // Phase guard - prevents initialization when not in Unrest phase or already initialized
        const guardResult = checkPhaseGuard(TurnPhase.UNREST, 'UnrestPhaseController');
        if (guardResult) return guardResult;
        
        const kingdom = get(kingdomData);
        
        // Read CURRENT state from turnState (single source of truth)
        const incidentRolled = kingdom.turnState?.unrestPhase?.incidentRolled ?? false;
        const incidentTriggered = kingdom.turnState?.unrestPhase?.incidentTriggered ?? false;
        
        // Initialize steps with CORRECT completion state (using type-safe constants)
        // No workarounds needed - steps reflect KingdomActor state directly
        const steps = [
          { name: 'Calculate Unrest', completed: 1 },  // UnrestPhaseSteps.CALCULATE_UNREST = 0 (always complete)
          { name: 'Incident Check', completed: incidentRolled ? 1 : 0 },  // UnrestPhaseSteps.INCIDENT_CHECK = 1
          { name: 'Resolve Incident', completed: (incidentRolled && !incidentTriggered) ? 1 : 0 }  // UnrestPhaseSteps.RESOLVE_INCIDENT = 2
        ];
        
        await initializePhaseSteps(steps);
        
        console.log('✅ [UnrestPhaseController] Phase initialization complete');
        
        return createPhaseResult(true)
      } catch (error) {
        reportPhaseError('UnrestPhaseController', error instanceof Error ? error : new Error(String(error)))
        return createPhaseResult(false, error instanceof Error ? error.message : 'Unknown error')
      }
    },

    /**
     * Calculate and display current unrest level (auto-completed on init)
     */
    async calculateUnrest() {
      const kingdom = get(kingdomData)
      const currentUnrest = kingdom.unrest || 0
      
      console.log(`📊 [UnrestPhaseController] Current unrest level: ${currentUnrest}`)
      
      // This step is already auto-completed during initialization
      return { unrest: currentUnrest }
    },

    /**
     * Check for incidents based on unrest level (manual step)
     */
    async checkForIncidents() {
      const actor = getKingdomActor();
      if (!actor) {
        console.error('❌ [UnrestPhaseController] No kingdom actor available');
        return { incidentTriggered: false };
      }

      // Check if incident check step is already completed (using type-safe constant)
      if (await isStepCompletedByIndex(UnrestPhaseSteps.INCIDENT_CHECK)) {
        console.log('🟡 [UnrestPhaseController] Incident check already completed');
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
      
      console.log(`🎲 [UnrestPhaseController] Incident check: rolled ${(roll * 100).toFixed(1)}% vs ${(incidentChance * 100)}% chance (tier ${tier})`);
      
      let incidentId: string | null = null;
      if (incidentTriggered) {
        try {
          const { incidentLoader } = await import('./incidents/incident-loader');
          const severity = tier === 1 ? 'minor' : tier === 2 ? 'moderate' : 'major';
          const incident = incidentLoader.getRandomIncident(severity);
          incidentId = incident?.id || null;
          
          console.log(`📋 [UnrestPhaseController] Selected incident for tier ${tier}:`, incident?.name);
          
          // Set the incident - write to turnState ONLY (simplified migration)
          await actor.updateKingdom((kingdom) => {
            if (kingdom.turnState) {
              kingdom.turnState.unrestPhase.incidentRolled = true;
              kingdom.turnState.unrestPhase.incidentRoll = Math.round(roll * 100);
              kingdom.turnState.unrestPhase.incidentTriggered = true;
              kingdom.turnState.unrestPhase.incidentId = incidentId;
            }
          });
          
          console.log('⚠️ [UnrestPhaseController] Incident triggered, step 2 will require manual resolution');
        } catch (error) {
          console.error('❌ [UnrestPhaseController] Error loading incident:', error);
        }
      } else {
        console.log('✅ [UnrestPhaseController] No incident occurred');
        
        // Update turnState
        await actor.updateKingdom((kingdom) => {
          if (kingdom.turnState) {
            kingdom.turnState.unrestPhase.incidentRolled = true;
            kingdom.turnState.unrestPhase.incidentRoll = Math.round(roll * 100);
            kingdom.turnState.unrestPhase.incidentTriggered = false;
            kingdom.turnState.unrestPhase.incidentId = null;
          }
        });
        
        // Complete resolve incident step (using type-safe constant)
        await completePhaseStepByIndex(UnrestPhaseSteps.RESOLVE_INCIDENT);
        
        console.log('✅ [UnrestPhaseController] No incident - turnState updated, step 2 completed via helper');
      }
      
      // Complete incident check step (using type-safe constant)
      await completePhaseStepByIndex(UnrestPhaseSteps.INCIDENT_CHECK);
      
      return { 
        incidentTriggered,
        roll: Math.round(roll * 100),
        chance: Math.round(incidentChance * 100),
        incidentId
      };
    },

    /**
     * Resolve a triggered incident (step 2)
     * NEW ARCHITECTURE: Receives ResolutionData with all values already computed
     */
    async resolveIncident(
      incidentId: string, 
      outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
      resolutionData: import('../types/modifiers').ResolutionData
    ) {
      const actor = getKingdomActor();
      if (!actor) {
        console.error('❌ [UnrestPhaseController] No kingdom actor available');
        return { success: false, error: 'No kingdom actor' };
      }

      // Validate incident exists
      const { incidentLoader } = await import('./incidents/incident-loader');
      const incident = incidentLoader.getIncidentById(incidentId);
      
      if (!incident) {
        console.error(`❌ [UnrestPhaseController] Incident ${incidentId} not found`);
        return { success: false, error: 'Incident not found' };
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
     * Get outcome modifiers for an incident
     * (Follows same pattern as ActionPhaseController.getActionModifiers)
     * NOTE: For incidents, criticalSuccess falls back to success (by design)
     */
    getIncidentModifiers(incident: any, outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure') {
      // For incidents, criticalSuccess falls back to success if not defined (by design)
      const effectiveOutcome = outcome === 'criticalSuccess' && !incident.effects.criticalSuccess 
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
