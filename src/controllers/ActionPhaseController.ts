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
  initializePhaseSteps,
  completePhaseStep,
  isStepCompleted
} from './shared/PhaseControllerHelpers'

// Define steps for Action Phase
const ACTION_PHASE_STEPS = [
  { id: 'execute-actions', name: 'Execute Player Actions' },
  { id: 'resolve-results', name: 'Resolve Action Results' }
]

export async function createActionPhaseController() {
  return {
    async startPhase() {
      reportPhaseStart('ActionPhaseController')
      
      try {
        // Initialize phase with predefined steps
        await initializePhaseSteps(ACTION_PHASE_STEPS)
        
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
      if (isStepCompleted('execute-actions')) {
        console.log('🟡 [ActionPhaseController] Actions already executed')
        return createPhaseResult(false, 'Actions already executed this turn')
      }

      try {
        console.log('🎬 [ActionPhaseController] Executing player actions...')
        
        // Player actions are handled through the UI and individual action controllers
        // This step is completed manually when all players have taken their actions
        
        // Complete the execute-actions step
        await completePhaseStep('execute-actions')
        
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
      if (!isStepCompleted('execute-actions')) {
        return createPhaseResult(false, 'Must execute actions before resolving results')
      }

      if (isStepCompleted('resolve-results')) {
        console.log('🟡 [ActionPhaseController] Results already resolved')
        return createPhaseResult(false, 'Results already resolved this turn')
      }

      try {
        console.log('⚖️ [ActionPhaseController] Resolving action results...')
        
        // Action results are resolved through individual action implementations
        // This step is completed manually when all action results have been processed
        
        // Complete the resolve-results step
        await completePhaseStep('resolve-results')
        
        console.log('✅ [ActionPhaseController] Action results resolved')
        return createPhaseResult(true)
      } catch (error) {
        console.error('❌ [ActionPhaseController] Error resolving results:', error)
        return createPhaseResult(false, error instanceof Error ? error.message : 'Unknown error')
      }
    },

    /**
     * Check if a specific player has spent their action
     */
    hasPlayerActed(playerId: string): boolean {
      const kingdom = get(kingdomData)
      const playerAction = kingdom.playerActions[playerId]
      return playerAction?.actionSpent === true
    },

    /**
     * Get all players who have spent their actions
     */
    getPlayersWhoActed(): string[] {
      const kingdom = get(kingdomData)
      return Object.values(kingdom.playerActions)
        .filter(action => action.actionSpent)
        .map(action => action.playerId)
    },

    /**
     * Get all players who haven't spent their actions
     */
    getPlayersWhoHaventActed(): string[] {
      const kingdom = get(kingdomData)
      return Object.values(kingdom.playerActions)
        .filter(action => !action.actionSpent)
        .map(action => action.playerId)
    },

    /**
     * Check if all players have taken their actions
     */
    haveAllPlayersActed(): boolean {
      const kingdom = get(kingdomData)
      const playerActions = Object.values(kingdom.playerActions)
      
      if (playerActions.length === 0) return false
      
      return playerActions.every(action => action.actionSpent)
    },

    /**
     * Get display data for the UI
     */
    getDisplayData() {
      const kingdom = get(kingdomData)
      const playerActions = Object.values(kingdom.playerActions)
      const actedCount = playerActions.filter(action => action.actionSpent).length
      const totalPlayers = playerActions.length
      
      return {
        totalPlayers,
        actedCount,
        remainingPlayers: totalPlayers - actedCount,
        allPlayersActed: actedCount === totalPlayers && totalPlayers > 0,
        playersWhoActed: this.getPlayersWhoActed(),
        playersWhoHaventActed: this.getPlayersWhoHaventActed(),
        actionsExecuted: isStepCompleted('execute-actions'),
        resultsResolved: isStepCompleted('resolve-results')
      }
    },

    /**
     * Reset player actions for the turn (called by TurnManager)
     */
    async resetPlayerActions() {
      const actor = getKingdomActor()
      if (actor) {
        await actor.updateKingdom((kingdom) => {
          Object.values(kingdom.playerActions).forEach(action => {
            action.actionSpent = false
            action.spentInPhase = undefined
          })
        })
        console.log('🔄 [ActionPhaseController] Reset all player actions')
      }
    }
  }
}
