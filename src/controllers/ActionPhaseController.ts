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
        
        logger.debug('✅ [ActionPhaseController] Actions phase auto-completed (players can skip actions)')
        
        reportPhaseComplete('ActionPhaseController')
        return createPhaseResult(true)
      } catch (error) {
        reportPhaseError('ActionPhaseController', error instanceof Error ? error : new Error(String(error)))
        return createPhaseResult(false, error instanceof Error ? error.message : 'Unknown error')
      }
    },

    /**
     * Execute player actions step
     */
    async executeActions() {
      if (await isStepCompletedByIndex(ActionPhaseSteps.EXECUTE_ACTIONS)) {
        logger.debug('🟡 [ActionPhaseController] Actions already executed')
        return createPhaseResult(false, 'Actions already executed this turn')
      }

      try {
        logger.debug('🎬 [ActionPhaseController] Executing player actions...')
        
        // Player actions are handled through the UI and individual action controllers
        // This step is completed manually when all players have taken their actions
        
        // Complete execute actions step (using type-safe constant)
        await completePhaseStepByIndex(ActionPhaseSteps.EXECUTE_ACTIONS)
        
        logger.debug('✅ [ActionPhaseController] Player actions executed')
        return createPhaseResult(true)
      } catch (error) {
        logger.error('❌ [ActionPhaseController] Error executing actions:', error)
        return createPhaseResult(false, error instanceof Error ? error.message : 'Unknown error')
      }
    },


    /**
     * Check if a specific player has spent their action (using actionLog)
     */
    hasPlayerActed(playerId: string): boolean {
      const kingdom = get(kingdomData)
      const actionLog = kingdom.turnState?.actionLog || []
      return actionLog.some((entry: any) => 
        entry.playerId === playerId && 
        (entry.phase === TurnPhase.ACTIONS || entry.phase === TurnPhase.EVENTS)
      )
    },

    /**
     * Get all players who have spent their actions (using actionLog)
     */
    getPlayersWhoActed(): string[] {
      const kingdom = get(kingdomData)
      const actionLog = kingdom.turnState?.actionLog || []
      const actedPlayerIds = new Set<string>()
      actionLog.forEach((entry: any) => {
        if (entry.phase === TurnPhase.ACTIONS || entry.phase === TurnPhase.EVENTS) {
          actedPlayerIds.add(entry.playerId)
        }
      })
      return Array.from(actedPlayerIds)
    },

    /**
     * Get all players who haven't spent their actions (using actionLog)
     */
    getPlayersWhoHaventActed(): string[] {
      const kingdom = get(kingdomData)
      const actionLog = kingdom.turnState?.actionLog || []
      const game = (window as any).game
      
      const allPlayerIds = game?.users?.filter((u: any) => !u.isGM).map((u: any) => u.id) || []
      const actedPlayerIds = new Set<string>()
      actionLog.forEach((entry: any) => {
        if (entry.phase === TurnPhase.ACTIONS || entry.phase === TurnPhase.EVENTS) {
          actedPlayerIds.add(entry.playerId)
        }
      })
      
      return allPlayerIds.filter((id: string) => !actedPlayerIds.has(id))
    },

    /**
     * Check if all players have taken their actions (using actionLog)
     */
    haveAllPlayersActed(): boolean {
      const kingdom = get(kingdomData)
      const actionLog = kingdom.turnState?.actionLog || []
      const game = (window as any).game
      const totalPlayers = game?.users?.filter((u: any) => !u.isGM)?.length || 0
      
      if (totalPlayers === 0) return false
      
      const actedPlayerIds = new Set<string>()
      actionLog.forEach((entry: any) => {
        if (entry.phase === TurnPhase.ACTIONS || entry.phase === TurnPhase.EVENTS) {
          actedPlayerIds.add(entry.playerId)
        }
      })
      
      return actedPlayerIds.size === totalPlayers
    },

    /**
     * Get display data for the UI (using actionLog)
     */
    async getDisplayData() {
      const kingdom = get(kingdomData)
      const game = (window as any).game
      const totalPlayers = game?.users?.filter((u: any) => !u.isGM)?.length || 0
      const actedCount = this.getPlayersWhoActed().length
      
      return {
        totalPlayers,
        actedCount,
        remainingPlayers: totalPlayers - actedCount,
        allPlayersActed: actedCount === totalPlayers && totalPlayers > 0,
        playersWhoActed: this.getPlayersWhoActed(),
        playersWhoHaventActed: this.getPlayersWhoHaventActed(),
        actionsCompleted: await isStepCompletedByIndex(ActionPhaseSteps.EXECUTE_ACTIONS)
      }
    },

    /**
     * Check if an action can be performed
     */
    canPerformAction(action: PlayerAction, kingdomData: KingdomData): boolean {
      const requirements = actionResolver.checkActionRequirements(action, kingdomData)
      return requirements.met
    },

    /**
     * Get action requirements
     */
    getActionRequirements(action: PlayerAction, kingdomData: KingdomData) {
      return actionResolver.checkActionRequirements(action, kingdomData)
    },

    /**
     * Get action outcome modifiers
     */
    getActionModifiers(action: PlayerAction, outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure') {
      return actionResolver.getOutcomeModifiers(action, outcome)
    },

    /**
     * Get action DC based on character level
     */
    getActionDC(characterLevel: number): number {
      return actionResolver.getActionDC(characterLevel)
    },

    /**
     * Get custom resolution component for an action if it requires one
     * Returns component constructor for actions that need custom UI
     */
    async getCustomComponent(
      actionId: string, 
      outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'
    ) {
      // All actions now use the implementations registry
      return getCustomResolutionComponent(actionId, outcome);
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
      playerId?: string
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
      const requirements = this.getActionRequirements(action, kingdom);
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
        
        logger.debug(`📝 [ActionPhaseController] Tracked action: ${actorName || playerName} performed ${actionId}-${outcome}`);
      }
      
      // Check if action has custom resolution logic
      const { hasCustomImplementation, executeCustomResolution } = await import('./actions/implementations');
      const { getActionImplementation } = await import('./actions/implementations');
      const impl = getActionImplementation(actionId);
      
      // Use custom resolution if available and needed for this outcome
      if (impl?.customResolution && impl.needsCustomResolution?.(outcome)) {
        logger.debug(`🎯 [ActionPhaseController] Using custom resolution for ${actionId}-${outcome}`);
        const result = await executeCustomResolution(actionId, resolutionData);
        
        if (!result.success) {
          logger.error(`❌ [ActionPhaseController] Custom resolution failed:`, result.error);
        }
        
        return result;
      }
      
      // Use unified resolution wrapper (consolidates duplicate logic)
      // Note: Actions don't complete phase steps (phase auto-completes on init)
      return await resolvePhaseOutcome(
        actionId,
        'action',
        outcome,
        resolutionData,
        []  // No steps to complete for actions (auto-complete phase)
      );
    }
  }
}
