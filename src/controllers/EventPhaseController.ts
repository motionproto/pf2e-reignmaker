/**
 * EventPhaseController - Orchestrates event phase operations
 * 
 * NEW: Uses simplified step array system with "event-check" and "resolve-event" steps.
 * Changed "stability roll" terminology to clearer "event check".
 */

import { getEventDisplayName } from '../types/event-helpers';
import { EventResolver } from './events/event-resolver';
import { eventService } from './events/event-loader';
import type { EventData } from './events/event-loader';
import type { KingdomData } from '../actors/KingdomActor';
import { updateKingdom } from '../stores/KingdomStore';
import { createModifierService } from '../services/ModifierService';
import { createGameEffectsService } from '../services/GameEffectsService';
import type { ActiveModifier } from '../models/Modifiers';
import { 
  reportPhaseStart, 
  reportPhaseComplete, 
  reportPhaseError, 
  createPhaseResult,
  initializePhaseSteps,
  completePhaseStepByIndex,
  isStepCompletedByIndex
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

// Define steps for Events Phase - 3-step structure for clarity
const EVENTS_PHASE_STEPS = [
  { name: 'Event Roll' },        // Step 0 - MANUAL (user rolls)
  { name: 'Resolve Event' },     // Step 1 - CONDITIONAL (auto if no event, manual if event)
  { name: 'Apply Modifiers' }    // Step 2 - CONDITIONAL (auto-complete based on outcome)
];

export async function createEventPhaseController(_eventService?: any) {
    const eventResolver = new EventResolver(eventService);
    const modifierService = await createModifierService();
    const gameEffectsService = await createGameEffectsService();
    
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
                // Initialize phase with 3-step structure
                await initializePhaseSteps(EVENTS_PHASE_STEPS);
                
                // Initialize the phase state
                state = createInitialState();
                
                // Step 0: Event Roll - MANUAL (never auto-complete)
                // Step 1: Resolve Event - CONDITIONAL (auto if no event, manual if event exists)
                // Step 2: Apply Modifiers - CONDITIONAL (auto-complete when steps 0 & 1 complete)
                
                // Check if there's a pre-existing event that needs resolution
                const { getKingdomActor } = await import('../stores/KingdomStore');
                const actor = getKingdomActor();
                const kingdom = actor?.getKingdom();
                const hasActiveEvent = kingdom?.currentEventId !== null;
                
                if (hasActiveEvent) {
                    console.log('⚠️ [EventPhaseController] Pre-existing event requires resolution');
                } else {
                    console.log('🟡 [EventPhaseController] Event roll required (step 0)');
                }
                
                // Don't auto-complete any steps at initialization
                // All steps start as incomplete and are completed by performEventCheck() or applyEventOutcome()
                
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
            // Check if step 0 (event-check) is already completed
            if (await isStepCompletedByIndex(0)) {
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
                event = eventService.getRandomEvent();
                newDC = 15;
                
                if (event) {
                    state.currentEvent = event;
                    console.log(`✨ [EventPhaseController] Event triggered: "${getEventDisplayName(event)}" (${event.id})`);
                    
                    // Store event in kingdom state
                    const { getKingdomActor } = await import('../stores/KingdomStore');
                    const actor = getKingdomActor();
                    if (actor) {
                        await actor.updateKingdom((kingdom) => {
                            kingdom.currentEventId = event!.id;
                            kingdom.eventDC = newDC;
                            kingdom.eventStabilityRoll = roll;
                            kingdom.eventRollDC = currentDC;
                            kingdom.eventTriggered = true;
                        });
                    }
                    
                    // Step 1 (Resolve Event) remains INCOMPLETE - player must resolve
                    // Step 2 (Apply Modifiers) remains INCOMPLETE - will complete with step 1
                    console.log('⚠️ [EventPhaseController] Event triggered - step 1 requires resolution');
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
                        kingdom.eventStabilityRoll = roll;
                        kingdom.eventRollDC = currentDC;
                        kingdom.eventTriggered = false;
                    });
                }
                
                // Auto-complete steps 1 & 2 since no event to resolve or modifiers to apply
                await completePhaseStepByIndex(1);
                await completePhaseStepByIndex(2);
                console.log('✅ [EventPhaseController] No event - steps 1 & 2 auto-completed');
            }
            
            state.eventDC = newDC;
            
            // Complete step 0 (event-roll) - always completes after roll
            await completePhaseStepByIndex(0);
            
            return {
                triggered,
                event,
                roll,
                newDC
            };
        },
        
        /**
         * Apply event outcome using GameEffectsService (New Architecture)
         * Includes verification and force-completion logic to ensure phase completes properly
         */
        async applyEventOutcome(
            event: EventData,
            outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
            kingdomData: KingdomData,
            currentTurn: number
        ): Promise<{
            success: boolean;
            effects: Map<string, any>;
            unresolvedEvent: EventData | null;
            error?: string;
        }> {
            console.log(`🎯 [EventPhaseController] Applying event outcome: ${getEventDisplayName(event)} -> ${outcome}`);
            
            try {
                // Get the outcome effects from the event
                const effectOutcome = event.effects?.[outcome];
                if (!effectOutcome) {
                    throw new Error(`No effects defined for outcome: ${outcome}`);
                }
                
                // Use GameEffectsService to apply the outcome
                const result = await gameEffectsService.applyOutcome({
                    type: 'event',
                    sourceId: event.id,
                    sourceName: getEventDisplayName(event),
                    outcome: outcome,
                    modifiers: effectOutcome.modifiers || [],
                    createOngoingModifier: false // Handle separately below
                });
                
                if (!result.success) {
                    throw new Error(result.error || 'Failed to apply outcome');
                }
                
                // Convert applied resources to Map for compatibility
                const appliedChanges = new Map<string, any>();
                for (const { resource, value } of result.applied.resources) {
                    appliedChanges.set(resource, value);
                }
                
                // Handle unresolved modifier creation if applicable
                let unresolvedModifier: ActiveModifier | undefined;
                if (event.ifUnresolved && (outcome === 'failure' || outcome === 'criticalFailure')) {
                    unresolvedModifier = modifierService.createFromUnresolvedEvent(event as any, currentTurn);
                    if (unresolvedModifier) {
                        await updateKingdom(kingdom => {
                            if (!kingdom.activeModifiers) kingdom.activeModifiers = [];
                            kingdom.activeModifiers.push(unresolvedModifier!);
                        });
                        appliedChanges.set('modifier', unresolvedModifier);
                        console.log(`📋 [EventPhaseController] Created ongoing modifier: ${unresolvedModifier.name}`);
                    }
                }
                
                // Clear current event
                await updateKingdom(kingdom => {
                    kingdom.currentEventId = null;
                });
                
                state.resolutionOutcome = outcome;
                state.appliedEffects = appliedChanges;
                
                // Handle ongoing events list
                if (event.ifUnresolved && (outcome === 'failure' || outcome === 'criticalFailure')) {
                    await this.addToOngoingEvents(event.id);
                    state.unresolvedEvent = event;
                } else {
                    if (effectOutcome?.msg && effectOutcome.msg.includes('<EVENT ENDS>')) {
                        await this.removeFromOngoingEvents(event.id);
                    }
                }
                
                // Complete steps 1 & 2 (resolve-event & apply-modifiers)
                // Using singleton TurnManager ensures consistent state without timing workarounds
                console.log('[EventPhaseController] Marking steps 1 & 2 as complete...');
                await completePhaseStepByIndex(1);
                await completePhaseStepByIndex(2);
                
                console.log('✅ [EventPhaseController] Event resolution & modifier application completed');
                
                return {
                    success: true,
                    effects: state.appliedEffects,
                    unresolvedEvent: state.unresolvedEvent
                };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.error('❌ [EventPhaseController] Failed to apply event outcome:', error);
                
                return {
                    success: false,
                    effects: new Map(),
                    unresolvedEvent: null,
                    error: errorMessage
                };
            }
        },

        /**
         * Handle event ignored (applies failure outcome and creates modifier if needed)
         */
        async ignoreEvent(event: EventData, currentTurn: number): Promise<{
            success: boolean;
            effects: Map<string, any>;
            modifier?: ActiveModifier;
        }> {
            console.log(`🚫 [EventPhaseController] Ignoring event: ${getEventDisplayName(event)}`);
            
            // Apply failure effects
            const failureEffects = eventResolver.calculateResourceChanges(event, 'failure');
            
            // Create ongoing modifier if event has ifUnresolved configuration
            let modifier: ActiveModifier | undefined;
            if (event.ifUnresolved) {
                // Event already has tier at the top level, use it directly
                modifier = modifierService.createFromUnresolvedEvent(event as any, currentTurn);
                if (modifier) {
                    await updateKingdom(kingdom => {
                        if (!kingdom.activeModifiers) kingdom.activeModifiers = [];
                        kingdom.activeModifiers.push(modifier!);
                    });
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
            if (!kingdom || !kingdom.ongoingEvents || kingdom.ongoingEvents.length === 0) {
                return [];
            }
            
            const events: EventData[] = [];
            for (const eventId of kingdom.ongoingEvents) {
                const event = eventService.getEventById(eventId);
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
            return eventResolver.canResolveWithSkill(event, skill);
        },
        
        /**
         * Get the DC for resolving an event
         */
        getEventResolutionDC(kingdomLevel: number): number {
            return eventResolver.getResolutionDC(kingdomLevel);
        },
        
        /**
         * Determine outcome based on roll result
         */
        determineOutcome(roll: number, modifier: number, dc: number): 
            'criticalSuccess' | 'success' | 'failure' | 'criticalFailure' {
            return eventResolver.determineOutcome(roll, modifier, dc);
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
