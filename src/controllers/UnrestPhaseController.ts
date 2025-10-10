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
        const hasActiveIncident = kingdom.turnState?.unrestPhase?.incidentId !== null && 
                                   kingdom.turnState?.unrestPhase?.incidentId !== undefined;
        
        // Check if phase is already initialized (prevent re-initialization on component remount)
        const hasSteps = kingdom?.currentPhaseSteps && kingdom.currentPhaseSteps.length > 0;
        
        if (hasSteps && kingdom?.currentPhase === 'Unrest') {
          console.log('⏭️ [UnrestPhaseController] Phase already initialized, skipping re-initialization');
          return createPhaseResult(true);
        }
        
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
        
        // Step 1: Check for Incidents - CONDITIONAL
        // Auto-complete if tier 0 (stable kingdom - no incidents possible)
        // Otherwise MANUAL (user must roll)
        const tier = this.getUnrestTier(kingdom.unrest || 0);
        if (tier === 0) {
          await completePhaseStepByIndex(1); // Auto-complete if stable
          console.log('✅ [UnrestPhaseController] Incident check auto-completed (stable kingdom - tier 0)');
        } else {
          console.log('⚠️ [UnrestPhaseController] Incident check requires manual roll (tier', tier, ')');
        }
        
        // Step 2: Resolve Incident - Will be completed by:
        // 1. checkForIncidents() if no incident triggers
        // 2. resolveIncident() after user applies the result
        console.log('⚠️ [UnrestPhaseController] Step 2 (Resolve Incident) awaits completion via incident flow');
        
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
              // SKIP dice formulas - they should only be in modifiers array
              // OutcomeDisplay will merge rolled values via computeDisplayStateChanges
              continue;
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
        modifiers: effectOutcome?.modifiers || [], // Include modifiers for UI (dice rollers, resource selectors)
        manualEffects: effectOutcome?.manualEffects || []
      };
    }
  };
}
