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
  initializePhaseSteps,
  completePhaseStepByIndex,
  isStepCompletedByIndex
} from './shared/PhaseControllerHelpers'
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
        const kingdom = get(kingdomData);
        
        // Check if phase is already initialized (prevent re-initialization on component remount)
        const hasSteps = kingdom?.currentPhaseSteps && kingdom.currentPhaseSteps.length > 0;
        
        if (hasSteps && kingdom?.currentPhase === 'Unrest') {
          console.log('⏭️ [UnrestPhaseController] Phase already initialized, skipping re-initialization');
          return createPhaseResult(true);
        }
        
        // Read CURRENT state from turnState (single source of truth)
        const incidentRolled = kingdom.turnState?.unrestPhase?.incidentRolled ?? false;
        const incidentTriggered = kingdom.turnState?.unrestPhase?.incidentTriggered ?? false;
        
        // Initialize steps with CORRECT completion state from the start
        // No workarounds needed - steps reflect KingdomActor state directly
        const steps = [
          { name: 'Calculate Unrest', completed: 1 },  // Always complete
          { name: 'Incident Check', completed: incidentRolled ? 1 : 0 },
          { name: 'Resolve Incident', completed: (incidentRolled && !incidentTriggered) ? 1 : 0 }
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

      // Check if step 1 (check incidents) is already completed
      if (await isStepCompletedByIndex(1)) {
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
        
        // Complete step 2 using proper helper (ensures phaseComplete is updated)
        await completePhaseStepByIndex(2); // Resolve Incident
        
        console.log('✅ [UnrestPhaseController] No incident - turnState updated, step 2 completed via helper');
      }
      
      // Complete step 1 (incident check)
      await completePhaseStepByIndex(1);
      
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
      resolutionData: import('../types/events').ResolutionData
    ) {
      const actor = getKingdomActor();
      if (!actor) {
        console.error('❌ [UnrestPhaseController] No kingdom actor available');
        return { success: false, error: 'No kingdom actor' };
      }

      // DIAGNOSTIC: Check current phase and steps BEFORE applying
      const kingdom = actor.getKingdom();
      if (kingdom) {
        console.log('🔍 [UnrestPhaseController] DIAGNOSTIC - Current state BEFORE resolution:');
        console.log('  - Current Phase:', kingdom.currentPhase);
        console.log('  - Current Phase Steps:', kingdom.currentPhaseSteps?.map((s, i) => `[${i}] ${s.name} (${s.completed ? 'complete' : 'incomplete'})`));
        console.log('  - Phase Complete Flag:', kingdom.phaseComplete);
      }

      console.log(`🎯 [UnrestPhaseController] Resolving incident ${incidentId} with outcome: ${outcome}`);
      console.log(`📋 [UnrestPhaseController] ResolutionData:`, resolutionData);

      try {
        // NEW ARCHITECTURE: ResolutionData already contains final numeric values
        // No need to filter, transform, or roll - just apply!
        
        const { incidentLoader } = await import('./incidents/incident-loader');
        const incident = incidentLoader.getIncidentById(incidentId);
        
        if (!incident) {
          console.error(`❌ [UnrestPhaseController] Incident ${incidentId} not found`);
          return { success: false, error: 'Incident not found' };
        }

        // Apply numeric modifiers using new simplified service method
        const { createGameEffectsService } = await import('../services/GameEffectsService');
        const gameEffects = await createGameEffectsService();
        
        const result = await gameEffects.applyNumericModifiers(resolutionData.numericModifiers);
        
        console.log(`✅ [UnrestPhaseController] Applied ${resolutionData.numericModifiers.length} modifiers`);
        
        // Log manual effects (they're displayed in UI, not executed)
        if (resolutionData.manualEffects.length > 0) {
          console.log(`� [UnrestPhaseController] Manual effects for GM:`, resolutionData.manualEffects);
        }
        
        // Execute complex actions (Phase 3 - stub for now)
        if (resolutionData.complexActions.length > 0) {
          console.log(`� [UnrestPhaseController] Complex actions to execute:`, resolutionData.complexActions);
          // await gameEffects.executeComplexActions(resolutionData.complexActions);
        }
        
        // Complete step 2 (resolve incident)
        await completePhaseStepByIndex(2);
        
        // DIAGNOSTIC: Check state AFTER completing step 2
        const kingdomAfter = actor.getKingdom();
        if (kingdomAfter) {
          console.log('🔍 [UnrestPhaseController] DIAGNOSTIC - Current state AFTER step 2 completion:');
          console.log('  - Current Phase:', kingdomAfter.currentPhase);
          console.log('  - Current Phase Steps:', kingdomAfter.currentPhaseSteps?.map((s, i) => `[${i}] ${s.name} (${s.completed === 1 ? 'complete' : 'incomplete'})`));
          console.log('  - Phase Complete Flag:', kingdomAfter.phaseComplete);
          console.log('  - Completed Count:', kingdomAfter.currentPhaseSteps?.filter(s => s.completed === 1).length);
          console.log('  - Total Steps:', kingdomAfter.currentPhaseSteps?.length);
        }
        
        console.log(`✅ [UnrestPhaseController] Incident resolved successfully`);
        
        return {
          success: true,
          applied: result  // Pass through result with shortfall data
        };
      } catch (error) {
        console.error('❌ [UnrestPhaseController] Error resolving incident:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
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
