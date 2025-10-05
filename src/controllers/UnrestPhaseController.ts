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
  
  // D100 thresholds - minimum roll needed to trigger incident
  // These match the incident tables in Unrest_incidents.md
  const d100Thresholds = [0, 21, 16, 11]; // Tier 0: N/A, Tier 1: 21+, Tier 2: 16+, Tier 3: 11+
  const incidentChances = [0, 80, 85, 90]; // Tier 0: 0%, Tier 1: 80%, Tier 2: 85%, Tier 3: 90%
  
  const tierNames = ['Stable', 'Discontent', 'Turmoil', 'Rebellion'];
  const tierDescriptions = [
    'No incidents occur at this level',
    'Minor incidents possible (80% chance)',
    'Moderate incidents possible (85% chance)',
    'Major incidents possible (90% chance)'
  ];
  const statusClasses = ['stable', 'discontent', 'unrest', 'rebellion'];
  
  const severity: 'minor' | 'moderate' | 'major' = 
    tier <= 1 ? 'minor' : tier <= 2 ? 'moderate' : 'major';
  
  return {
    tier,
    tierName: tierNames[tier] || 'Stable',
    penalty: tier,
    incidentThreshold: d100Thresholds[tier] || 0,
    incidentChance: incidentChances[tier] || 0,
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
            kingdom.incidentRoll = Math.round(roll * 100);
            kingdom.incidentTriggered = true;
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
          kingdom.incidentRoll = Math.round(roll * 100);
          kingdom.incidentTriggered = false;
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
     * Now uses GameEffectsService for consistent outcome application
     */
    async resolveIncident(
      incidentId: string, 
      outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
      preRolledValues?: Map<number | string, number>
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

        // Get the outcome effects from the incident
        const effectOutcome = incident.effects?.[outcome];
        if (!effectOutcome) {
          throw new Error(`No effects defined for outcome: ${outcome}`);
        }

        // Use GameEffectsService to apply the outcome
        const { createGameEffectsService } = await import('../services/GameEffectsService');
        const gameEffectsService = await createGameEffectsService();
        
        const result = await gameEffectsService.applyOutcome({
          type: 'incident',
          sourceId: incident.id,
          sourceName: getIncidentDisplayName(incident),
          outcome: outcome,
          modifiers: effectOutcome.modifiers || [],
          createOngoingModifier: false, // Handle separately below
          preRolledValues: preRolledValues // Pass through pre-rolled values from UI
        });

        if (!result.success) {
          throw new Error(result.error || 'Failed to apply outcome');
        }

        // Convert applied resources to Map for compatibility
        const appliedChanges = new Map<string, any>();
        for (const { resource, value } of result.applied.resources) {
          appliedChanges.set(resource, value);
        }

        // Handle unresolved modifier creation if applicable
        if (incident.ifUnresolved && (outcome === 'failure' || outcome === 'criticalFailure')) {
          const { createModifierService } = await import('../services/ModifierService');
          const modifierService = await createModifierService();
          
          const kingdom = get(kingdomData);
          const unresolvedModifier = modifierService.createFromUnresolvedEvent(incident as any, kingdom.currentTurn || 1);
          
          if (unresolvedModifier) {
            await actor.updateKingdom(kingdom => {
              if (!kingdom.activeModifiers) kingdom.activeModifiers = [];
              kingdom.activeModifiers.push(unresolvedModifier);
            });
            appliedChanges.set('modifier', unresolvedModifier);
            console.log(`📋 [UnrestPhaseController] Created ongoing modifier: ${unresolvedModifier.name}`);
          }
        }

        // Clear the current incident
        await actor.updateKingdom((kingdom) => {
          kingdom.currentIncidentId = null;
        });

        console.log(`✅ [UnrestPhaseController] Incident resolved: ${effectOutcome.msg}`);
        
        // Complete step 2 (resolve incident)
        await completePhaseStepByIndex(2);
        
        return { 
          success: true, 
          outcome: outcome,
          message: effectOutcome.msg,
          resourceChanges: appliedChanges,
          applied: result.applied  // Pass through shortfall data for UI
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
      const turnManager = TurnManager.getInstance();
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
    },

    /**
     * Check if incident rolling is allowed (business logic)
     */
    canRollForIncident(): { allowed: boolean; reason?: string } {
      const kingdom = get(kingdomData);
      const unrest = kingdom.unrest || 0;
      const tier = this.getUnrestTier(unrest);
      
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

    /**
     * Map detailed outcome to simple outcome for controller
     */
    mapDetailedOutcomeToSimple(
      outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'
    ): 'success' | 'failure' {
      return outcome === 'criticalSuccess' || outcome === 'success' ? 'success' : 'failure';
    },

    /**
     * Get formatted incident display data for UI
     * Uses shared helper to handle missing outcomes (e.g., criticalSuccess = success)
     */
    async getIncidentDisplayData(incident: any) {
      const { buildPossibleOutcomes } = await import('./shared/PossibleOutcomeHelpers');
      const outcomes = buildPossibleOutcomes(incident.effects);
      return { outcomes };
    },

    /**
     * Get resolution display data for UI after skill check
     */
    getResolutionDisplayData(
      incident: any,
      outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
      actorName: string
    ) {
      const DICE_PATTERN = /^-?\d+d\d+([+-]\d+)?$/;
      
      let effect = '';
      let effectOutcome = null;
      
      switch (outcome) {
        case 'criticalSuccess':
          // For incidents, critical success uses success message (fallback pattern)
          effectOutcome = incident.effects?.success;
          effect = effectOutcome?.msg || 'Critical Success! The incident is resolved favorably.';
          break;
        case 'success':
          effectOutcome = incident.effects?.success;
          effect = effectOutcome?.msg || 'Success';
          break;
        case 'failure':
          effectOutcome = incident.effects?.failure;
          effect = effectOutcome?.msg || 'Failure';
          break;
        case 'criticalFailure':
          effectOutcome = incident.effects?.criticalFailure;
          effect = effectOutcome?.msg || 'Critical Failure';
          break;
        default:
          effect = 'Unknown outcome';
      }
      
      // Inline the state changes calculation to avoid import issues
      // (extracted from shared/OutcomeHelpers.ts)
      // IMPORTANT: Preserves dice formulas for dice roller UI
      const modifiers = effectOutcome?.modifiers;
      const stateChanges: Record<string, any> = {};
      
      if (modifiers && modifiers.length > 0) {
        const changes = new Map<string, any>();
        
        for (const modifier of modifiers) {
          // Skip modifiers with resource arrays (they require player choice)
          if (!Array.isArray(modifier.resource)) {
            const value = modifier.value;
            
            // Check if value is a dice formula
            if (typeof value === 'string' && DICE_PATTERN.test(value)) {
              // Preserve dice formulas as strings for dice roller UI
              changes.set(modifier.resource, value);
            } else {
              // Aggregate numeric values
              const currentValue = changes.get(modifier.resource) || 0;
              changes.set(modifier.resource, currentValue + value);
            }
          }
        }
        
        Object.assign(stateChanges, Object.fromEntries(changes));
      }
      
      return {
        effect,
        actorName,
        stateChanges,
        manualEffects: effectOutcome?.manualEffects || []
      };
    }
  };
}
