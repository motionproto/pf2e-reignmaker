/**
 * ActionPhaseController - Handles player action execution and resolution
 * 
 * NEW: Uses simplified step array system with execute-actions and resolve-results steps.
 * Players execute their chosen actions and results are resolved.
 */

import { logger } from '../utils/Logger';

import { getKingdomActor } from '../stores/KingdomStore'
import { get } from 'svelte/store'
import { kingdomData } from '../stores/KingdomStore'
import ArrestDissidentsResolution from '../view/kingdom/components/OutcomeDisplay/components/ArrestDissidentsResolution.svelte'
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
import { actionResolver } from './actions/action-resolver'
import type { PlayerAction } from './actions/action-types'
import type { KingdomData } from '../actors/KingdomActor'
import { TurnPhase } from '../actors/KingdomActor'
import { ActionPhaseSteps } from './shared/PhaseStepConstants'
import { getCustomResolutionComponent } from './actions/implementations'

export async function createActionPhaseController() {
  return {
    async startPhase() {
      reportPhaseStart('ActionPhaseController')
      
      try {
        // Phase guard - prevents initialization when not in Actions phase or already initialized
        const guardResult = checkPhaseGuard(TurnPhase.ACTIONS, 'ActionPhaseController');
        if (guardResult) return guardResult;
        
        // Initialize steps using shared helpers - auto-complete on init as specified  
        const steps = [
          { name: 'Actions' }  // Single step that auto-completes
        ];
        
        await initializePhaseSteps(steps);
        
        // Auto-complete immediately since players can choose to skip actions
        await completePhaseStepByIndex(ActionPhaseSteps.EXECUTE_ACTIONS);

        return createPhaseResult(true);
      } catch (error) {
        reportPhaseError('ActionPhaseController', error instanceof Error ? error : new Error(String(error)));
        return createPhaseResult(false, error instanceof Error ? error.message : 'Unknown error');
      }
    },

    /**
     * Resolve action with ResolutionData
     * Receives pre-computed resolution data from UI (all dice rolled, choices made)
     */
    async resolveAction(
      actionId: string,
      outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
      resolutionData: import('../types/modifiers').ResolutionData,
      actorName?: string,
      skillName?: string,
      playerId?: string,
      instanceId?: string
    ) {
      // Validate action exists
      const { actionLoader } = await import('./actions/action-loader');
      const action = actionLoader.getAllActions().find(a => a.id === actionId);
      if (!action) {
        logger.error(`❌ [ActionPhaseController] Action ${actionId} not found`);
        return { success: false, error: 'Action not found' };
      }
      
      // Check requirements
      const kingdom = get(kingdomData);
      
      // Get the stored instance for context-aware requirement checks (e.g., gold fallback detection)
      let storedInstance;
      if (instanceId) {
        storedInstance = kingdom.activeCheckInstances?.find(i => i.instanceId === instanceId);
      }
      
      const requirements = this.getActionRequirements(action, kingdom, storedInstance);
      if (!requirements.met) {
        return { success: false, error: requirements.reason || 'Action requirements not met' };
      }
      
      // Track player action (action-specific logic before resolution)
      if (playerId) {
        const { createGameCommandsService } = await import('../services/GameCommandsService');
        const gameCommands = await createGameCommandsService();
        const game = (window as any).game;
        const user = game?.users?.get(playerId);
        const playerName = user?.name || 'Unknown Player';
        
        await gameCommands.trackPlayerAction(
          playerId,
          playerName,
          actorName || playerName,
          `${actionId}-${outcome}`,
          TurnPhase.ACTIONS
        );
      }
      
      // Check if action has custom resolution logic
      const { hasCustomImplementation, executeCustomResolution } = await import('./actions/implementations');
      const { getActionImplementation } = await import('./actions/implementations');
      const impl = getActionImplementation(actionId);
      
      // Use custom resolution if available and needed for this outcome
      if (impl?.customResolution && impl.needsCustomResolution?.(outcome)) {
        console.log('🎯 [ActionPhaseController] Using custom resolution for:', actionId);
        console.log('🎯 [ActionPhaseController] instanceId provided:', instanceId);
        
        // Get the stored instance from kingdom data to access its metadata
        // Use instanceId if provided, otherwise fall back to checkId + status lookup
        let storedInstance;
        if (instanceId) {
          storedInstance = kingdom.activeCheckInstances?.find(i => i.instanceId === instanceId);
          console.log('🎯 [ActionPhaseController] Looking up by instanceId:', instanceId);
        } else {
          storedInstance = kingdom.activeCheckInstances?.find(i => 
            i.checkId === actionId && i.status === 'resolved'
          );
          console.log('🎯 [ActionPhaseController] Looking up by checkId + status');
        }
        console.log('🎯 [ActionPhaseController] Stored instance:', storedInstance);
        console.log('🎯 [ActionPhaseController] Stored instance metadata:', storedInstance?.metadata);
        
        // Create instance metadata for custom resolution, merging stored metadata with runtime data
        const instance = {
          metadata: {
            ...storedInstance?.metadata,  // Include stored metadata (e.g., factionId, factionName)
            ...resolutionData.customComponentData,  // CRITICAL: Include dialog selections (structureId, settlementId) and user choices (cost)
            outcome,
            actorName,
            skillName,
            playerId
          }
        };
        console.log('🎯 [ActionPhaseController] Merged instance metadata:', instance.metadata);
        console.log('🎯 [ActionPhaseController] customComponentData:', resolutionData.customComponentData);
        
        const result = await executeCustomResolution(actionId, resolutionData, instance);
        
        if (!result.success) {
          logger.error(`❌ [ActionPhaseController] Custom resolution failed:`, result.error);
        }
        
        return result;
      }
      
      // FIXED: Use ActionResolver.executeAction() instead of resolvePhaseOutcome()
      // This ensures game commands from action JSON are executed (e.g., reduceImprisoned)
      
      // Convert ResolutionData.numericModifiers back to preRolledValues Map
      // The UI has already rolled all dice and stored results in numericModifiers
      const preRolledValues = new Map<number | string, number>();
      
      // Get modifiers from action to match indices
      const actionModifiers = this.getActionModifiers(action, outcome);
      
      // Map rolled values back to their modifier indices
      if (resolutionData.numericModifiers && actionModifiers) {
        resolutionData.numericModifiers.forEach(rolled => {
          // Find matching modifier by resource
          const modifierIndex = actionModifiers.findIndex(m => m.resource === rolled.resource);
          if (modifierIndex !== -1) {
            preRolledValues.set(modifierIndex, rolled.value);
          }
        });
      }
      
      // Execute action via ActionResolver (handles BOTH modifiers AND game commands)
      const result = await actionResolver.executeAction(
        action,
        outcome,
        kingdom,
        preRolledValues
      );
      
      return result;
    },

    /**
     * Check if an action can be performed (delegates to actionResolver)
     */
    canPerformAction(action: PlayerAction, kingdom: KingdomData): boolean {
      return actionResolver.checkActionRequirements(action, kingdom).met;
    },

    /**
     * Get action requirements (delegates to actionResolver)
     */
    getActionRequirements(action: PlayerAction, kingdom: KingdomData, instance?: any) {
      return actionResolver.checkActionRequirements(action, kingdom, instance);
    },

    /**
     * Get modifiers for an action outcome (delegates to actionResolver)
     */
    getActionModifiers(action: PlayerAction, outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure') {
      return actionResolver.getOutcomeModifiers(action, outcome);
    },

    /**
     * Get DC for an action based on character level (delegates to actionResolver)
     */
    getActionDC(characterLevel: number): number {
      return actionResolver.getActionDC(characterLevel);
    }
  }
}
