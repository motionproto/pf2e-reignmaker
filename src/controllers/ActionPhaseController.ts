/**
 * ActionPhaseController - Orchestrates action phase operations
 * 
 * This controller coordinates between services, commands, and stores
 * to handle all action phase business logic without UI concerns.
 */

import { actionExecutionService } from '../services/domain/ActionExecutionService';
import { ExecuteActionCommand } from '../commands/impl/ExecuteActionCommand';
import { commandExecutor } from '../commands/base/CommandExecutor';
import type { CommandContext } from '../commands/base/Command';
import type { PlayerAction } from '../models/PlayerActions';
import type { KingdomState } from '../models/KingdomState';
import { stateChangeFormatter } from '../services/formatters/StateChangeFormatter';

export interface ActionResolution {
    outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
    actorName: string;
    skillName?: string;
    stateChanges: Map<string, any>;
    formattedChanges?: any[];
}

export interface ActionPhaseState {
    resolvedActions: Map<string, ActionResolution>;
    actionsUsed: number;
    maxActions: number;
    expandedActionId: string | null;
}

export class ActionPhaseController {
    private state: ActionPhaseState;
    
    constructor(maxActions: number = 4) {
        this.state = this.createInitialState(maxActions);
    }
    
    private createInitialState(maxActions: number): ActionPhaseState {
        return {
            resolvedActions: new Map(),
            actionsUsed: 0,
            maxActions,
            expandedActionId: null
        };
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
        // Check if action has already been resolved
        if (this.state.resolvedActions.has(action.id)) {
            return {
                success: false,
                error: 'Action has already been resolved'
            };
        }
        
        // Check if we've reached the action limit
        if (this.state.actionsUsed >= this.state.maxActions) {
            return {
                success: false,
                error: `Maximum actions (${this.state.maxActions}) already taken`
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
            // Format the changes for display
            const formattedChanges = stateChangeFormatter.formatStateChanges(
                result.data?.appliedChanges || new Map()
            );
            
            // Create resolution record
            const resolution: ActionResolution = {
                outcome,
                actorName: actorName || 'The Kingdom',
                skillName,
                stateChanges: result.data?.appliedChanges || new Map(),
                formattedChanges
            };
            
            // Update state
            this.state.resolvedActions.set(action.id, resolution);
            this.state.actionsUsed++;
            
            return {
                success: true,
                resolution
            };
        } else {
            return {
                success: false,
                error: result.error
            };
        }
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
     * Resolve an action and update state
     */
    resolveAction(
        action: PlayerAction,
        outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
        actorName: string,
        skillName?: string
    ): ActionResolution | null {
        // Check if already resolved
        if (this.state.resolvedActions.has(action.id)) {
            return null;
        }
        
        // Check action limit
        if (this.state.actionsUsed >= this.state.maxActions) {
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
        
        // Create resolution
        const resolution: ActionResolution = {
            outcome,
            actorName,
            skillName,
            stateChanges,
            formattedChanges: stateChangeFormatter.formatStateChanges(stateChanges)
        };
        
        // Update state
        this.state.resolvedActions.set(action.id, resolution);
        this.state.actionsUsed++;
        
        return resolution;
    }
    
    /**
     * Reset an action (undo resolution)
     */
    async resetAction(
        actionId: string,
        kingdomState?: KingdomState
    ): Promise<boolean> {
        if (!this.state.resolvedActions.has(actionId)) {
            return false;
        }
        
        // Attempt to undo the last command if it matches this action
        const canUndo = commandExecutor.canUndo();
        if (canUndo) {
            const result = await commandExecutor.undo();
            if (result.success) {
                this.state.resolvedActions.delete(actionId);
                this.state.actionsUsed = Math.max(0, this.state.actionsUsed - 1);
                return true;
            }
        }
        
        // If undo isn't available, just remove from resolved
        // (This won't revert state changes but allows re-rolling)
        this.state.resolvedActions.delete(actionId);
        this.state.actionsUsed = Math.max(0, this.state.actionsUsed - 1);
        return true;
    }
    
    /**
     * Check if an action has been resolved
     */
    isActionResolved(actionId: string): boolean {
        return this.state.resolvedActions.has(actionId);
    }
    
    /**
     * Get resolution details for an action
     */
    getActionResolution(actionId: string): ActionResolution | undefined {
        return this.state.resolvedActions.get(actionId);
    }
    
    /**
     * Get all resolved actions
     */
    getAllResolvedActions(): Map<string, ActionResolution> {
        return new Map(this.state.resolvedActions);
    }
    
    /**
     * Check if more actions can be taken
     */
    canPerformMoreActions(): boolean {
        return this.state.actionsUsed < this.state.maxActions;
    }
    
    /**
     * Get the number of actions remaining
     */
    getActionsRemaining(): number {
        return Math.max(0, this.state.maxActions - this.state.actionsUsed);
    }
    
    /**
     * Toggle action expansion (UI state)
     */
    toggleActionExpanded(actionId: string): void {
        if (this.state.expandedActionId === actionId) {
            this.state.expandedActionId = null;
        } else {
            this.state.expandedActionId = actionId;
        }
    }
    
    /**
     * Check if an action is expanded
     */
    isActionExpanded(actionId: string): boolean {
        return this.state.expandedActionId === actionId;
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
        this.state = this.createInitialState(this.state.maxActions);
        // Clear command history for actions
        commandExecutor.clearHistory();
    }
    
    /**
     * Get current controller state
     */
    getState(): ActionPhaseState {
        return {
            ...this.state,
            resolvedActions: new Map(this.state.resolvedActions)
        };
    }
    
    /**
     * Get actions used count
     */
    getActionsUsed(): number {
        return this.state.actionsUsed;
    }
    
    /**
     * Get max actions
     */
    getMaxActions(): number {
        return this.state.maxActions;
    }
}

// Export factory function
export function createActionPhaseController(maxActions: number = 4): ActionPhaseController {
    return new ActionPhaseController(maxActions);
}
