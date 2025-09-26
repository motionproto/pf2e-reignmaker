/**
 * EventPhaseController - Orchestrates event phase operations
 * 
 * This controller coordinates between services, commands, and stores
 * to handle all event phase business logic without UI concerns.
 */

import { EventResolutionService } from '../services/domain/EventResolutionService';
import { ApplyEventOutcomeCommand } from '../commands/impl/ApplyEventOutcomeCommand';
import { commandExecutor } from '../commands/base/CommandExecutor';
import type { CommandContext } from '../commands/base/Command';
import type { EventData } from '../services/EventService';
import type { KingdomState } from '../models/KingdomState';
import { stateChangeFormatter } from '../services/formatters/StateChangeFormatter';

export interface EventPhaseState {
    currentEvent: EventData | null;
    stabilityRoll: number;
    eventDC: number;
    resolutionOutcome: 'success' | 'failure' | 'criticalSuccess' | 'criticalFailure' | null;
    appliedEffects: Map<string, any>;
    unresolvedEvent: EventData | null;
}

export class EventPhaseController {
    private eventResolutionService: EventResolutionService;
    private state: EventPhaseState;
    
    constructor(eventService: any) {
        this.eventResolutionService = new EventResolutionService(eventService);
        this.state = this.createInitialState();
    }
    
    private createInitialState(): EventPhaseState {
        return {
            currentEvent: null,
            stabilityRoll: 0,
            eventDC: 16,
            resolutionOutcome: null,
            appliedEffects: new Map(),
            unresolvedEvent: null
        };
    }
    
    /**
     * Perform stability check for event occurrence
     */
    async performStabilityCheck(currentDC: number): Promise<{
        triggered: boolean;
        event: EventData | null;
        roll: number;
        newDC: number;
    }> {
        const result = this.eventResolutionService.performStabilityCheck(currentDC);
        
        this.state.stabilityRoll = result.roll;
        this.state.eventDC = result.newDC;
        
        if (result.event) {
            this.state.currentEvent = result.event;
        }
        
        return {
            triggered: !!result.event,
            event: result.event || null,
            roll: result.roll,
            newDC: result.newDC
        };
    }
    
    /**
     * Apply event outcome using command pattern
     */
    async applyEventOutcome(
        event: EventData,
        outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
        kingdomState: KingdomState,
        currentTurn: number
    ): Promise<{
        success: boolean;
        effects: Map<string, any>;
        formattedEffects: any[];
        unresolvedEvent: EventData | null;
        error?: string;
    }> {
        const context: CommandContext = {
            kingdomState,
            currentTurn,
            currentPhase: 'Phase IV: Events'
        };
        
        const command = new ApplyEventOutcomeCommand(
            event,
            outcome,
            this.eventResolutionService
        );
        
        const result = await commandExecutor.execute(command, context);
        
        if (result.success) {
            this.state.resolutionOutcome = outcome;
            this.state.appliedEffects = result.data?.appliedChanges || new Map();
            
            // Check for unresolved event
            if ((outcome === 'failure' || outcome === 'criticalFailure') && event.ifUnresolved) {
                this.state.unresolvedEvent = event;
            }
            
            // Format effects for display
            const formattedEffects = stateChangeFormatter.formatStateChanges(
                this.state.appliedEffects
            );
            
            return {
                success: true,
                effects: this.state.appliedEffects,
                formattedEffects,
                unresolvedEvent: this.state.unresolvedEvent
            };
        } else {
            return {
                success: false,
                effects: new Map(),
                formattedEffects: [],
                unresolvedEvent: null,
                error: result.error
            };
        }
    }
    
    /**
     * Check if event can be resolved with a specific skill
     */
    canResolveWithSkill(event: EventData, skill: string): boolean {
        return this.eventResolutionService.canResolveWithSkill(event, skill);
    }
    
    /**
     * Get the DC for resolving an event
     */
    getEventResolutionDC(event: EventData): number {
        return this.eventResolutionService.getResolutionDC(event);
    }
    
    /**
     * Determine outcome based on roll result
     */
    determineOutcome(roll: number, modifier: number, dc: number): 
        'criticalSuccess' | 'success' | 'failure' | 'criticalFailure' {
        return this.eventResolutionService.determineOutcome(roll, modifier, dc);
    }
    
    /**
     * Reset controller state for next phase
     */
    resetState(): void {
        this.state = this.createInitialState();
    }
    
    /**
     * Get current controller state
     */
    getState(): EventPhaseState {
        return { ...this.state };
    }
    
    /**
     * Check if there are any unresolved events
     */
    hasUnresolvedEvents(): boolean {
        return this.state.unresolvedEvent !== null;
    }
    
    /**
     * Get unresolved event for processing in upkeep phase
     */
    getUnresolvedEvent(): EventData | null {
        return this.state.unresolvedEvent;
    }
    
    /**
     * Clear unresolved event after processing
     */
    clearUnresolvedEvent(): void {
        this.state.unresolvedEvent = null;
    }
}

// Export factory function for creating controllers
export function createEventPhaseController(eventService: any): EventPhaseController {
    return new EventPhaseController(eventService);
}
