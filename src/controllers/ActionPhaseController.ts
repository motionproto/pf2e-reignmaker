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
import type { PlayerAction } from './actions/pipeline-types'
import type { KingdomData } from '../actors/KingdomActor'
import { TurnPhase } from '../actors/KingdomActor'
import { ActionPhaseSteps } from './shared/PhaseStepConstants'
import { PipelineIntegrationAdapter, shouldUsePipeline } from '../services/PipelineIntegrationAdapter'
import type { CheckMetadata, ResolutionData as PipelineResolutionData } from '../types/CheckContext'
import { actionAvailabilityService } from '../services/actions/ActionAvailabilityService'

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
      const { actionLoader } = await import('./actions/pipeline-loader');
      const action = actionLoader.getAllActions().find(a => a.id === actionId);
      if (!action) {
        logger.error(`❌ [ActionPhaseController] Action ${actionId} not found`);
        return { success: false, error: 'Action not found' };
      }

      // Check if action should use new pipeline system
      if (shouldUsePipeline(actionId) && PipelineIntegrationAdapter.hasPipeline(actionId)) {
        logger.info(`🚀 [ActionPhaseController] Using pipeline system for ${actionId}`);

        const kingdom = get(kingdomData);

        // Convert legacy ResolutionData to pipeline format
        const pipelineResolutionData: PipelineResolutionData = {
          diceRolls: (resolutionData as any).diceRolls || {},
          choices: (resolutionData as any).choices || {},
          allocations: (resolutionData as any).allocations || {},
          textInputs: (resolutionData as any).textInputs || {},
          compoundData: (resolutionData as any).compoundData || {},
          numericModifiers: resolutionData.numericModifiers || [],
          manualEffects: resolutionData.manualEffects || [],
          customComponentData: resolutionData.customComponentData || null
        };

        // Get stored instance metadata if available
        let metadata: CheckMetadata = {};
        if (instanceId) {
          const storedInstance = kingdom.activeCheckInstances?.find(i => i.instanceId === instanceId);
          if (storedInstance?.metadata) {
            metadata = storedInstance.metadata;
          }
        }

        // Execute via pipeline system
        const result = await PipelineIntegrationAdapter.executePipelineAction(
          actionId,
          outcome,
          kingdom,
          metadata,
          pipelineResolutionData
        );

        return result;
      }

      // Action not migrated to pipeline system - show error
      logger.error(`❌ [ActionPhaseController] Action ${actionId} not found in pipeline system`);
      
      const game = (window as any).game;
      if (game?.ui?.notifications) {
        const actionName = action?.name || actionId;
        game.ui.notifications.error(
          `Action "${actionName}" is not available. Please report this issue.`,
          { permanent: false }
        );
      }
      
      return { 
        success: false, 
        error: `Action ${actionId} not migrated to pipeline system` 
      };
    },

    /**
     * Check if an action can be performed
     */
    canPerformAction(action: PlayerAction, kingdom: KingdomData): boolean {
      return actionAvailabilityService.checkRequirements(action, kingdom).met;
    },

    /**
     * Get action requirements
     */
    getActionRequirements(action: PlayerAction, kingdom: KingdomData, instance?: any) {
      return actionAvailabilityService.checkRequirements(action, kingdom, instance);
    }
  }
}
