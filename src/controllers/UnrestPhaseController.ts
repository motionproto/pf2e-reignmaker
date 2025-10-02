/**
 * UnrestPhaseController - Handles unrest calculation and incident resolution
 * 
 * NEW: Uses static-length step system with CONDITIONAL auto-completion
 * - Step 0: Calculate Unrest (auto-complete immediately)
 * - Step 1: Check for Incidents (MANUAL - user must roll)
 * - Step 2: Resolve Incident (CONDITIONAL - auto if no incident, manual if incident)
 */

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

export async function createUnrestPhaseController() {
  return {
    async startPhase() {
      reportPhaseStart('UnrestPhaseController')
      
      try {
        const kingdom = get(kingdomData);
        const hasActiveIncident = kingdom.currentIncidentId !== null;
        
        // Initialize steps with intelligent auto-completion using shared helpers
        const steps = [
          { name: 'Calculate Unrest' },              // Index 0 - Auto-complete immediately
          { name: 'Incident Check' },               // Index 1 - Always manual
          { name: 'Resolve Incident' }              // Index 2 - Conditional
        ];
        
        await initializePhaseSteps(steps);
        
        // CONDITIONAL auto-completion logic
        // Step 0: Auto-complete unrest calculation immediately
        await completePhaseStepByIndex(0); // Step 0: Calculate Unrest
        
        // Step 1: Check for Incidents - MANUAL (user must roll)
        // Do NOT auto-complete - user must manually trigger incident check
        
        // Step 2: Resolve Incident - CONDITIONAL
        // Only auto-complete if no active incident exists
        if (!hasActiveIncident) {
          await completePhaseStepByIndex(2); // Step 2: Auto-complete if no incident
          console.log('✅ [UnrestPhaseController] Incident resolution auto-completed (no active incident)');
        } else {
          console.log('⚠️ [UnrestPhaseController] Incident resolution requires manual completion');
        }
        
        console.log('✅ [UnrestPhaseController] Unrest calculation auto-completed, incident check requires user action');
        
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
      
      // Get unrest tier and incident chance
      const tier = this.getUnrestTier(unrest);
      const incidentChance = this.getIncidentChance(tier);
      
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
          
          // Set the incident and update step 2 to require resolution
          await actor.updateKingdom((kingdom) => {
            kingdom.currentIncidentId = incidentId;
            // Update step 2 to require resolution
            if (kingdom.currentPhaseSteps[2]) {
              kingdom.currentPhaseSteps[2].completed = 0;
            }
          });
          
          console.log('⚠️ [UnrestPhaseController] Incident triggered, step 2 now requires resolution');
        } catch (error) {
          console.error('❌ [UnrestPhaseController] Error loading incident:', error);
        }
      } else {
        console.log('✅ [UnrestPhaseController] No incident occurred');
        
        // Ensure no incident is set and step 2 remains auto-completed
        await actor.updateKingdom((kingdom) => {
          kingdom.currentIncidentId = null;
          // Keep step 2 auto-completed since no incident
          if (kingdom.currentPhaseSteps[2]) {
            kingdom.currentPhaseSteps[2].completed = 1;
          }
        });
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
     */
    async resolveIncident(incidentId: string, outcome: 'success' | 'failure') {
      const actor = getKingdomActor();
      if (!actor) {
        console.error('❌ [UnrestPhaseController] No kingdom actor available');
        return { success: false, error: 'No kingdom actor' };
      }

      console.log(`🎯 [UnrestPhaseController] Resolving incident ${incidentId} with outcome: ${outcome}`);

      // Apply incident effects based on outcome
      await actor.updateKingdom((kingdom) => {
        if (outcome === 'success') {
          // Successful resolution may reduce unrest
          kingdom.unrest = Math.max(0, kingdom.unrest - 1);
          console.log('✅ [UnrestPhaseController] Incident resolved successfully, -1 unrest');
        } else {
          // Failed resolution may increase unrest
          kingdom.unrest = kingdom.unrest + 1;
          console.log('❌ [UnrestPhaseController] Incident resolution failed, +1 unrest');
        }
        
        // Clear the current incident
        kingdom.currentIncidentId = null;
      });
      
      // Complete step 2 (resolve incident)
      await completePhaseStepByIndex(2);
      
      return { success: true, outcome };
    },

    /**
     * Check if phase is complete using new index-based system
     */
    async isPhaseComplete(): Promise<boolean> {
      const { TurnManager } = await import('../models/turn-manager');
      const turnManager = new TurnManager();
      return await turnManager.isCurrentPhaseComplete();
    },

    /**
     * Get unrest tier based on current unrest level
     */
    getUnrestTier(unrest: number): number {
      if (unrest >= 0 && unrest <= 2) return 0; // Stable
      if (unrest >= 3 && unrest <= 5) return 1; // Discontent (Minor incidents)
      if (unrest >= 6 && unrest <= 8) return 2; // Unrest (Moderate incidents)
      return 3; // Rebellion (Major incidents)
    },

    /**
     * Get incident chance based on tier
     */
    getIncidentChance(tier: number): number {
      switch (tier) {
        case 0: return 0.0;  // Stable - no incidents
        case 1: return 0.8;  // Minor - 80% chance
        case 2: return 0.85; // Moderate - 85% chance
        case 3: return 0.9;  // Major - 90% chance
        default: return 0.0;
      }
    },

    /**
     * Get incident threshold based on unrest level (legacy method)
     */
    getIncidentThreshold(unrest: number): number {
      const tier = this.getUnrestTier(unrest);
      return Math.round(this.getIncidentChance(tier) * 20); // Convert to d20 equivalent for display
    },

    /**
     * Get incident severity based on unrest level
     */
    getIncidentSeverity(unrest: number): 'minor' | 'moderate' | 'major' {
      if (unrest <= 4) return 'minor';
      if (unrest <= 8) return 'moderate';
      return 'major';
    },

    /**
     * Get display data for the UI
     */
    getDisplayData() {
      const kingdom = get(kingdomData);
      const unrest = kingdom.unrest || 0;
      const threshold = this.getIncidentThreshold(unrest);
      const severity = this.getIncidentSeverity(unrest);
      
      return {
        currentUnrest: unrest,
        incidentThreshold: threshold,
        incidentChance: threshold > 0 ? Math.round((threshold / 20) * 100) : 0,
        incidentSeverity: severity,
        status: unrest === 0 ? 'stable' : 
                unrest <= 2 ? 'calm' :
                unrest <= 4 ? 'tense' :
                unrest <= 6 ? 'troubled' :
                unrest <= 8 ? 'volatile' : 'critical'
      };
    }
  };
}
