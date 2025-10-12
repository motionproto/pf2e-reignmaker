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
import type { ActiveModifier, ActiveEventInstance } from '../models/Modifiers';
import { isStaticModifier, isOngoingDuration, isDiceModifier } from '../types/modifiers';
import { 
  reportPhaseStart, 
  reportPhaseComplete, 
  reportPhaseError, 
  createPhaseResult,
  checkPhaseGuard,
  initializePhaseSteps,
  completePhaseStepByIndex,
  isStepCompletedByIndex,
  resolvePhaseOutcome
} from './shared/PhaseControllerHelpers';
import { TurnPhase } from '../actors/KingdomActor';
import { EventsPhaseSteps } from './shared/PhaseStepConstants';

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
                // Phase guard - prevents initialization when not in Events phase or already initialized
                const guardResult = checkPhaseGuard(TurnPhase.EVENTS, 'EventPhaseController');
                if (guardResult) return guardResult;
                
                // Get kingdom for step initialization
                const { getKingdomActor } = await import('../stores/KingdomStore');
                const actor = getKingdomActor();
                const kingdom = actor?.getKingdom();
                
                // Apply custom modifiers at the start of Events phase
                await this.applyCustomModifiers();
                
                // Clear appliedOutcome from ongoing events (reset to unresolved state each turn)
                await updateKingdom(kingdom => {
                    const pendingEvents = kingdom.activeEventInstances?.filter(i => i.status === 'pending') || [];
                    if (pendingEvents.length > 0) {
                        console.log(`🔄 [EventPhaseController] Clearing appliedOutcome from ${pendingEvents.length} ongoing event(s)`);
                        pendingEvents.forEach(instance => {
                            instance.appliedOutcome = undefined;
                            instance.effectsApplied = false;
                            instance.resolutionProgress = undefined;
                            console.log(`   ✓ Reset: ${instance.eventData.name} (${instance.instanceId})`);
                        });
                    }
                });
                
        // Read CURRENT state from turnState (single source of truth)
        const eventRolled = kingdom?.turnState?.eventsPhase?.eventRolled ?? false;
        const eventTriggered = kingdom?.turnState?.eventsPhase?.eventTriggered ?? false;
        
        // Initialize steps with CORRECT completion state from the start (using type-safe constants)
        // No workarounds needed - steps reflect KingdomActor state directly
        const steps = [
            { name: 'Event Roll', completed: eventRolled ? 1 : 0 },  // EventsPhaseSteps.EVENT_ROLL = 0
            { name: 'Resolve Event', completed: (eventRolled && !eventTriggered) ? 1 : 0 },  // EventsPhaseSteps.RESOLVE_EVENT = 1
            { name: 'Apply Modifiers', completed: (eventRolled && !eventTriggered) ? 1 : 0 }  // EventsPhaseSteps.APPLY_MODIFIERS = 2
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
            // Check if event roll step is already completed (using type-safe constant)
            if (await isStepCompletedByIndex(EventsPhaseSteps.EVENT_ROLL)) {
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
                
                // Complete steps using type-safe constants
                await completePhaseStepByIndex(EventsPhaseSteps.RESOLVE_EVENT);
                await completePhaseStepByIndex(EventsPhaseSteps.APPLY_MODIFIERS);
                
                console.log('✅ [EventPhaseController] No event - turnState updated, steps 1 & 2 completed via helpers');
            }
            
            state.eventDC = newDC;
            
            // Complete event roll step - always completes after roll
            await completePhaseStepByIndex(EventsPhaseSteps.EVENT_ROLL);
            
            return {
                triggered,
                event,
                roll,
                newDC
            };
        },
        
        /**
         * Start resolving an event - tracks who is working on it for multi-player coordination
         */
        async startResolvingEvent(
            eventId: string,
            outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
            isIgnored: boolean = false
        ) {
            const { getKingdomActor } = await import('../stores/KingdomStore');
            const actor = getKingdomActor();
            const kingdom = actor?.getKingdom();
            const game = (globalThis as any).game;
            
            if (!game?.user) return { success: false, error: 'No user found' };
            
            const existingInstance = kingdom?.activeEventInstances?.find(
                instance => instance.eventId === eventId && instance.status === 'pending'
            );
            
            if (!existingInstance) {
                console.warn(`⚠️ [EventPhaseController] Cannot start resolving - instance not found: ${eventId}`);
                return { success: false, error: 'Event instance not found' };
            }
            
            // Set resolution progress
            await updateKingdom(kingdom => {
                const instance = kingdom.activeEventInstances?.find(i => i.instanceId === existingInstance.instanceId);
                if (instance) {
                    instance.resolutionProgress = {
                        playerId: game.user.id,
                        playerName: game.user.name,
                        timestamp: Date.now(),
                        outcome,
                        selectedChoices: [],
                        rolledDice: {}
                    };
                    console.log(`🎬 [EventPhaseController] ${game.user.name} started resolving: ${eventId}`);
                }
            });
            
            return { success: true };
        },
        
        /**
         * Update resolution progress (when player makes choices or rolls dice)
         */
        async updateResolutionProgress(
            eventId: string,
            updates: {
                selectedChoices?: number[];
                rolledDice?: Record<string, number>;
            }
        ) {
            const { getKingdomActor } = await import('../stores/KingdomStore');
            const actor = getKingdomActor();
            const kingdom = actor?.getKingdom();
            
            const existingInstance = kingdom?.activeEventInstances?.find(
                instance => instance.eventId === eventId && instance.status === 'pending'
            );
            
            if (!existingInstance?.resolutionProgress) {
                console.warn(`⚠️ [EventPhaseController] Cannot update progress - no resolution in progress: ${eventId}`);
                return { success: false };
            }
            
            await updateKingdom(kingdom => {
                const instance = kingdom.activeEventInstances?.find(i => i.instanceId === existingInstance.instanceId);
                if (instance?.resolutionProgress) {
                    if (updates.selectedChoices !== undefined) {
                        instance.resolutionProgress.selectedChoices = updates.selectedChoices;
                        console.log(`📝 [EventPhaseController] Updated choices: ${updates.selectedChoices}`);
                    }
                    if (updates.rolledDice !== undefined) {
                        instance.resolutionProgress.rolledDice = updates.rolledDice;
                        console.log(`🎲 [EventPhaseController] Updated dice: ${JSON.stringify(updates.rolledDice)}`);
                    }
                }
            });
            
            return { success: true };
        },
        
        /**
         * Resolve event with ResolutionData
         * Receives pre-computed resolution data from UI (all dice rolled, choices made)
         */
        async resolveEvent(
            eventId: string,
            outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
            resolutionData: ResolutionData,
            isIgnored: boolean = false,
            actorName?: string,
            skillName?: string
        ) {
            // Validate event exists
            const event = eventService.getEventById(eventId);
            if (!event) {
                console.error(`❌ [EventPhaseController] Event ${eventId} not found`);
                return { success: false, error: 'Event not found' };
            }
            
            const outcomeData = event.effects[outcome];
            const { getKingdomActor } = await import('../stores/KingdomStore');
            const actor = getKingdomActor();
            const kingdom = actor?.getKingdom();
            const currentTurn = kingdom?.currentTurn || 1;
            
            // Check if this event already exists as an ongoing instance
            const existingInstance = kingdom?.activeEventInstances?.find(
                instance => instance.eventId === event.id && instance.status === 'pending'
            );
            
            // NEW ARCHITECTURE: Create or update ActiveEventInstance for ongoing events
            // This happens for:
            // 1. Ignored dangerous events with immediate modifiers → ongoing
            // 2. Rolled outcomes with endsEvent: false and ongoing modifiers
            const shouldCreateInstance = (
                (isIgnored && 
                 event.traits?.includes('dangerous') && 
                 outcomeData?.modifiers?.some(m => m.duration === 'immediate')) ||
                (outcomeData && !outcomeData.endsEvent && outcomeData.modifiers && 
                 outcomeData.modifiers.some(m => m.duration === 'ongoing' || typeof m.duration === 'number'))
            );
            
            // Capture the instance ID for use later when storing appliedOutcome
            let newInstanceId: string | null = null;
            
            // Create instance and clear current event in a SINGLE update to avoid double-rendering
            if (shouldCreateInstance && !existingInstance) {
                // First time: Create new instance
                newInstanceId = `${event.id}-${Date.now()}`;
                const instance: ActiveEventInstance = {
                    instanceId: newInstanceId,
                    eventId: event.id,
                    eventType: 'event',
                    eventData: event,
                    createdTurn: currentTurn,
                    status: 'pending'
                };
                
                await updateKingdom(kingdom => {
                    // Create instance
                    if (!kingdom.activeEventInstances) kingdom.activeEventInstances = [];
                    kingdom.activeEventInstances.push(instance);
                    
                    // Clear current event atomically (prevents showing in both sections)
                    if (kingdom.turnState?.eventsPhase?.eventId === eventId) {
                        kingdom.turnState.eventsPhase.eventId = null;
                        kingdom.turnState.eventsPhase.eventTriggered = false;
                    }
                });
                
                console.log(`✅ [EventPhaseController] Created event instance and cleared current event: ${newInstanceId}`);
            } else if (existingInstance) {
                // Reroll case: Instance already exists, just apply effects
                console.log(`🔁 [EventPhaseController] Re-rolling existing instance: ${event.name} (${existingInstance.instanceId})`);
            }
            
            // Use unified resolution wrapper (consolidates duplicate logic)
            const result = await resolvePhaseOutcome(
                eventId,
                'event',
                outcome,
                resolutionData,
                [EventsPhaseSteps.RESOLVE_EVENT, EventsPhaseSteps.APPLY_MODIFIERS]  // Type-safe step indices
            );
            
            // Store appliedOutcome and mark effects as applied
            if (shouldCreateInstance || existingInstance) {
                // Use the captured instanceId (if we just created one) or the existing instance's ID
                const targetInstanceId = existingInstance?.instanceId || newInstanceId;
                
                // Convert ResolutionData.numericModifiers to resolved static modifiers
                // This ensures OutcomeDisplay shows static values, not interactive dice/choices
                const resolvedModifiers = resolutionData.numericModifiers.map(m => ({
                    type: 'static' as const,
                    resource: m.resource,
                    value: m.value,
                    duration: 'immediate' as const  // Copy from original if needed
                }));
                
                await updateKingdom(kingdom => {
                    if (!kingdom.activeEventInstances) return;
                    
                    const instance = kingdom.activeEventInstances.find(i => i.instanceId === targetInstanceId);
                    if (instance) {
                        // Store outcome for both rolled and ignored events
                        instance.appliedOutcome = {
                            outcome,
                            actorName: actorName || 'Event Ignored',
                            skillName: skillName || '',
                            effect: outcomeData?.msg || '',
                            modifiers: resolvedModifiers,  // ✅ RESOLVED values, not raw modifiers
                            manualEffects: outcomeData?.manualEffects || [],
                            shortfallResources: result.applied?.applied?.specialEffects
                                ?.filter((e: string) => e.startsWith('shortage_penalty:'))
                                ?.map((e: string) => e.split(':')[1]) || [],
                            effectsApplied: true  // ✅ Mark effects as applied inside appliedOutcome (syncs across clients)
                        };
                        instance.effectsApplied = true;  // DEPRECATED - kept for backward compatibility during migration
                        
                        // Clear resolution progress after successful application
                        instance.resolutionProgress = undefined;
                        console.log(`✅ [EventPhaseController] Stored appliedOutcome with ${resolvedModifiers.length} resolved modifiers${isIgnored ? ' (ignored)' : ''}: ${targetInstanceId}`);
                    }
                });
            }
            
            // After resolution, mark instance as resolved if it ends the event
            if (!isIgnored && existingInstance && outcomeData?.endsEvent) {
                await updateKingdom(kingdom => {
                    const instance = kingdom.activeEventInstances?.find(
                        i => i.instanceId === existingInstance.instanceId
                    );
                    if (instance) {
                        instance.status = 'resolved';
                        console.log(`✅ [EventPhaseController] Marked event as resolved: ${existingInstance.instanceId}`);
                    }
                });
            }
            
            // Track event as resolved (for phase gate) - only if NOT creating new instance
            if (!shouldCreateInstance || existingInstance) {
                await updateKingdom(kingdom => {
                    if (!kingdom.turnState?.eventsPhase) return;
                    
                    // Initialize resolved tracking array
                    if (!kingdom.turnState.eventsPhase.resolvedOngoingEvents) {
                        kingdom.turnState.eventsPhase.resolvedOngoingEvents = [];
                    }
                    
                    // Add to resolved list (prevents blocking phase progression)
                    if (!kingdom.turnState.eventsPhase.resolvedOngoingEvents.includes(eventId)) {
                        kingdom.turnState.eventsPhase.resolvedOngoingEvents.push(eventId);
                        console.log(`✅ [EventPhaseController] Marked event as resolved: ${eventId}`);
                    }
                    
                    // If it was the active event, clear it (moves to ongoing section)
                    if (kingdom.turnState.eventsPhase.eventId === eventId) {
                        kingdom.turnState.eventsPhase.eventId = null;
                        kingdom.turnState.eventsPhase.eventTriggered = false;
                        console.log(`✅ [EventPhaseController] Cleared active event, moved to ongoing section`);
                    }
                });
            }
            
            // Check if all events have effects applied (phase completion)
            const updatedActor = getKingdomActor();
            const updatedKingdomState = updatedActor?.getKingdom();
            const pendingInstances = updatedKingdomState?.activeEventInstances?.filter(i => i.status === 'pending') || [];
            const allEffectsApplied = pendingInstances.length === 0 || pendingInstances.every(i => i.effectsApplied === true);
            
            if (allEffectsApplied && !updatedKingdomState?.turnState?.eventsPhase?.eventId) {
                console.log(`✅ [EventPhaseController] All event effects applied, marking phase complete`);
                await completePhaseStepByIndex(EventsPhaseSteps.RESOLVE_EVENT);
                await completePhaseStepByIndex(EventsPhaseSteps.APPLY_MODIFIERS);
            }
            
            return result;
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
                console.log(`  - ${m.name} (sourceType: ${m.sourceType})`);
            });
            
            // Filter for custom modifiers only (sourceType === 'custom')
            const customModifiers = kingdom.activeModifiers.filter(m => m.sourceType === 'custom');
            
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
                    } else if (Array.isArray((mod as any).resource)) {
                        resourceInfo = (mod as any).resource.join(', ');
                    } else {
                        resourceInfo = (mod as any).resource || 'unknown';
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
