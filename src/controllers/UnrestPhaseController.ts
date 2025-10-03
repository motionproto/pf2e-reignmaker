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

/**
 * Unrest tier information for display
 */
export interface UnrestTierInfo {
  tier: number;
  tierName: string;
  penalty: number;
  incidentThreshold: number;
  incidentChance: number;
  incidentSeverity: 'minor' | 'moderate' | 'major';
  description: string;
  statusClass: string;
}

/**
 * Static helper: Get comprehensive unrest tier information for UI display
 * This is the single source of truth for unrest tier calculations
 */
export function getUnrestTierInfo(unrest: number): UnrestTierInfo {
  const tier = Math.min(3, Math.floor(unrest / 3));
  
  // Tier-based thresholds
  const thresholds = [0, 3, 6, 10, 15];
  const threshold = unrest <= 2 ? 0 : 
                    unrest <= 4 ? 3 : 
                    unrest <= 6 ? 6 : 
                    unrest <= 8 ? 10 : 15;
  
  const tierNames = ['Stable', 'Discontent', 'Unrest', 'Rebellion'];
  const tierDescriptions = [
    'No incidents occur at this level',
    'Minor incidents possible',
    'Moderate incidents possible',
    'Major incidents possible'
  ];
  const statusClasses = ['stable', 'discontent', 'unrest', 'rebellion'];
  
  const severity: 'minor' | 'moderate' | 'major' = 
    tier <= 1 ? 'minor' : tier <= 2 ? 'moderate' : 'major';
  
  return {
    tier,
    tierName: tierNames[tier] || 'Stable',
    penalty: tier,
    incidentThreshold: threshold,
    incidentChance: threshold > 0 ? Math.round((threshold / 20) * 100) : 0,
    incidentSeverity: severity,
    description: tierDescriptions[tier] || 'No incidents occur at this level',
    statusClass: statusClasses[tier] || 'stable'
  };
}

/**
 * Static helper: Get unrest status text based on level
 */
export function getUnrestStatus(unrest: number): string {
  if (unrest === 0) return 'stable';
  if (unrest <= 2) return 'calm';
  if (unrest <= 4) return 'tense';
  if (unrest <= 6) return 'troubled';
  if (unrest <= 8) return 'volatile';
  return 'critical';
}

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
          
          // Set the incident (DON'T manipulate currentPhaseSteps directly)
          await actor.updateKingdom((kingdom) => {
            kingdom.currentIncidentId = incidentId;
          });
          
          console.log('⚠️ [UnrestPhaseController] Incident triggered, step 2 will require manual resolution');
        } catch (error) {
          console.error('❌ [UnrestPhaseController] Error loading incident:', error);
        }
      } else {
        console.log('✅ [UnrestPhaseController] No incident occurred');
        
        // Ensure no incident is set (DON'T manipulate currentPhaseSteps directly)
        await actor.updateKingdom((kingdom) => {
          kingdom.currentIncidentId = null;
        });
        
        // Auto-complete step 2 since no incident (using PhaseHandler)
        await completePhaseStepByIndex(2);
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
     * Now uses IncidentResolutionService for proper effect parsing
     */
    async resolveIncident(
      incidentId: string, 
      outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'
    ) {
      const actor = getKingdomActor();
      if (!actor) {
        console.error('❌ [UnrestPhaseController] No kingdom actor available');
        return { success: false, error: 'No kingdom actor' };
      }

      console.log(`🎯 [UnrestPhaseController] Resolving incident ${incidentId} with outcome: ${outcome}`);

      try {
        // Load incident data
        const { incidentLoader } = await import('./incidents/incident-loader');
        const incident = incidentLoader.getIncidentById(incidentId);
        
        if (!incident) {
          console.error(`❌ [UnrestPhaseController] Incident ${incidentId} not found`);
          return { success: false, error: 'Incident not found' };
        }

        // Use incident resolution service to parse effects
        const { incidentResolutionService } = await import('./incidents/incident-resolution');
        const result = incidentResolutionService.applyIncidentOutcome(incident, outcome);

        // Apply resource changes to kingdom
        await actor.updateKingdom((kingdom) => {
          // Apply resource changes from incident effects
          for (const [resource, change] of result.resourceChanges.entries()) {
            if (resource === 'unrest') {
              kingdom.unrest = Math.max(0, (kingdom.unrest || 0) + change);
            } else if (resource === 'fame') {
              kingdom.fame = Math.max(0, Math.min(3, (kingdom.fame || 0) + change));
            } else if (kingdom.resources[resource] !== undefined) {
              kingdom.resources[resource] = Math.max(0, (kingdom.resources[resource] || 0) + change);
            }
          }

          // Add unresolved modifier if incident failed
          if (result.unresolvedModifier) {
            if (!kingdom.activeModifiers) kingdom.activeModifiers = [];
            kingdom.activeModifiers.push(result.unresolvedModifier);
            console.log('📋 [UnrestPhaseController] Added unresolved incident modifier');
          }
          
          // Clear the current incident
          kingdom.currentIncidentId = null;
        });

        console.log(`✅ [UnrestPhaseController] Incident resolved: ${result.message}`);
        
        // Complete step 2 (resolve incident)
        await completePhaseStepByIndex(2);
        
        return { 
          success: true, 
          outcome: result.outcome,
          message: result.message,
          resourceChanges: result.resourceChanges
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
     * Check if phase is complete using new index-based system
     */
    async isPhaseComplete(): Promise<boolean> {
      const { TurnManager } = await import('../models/turn-manager');
      const turnManager = new TurnManager();
      return await turnManager.isCurrentPhaseComplete();
    },

    /**
     * Get unrest tier based on current unrest level
     * Uses the correct formula: Math.min(3, Math.floor(unrest / 3))
     */
    getUnrestTier(unrest: number): number {
      return Math.min(3, Math.floor(unrest / 3));
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
     * Get incident severity based on tier (uses correct tier calculation)
     */
    getIncidentSeverity(unrest: number): 'minor' | 'moderate' | 'major' {
      const tier = this.getUnrestTier(unrest);
      if (tier <= 1) return 'minor';
      if (tier <= 2) return 'moderate';
      return 'major';
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
    }
  };
}
