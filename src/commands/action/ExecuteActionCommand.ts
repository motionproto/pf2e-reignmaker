/**
 * ExecuteActionCommand - Command to execute player actions with validation and rollback
 * 
 * This command uses the ActionExecutionService to handle player actions
 * with proper resource validation, state mutation, and rollback support.
 */

import { Command } from '../base/Command';
import type { CommandContext, CommandResult } from '../base/Command';
import { actionExecutionService } from '../../services/domain/ActionExecutionService';
import type { PlayerAction } from '../../models/PlayerActions';
import type { KingdomState } from '../../models/KingdomState';

export interface ActionExecutionData {
    action: PlayerAction;
    outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
    rollTotal?: number;
    previousState?: Partial<KingdomState>;
    appliedChanges?: Map<string, any>;
    messages: string[];
}

export class ExecuteActionCommand extends Command<ActionExecutionData> {
    private action: PlayerAction;
    private outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
    private rollTotal?: number;
    private previousState?: Partial<KingdomState>;
    
    constructor(
        action: PlayerAction,
        outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
        rollTotal?: number
    ) {
        super();
        this.action = action;
        this.outcome = outcome;
        this.rollTotal = rollTotal;
    }
    
    getName(): string {
        return `ExecuteAction:${this.action.id}`;
    }
    
    getDescription(): string {
        return `Execute action "${this.action.name}" with ${this.outcome} outcome`;
    }
    
    canExecute(context: CommandContext): boolean {
        // Validate basic command parameters
        const validation = this.validate();
        if (validation) {
            console.warn(`Cannot execute: ${validation}`);
            return false;
        }
        
        // Check if action can be performed based on kingdom state
        const requirements = actionExecutionService.checkActionRequirements(
            this.action,
            context.kingdomState
        );
        
        if (!requirements.met) {
            console.warn(`Action requirements not met: ${requirements.reason}`);
            return false;
        }
        
        // Check phase restriction
        if (context.currentPhase !== 'Phase V: Actions' && context.currentPhase !== 'ACTIONS') {
            console.warn(`Actions can only be executed during the Actions phase`);
            return false;
        }
        
        return true;
    }
    
    execute(context: CommandContext): CommandResult<ActionExecutionData> {
        this.setContext(context);
        
        // Store previous state for rollback
        this.previousState = {
            unrest: context.kingdomState.unrest,
            imprisonedUnrest: context.kingdomState.imprisonedUnrest,
            fame: context.kingdomState.fame,
            resources: new Map(context.kingdomState.resources),
            hexes: [...context.kingdomState.hexes],
            size: context.kingdomState.size,
            armies: [...context.kingdomState.armies],
            settlements: [...context.kingdomState.settlements]
        };
        
        // Execute the action using the service
        const actionOutcome = actionExecutionService.executeAction(
            this.action,
            this.outcome,
            context.kingdomState
        );
        
        // Apply state changes to the kingdom
        const appliedChanges = new Map<string, any>();
        
        for (const [key, value] of actionOutcome.stateChanges) {
            switch (key) {
                case 'unrest':
                    const unrestChange = value as number;
                    context.kingdomState.unrest = Math.max(0, 
                        context.kingdomState.unrest + unrestChange
                    );
                    appliedChanges.set('unrest', unrestChange);
                    break;
                    
                case 'imprisonedUnrest':
                    const imprisonedChange = value as number;
                    context.kingdomState.imprisonedUnrest = Math.max(0,
                        context.kingdomState.imprisonedUnrest + imprisonedChange
                    );
                    appliedChanges.set('imprisonedUnrest', imprisonedChange);
                    break;
                    
                case 'imprisonedUnrestRemoved':
                    let removed = 0;
                    if (value === 'all') {
                        removed = context.kingdomState.imprisonedUnrest;
                        context.kingdomState.imprisonedUnrest = 0;
                    } else if (typeof value === 'number') {
                        removed = Math.min(value, context.kingdomState.imprisonedUnrest);
                        context.kingdomState.imprisonedUnrest -= removed;
                    }
                    appliedChanges.set('imprisonedUnrestRemoved', removed);
                    break;
                    
                case 'fame':
                    const fameChange = value as number;
                    context.kingdomState.fame = Math.max(0, Math.min(3,
                        context.kingdomState.fame + fameChange
                    ));
                    appliedChanges.set('fame', fameChange);
                    break;
                    
                case 'gold':
                case 'food':
                case 'lumber':
                case 'stone':
                case 'ore':
                    const resourceChange = value as number;
                    const current = context.kingdomState.resources.get(key) || 0;
                    context.kingdomState.resources.set(key, Math.max(0, current + resourceChange));
                    appliedChanges.set(key, resourceChange);
                    break;
                    
                case 'resources':
                    // Generic resources affect lumber, stone, and ore
                    const genericChange = value as number;
                    ['lumber', 'stone', 'ore'].forEach(resource => {
                        const curr = context.kingdomState.resources.get(resource) || 0;
                        context.kingdomState.resources.set(resource, 
                            Math.max(0, curr + genericChange)
                        );
                    });
                    appliedChanges.set('resources', genericChange);
                    break;
                    
                case 'meta':
                    // Meta effects are handled by the UI/store layer
                    appliedChanges.set('meta', value);
                    break;
                    
                default:
                    // Other changes may need special handling
                    appliedChanges.set(key, value);
            }
        }
        
        // Deduct action cost from resources
        if (this.action.cost) {
            for (const [resource, cost] of this.action.cost) {
                const current = context.kingdomState.resources.get(resource) || 0;
                context.kingdomState.resources.set(resource, Math.max(0, current - cost));
                const previousCost = appliedChanges.get(resource) || 0;
                appliedChanges.set(resource, previousCost - cost);
            }
        }
        
        return {
            success: true,
            data: {
                action: this.action,
                outcome: this.outcome,
                rollTotal: this.rollTotal,
                previousState: this.previousState,
                appliedChanges,
                messages: actionOutcome.messages
            },
            rollback: () => this.rollback(context)
        };
    }
    
    protected validate(): string | null {
        if (!this.action) {
            return 'Action is required';
        }
        
        if (!this.outcome) {
            return 'Outcome is required';
        }
        
        const validOutcomes = ['criticalSuccess', 'success', 'failure', 'criticalFailure'];
        if (!validOutcomes.includes(this.outcome)) {
            return `Invalid outcome: ${this.outcome}`;
        }
        
        return null;
    }
    
    private rollback(context: CommandContext): void {
        if (!this.previousState) {
            console.warn('No previous state available for rollback');
            return;
        }
        
        // Restore previous state
        if (this.previousState.unrest !== undefined) {
            context.kingdomState.unrest = this.previousState.unrest;
        }
        
        if (this.previousState.imprisonedUnrest !== undefined) {
            context.kingdomState.imprisonedUnrest = this.previousState.imprisonedUnrest;
        }
        
        if (this.previousState.fame !== undefined) {
            context.kingdomState.fame = this.previousState.fame;
        }
        
        if (this.previousState.resources) {
            context.kingdomState.resources = new Map(this.previousState.resources);
        }
        
        if (this.previousState.hexes) {
            context.kingdomState.hexes = [...this.previousState.hexes];
        }
        
        if (this.previousState.size !== undefined) {
            context.kingdomState.size = this.previousState.size;
        }
        
        if (this.previousState.armies) {
            context.kingdomState.armies = [...this.previousState.armies];
        }
        
        if (this.previousState.settlements) {
            context.kingdomState.settlements = [...this.previousState.settlements];
        }
    }
}
