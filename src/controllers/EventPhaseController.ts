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
                // Check if phase is already initialized (prevent re-initialization on component remount)
                const { getKingdomActor } = await import('../stores/KingdomStore');
                const actor = getKingdomActor();
                const kingdom = actor?.getKingdom();
                const hasSteps = kingdom?.currentPhaseSteps && kingdom.currentPhaseSteps.length > 0;
                
                if (hasSteps && kingdom?.currentPhase === 'Events') {
                    console.log('⏭️ [EventPhaseController] Phase already initialized, skipping re-initialization');
                    return createPhaseResult(true);
                }
                
                // Read CURRENT state from turnState (single source of truth)
                const eventRolled = kingdom?.turnState?.eventsPhase?.eventRolled ?? false;
                const eventTriggered = kingdom?.turnState?.eventsPhase?.eventTriggered ?? false;
                
                // Initialize steps with CORRECT completion state from the start
                // No workarounds needed - steps reflect KingdomActor state directly
                const steps = [
                    { name: 'Event Roll', completed: eventRolled ? 1 : 0 },
                    { name: 'Resolve Event', completed: (eventRolled && !eventTriggered) ? 1 : 0 },
                    { name: 'Apply Modifiers', completed: (eventRolled && !eventTriggered) ? 1 : 0 }
                ];
                
                await initializePhaseSteps(steps);
                
                // Initialize the phase state
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
                    
                    // Store event in kingdom state (both persistent DC and turnState)
                    const { getKingdomActor } = await import('../stores/KingdomStore');
                    const actor = getKingdomActor();
                    if (actor) {
                        await actor.updateKingdom((kingdom) => {
                            // Update persistent DC (survives across turns)
                            kingdom.eventDC = newDC;
                            
                            // Update turnState (for current turn display)
                            if (kingdom.turnState) {
                                kingdom.turnState.eventsPhase.eventRolled = true;
                                kingdom.turnState.eventsPhase.eventRoll = roll;
                                kingdom.turnState.eventsPhase.eventTriggered = true;
                                kingdom.turnState.eventsPhase.eventId = event!.id;
                            }
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
                
                // Update persistent DC and turnState
                const { getKingdomActor } = await import('../stores/KingdomStore');
                const actor = getKingdomActor();
                if (actor) {
                    await actor.updateKingdom((kingdom) => {
                        // Update persistent DC (survives across turns)
                        kingdom.eventDC = newDC;
                        
                        // Update turnState (for current turn display)
                        if (kingdom.turnState) {
                            kingdom.turnState.eventsPhase.eventRolled = true;
                            kingdom.turnState.eventsPhase.eventRoll = roll;
                            kingdom.turnState.eventsPhase.eventTriggered = false;
                            kingdom.turnState.eventsPhase.eventId = null;
                        }
                    });
                }
                
                // Complete steps 1 & 2 using proper helpers (ensures phaseComplete is updated)
                await completePhaseStepByIndex(1); // Resolve Event
                await completePhaseStepByIndex(2); // Apply Modifiers
                
                console.log('✅ [EventPhaseController] No event - turnState updated, steps 1 & 2 completed via helpers');
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
         * Resolve event with ResolutionData
         * Receives pre-computed resolution data from UI (all dice rolled, choices made)
         */
        async resolveEvent(
            eventId: string,
            outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
            resolutionData: import('../types/events').ResolutionData
        ) {
            console.log(`🎯 [EventPhaseController] Resolving event ${eventId} with outcome: ${outcome}`);
            console.log(`📋 [EventPhaseController] ResolutionData:`, resolutionData);
            
            try {
                // NEW ARCHITECTURE: ResolutionData already contains final numeric values
                // No need to filter, transform, or roll - just apply!
                
                const event = eventService.getEventById(eventId);
                if (!event) {
                    console.error(`❌ [EventPhaseController] Event ${eventId} not found`);
                    return { success: false, error: 'Event not found' };
                }
                
                // Apply numeric modifiers using new simplified service method
                const result = await gameEffectsService.applyNumericModifiers(resolutionData.numericModifiers);
                
                console.log(`✅ [EventPhaseController] Applied ${resolutionData.numericModifiers.length} modifiers`);
                
                // Log manual effects (they're displayed in UI, not executed)
                if (resolutionData.manualEffects.length > 0) {
                    console.log(`📋 [EventPhaseController] Manual effects for GM:`, resolutionData.manualEffects);
                }
                
                // Execute complex actions (Phase 3 - stub for now)
                if (resolutionData.complexActions.length > 0) {
                    console.log(`🔧 [EventPhaseController] Complex actions to execute:`, resolutionData.complexActions);
                    // await gameEffects.executeComplexActions(resolutionData.complexActions);
                }
                
                // Complete steps 1 & 2 (resolve-event & apply-modifiers)
                await completePhaseStepByIndex(1);
                await completePhaseStepByIndex(2);
                
                console.log(`✅ [EventPhaseController] Event resolved successfully`);
                
                return {
                    success: true,
                    applied: result
                };
            } catch (error) {
                console.error('❌ [EventPhaseController] Error resolving event:', error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
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
         * Check if current phase is complete
         */
        async isCurrentPhaseComplete(): Promise<boolean> {
            const { kingdomData } = await import('../stores/KingdomStore');
            const { get } = await import('svelte/store');
            const kingdom = get(kingdomData);
            if (!kingdom) return false;

            const totalSteps = kingdom.currentPhaseSteps.length;
            const completedCount = kingdom.currentPhaseSteps.filter(s => s.completed === 1).length;
            const allComplete = totalSteps > 0 && completedCount === totalSteps;

            console.log(`[EventPhaseController] Phase ${kingdom.currentPhase} completion: ${completedCount}/${totalSteps} steps`);
            return allComplete;
        }
    };
}
