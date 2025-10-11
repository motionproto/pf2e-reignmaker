/**
 * EventPhaseController - Orchestrates event phase operations
 * 
 * NEW: Uses simplified step array system with "event-check" and "resolve-event" steps.
 * Changed "stability roll" terminology to clearer "event check".
 */

import { getEventDisplayName } from '../types/event-helpers';
import { eventService } from './events/event-loader';
import type { EventData } from './events/event-loader';
import type { KingdomData } from '../actors/KingdomActor';
import type { ResolutionData } from '../types/modifiers';
import { updateKingdom } from '../stores/KingdomStore';
import { createModifierService } from '../services/ModifierService';
import { createGameEffectsService } from '../services/GameEffectsService';
import type { ActiveModifier } from '../models/Modifiers';
import { isStaticModifier, isOngoingDuration, isDiceModifier } from '../types/modifiers';
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
                
                // Apply custom modifiers at the start of Events phase
                await this.applyCustomModifiers();
                
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
            resolutionData: ResolutionData
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
                // Apply outcome using shared service
                const { applyResolvedOutcome } = await import('../services/resolution');
                const result = await applyResolvedOutcome(resolutionData, outcome);
                
                // Note: If event has endsEvent === false, it should be handled by
                // adding to activeModifiers via the UI or controller
                
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
         * Apply custom modifiers at the start of Events phase
         * Custom modifiers have no resolution path (sourceType === 'custom' and no originalEventData)
         */
        async applyCustomModifiers() {
            const { getKingdomActor } = await import('../stores/KingdomStore');
            const actor = getKingdomActor();
            if (!actor) {
                console.log('⚠️ [EventPhaseController.applyCustomModifiers] No actor found');
                return;
            }
            
            const kingdom = actor.getKingdom();
            if (!kingdom || !kingdom.activeModifiers || kingdom.activeModifiers.length === 0) {
                console.log('⚠️ [EventPhaseController.applyCustomModifiers] No active modifiers');
                return;
            }
            
            console.log(`🔍 [EventPhaseController.applyCustomModifiers] Total active modifiers: ${kingdom.activeModifiers.length}`);
            kingdom.activeModifiers.forEach(m => {
                console.log(`  - ${m.name} (sourceType: ${m.sourceType}, hasOriginalEventData: ${!!m.originalEventData})`);
            });
            
            // Filter for custom modifiers only (no resolution path, not from structures)
            const customModifiers = kingdom.activeModifiers.filter(m => 
                !m.originalEventData && m.sourceType === 'custom'
            );
            
            if (customModifiers.length === 0) {
                console.log('⚠️ [EventPhaseController.applyCustomModifiers] No custom modifiers found');
                return;
            }
            
            console.log(`🔄 [EventPhaseController] Applying ${customModifiers.length} custom modifier(s)...`);
            
            // Batch modifiers by resource to avoid collisions
            const modifiersByResource = new Map<string, number>();
            const modifiersToDecrement: Array<{ modifierId: string; modifierIndex: number }> = [];
            
            for (const modifier of customModifiers) {
                console.log(`  📋 Processing modifier: ${modifier.name}`);
                console.log(`     Modifiers count: ${modifier.modifiers.length}`);
                
                for (let i = 0; i < modifier.modifiers.length; i++) {
                    const mod = modifier.modifiers[i];
                    let resourceInfo = 'unknown';
                    if (isStaticModifier(mod) || isDiceModifier(mod)) {
                        resourceInfo = mod.resource;
                    } else {
                        resourceInfo = (mod as any).resources?.join(', ') || 'unknown';
                    }
                    console.log(`     - Type: ${mod.type}, Resource: ${resourceInfo}, Value: ${(mod as any).value}, Duration: ${mod.duration}`);
                    console.log(`     - isStatic: ${isStaticModifier(mod)}, isOngoing: ${isOngoingDuration(mod.duration)}, isTurnCount: ${typeof mod.duration === 'number'}`);
                    
                    // Apply static modifiers with ongoing OR numeric duration
                    if (isStaticModifier(mod) && (isOngoingDuration(mod.duration) || typeof mod.duration === 'number')) {
                        const current = modifiersByResource.get(mod.resource) || 0;
                        const newValue = current + mod.value;
                        modifiersByResource.set(mod.resource, newValue);
                        console.log(`     ✓ Added ${mod.value} to ${mod.resource} (total: ${newValue})`);
                        
                        // Track numeric durations for decrementing
                        if (typeof mod.duration === 'number') {
                            modifiersToDecrement.push({ modifierId: modifier.id, modifierIndex: i });
                        }
                    } else {
                        console.log(`     ✗ Skipped (not static+ongoing/numeric)`);
                    }
                }
            }
            
            // Apply all at once (single batch)
            const numericModifiers = Array.from(modifiersByResource.entries()).map(([resource, value]) => ({
                resource: resource as any,
                value
            }));
            
            console.log(`📊 [EventPhaseController] Total modifiers to apply: ${numericModifiers.length}`);
            numericModifiers.forEach(m => console.log(`   ${m.resource}: ${m.value}`));
            
            if (numericModifiers.length > 0) {
                await gameEffectsService.applyNumericModifiers(numericModifiers);
                console.log(`✅ [EventPhaseController] Applied ${numericModifiers.length} numeric modifier(s) from ${customModifiers.length} custom modifier(s)`);
            } else {
                console.log(`⚠️ [EventPhaseController] No numeric modifiers to apply`);
            }
            
            // Decrement turn-based durations and remove expired modifiers
            if (modifiersToDecrement.length > 0) {
                console.log(`⏬ [EventPhaseController] Decrementing ${modifiersToDecrement.length} turn-based modifier(s)...`);
                
                await updateKingdom(kingdom => {
                    const modifiersToRemove: string[] = [];
                    
                    for (const { modifierId, modifierIndex } of modifiersToDecrement) {
                        const modifier = kingdom.activeModifiers?.find(m => m.id === modifierId);
                        if (modifier && modifier.modifiers[modifierIndex]) {
                            const mod = modifier.modifiers[modifierIndex];
                            if (typeof mod.duration === 'number') {
                                mod.duration -= 1;
                                console.log(`   Decremented ${modifier.name}.modifiers[${modifierIndex}] to ${mod.duration} turns remaining`);
                                
                                // Mark modifier for removal if all its modifiers are expired
                                if (mod.duration <= 0) {
                                    const allExpired = modifier.modifiers.every(m => 
                                        typeof m.duration === 'number' && m.duration <= 0
                                    );
                                    if (allExpired && !modifiersToRemove.includes(modifierId)) {
                                        modifiersToRemove.push(modifierId);
                                    }
                                }
                            }
                        }
                    }
                    
                    // Remove expired modifiers
                    if (modifiersToRemove.length > 0) {
                        console.log(`🗑️ [EventPhaseController] Removing ${modifiersToRemove.length} expired modifier(s)`);
                        kingdom.activeModifiers = kingdom.activeModifiers?.filter(m => 
                            !modifiersToRemove.includes(m.id)
                        ) || [];
                    }
                });
            }
        },
        
        /**
         * Get outcome modifiers for an event
         * (Follows same pattern as ActionPhaseController.getActionModifiers)
         */
        getEventModifiers(event: EventData, outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure') {
            const outcomeData = event.effects[outcome];
            
            return {
                msg: outcomeData?.msg || '',
                modifiers: outcomeData?.modifiers || [],
                manualEffects: outcomeData?.manualEffects || []
            };
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
