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
import { EventProvider } from './events/EventProvider';
import { modifierService } from '../services/domain/modifiers/ModifierService';
import type { KingdomModifier } from '../models/Modifiers';
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
        eventDC: 15, // Start at 15 per rules
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
         * Perform event check with DC management
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

            // Roll d20 for event check
            const roll = Math.floor(Math.random() * 20) + 1;
            const triggered = roll >= currentDC;
            
            console.log(`🎲 [EventPhaseController] Event check: rolled ${roll} vs DC ${currentDC} - ${triggered ? 'TRIGGERED' : 'NO EVENT'}`);
            
            state.eventCheckRoll = roll;
            
            let newDC: number;
            let event: EventData | null = null;
            
            if (triggered) {
                // Event triggered - get random event and reset DC to 15
                event = await EventProvider.getRandomEvent();
                newDC = 15;
                
                if (event) {
                    state.currentEvent = event;
                    console.log(`✨ [EventPhaseController] Event triggered: "${event.name}" (${event.id})`);
                    
                    // Add resolve-event step dynamically
                    const { getKingdomActor } = await import('../stores/KingdomStore');
                    const actor = getKingdomActor();
                    if (actor) {
                        await actor.updateKingdom((kingdom) => {
                            // Store event in kingdom state
                            kingdom.currentEventId = event.id;
                            kingdom.eventDC = newDC;
                            
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
                }
            } else {
                // No event - reduce DC by 5 (minimum 6)
                newDC = Math.max(6, currentDC - 5);
                console.log(`📉 [EventPhaseController] No event, DC reduced from ${currentDC} to ${newDC}`);
                
                // Update kingdom state with new DC
                const { getKingdomActor } = await import('../stores/KingdomStore');
                const actor = getKingdomActor();
                if (actor) {
                    await actor.updateKingdom((kingdom) => {
                        kingdom.eventDC = newDC;
                        kingdom.currentEventId = null;
                    });
                }
            }
            
            state.eventDC = newDC;
            
            // Complete the event-check step
            await completePhaseStep('event-check');
            
            return {
                triggered,
                event,
                roll,
                newDC
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
            console.log(`🎯 [EventPhaseController] Applying event outcome: ${event.name} -> ${outcome}`);
            
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
                
                // Handle event resolution and modifiers
                await this.handleEventResolution(event, outcome, currentTurn);
                
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
         * Handle event ignored (applies failure outcome and creates modifier if needed)
         */
        async ignoreEvent(event: EventData, currentTurn: number): Promise<{
            success: boolean;
            effects: Map<string, any>;
            modifier?: KingdomModifier;
        }> {
            console.log(`🚫 [EventPhaseController] Ignoring event: ${event.name}`);
            
            // Apply failure effects
            const failureEffects = eventResolutionService.calculateResourceChanges(event, 'failure');
            
            // Create ongoing modifier if event has ifUnresolved configuration
            let modifier: KingdomModifier | undefined;
            if (event.ifUnresolved) {
                modifier = await this.createEventModifier(event, currentTurn);
                if (modifier) {
                    await modifierService.addModifier(modifier);
                    await this.addToOngoingEvents(event.id);
                    console.log(`📋 [EventPhaseController] Created ongoing modifier for ignored event: ${modifier.name}`);
                }
            }
            
            // Clear current event
            state.currentEvent = null;
            
            // Update kingdom state
            const { getKingdomActor } = await import('../stores/KingdomStore');
            const actor = getKingdomActor();
            if (actor) {
                await actor.updateKingdom((kingdom) => {
                    kingdom.currentEventId = null;
                });
            }
            
            return {
                success: true,
                effects: failureEffects,
                modifier
            };
        },

        /**
         * Handle event resolution logic (check for continuous events, create modifiers)
         */
        async handleEventResolution(
            event: EventData,
            outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
            currentTurn: number
        ): Promise<void> {
            // Check if this is a continuous event that should become a modifier
            if (event.ifUnresolved && (outcome === 'failure' || outcome === 'criticalFailure')) {
                const modifier = await this.createEventModifier(event, currentTurn);
                if (modifier) {
                    await modifierService.addModifier(modifier);
                    await this.addToOngoingEvents(event.id);
                    state.unresolvedEvent = event;
                    console.log(`📋 [EventPhaseController] Event failed - created ongoing modifier: ${modifier.name}`);
                }
            } else {
                // Check if continuous event ends based on outcome message
                const effectOutcome = event.effects?.[outcome];
                if (effectOutcome?.msg && effectOutcome.msg.includes('<EVENT ENDS>')) {
                    await this.removeFromOngoingEvents(event.id);
                    console.log(`✅ [EventPhaseController] Continuous event ended: ${event.name}`);
                }
            }
            
            // Clear current event from state
            state.currentEvent = null;
            const { getKingdomActor } = await import('../stores/KingdomStore');
            const actor = getKingdomActor();
            if (actor) {
                await actor.updateKingdom((kingdom) => {
                    kingdom.currentEventId = null;
                });
            }
        },

        /**
         * Create a modifier from an unresolved event
         */
        async createEventModifier(event: EventData, currentTurn: number): Promise<KingdomModifier | null> {
            if (!event.ifUnresolved) return null;
            
            const template = event.ifUnresolved.continuous?.modifierTemplate;
            if (!template) {
                console.warn(`[EventPhaseController] Event ${event.id} has ifUnresolved but no modifier template`);
                return null;
            }
            
            const modifier: KingdomModifier = {
                id: `event-${event.id}-${currentTurn}-${Date.now()}`,
                name: template.name || event.name,
                description: template.description || event.description,
                source: {
                    type: 'event',
                    id: event.id,
                    name: event.name
                },
                startTurn: currentTurn,
                duration: template.duration || 'until-resolved',
                priority: template.priority || 100,
                effects: template.effects || {},
                visible: true,
                severity: template.severity || 'dangerous',
                icon: template.icon
            };
            
            // Add resolution information if present
            if (template.resolution) {
                modifier.resolution = {
                    skills: template.resolution.skills || [],
                    dc: template.resolution.dc || 15
                };
            }
            
            return modifier;
        },

        /**
         * Add event to ongoing events list
         */
        async addToOngoingEvents(eventId: string): Promise<void> {
            const { getKingdomActor } = await import('../stores/KingdomStore');
            const actor = getKingdomActor();
            if (actor) {
                await actor.updateKingdom((kingdom) => {
                    if (!kingdom.ongoingEvents) {
                        kingdom.ongoingEvents = [];
                    }
                    if (!kingdom.ongoingEvents.includes(eventId)) {
                        kingdom.ongoingEvents.push(eventId);
                    }
                });
            }
        },

        /**
         * Remove event from ongoing events list
         */
        async removeFromOngoingEvents(eventId: string): Promise<void> {
            const { getKingdomActor } = await import('../stores/KingdomStore');
            const actor = getKingdomActor();
            if (actor) {
                await actor.updateKingdom((kingdom) => {
                    if (kingdom.ongoingEvents) {
                        kingdom.ongoingEvents = kingdom.ongoingEvents.filter(id => id !== eventId);
                    }
                });
            }
        },

        /**
         * Get ongoing events for display
         */
        async getOngoingEvents(): Promise<EventData[]> {
            const { getKingdomActor } = await import('../stores/KingdomStore');
            const actor = getKingdomActor();
            if (!actor) return [];
            
            const kingdom = actor.getKingdom();
            if (!kingdom.ongoingEvents || kingdom.ongoingEvents.length === 0) {
                return [];
            }
            
            const events: EventData[] = [];
            for (const eventId of kingdom.ongoingEvents) {
                const event = await EventProvider.getEventById(eventId);
                if (event) {
                    events.push(event);
                }
            }
            
            return events;
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
