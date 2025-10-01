/**
 * UnrestPhaseController - Handles unrest calculation and incident resolution
 * 
 * NEW: Uses simplified step array system with show-unrest, incident-check, and resolve-incident steps.
 * Auto-calculates unrest and checks for incidents based on unrest level.
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
  completePhaseStep,
  isStepCompleted
} from './shared/PhaseControllerHelpers'

// Define steps for Unrest Phase
const UNREST_PHASE_STEPS = [
  { id: 'show-unrest', name: 'Calculate and Show Unrest' },
  { id: 'incident-check', name: 'Check for Incidents' }
  // 'resolve-incident' step is added dynamically if incident occurs
]

export async function createUnrestPhaseController() {
  return {
    async startPhase() {
      reportPhaseStart('UnrestPhaseController')
      
      try {
        // Initialize phase with predefined steps but DON'T auto-complete them
        await initializePhaseSteps(UNREST_PHASE_STEPS)
        
        console.log('🟡 [UnrestPhaseController] Phase initialized - manual interaction required')
        
        // No auto-completion - steps must be completed manually through user interaction
        return createPhaseResult(true)
      } catch (error) {
        reportPhaseError('UnrestPhaseController', error instanceof Error ? error : new Error(String(error)))
        return createPhaseResult(false, error instanceof Error ? error.message : 'Unknown error')
      }
    },

    /**
     * Calculate and display current unrest level
     */
    async calculateUnrest() {
      if (isStepCompleted('show-unrest')) {
        console.log('🟡 [UnrestPhaseController] Unrest already calculated')
        return
      }

      const kingdom = get(kingdomData)
      const currentUnrest = kingdom.unrest || 0
      
      console.log(`📊 [UnrestPhaseController] Current unrest level: ${currentUnrest}`)
      
      // Complete the show-unrest step
      await completePhaseStep('show-unrest')
      
      return { unrest: currentUnrest }
    },

    /**
     * Check for incidents based on unrest level
     */
    async checkForIncidents() {
      if (isStepCompleted('incident-check')) {
        console.log('🟡 [UnrestPhaseController] Incident check already completed')
        return { incidentTriggered: false }
      }

      const kingdom = get(kingdomData)
      const unrest = kingdom.unrest || 0
      
      // Get unrest tier and incident chance
      const tier = this.getUnrestTier(unrest)
      const incidentChance = this.getIncidentChance(tier)
      
      // Roll for incident occurrence
      const roll = Math.random()
      const incidentTriggered = roll < incidentChance
      
      console.log(`🎲 [UnrestPhaseController] Incident check: rolled ${(roll * 100).toFixed(1)}% vs ${(incidentChance * 100)}% chance (tier ${tier})`)
      
      let incidentId: string | null = null
      if (incidentTriggered) {
        try {
          const { IncidentManager } = await import('../models/Incidents')
          const incident = IncidentManager.getRandomIncident(tier)
          incidentId = incident?.id || null
          
          console.log(`📋 [UnrestPhaseController] Selected incident for tier ${tier}:`, incident?.name)
        } catch (error) {
          console.error('❌ [UnrestPhaseController] Error loading incident:', error)
        }
        
        // Add resolve-incident step dynamically
        const actor = getKingdomActor()
        if (actor) {
          await actor.updateKingdom((kingdom) => {
            // Set the incident ID
            kingdom.currentIncidentId = incidentId
            
            // Add resolve-incident step if not already present
            const hasResolveStep = kingdom.currentPhaseSteps.some(s => s.id === 'resolve-incident')
            if (!hasResolveStep) {
              kingdom.currentPhaseSteps.push({
                id: 'resolve-incident',
                name: 'Resolve Triggered Incident',
                completed: false
              })
            }
          })
        }
        
        console.log('⚠️ [UnrestPhaseController] Incident triggered, added resolve step')
      } else {
        console.log('✅ [UnrestPhaseController] No incident occurred')
      }
      
      // Complete the incident-check step
      await completePhaseStep('incident-check')
      
      return { 
        incidentTriggered,
        roll: Math.round(roll * 100),
        chance: Math.round(incidentChance * 100),
        incidentId
      }
    },

    /**
     * Resolve a triggered incident
     */
    async resolveIncident(incidentId: string, outcome: 'success' | 'failure') {
      // Don't check for completed steps - allow resolution when incident is triggered
      console.log(`🎯 [UnrestPhaseController] Resolving incident ${incidentId} with outcome: ${outcome}`)

      // Apply incident effects based on outcome
      const actor = getKingdomActor()
      if (actor) {
        await actor.updateKingdom((kingdom) => {
          if (outcome === 'success') {
            // Successful resolution may reduce unrest
            kingdom.unrest = Math.max(0, kingdom.unrest - 1)
            console.log('✅ [UnrestPhaseController] Incident resolved successfully, -1 unrest')
          } else {
            // Failed resolution may increase unrest
            kingdom.unrest = kingdom.unrest + 1
            console.log('❌ [UnrestPhaseController] Incident resolution failed, +1 unrest')
          }
          
          // Clear the current incident
          kingdom.currentIncidentId = null
        })
      }
      
      // Complete the resolve-incident step if it exists
      if (!isStepCompleted('resolve-incident')) {
        await completePhaseStep('resolve-incident')
      }
      
      return { success: true, outcome }
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
      const tier = this.getUnrestTier(unrest)
      return Math.round(this.getIncidentChance(tier) * 20) // Convert to d20 equivalent for display
    },

    /**
     * Get incident severity based on unrest level
     */
    getIncidentSeverity(unrest: number): 'minor' | 'moderate' | 'major' {
      if (unrest <= 4) return 'minor'
      if (unrest <= 8) return 'moderate'
      return 'major'
    },

    /**
     * Get display data for the UI
     */
    getDisplayData() {
      const kingdom = get(kingdomData)
      const unrest = kingdom.unrest || 0
      const threshold = this.getIncidentThreshold(unrest)
      const severity = this.getIncidentSeverity(unrest)
      
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
      }
    }
  }
}
