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
import { createGameCommandsService } from '../services/GameCommandsService';
import type { ActiveModifier, ActiveEventInstance } from '../models/Modifiers';
import { isStaticModifier, isOngoingDuration, isDiceModifier } from '../types/modifiers';
import { checkInstanceService } from '../services/CheckInstanceService';
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
import { logger } from '../utils/Logger';

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
    const gameCommandsService = await createGameCommandsService();
    
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
                
                // NEW ARCHITECTURE: Clear completed events and reset ongoing event resolutions
                await checkInstanceService.clearCompleted('event', kingdom?.currentTurn);
                await checkInstanceService.clearOngoingResolutions('event');
                
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
                logger.debug('🟡 [EventPhaseController] Event check already completed');
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
            
            logger.debug(`🎲 [EventPhaseController] Event check: rolled ${roll} vs DC ${currentDC} - ${triggered ? 'TRIGGERED' : 'NO EVENT'}`);
            
            state.eventCheckRoll = roll;
            
            let newDC: number;
            let event: EventData | null = null;
            
            if (triggered) {
                // Event triggered - get random event and reset DC to 15
                event = eventService.getRandomEvent();
                newDC = 15;
                
                if (event) {
                    state.currentEvent = event;
                    logger.debug(`✨ [EventPhaseController] Event triggered: "${getEventDisplayName(event)}" (${event.id})`);
                    
                    // ✅ ARCHITECTURE FIX: Create ActiveCheckInstance IMMEDIATELY (or reuse if exists)
                    const { getKingdomActor } = await import('../stores/KingdomStore');
                    const actor = getKingdomActor();
                    const kingdom = actor?.getKingdom();
                    
                    if (actor && kingdom && event) {
                        // Check if this event already exists as an ongoing instance
                        const existingInstance = kingdom.activeCheckInstances?.find(
                            i => i.checkType === 'event' && i.checkId === event.id && i.status === 'pending'
                        );
                        
                        let instanceId: string;
                        
                        if (existingInstance) {
                            // Reuse existing ongoing instance
                            instanceId = existingInstance.instanceId;
                            logger.debug(`🔁 [EventPhaseController] Event already ongoing, reusing instance: ${instanceId}`);
                        } else {
                            // Create new instance via CheckInstanceService
                            instanceId = await checkInstanceService.createInstance(
                                'event',
                                event.id,
                                event,
                                kingdom.currentTurn
                            );
                            logger.debug(`✅ [EventPhaseController] Created new event instance: ${instanceId}`);
                        }
                        
                        // Update persistent DC and turnState (mark as current event)
                        await actor.updateKingdom((kingdom) => {
                            // Update persistent DC (survives across turns)
                            kingdom.eventDC = newDC;
                            
                            // Update turnState (for current turn display - roll numbers + current marker)
                            if (kingdom.turnState && event) {
                                kingdom.turnState.eventsPhase.eventRolled = true;
                                kingdom.turnState.eventsPhase.eventRoll = roll;
                                kingdom.turnState.eventsPhase.eventTriggered = true;
                                kingdom.turnState.eventsPhase.eventId = event.id;  // Marks as "current event"
                                kingdom.turnState.eventsPhase.eventInstanceId = instanceId;  // ✅ Ties marker to specific instance
                            }
                        });
                    }
                    
                    // Step 1 (Resolve Event) remains INCOMPLETE - player must resolve
                    // Step 2 (Apply Modifiers) remains INCOMPLETE - will complete with step 1
                    logger.debug('⚠️ [EventPhaseController] Event triggered - step 1 requires resolution');
                }
            } else {
                // No event - reduce DC by 5 (minimum 6)
                newDC = Math.max(6, currentDC - 5);
                logger.debug(`📉 [EventPhaseController] No event, DC reduced from ${currentDC} to ${newDC}`);
                
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
                
                logger.debug('✅ [EventPhaseController] No event - turnState updated, steps 1 & 2 completed via helpers');
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
         * Resolve event with ResolutionData
         * Receives pre-computed resolution data from UI (all dice rolled, choices made)
         */
        async resolveEvent(
            eventId: string,
            outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
            resolutionData: ResolutionData,
            isIgnored: boolean = false,
            actorName?: string,
            skillName?: string,
            playerId?: string
        ) {
            // Validate event exists
            const event = eventService.getEventById(eventId);
            if (!event) {
                logger.error(`❌ [EventPhaseController] Event ${eventId} not found`);
                return { success: false, error: 'Event not found' };
            }
            
            const outcomeData = event.effects[outcome];
            const { getKingdomActor } = await import('../stores/KingdomStore');
            const actor = getKingdomActor();
            const kingdom = actor?.getKingdom();
            const currentTurn = kingdom?.currentTurn || 1;
            
            // Track player action (unless event is ignored)
            if (!isIgnored && playerId && actorName) {
                const { createGameCommandsService } = await import('../services/GameCommandsService');
                const gameCommands = await createGameCommandsService();
                const game = (window as any).game;
                const user = game?.users?.get(playerId);
                const playerName = user?.name || 'Unknown Player';
                
                await gameCommands.trackPlayerAction(
                    playerId,
                    playerName,
                    actorName,
                    `${eventId}-${outcome}`,
                    TurnPhase.EVENTS
                );
                
                logger.debug(`📝 [EventPhaseController] Tracked event action: ${actorName} performed ${eventId}-${outcome}`);
            }
            
            // Check if this event already exists as an ongoing instance (NEW system)
            const existingInstance = kingdom?.activeCheckInstances?.find(
                instance => instance.checkType === 'event' && instance.checkId === event.id && instance.status === 'pending'
            );
            
            // NEW ARCHITECTURE: Create or update ActiveCheckInstance for ongoing events
            // This happens for rolled outcomes with endsEvent: false and ongoing modifiers
            // NOTE: Ignored events already have instances created by ignoreEvent(), so we exclude them here
            const shouldCreateInstance = (
                !isIgnored &&
                outcomeData && 
                !outcomeData.endsEvent && 
                outcomeData.modifiers && 
                outcomeData.modifiers.some(m => m.duration === 'ongoing' || typeof m.duration === 'number')
            );
            
            // Capture the instance ID for use later when storing appliedOutcome
            let newInstanceId: string | null = null;
            
            // Create instance using NEW system (activeCheckInstances, not activeEventInstances)
            if (shouldCreateInstance && !existingInstance) {
                // First time: Create new instance via CheckInstanceService
                newInstanceId = await checkInstanceService.createInstance(
                    'event',
                    event.id,
                    event,
                    currentTurn
                );
                
                // Clear current event turnState to prevent double-display
                await updateKingdom(kingdom => {
                    if (kingdom.turnState?.eventsPhase?.eventId === eventId) {
                        kingdom.turnState.eventsPhase.eventId = null;
                        kingdom.turnState.eventsPhase.eventTriggered = false;
                        logger.debug(`✅ [EventPhaseController] Created ongoing event instance and cleared turnState: ${newInstanceId}`);
                    }
                });
            } else if (existingInstance) {
                // Reroll case: Instance already exists, just apply effects
                logger.debug(`🔁 [EventPhaseController] Re-rolling existing instance: ${event.name} (${existingInstance.instanceId})`);
            }
            
            // Use unified resolution wrapper (consolidates duplicate logic)
            const result = await resolvePhaseOutcome(
                eventId,
                'event',
                outcome,
                resolutionData,
                [EventsPhaseSteps.RESOLVE_EVENT, EventsPhaseSteps.APPLY_MODIFIERS]  // Type-safe step indices
            );
            
            // Store appliedOutcome and mark effects as applied (NEW system)
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
                    if (!kingdom.activeCheckInstances) return;
                    
                    const instance = kingdom.activeCheckInstances.find(i => i.instanceId === targetInstanceId);
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
                        
                        // Clear resolution progress after successful application
                        instance.resolutionProgress = undefined;
                        logger.debug(`✅ [EventPhaseController] Stored appliedOutcome with ${resolvedModifiers.length} resolved modifiers${isIgnored ? ' (ignored)' : ''}: ${targetInstanceId}`);
                    }
                });
            }
            
            // After resolution, mark instance as resolved if it ends the event
            // This applies to BOTH new events and existing ongoing events
            if (!isIgnored && outcomeData?.endsEvent) {
                await updateKingdom(kingdom => {
                    // Find the instance (either existing or newly created)
                    const instance = kingdom.activeCheckInstances?.find(
                        i => i.checkType === 'event' && i.checkId === eventId && i.status !== 'resolved'
                    );
                    if (instance) {
                        instance.status = 'resolved';
                        logger.debug(`✅ [EventPhaseController] Marked event as resolved (endsEvent: true): ${instance.instanceId}`);
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
                        logger.debug(`✅ [EventPhaseController] Marked event as resolved: ${eventId}`);
                    }
                    
                    // If it was the active event, clear it (moves to ongoing section)
                    // ✅ CRITICAL FIX: Check BOTH eventId AND instanceId to prevent clearing wrong event
                    const currentInstanceId = existingInstance?.instanceId || newInstanceId;
                    if (kingdom.turnState.eventsPhase.eventId === eventId && 
                        kingdom.turnState.eventsPhase.eventInstanceId === currentInstanceId) {
                        kingdom.turnState.eventsPhase.eventId = null;
                        kingdom.turnState.eventsPhase.eventInstanceId = null;
                        kingdom.turnState.eventsPhase.eventTriggered = false;
                        logger.debug(`✅ [EventPhaseController] Cleared active event marker (${currentInstanceId})`);
                    } else if (kingdom.turnState.eventsPhase.eventId === eventId) {
                        // Different instance - don't clear the marker
                        logger.debug(`⚠️ [EventPhaseController] Event ${eventId} resolved, but different instance is current (not clearing marker)`);
                    }
                });
            }
            
            // NOTE: We DON'T clear immediate event instances here anymore
            // They stay as 'resolved' status and appear in the "Resolved Events" section
            // They will be cleaned up at the start of the NEXT Events phase by startPhase()
            // This allows players to see what events were resolved this turn
            
            // Check if all events have effects applied (phase completion) - NEW system
            const updatedActor = getKingdomActor();
            const updatedKingdomState = updatedActor?.getKingdom();
            const pendingInstances = updatedKingdomState?.activeCheckInstances?.filter(
                i => i.checkType === 'event' && i.status === 'pending'
            ) || [];
            const allEffectsApplied = pendingInstances.length === 0 || pendingInstances.every(i => 
                i.appliedOutcome?.effectsApplied === true
            );
            
            if (allEffectsApplied && !updatedKingdomState?.turnState?.eventsPhase?.eventId) {
                logger.debug(`✅ [EventPhaseController] All event effects applied, marking phase complete`);
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
                logger.debug('⚠️ [EventPhaseController.applyCustomModifiers] No actor found');
                return;
            }
            
            const kingdom = actor.getKingdom();
            if (!kingdom || !kingdom.activeModifiers || kingdom.activeModifiers.length === 0) {
                logger.debug('⚠️ [EventPhaseController.applyCustomModifiers] No active modifiers');
                return;
            }
            
            logger.debug(`🔍 [EventPhaseController.applyCustomModifiers] Total active modifiers: ${kingdom.activeModifiers.length}`);
            kingdom.activeModifiers.forEach(m => {
                logger.debug(`  - ${m.name} (sourceType: ${m.sourceType})`);
            });
            
            // Filter for custom modifiers only (sourceType === 'custom')
            const customModifiers = kingdom.activeModifiers.filter(m => m.sourceType === 'custom');
            
            if (customModifiers.length === 0) {
                logger.debug('⚠️ [EventPhaseController.applyCustomModifiers] No custom modifiers found');
                return;
            }
            
            logger.debug(`🔄 [EventPhaseController] Applying ${customModifiers.length} custom modifier(s)...`);
            
            // Batch modifiers by resource to avoid collisions
            const modifiersByResource = new Map<string, number>();
            const modifiersToDecrement: Array<{ modifierId: string; modifierIndex: number }> = [];
            
            for (const modifier of customModifiers) {
                logger.debug(`  📋 Processing modifier: ${modifier.id} (${modifier.sourceType})`);
                logger.debug(`     Modifiers count: ${modifier.modifiers.length}`);
                
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
                    logger.debug(`     - Type: ${mod.type}, Resource: ${resourceInfo}, Value: ${(mod as any).value}, Duration: ${mod.duration}`);
                    logger.debug(`     - isStatic: ${isStaticModifier(mod)}, isOngoing: ${isOngoingDuration(mod.duration)}, isTurnCount: ${typeof mod.duration === 'number'}`);
                    
                    // Apply static modifiers with ongoing OR numeric duration
                    if (isStaticModifier(mod) && (isOngoingDuration(mod.duration) || typeof mod.duration === 'number')) {
                        const current = modifiersByResource.get(mod.resource) || 0;
                        const newValue = current + mod.value;
                        modifiersByResource.set(mod.resource, newValue);
                        logger.debug(`     ✓ Added ${mod.value} to ${mod.resource} (total: ${newValue})`);
                        
                        // Track numeric durations for decrementing
                        if (typeof mod.duration === 'number') {
                            modifiersToDecrement.push({ modifierId: modifier.id, modifierIndex: i });
                        }
                    } else {
                        logger.debug(`     ✗ Skipped (not static+ongoing/numeric)`);
                    }
                }
            }
            
            // Apply all at once (single batch)
            const numericModifiers = Array.from(modifiersByResource.entries()).map(([resource, value]) => ({
                resource: resource as any,
                value
            }));
            
            logger.debug(`📊 [EventPhaseController] Total modifiers to apply: ${numericModifiers.length}`);
            numericModifiers.forEach(m => logger.debug(`   ${m.resource}: ${m.value}`));
            
            if (numericModifiers.length > 0) {
                await gameCommandsService.applyNumericModifiers(numericModifiers);
                logger.debug(`✅ [EventPhaseController] Applied ${numericModifiers.length} numeric modifier(s) from ${customModifiers.length} custom modifier(s)`);
            } else {
                logger.debug(`⚠️ [EventPhaseController] No numeric modifiers to apply`);
            }
            
            // Decrement turn-based durations and remove expired modifiers
            if (modifiersToDecrement.length > 0) {
                logger.debug(`⏬ [EventPhaseController] Decrementing ${modifiersToDecrement.length} turn-based modifier(s)...`);
                
                await updateKingdom(kingdom => {
                    const modifiersToRemove: string[] = [];
                    
                    for (const { modifierId, modifierIndex } of modifiersToDecrement) {
                        const modifier = kingdom.activeModifiers?.find(m => m.id === modifierId);
                        if (modifier && modifier.modifiers[modifierIndex]) {
                            const mod = modifier.modifiers[modifierIndex];
                            if (typeof mod.duration === 'number') {
                                mod.duration -= 1;
                                logger.debug(`   Decremented ${modifier.id}.modifiers[${modifierIndex}] to ${mod.duration} turns remaining`);
                                
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
                        logger.debug(`🗑️ [EventPhaseController] Removing ${modifiersToRemove.length} expired modifier(s)`);
                        kingdom.activeModifiers = kingdom.activeModifiers?.filter(m => 
                            !modifiersToRemove.includes(m.id)
                        ) || [];
                    }
                });
            }
        },
        
        /**
         * Ignore event - controller method (called from UI)
         * Architecture: UI delegates to controller for all business logic
         */
        async ignoreEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
            logger.debug(`🚫 [EventPhaseController] Ignoring event: ${eventId}`);
            
            const event = eventService.getEventById(eventId);
            if (!event) {
                return { success: false, error: 'Event not found' };
            }
            
            // Determine if this event should create an ongoing instance
            const shouldCreateInstance = event.traits?.includes('dangerous');
            const outcomeData = event.effects.failure;
            
            if (shouldCreateInstance && outcomeData) {
                const { getKingdomActor } = await import('../stores/KingdomStore');
                const actor = getKingdomActor();
                const kingdom = actor?.getKingdom();
                
                if (kingdom) {
                    // Check if an instance already exists (created by performEventCheck)
                    const existingInstance = kingdom.activeCheckInstances?.find(
                        i => i.checkType === 'event' && i.checkId === event.id && i.status === 'pending'
                    );
                    
                    let instanceId: string;
                    
                    if (existingInstance) {
                        // Use existing instance from performEventCheck
                        instanceId = existingInstance.instanceId;
                        logger.debug(`🔍 [EventPhaseController] Found existing instance for ignored event: ${instanceId}`);
                    } else {
                        // Create new instance (fallback for edge cases)
                        instanceId = await checkInstanceService.createInstance(
                            'event',
                            event.id,
                            event,
                            kingdom.currentTurn
                        );
                        logger.debug(`✅ [EventPhaseController] Created new instance for ignored event: ${instanceId}`);
                    }
                    
                    // Build failure outcome preview
                    const resolution = {
                        outcome: 'failure' as const,
                        actorName: 'Event Ignored',
                        skillName: '',
                        effect: outcomeData.msg,
                        modifiers: outcomeData.modifiers || [],
                        manualEffects: outcomeData.manualEffects || [],
                        shortfallResources: [],
                        effectsApplied: false,
                        isIgnored: true  // Flag to hide reroll button
                    };
                    
                    // Store preview in instance
                    await updateKingdom(kingdom => {
                        const instance = kingdom.activeCheckInstances?.find(i => i.instanceId === instanceId);
                        if (instance) {
                            instance.appliedOutcome = resolution;
                            logger.debug(`✅ [EventPhaseController] Stored failure preview in instance: ${instanceId}`);
                        }
                    });
                }
            }
            
            // Clear current event from turnState (moves to ongoing section if instance created)
            await updateKingdom(kingdom => {
                if (kingdom.turnState?.eventsPhase?.eventId === eventId) {
                    kingdom.turnState.eventsPhase.eventId = null;
                    kingdom.turnState.eventsPhase.eventTriggered = false;
                    logger.debug(`✅ [EventPhaseController] Cleared current event from turnState`);
                }
            });
            
            return { success: true };
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

            logger.debug(`[EventPhaseController] Phase ${kingdom.currentPhase} completion: ${completedCount}/${totalSteps} steps`);
            return allComplete;
        }
    };
}
