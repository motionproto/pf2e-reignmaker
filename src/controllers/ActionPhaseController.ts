/**
 * ActionPhaseController - Handles player action execution and resolution
 * 
 * NEW: Uses simplified step array system with execute-actions and resolve-results steps.
 * Players execute their chosen actions and results are resolved.
 */

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
  isStepCompletedByIndex
} from './shared/PhaseControllerHelpers'
import { actionResolver } from './actions/action-resolver'
import type { PlayerAction } from './actions/action-types'
import type { KingdomData } from '../actors/KingdomActor'
import { TurnPhase } from '../actors/KingdomActor'

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
        await completePhaseStepByIndex(0);
        
        console.log('✅ [ActionPhaseController] Actions phase auto-completed (players can skip actions)')
        
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
      if (await isStepCompletedByIndex(0)) {
        console.log('🟡 [ActionPhaseController] Actions already executed')
        return createPhaseResult(false, 'Actions already executed this turn')
      }

      try {
        console.log('🎬 [ActionPhaseController] Executing player actions...')
        
        // Player actions are handled through the UI and individual action controllers
        // This step is completed manually when all players have taken their actions
        
        // Complete step 0 (execute-actions)
        await completePhaseStepByIndex(0)
        
        console.log('✅ [ActionPhaseController] Player actions executed')
        return createPhaseResult(true)
      } catch (error) {
        console.error('❌ [ActionPhaseController] Error executing actions:', error)
        return createPhaseResult(false, error instanceof Error ? error.message : 'Unknown error')
      }
    },

    /**
     * Resolve action results step
     */
    async resolveResults() {
      if (!(await isStepCompletedByIndex(0))) {
        return createPhaseResult(false, 'Must execute actions before resolving results')
      }

      if (isStepCompletedByIndex(1)) {
        console.log('🟡 [ActionPhaseController] Results already resolved')
        return createPhaseResult(false, 'Results already resolved this turn')
      }

      try {
        console.log('⚖️ [ActionPhaseController] Resolving action results...')
        
        // Action results are resolved through individual action implementations
        // This step is completed manually when all action results have been processed
        
        // Complete step 1 (resolve-results)
        await completePhaseStepByIndex(1)
        
        console.log('✅ [ActionPhaseController] Action results resolved')
        return createPhaseResult(true)
      } catch (error) {
        console.error('❌ [ActionPhaseController] Error resolving results:', error)
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
    getDisplayData() {
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
        actionsCompleted: isStepCompletedByIndex(0)
      }
    },

    /**
     * Reset player actions - no longer needed, handled by turnState reset
     */
    async resetPlayerActions() {
      // Player actions are now automatically reset via turnState.actionLog reset
      // (handled by TurnManager.endTurn() which resets entire turnState)
      console.log('🔄 [ActionPhaseController] Player actions reset via turnState')
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
     * NEW ARCHITECTURE: Resolve action with ResolutionData
     * Receives pre-computed resolution data from UI (all dice rolled, choices made)
     */
    async resolveAction(
      actionId: string,
      outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
      resolutionData: import('../types/events').ResolutionData,
      actorName?: string,
      skillName?: string,
      playerId?: string
    ) {
      console.log(`🎯 [ActionPhaseController] Resolving action ${actionId} with outcome: ${outcome}`);
      console.log(`📋 [ActionPhaseController] ResolutionData:`, resolutionData);
      
      try {
        // NEW ARCHITECTURE: ResolutionData already contains final numeric values
        // No need to filter, transform, or roll - just apply!
        
        const { actionLoader } = await import('./actions/action-loader');
        const action = actionLoader.getAllActions().find(a => a.id === actionId);
        if (!action) {
          console.error(`❌ [ActionPhaseController] Action ${actionId} not found`);
          return { success: false, error: 'Action not found' };
        }
        
        // Check requirements
        const kingdom = get(kingdomData);
        const requirements = this.getActionRequirements(action, kingdom);
        if (!requirements.met) {
          return { success: false, error: requirements.reason || 'Action requirements not met' };
        }
        
        // Apply outcome using shared service
        const { applyResolvedOutcome } = await import('../services/resolution');
        const result = await applyResolvedOutcome(resolutionData, outcome);
        
        // Track player action
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
          
          console.log(`📝 [ActionPhaseController] Tracked action: ${actorName || playerName} performed ${actionId}-${outcome}`);
        }
        
        console.log(`✅ [ActionPhaseController] Action resolved successfully`);
        
        // Return the result directly (it's already ApplyOutcomeResult with proper structure)
        return result;
      } catch (error) {
        console.error('❌ [ActionPhaseController] Error resolving action:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    },
    
    /**
     * OLD ARCHITECTURE: Execute an action with optional pre-rolled dice values
     * DEPRECATED: Use resolveAction() instead for new code
     */
    async executeAction(
      action: PlayerAction,
      outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
      kingdomData: KingdomData,
      currentTurn: number,
      preRolledValues?: Map<number | string, number>,
      actorName?: string,
      skillName?: string,
      playerId?: string
    ) {
      try {
        // Check requirements first
        const requirements = this.getActionRequirements(action, kingdomData)
        if (!requirements.met) {
          return { success: false, error: requirements.reason || 'Action requirements not met' }
        }

        // Execute the action using ActionResolver (which now uses GameEffectsService)
        const result = await actionResolver.executeAction(action, outcome, kingdomData, preRolledValues)
        
        // Track player action if successful and we have player info
        if (result.success && playerId) {
          try {
            const { createGameEffectsService } = await import('../services/GameEffectsService')
            const gameEffects = await createGameEffectsService()
            
            // Get player name from game
            const game = (window as any).game
            const user = game?.users?.get(playerId)
            const playerName = user?.name || 'Unknown Player'
            
            await gameEffects.trackPlayerAction(
              playerId,
              playerName,
              actorName || playerName,
              `${action.id}-${outcome}`,
              TurnPhase.ACTIONS
            )
            
            console.log(`📝 [ActionPhaseController] Tracked action: ${actorName || playerName} performed ${action.id}-${outcome}`)
          } catch (trackingError) {
            console.error('[ActionPhaseController] Failed to track action:', trackingError)
            // Don't fail the whole action if tracking fails
          }
        }
        
        return result
      } catch (error) {
        console.error('Error executing action:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    },

    /**
     * Store action resolution
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
     * Reset action resolution
     */
    async resetAction(actionId: string, kingdomData: KingdomData, playerId?: string) {
      actionResolutions.delete(actionId)
      console.log(`🔄 [ActionPhaseController] Reset action resolution for ${actionId}`)
    },

    /**
     * Reset controller state
     */
    resetState() {
      actionResolutions.clear()
      console.log('🔄 [ActionPhaseController] Reset controller state')
    }
  }
}
