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
import { actionResolver } from './actions/action-resolver'
import type { PlayerAction } from './actions/action-types'
import type { KingdomData } from '../actors/KingdomActor'
import { TurnPhase } from '../actors/KingdomActor'
import { ActionPhaseSteps } from './shared/PhaseStepConstants'

export async function createActionPhaseController() {
  // Store for action resolutions
  const actionResolutions = new Map<string, any>()
  
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
     * Store action resolution (used by UI to track pending resolutions)
     */
    storeResolution(resolution: any) {
      actionResolutions.set(resolution.actionId, resolution)
    },

    /**
     * Check if action is resolved by a specific player
     */
    isActionResolved(actionId: string, playerId?: string): boolean {
      const resolution = actionResolutions.get(actionId)
      if (!resolution) return false
      
      if (playerId) {
        return resolution.playerId === playerId
      }
      
      return true
    },

    /**
     * Get all player resolutions for an action
     */
    getAllPlayersResolutions(actionId: string) {
      // Return array for compatibility with component
      const resolution = actionResolutions.get(actionId)
      return resolution ? [resolution] : []
    },

    /**
     * Reset action resolution (used by UI for rerolls)
     */
    async resetAction(actionId: string, kingdomData: KingdomData, playerId?: string) {
      actionResolutions.delete(actionId)
      logger.debug(`🔄 [ActionPhaseController] Reset action resolution for ${actionId}`)
    },

    /**
     * Reset controller state (called on component unmount)
     */
    resetState() {
      actionResolutions.clear()
      logger.debug('🔄 [ActionPhaseController] Reset controller state')
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
        const { createGameEffectsService } = await import('../services/GameEffectsService');
        const gameEffects = await createGameEffectsService();
        const game = (window as any).game;
        const user = game?.users?.get(playerId);
        const playerName = user?.name || 'Unknown Player';
        
        await gameEffects.trackPlayerAction(
          playerId,
          playerName,
          actorName || playerName,
          `${actionId}-${outcome}`,
          TurnPhase.ACTIONS
        );
        
        logger.debug(`📝 [ActionPhaseController] Tracked action: ${actorName || playerName} performed ${actionId}-${outcome}`);
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
