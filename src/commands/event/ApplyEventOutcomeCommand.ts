/**
 * ApplyEventOutcomeCommand - Command to apply event outcomes to kingdom state
 * 
 * This command uses the EventResolutionService to handle event outcomes
 * with proper validation, state mutation, and rollback support.
 */

import { Command } from '../base/Command';
import type { CommandContext, CommandResult } from '../base/Command';
import { EventResolutionService } from '../../services/domain/EventResolutionService';
import type { EventData } from '../../services/domain/events/EventService';
import type { KingdomState } from '../../models/KingdomState';

export interface EventOutcomeData {
    event: EventData;
    outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
    previousState?: Partial<KingdomState>;
    appliedChanges?: Map<string, any>;
}

export class ApplyEventOutcomeCommand extends Command<EventOutcomeData> {
    private event: EventData;
    private outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
    private eventService: EventResolutionService;
    private previousState?: Partial<KingdomState>;
    
    constructor(
        event: EventData,
        outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
        eventService: EventResolutionService
    ) {
        super();
        this.event = event;
        this.outcome = outcome;
        this.eventService = eventService;
    }
    
    getName(): string {
        return `ApplyEventOutcome:${this.event.id}`;
    }
    
    getDescription(): string {
        return `Apply ${this.outcome} outcome for event "${this.event.name}"`;
    }
    
    canExecute(context: CommandContext): boolean {
        // Check if the event can be applied in the current state
        const validation = this.validate();
        if (validation) {
            console.warn(`Cannot execute: ${validation}`);
            return false;
        }
        
        // Check if kingdom state allows event application
        // (e.g., not in a locked phase)
        if (context.currentPhase === 'LOCKED') {
            return false;
        }
        
        return true;
    }
    
    execute(context: CommandContext): CommandResult<EventOutcomeData> {
        this.setContext(context);
        
        // Store previous state for rollback
        this.previousState = {
            unrest: context.kingdomState.unrest,
            fame: context.kingdomState.fame,
            resources: new Map(context.kingdomState.resources),
            modifiers: [...context.kingdomState.modifiers],
            currentEvent: context.kingdomState.currentEvent
        };
        
        // Apply the event outcome using the service
        const application = this.eventService.applyEventOutcome(
            this.event,
            this.outcome
        );
        
        // Apply resource changes to the kingdom state
        const appliedChanges = new Map<string, any>();
        
        for (const [resource, change] of application.resourceChanges) {
            if (resource === 'unrest') {
                const newUnrest = Math.max(0, context.kingdomState.unrest + change);
                context.kingdomState.unrest = newUnrest;
                appliedChanges.set('unrest', change);
            } else if (resource === 'fame') {
                const newFame = Math.max(0, Math.min(3, context.kingdomState.fame + change));
                context.kingdomState.fame = newFame;
                appliedChanges.set('fame', change);
            } else {
                const currentAmount = context.kingdomState.resources.get(resource) || 0;
                const newAmount = Math.max(0, currentAmount + change);
                context.kingdomState.resources.set(resource, newAmount);
                appliedChanges.set(resource, change);
            }
        }
        
        // Add unresolved modifier if applicable
        if (application.unresolvedModifier) {
            context.kingdomState.modifiers.push(application.unresolvedModifier);
            appliedChanges.set('modifier', application.unresolvedModifier);
        }
        
        // Clear current event if resolved
        if (this.outcome === 'success' || this.outcome === 'criticalSuccess') {
            context.kingdomState.currentEvent = null;
        }
        
        return {
            success: true,
            data: {
                event: this.event,
                outcome: this.outcome,
                previousState: this.previousState,
                appliedChanges
            },
            rollback: () => this.rollback(context)
        };
    }
    
    protected validate(): string | null {
        if (!this.event) {
            return 'Event is required';
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
        
        if (this.previousState.fame !== undefined) {
            context.kingdomState.fame = this.previousState.fame;
        }
        
        if (this.previousState.resources) {
            context.kingdomState.resources = new Map(this.previousState.resources);
        }
        
        if (this.previousState.modifiers) {
            context.kingdomState.modifiers = [...this.previousState.modifiers];
        }
        
        if (this.previousState.currentEvent !== undefined) {
            context.kingdomState.currentEvent = this.previousState.currentEvent;
        }
    }
}
