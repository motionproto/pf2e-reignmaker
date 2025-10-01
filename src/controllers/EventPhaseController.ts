/**
 * EventPhaseController - Orchestrates event phase operations
 * 
 * NEW: Uses simplified step array system with "event-check" and "resolve-event" steps.
 * Changed "stability roll" terminology to clearer "event check".
 */

import { EventResolutionService } from '../services/domain/EventResolutionService';
import { ApplyEventOutcomeCommand } from '../commands/event/ApplyEventOutcomeCommand';
import { commandExecutor } from '../commands/base/CommandExecutor';
import type { CommandContext } from '../commands/base/Command';
import type { EventData } from '../services/domain/events/EventService';
import type { KingdomState } from '../models/KingdomState';
import { stateChangeFormatter } from '../services/formatters/StateChangeFormatter';
import { 
  reportPhaseStart, 
  reportPhaseComplete, 
  reportPhaseError, 
  createPhaseResult,
  initializePhaseSteps,
  completePhaseStep,
  isStepCompleted
} from './shared/PhaseControllerHelpers';

export interface EventPhaseState {
    currentEvent: EventData | null;
    eventCheckRoll: number;
    eventDC: number;
    resolutionOutcome: 'success' | 'failure' | 'criticalSuccess' | 'criticalFailure' | null;
    appliedEffects: Map<string, any>;
    unresolvedEvent: EventData | null;
}

export interface IncidentResolution {
    incident: EventData;
    outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
    skillUsed?: string;
    actorName?: string;
    effects: Map<string, any>;
    formattedEffects?: any[];
    message: string;
}

// Define steps for Events Phase
const EVENTS_PHASE_STEPS = [
  { id: 'event-check', name: 'Perform Event Check' }
  // 'resolve-event' step is added dynamically if event is triggered
];

export async function createEventPhaseController(eventService: any) {
    const eventResolutionService = new EventResolutionService(eventService);
    
    const createInitialState = (): EventPhaseState => ({
        currentEvent: null,
        eventCheckRoll: 0,
        eventDC: 16,
        resolutionOutcome: null,
        appliedEffects: new Map(),
        unresolvedEvent: null
    });
    
    let state = createInitialState();
    
    return {
        async startPhase() {
            reportPhaseStart('EventPhaseController');
            
            try {
                // Initialize phase with predefined steps
                await initializePhaseSteps(EVENTS_PHASE_STEPS);
                
                // Initialize the phase
                state = createInitialState();
                
                reportPhaseComplete('EventPhaseController');
                return createPhaseResult(true);
            } catch (error) {
                reportPhaseError('EventPhaseController', error instanceof Error ? error : new Error(String(error)));
                return createPhaseResult(false, error instanceof Error ? error.message : 'Unknown error');
            }
        },

        /**
         * NEW: Perform event check and add resolve step if triggered
         */
        async performEventCheck(currentDC: number): Promise<{
            triggered: boolean;
            event: EventData | null;
            roll: number;
            newDC: number;
        }> {
            // Check if already completed
            if (isStepCompleted('event-check')) {
                console.log('🟡 [EventPhaseController] Event check already completed');
                return {
                    triggered: !!state.currentEvent,
                    event: state.currentEvent,
                    roll: state.eventCheckRoll,
                    newDC: state.eventDC
                };
            }

            const result = eventResolutionService.performStabilityCheck(currentDC);
            
            state.eventCheckRoll = result.roll;
            state.eventDC = result.newDC;
            
            if (result.event) {
                state.currentEvent = result.event;
                
                // Add resolve-event step dynamically
                const { getKingdomActor } = await import('../stores/KingdomStore');
                const actor = getKingdomActor();
                if (actor) {
                    await actor.updateKingdom((kingdom) => {
                        // Add resolve-event step if not already present
                        const hasResolveStep = kingdom.currentPhaseSteps.some(s => s.id === 'resolve-event');
                        if (!hasResolveStep) {
                            kingdom.currentPhaseSteps.push({
                                id: 'resolve-event',
                                name: 'Resolve Triggered Event',
                                completed: false
                            });
                        }
                    });
                }
                
                console.log('🎲 [EventPhaseController] Event triggered, added resolve step');
            }
            
            // Complete the event-check step
            await completePhaseStep('event-check');
            
            return {
                triggered: !!result.event,
                event: result.event || null,
                roll: result.roll,
                newDC: result.newDC
            };
        },
        
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
                eventResolutionService
            );
            
            const result = await commandExecutor.execute(command, context);
            
            if (result.success) {
                state.resolutionOutcome = outcome;
                state.appliedEffects = result.data?.appliedChanges || new Map();
                
                // Check for unresolved event
                if ((outcome === 'failure' || outcome === 'criticalFailure') && event.ifUnresolved) {
                    state.unresolvedEvent = event;
                }
                
                // Format effects for display
                const formattedEffects = stateChangeFormatter.formatStateChanges(
                    state.appliedEffects
                );
                
                // Complete the resolve-event step if it exists
                if (isStepCompleted('event-check') && !isStepCompleted('resolve-event')) {
                    await completePhaseStep('resolve-event');
                }
                
                return {
                    success: true,
                    effects: state.appliedEffects,
                    formattedEffects,
                    unresolvedEvent: state.unresolvedEvent
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
        },
        
        /**
         * Check if event can be resolved with a specific skill
         */
        canResolveWithSkill(event: EventData, skill: string): boolean {
            return eventResolutionService.canResolveWithSkill(event, skill);
        },
        
        /**
         * Get the DC for resolving an event
         */
        getEventResolutionDC(event: EventData): number {
            return eventResolutionService.getResolutionDC(event);
        },
        
        /**
         * Determine outcome based on roll result
         */
        determineOutcome(roll: number, modifier: number, dc: number): 
            'criticalSuccess' | 'success' | 'failure' | 'criticalFailure' {
            return eventResolutionService.determineOutcome(roll, modifier, dc);
        },
        
        /**
         * Reset controller state for next phase
         */
        resetState(): void {
            state = createInitialState();
        },
        
        /**
         * Get current controller state
         */
        getState(): EventPhaseState {
            return { ...state };
        },
        
        /**
         * Check if there are any unresolved events
         */
        hasUnresolvedEvents(): boolean {
            return state.unresolvedEvent !== null;
        },
        
        /**
         * Get unresolved event for processing in upkeep phase
         */
        getUnresolvedEvent(): EventData | null {
            return state.unresolvedEvent;
        },
        
        /**
         * Clear unresolved event after processing
         */
        clearUnresolvedEvent(): void {
            state.unresolvedEvent = null;
        }
    };
}
