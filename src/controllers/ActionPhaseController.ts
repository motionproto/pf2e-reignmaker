/**
 * ActionPhaseController - Stateless orchestrator for action phase operations
 * 
 * This controller coordinates between services, commands, and stores
 * to handle all action phase business logic without maintaining its own state.
 * All state is managed in the gameState store.
 */

import { get } from 'svelte/store';
import { actionExecutionService } from '../services/domain/ActionExecutionService';
import { ExecuteActionCommand } from '../commands/impl/ExecuteActionCommand';
import { commandExecutor } from '../commands/base/CommandExecutor';
import type { CommandContext } from '../commands/base/Command';
import type { PlayerAction } from '../models/PlayerActions';
import type { KingdomState } from '../models/KingdomState';
import { stateChangeFormatter } from '../services/formatters/StateChangeFormatter';
import { 
    gameState, 
    resolveAction as storeResolveAction,
    unresolveAction,
    isActionResolved,
    getActionResolution,
    getAllResolvedActions,
    clearResolvedActions,
    getAllPlayerActions,
    type ActionResolution 
} from '../stores/gameState';

// Re-export ActionResolution type from gameState
export type { ActionResolution } from '../stores/gameState';

export class ActionPhaseController {
    // Remove internal state - this is now a stateless controller
    private readonly maxActions: number;
    
    constructor(maxActions: number = 4) {
        this.maxActions = maxActions;
    }
    
    /**
     * Check if an action can be performed based on kingdom state
     */
    canPerformAction(action: PlayerAction, kingdomState: KingdomState): boolean {
        const requirements = actionExecutionService.checkActionRequirements(
            action,
            kingdomState
        );
        return requirements.met;
    }
    
    /**
     * Get detailed requirements check for an action
     */
    getActionRequirements(action: PlayerAction, kingdomState: KingdomState) {
        return actionExecutionService.checkActionRequirements(action, kingdomState);
    }
    
    /**
     * Get the number of actions used (from gameState)
     */
    getActionsUsed(): number {
        const playerActions = getAllPlayerActions();
        return playerActions.filter(pa => pa.actionSpent).length;
    }
    
    /**
     * Execute an action using the command pattern
     */
    async executeAction(
        action: PlayerAction,
        outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
        kingdomState: KingdomState,
        currentTurn: number,
        rollTotal?: number,
        actorName?: string,
        skillName?: string
    ): Promise<{
        success: boolean;
        resolution?: ActionResolution;
        error?: string;
    }> {
        // Check if action has already been resolved (from store)
        if (isActionResolved(action.id)) {
            return {
                success: false,
                error: 'Action has already been resolved'
            };
        }
        
        // Check if we've reached the action limit (from store)
        const actionsUsed = this.getActionsUsed();
        if (actionsUsed >= this.maxActions) {
            return {
                success: false,
                error: `Maximum actions (${this.maxActions}) already taken`
            };
        }
        
        // Create command context
        const context: CommandContext = {
            kingdomState,
            currentTurn,
            currentPhase: 'Phase V: Actions',
            actorId: actorName
        };
        
        // Create and execute the command
        const command = new ExecuteActionCommand(action, outcome, rollTotal);
        const result = await commandExecutor.execute(command, context);
        
        if (result.success) {
            // Store the resolution in gameState
            storeResolveAction(
                action.id,
                outcome,
                actorName || 'The Kingdom',
                skillName,
                result.data?.appliedChanges || new Map()
            );
            
            // Return the resolution
            const resolution = getActionResolution(action.id);
            if (resolution) {
                return {
                    success: true,
                    resolution
                };
            }
        }
        
        return {
            success: false,
            error: result.error
        };
    }
    
    /**
     * Parse action outcome from description (for backwards compatibility)
     * Note: This should ideally be data-driven rather than text parsing
     */
    parseActionOutcome(action: PlayerAction, outcome: string): Map<string, any> {
        const parsedEffects = actionExecutionService.parseActionOutcome(
            action, 
            outcome as any
        );
        
        const changes = new Map<string, any>();
        for (const [key, value] of Object.entries(parsedEffects)) {
            if (value !== undefined && value !== null) {
                changes.set(key, value);
            }
        }
        
        return changes;
    }
    
    /**
     * Resolve an action and update state in the store
     */
    resolveAction(
        action: PlayerAction,
        outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
        actorName: string,
        skillName?: string
    ): ActionResolution | null {
        // Check if already resolved (from store)
        if (isActionResolved(action.id)) {
            return null;
        }
        
        // Check action limit (from store)
        const actionsUsed = this.getActionsUsed();
        if (actionsUsed >= this.maxActions) {
            return null;
        }
        
        // Parse the outcome to get state changes
        const parsedEffects = actionExecutionService.parseActionOutcome(action, outcome);
        
        // Convert to Map
        const stateChanges = new Map<string, any>();
        if (parsedEffects) {
            Object.entries(parsedEffects).forEach(([key, value]) => {
                stateChanges.set(key, value);
            });
        }
        
        // Store the resolution in gameState
        storeResolveAction(
            action.id,
            outcome,
            actorName,
            skillName,
            stateChanges
        );
        
        return getActionResolution(action.id) || null;
    }
    
    /**
     * Reset an action (undo resolution)
     */
    async resetAction(
        actionId: string,
        kingdomState?: KingdomState
    ): Promise<boolean> {
        if (!isActionResolved(actionId)) {
            return false;
        }
        
        // Attempt to undo the last command if it matches this action
        const canUndo = commandExecutor.canUndo();
        if (canUndo) {
            const result = await commandExecutor.undo();
            if (result.success) {
                unresolveAction(actionId);
                return true;
            }
        }
        
        // If undo isn't available, just remove from resolved
        // (This won't revert state changes but allows re-rolling)
        unresolveAction(actionId);
        return true;
    }
    
    /**
     * Check if an action has been resolved (delegates to store)
     */
    isActionResolved(actionId: string): boolean {
        return isActionResolved(actionId);
    }
    
    /**
     * Get resolution details for an action (delegates to store)
     */
    getActionResolution(actionId: string): ActionResolution | undefined {
        return getActionResolution(actionId);
    }
    
    /**
     * Get all resolved actions (delegates to store)
     */
    getAllResolvedActions(): Map<string, ActionResolution> {
        return getAllResolvedActions();
    }
    
    /**
     * Check if more actions can be taken
     */
    canPerformMoreActions(): boolean {
        const actionsUsed = this.getActionsUsed();
        return actionsUsed < this.maxActions;
    }
    
    /**
     * Get the number of actions remaining
     */
    getActionsRemaining(): number {
        const actionsUsed = this.getActionsUsed();
        return Math.max(0, this.maxActions - actionsUsed);
    }
    
    /**
     * Get available actions for a category
     */
    getAvailableActions(
        category: string,
        allActions: PlayerAction[],
        kingdomState: KingdomState
    ): PlayerAction[] {
        return actionExecutionService.getAvailableActions(
            category,
            kingdomState,
            allActions
        );
    }
    
    /**
     * Get DC for action resolution based on character level
     */
    getActionDC(characterLevel: number): number {
        return actionExecutionService.getActionDC(characterLevel);
    }
    
    /**
     * Reset controller state for next phase
     */
    resetState(): void {
        // Clear resolved actions in the store
        clearResolvedActions();
        // Clear command history for actions
        commandExecutor.clearHistory();
    }
    
    /**
     * Get current state (reads from store, not internal state)
     */
    getState() {
        return {
            resolvedActions: getAllResolvedActions(),
            actionsUsed: this.getActionsUsed(),
            maxActions: this.maxActions
        };
    }
    
    /**
     * Get max actions
     */
    getMaxActions(): number {
        return this.maxActions;
    }
}

// Export factory function
export function createActionPhaseController(maxActions: number = 4): ActionPhaseController {
    return new ActionPhaseController(maxActions);
}
