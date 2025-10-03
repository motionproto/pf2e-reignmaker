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
  completePhaseStepByIndex,
  isStepCompletedByIndex
} from './shared/PhaseControllerHelpers'
import { actionResolver } from './actions/action-resolver'
import type { PlayerAction } from '../models/PlayerActions'
import type { KingdomData } from '../actors/KingdomActor'

export async function createActionPhaseController() {
  // Store for action resolutions
  const actionResolutions = new Map<string, any>()
  
  return {
    async startPhase() {
      reportPhaseStart('ActionPhaseController')
      
      try {
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
      if (isStepCompletedByIndex(0)) {
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
      if (!isStepCompletedByIndex(0)) {
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
     * Check if a specific player has spent their action
     */
    hasPlayerActed(playerId: string): boolean {
      const { getTurnManager } = require('../stores/KingdomStore')
      const manager = getTurnManager()
      if (!manager) return false
      
      const playerAction = manager.getPlayerAction(playerId)
      return playerAction?.actionSpent === true
    },

    /**
     * Get all players who have spent their actions
     */
    getPlayersWhoActed(): string[] {
      const kingdom = get(kingdomData)
      return Object.values(kingdom.playerActions || {})
        .filter((action: any) => action.actionSpent)
        .map((action: any) => action.playerId)
    },

    /**
     * Get all players who haven't spent their actions
     */
    getPlayersWhoHaventActed(): string[] {
      const kingdom = get(kingdomData)
      return Object.values(kingdom.playerActions || {})
        .filter((action: any) => !action.actionSpent)
        .map((action: any) => action.playerId)
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
        actionsCompleted: isStepCompletedByIndex(0)  // Step 0 = perform-actions
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
     * Parse action outcome
     */
    parseActionOutcome(action: PlayerAction, outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure') {
      const parsed = actionResolver.parseActionOutcome(action, outcome)
      const stateChanges = new Map<string, any>()
      
      // Convert parsed effects to state changes Map
      for (const [key, value] of Object.entries(parsed)) {
        if (value !== undefined) {
          stateChanges.set(key, value)
        }
      }
      
      return stateChanges
    },

    /**
     * Get action DC based on character level
     */
    getActionDC(characterLevel: number): number {
      return actionResolver.getActionDC(characterLevel)
    },

    /**
     * Execute an action
     */
    async executeAction(
      action: PlayerAction,
      outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
      kingdomData: KingdomData,
      currentTurn: number,
      rollTotal?: number,
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

        // Execute the action
        const result = actionResolver.executeAction(action, outcome, kingdomData)
        
        // Apply state changes to kingdom
        const actor = getKingdomActor()
        if (actor && result.stateChanges.size > 0) {
          await actor.updateKingdom((kingdom) => {
            for (const [key, value] of result.stateChanges.entries()) {
              if (key === 'unrest') {
                kingdom.unrest = Math.max(0, (kingdom.unrest || 0) + value)
              } else if (['gold', 'food', 'lumber', 'stone', 'ore'].includes(key)) {
                // All resources are stored in the resources object
                const current = kingdom.resources[key] || 0
                const newValue = Math.max(0, current + value)
                kingdom.resources[key] = newValue
              } else if (key === 'fame') {
                kingdom.fame = Math.max(0, (kingdom.fame || 0) + value)
              } else if (key === 'imprisonedUnrest') {
                kingdom.imprisonedUnrest = Math.max(0, (kingdom.imprisonedUnrest || 0) + value)
              }
              // Add other resource types as needed
            }
          })
        }

        return { success: true, stateChanges: result.stateChanges, messages: result.messages }
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
