/**
 * EventPhaseController - Orchestrates event phase operations
 * 
 * NEW: Uses simplified step array system with "event-check" and "resolve-event" steps.
 * Changed "stability roll" terminology to clearer "event check".
 */

import { getEventDisplayName } from '../types/event-helpers';
import type { CheckPipeline } from '../types/CheckPipeline';
import type { KingdomData } from '../actors/KingdomActor';
import type { ResolutionData } from '../types/modifiers';
import { updateKingdom } from '../stores/KingdomStore';
import { createModifierService } from '../services/ModifierService';
import { createGameCommandsService } from '../services/GameCommandsService';
import type { ActiveModifier, ActiveEventInstance } from '../models/Modifiers';
import { isStaticModifier, isOngoingDuration, isDiceModifier } from '../types/modifiers';
import { createOutcomePreviewService } from '../services/OutcomePreviewService';
import {
  reportPhaseStart,
  reportPhaseComplete,
  reportPhaseError,
  createPhaseResult,
  checkPhaseGuard,
  initializePhaseSteps,
  completePhaseStepByIndex,
  isStepCompletedByIndex
} from './shared/PhaseControllerHelpers';
import { TurnPhase } from '../actors/KingdomActor';
import { EventsPhaseSteps } from './shared/PhaseStepConstants';
import { logger } from '../utils/Logger';
import { pipelineRegistry } from '../pipelines/PipelineRegistry';

export interface EventPhaseState {
    currentEvent: CheckPipeline | null;
    eventCheckRoll: number;
    eventDC: number;
    resolutionOutcome: 'success' | 'failure' | 'criticalSuccess' | 'criticalFailure' | null;
    appliedEffects: Map<string, any>;
    unresolvedEvent: CheckPipeline | null;
}

export interface IncidentResolution {
    incident: CheckPipeline;
    outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
    skillUsed?: string;
    actorName?: string;
    effects: Map<string, any>;
    formattedEffects?: any[];
    message: string;
}

/**
 * Check if any demand-expansion events have been fulfilled (target hex claimed)
 * This is a FALLBACK check - normally resolution happens immediately via Claim Hex action.
 * This catches edge cases where a hex was claimed via other means (e.g., seize, debug).
 * 
 * Uses hex features (type: 'demanded') as the source of truth.
 * A demand is fulfilled when a hex with 'demanded' feature is claimed by player.
 */
async function checkDemandExpansionFulfilled(kingdom: KingdomData | null | undefined): Promise<void> {
    if (!kingdom) return;
    
    const { PLAYER_KINGDOM } = await import('../types/ownership');
    
    // Find hexes with 'demanded' feature that are now claimed by player
    const fulfilledHexes = kingdom.hexes?.filter(
        (hex: any) => 
            hex.claimedBy === PLAYER_KINGDOM &&
            hex.features?.some((f: any) => f.type === 'demanded')
    ) || [];
    
    if (fulfilledHexes.length === 0) return;
    
    // Silent cleanup - the dialog is shown during Claim Hex action
    // This fallback handles edge cases (claimed via debug/seize/other means)
    logger.info(`[EventPhaseController] Found ${fulfilledHexes.length} fulfilled demand expansion(s) - cleaning up silently`);
    
    const { updateKingdom } = await import('../stores/KingdomStore');
    
    await updateKingdom(kingdom => {
        for (const hex of fulfilledHexes) {
            const targetHex = kingdom.hexes?.find((h: any) => h.id === hex.id);
            if (targetHex?.features) {
                const demandedFeature = targetHex.features.find((f: any) => f.type === 'demanded');
                const eventInstanceId = demandedFeature?.eventInstanceId;
                
                // Remove 'demanded' feature
                targetHex.features = targetHex.features.filter((f: any) => f.type !== 'demanded');
                logger.info(`[EventPhaseController] Removed 'demanded' feature from hex ${hex.id}`);
                
                // Mark event as resolved if we have the instance ID
                if (eventInstanceId) {
                    const idx = kingdom.pendingOutcomes?.findIndex((i: any) => i.previewId === eventInstanceId);
                    if (idx !== undefined && idx >= 0) {
                        kingdom.pendingOutcomes[idx].status = 'resolved';
                        logger.info(`[EventPhaseController] Marked event ${eventInstanceId} as resolved`);
                    }
                }
            }
        }
    });
}

export async function createEventPhaseController() {
    const modifierService = await createModifierService();
    const gameCommandsService = await createGameCommandsService();
    // Initialize OutcomePreviewService once per controller instance
    const outcomePreviewService = await createOutcomePreviewService();
    
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
                const kingdom = actor?.getKingdomData();
                
                // Apply custom modifiers at the start of Events phase
                const { applyCustomModifiers } = await import('../services/domain/CustomModifierService');
                await applyCustomModifiers({ phase: 'Events' });
                
                // NEW ARCHITECTURE: Clear completed events and reset ongoing event resolutions
                await outcomePreviewService.clearCompleted('event', kingdom?.currentTurn);
                await outcomePreviewService.clearOngoingResolutions('event');
                
                // Check for fulfilled demand-expansion events (target hex was claimed)
                await checkDemandExpansionFulfilled(kingdom);
                
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
         * Trigger a specific event by ID (for debug/testing)
         * Bypasses the random roll and directly sets up the event
         */
        async triggerSpecificEvent(eventId: string): Promise<{
            success: boolean;
            error?: string;
        }> {
            try {
                // Get the event from registry
                const event = pipelineRegistry.getPipeline(eventId);
                if (!event) {
                    logger.error(`❌ [EventPhaseController] Event ${eventId} not found`);
                    return { success: false, error: 'Event not found' };
                }
                
                state.currentEvent = event;
                state.eventCheckRoll = 20; // Auto-succeed
                state.eventDC = 15; // Reset DC
                
                // Create instance for the event
                const { getKingdomActor } = await import('../stores/KingdomStore');
                const actor = getKingdomActor();
                const kingdom = actor?.getKingdomData();
                
                if (actor && kingdom) {
                    // Create new instance
                    const instanceId = await outcomePreviewService.createInstance(
                        'event',
                        event.id,
                        event,
                        kingdom.currentTurn
                    );
                    
                    // Update kingdom state to mark event as triggered
                    await actor.updateKingdomData((kingdom: any) => {
                        kingdom.eventDC = 15;
                        
                        if (kingdom.turnState) {
                            kingdom.turnState.eventsPhase.eventRolled = true;
                            kingdom.turnState.eventsPhase.eventRoll = 20;
                            kingdom.turnState.eventsPhase.eventTriggered = true;
                            kingdom.turnState.eventsPhase.eventId = event.id;
                            kingdom.turnState.eventsPhase.eventInstanceId = instanceId;
                        }
                    });
                    
                    // Complete the event roll step
                    await completePhaseStepByIndex(EventsPhaseSteps.EVENT_ROLL);
                    
                    logger.info(`✅ [EventPhaseController] Triggered event: ${event.name}`);
                    return { success: true };
                }
                
                return { success: false, error: 'No kingdom actor found' };
            } catch (error) {
                logger.error(`❌ [EventPhaseController] Error triggering event:`, error);
                return { 
                    success: false, 
                    error: error instanceof Error ? error.message : 'Unknown error' 
                };
            }
        },
        
        /**
         * Perform event check with DC management
         */
        async performEventCheck(currentDC: number): Promise<{
            triggered: boolean;
            event: CheckPipeline | null;
            roll: number;
            newDC: number;
        }> {
            // Check if event roll step is already completed (using type-safe constant)
            if (await isStepCompletedByIndex(EventsPhaseSteps.EVENT_ROLL)) {

                return {
                    triggered: !!state.currentEvent,
                    event: state.currentEvent,
                    roll: state.eventCheckRoll,
                    newDC: state.eventDC
                };
            }

            // Get kingdom to check current turn - use store for reactivity
            const { getKingdomActor, kingdomData } = await import('../stores/KingdomStore');
            const { get } = await import('svelte/store');
            const actor = getKingdomActor();

            // Use the reactive store instead of direct actor flag read
            // This ensures we get the latest data that the UI is displaying
            const storeKingdom = get(kingdomData);
            const currentTurn = storeKingdom?.currentTurn || 1;

            logger.info(`[EventPhaseController] performEventCheck - currentTurn from store: ${currentTurn}`);

            // No events on turn 1 - skip entirely (no roll, no DC change)
            if (currentTurn === 1) {
                if (actor) {
                    await actor.updateKingdomData((kingdom: any) => {
                        if (kingdom.turnState) {
                            kingdom.turnState.eventsPhase.eventRolled = true;
                            kingdom.turnState.eventsPhase.eventRoll = 0;
                            kingdom.turnState.eventsPhase.eventTriggered = false;
                            kingdom.turnState.eventsPhase.eventId = null;
                        }
                    });
                }

                await completePhaseStepByIndex(EventsPhaseSteps.EVENT_ROLL);
                await completePhaseStepByIndex(EventsPhaseSteps.RESOLVE_EVENT);
                await completePhaseStepByIndex(EventsPhaseSteps.APPLY_MODIFIERS);

                logger.info('[EventPhaseController] Turn 1 - events skipped');

                return {
                    triggered: false,
                    event: null,
                    roll: 0,
                    newDC: currentDC
                };
            }

            // Roll d20 for event check
            const roll = Math.floor(Math.random() * 20) + 1;
            const triggered = roll >= currentDC;

            state.eventCheckRoll = roll;
            
            let newDC: number;
            let event: CheckPipeline | null = null;
            
            if (triggered) {
                // Event triggered - get random event and reset DC to 15
                // Filter events by requirements (e.g., military-exercises requires armies)
                const allEvents = pipelineRegistry.getPipelinesByType('event')
                    .filter(evt => {
                        if (!evt.requirements) return true;
                        return evt.requirements(kingdom!).met;
                    });

                // Edge case: no available events (all filtered out)
                if (allEvents.length === 0) {
                    logger.info('[EventPhaseController] All events filtered by requirements - treating as no event');
                    newDC = Math.max(6, currentDC - 5);

                    // Update kingdom state (same as "no event" branch)
                    const { getKingdomActor } = await import('../stores/KingdomStore');
                    const actor = getKingdomActor();
                    if (actor) {
                        await actor.updateKingdomData((kingdom: any) => {
                            kingdom.eventDC = newDC;
                            if (kingdom.turnState) {
                                kingdom.turnState.eventsPhase.eventRolled = true;
                                kingdom.turnState.eventsPhase.eventRoll = roll;
                                kingdom.turnState.eventsPhase.eventTriggered = false;
                                kingdom.turnState.eventsPhase.eventId = null;
                            }
                        });
                    }
                    await completePhaseStepByIndex(EventsPhaseSteps.RESOLVE_EVENT);
                    await completePhaseStepByIndex(EventsPhaseSteps.APPLY_MODIFIERS);
                } else {
                    event = allEvents[Math.floor(Math.random() * allEvents.length)] as any;
                    newDC = 15;
                }

                if (event) {
                    state.currentEvent = event;

                    // ✅ ARCHITECTURE FIX: Create OutcomePreview IMMEDIATELY (or reuse if exists)
                    const { getKingdomActor } = await import('../stores/KingdomStore');
                    const actor = getKingdomActor();
                    const kingdom = actor?.getKingdomData();
                    
                    if (actor && kingdom && event) {
                        // Check if this event already exists as an ongoing instance
                        const existingInstance = kingdom.pendingOutcomes?.find(
                            (i: any) => i.checkType === 'event' && i.checkId === event!.id && i.status === 'pending'
                        );
                        
                        let instanceId: string;
                        
                        if (existingInstance) {
                            // Reuse existing ongoing instance
                            instanceId = existingInstance.instanceId;

                        } else {
                            // Create new instance via CheckInstanceService
                            instanceId = await outcomePreviewService.createInstance(
                                'event',
                                event.id,
                                event,
                                kingdom.currentTurn
                            );

                        }
                        
                        // Update persistent DC and turnState (mark as current event)
                        const eventId = event.id; // Capture for callback
                        await actor.updateKingdomData((kingdom: any) => {
                            // Update persistent DC (survives across turns)
                            kingdom.eventDC = newDC;
                            
                            // Update turnState (for current turn display - roll numbers + current marker)
                            if (kingdom.turnState) {
                                kingdom.turnState.eventsPhase.eventRolled = true;
                                kingdom.turnState.eventsPhase.eventRoll = roll;
                                kingdom.turnState.eventsPhase.eventTriggered = true;
                                kingdom.turnState.eventsPhase.eventId = eventId;  // Marks as "current event"
                                kingdom.turnState.eventsPhase.eventInstanceId = instanceId;  // ✅ Ties marker to specific instance
                            }
                        });
                    }
                    
                    // Step 1 (Resolve Event) remains INCOMPLETE - player must resolve
                    // Step 2 (Apply Modifiers) remains INCOMPLETE - will complete with step 1

                }
            } else {
                // No event - reduce DC by 5 (minimum 6)
                newDC = Math.max(6, currentDC - 5);

                // Update persistent DC and turnState
                const { getKingdomActor } = await import('../stores/KingdomStore');
                const actor = getKingdomActor();
                if (actor) {
                    await actor.updateKingdomData((kingdom: any) => {
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
         * Uses the pipeline system to execute event outcomes
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
            const event = pipelineRegistry.getPipeline(eventId);
            if (!event) {
                logger.error(`❌ [EventPhaseController] Event ${eventId} not found`);
                return { success: false, error: 'Event not found' };
            }
            
            const outcomeData = event.outcomes[outcome];
            const { getKingdomActor } = await import('../stores/KingdomStore');
            const actor = getKingdomActor();
            const kingdom = actor?.getKingdomData();
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

            }
            
            // Check if this event already exists as an ongoing instance
            const existingInstance = kingdom?.pendingOutcomes?.find(
                (instance: any) => instance.checkType === 'event' && instance.checkId === event.id && instance.status === 'pending'
            );
            
            // NEW ARCHITECTURE: Create or update OutcomePreview for ongoing events
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
            
            // Create instance using NEW system (pendingOutcomes, not activeEventInstances)
            if (shouldCreateInstance && !existingInstance) {
                // First time: Create new instance via CheckInstanceService
                newInstanceId = await outcomePreviewService.createInstance(
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

                    }
                });
            } else if (existingInstance) {
                // Reroll case: Instance already exists, just apply effects

            }
            
            // Apply numeric modifiers from resolutionData (pre-rolled dice values)
            const { applyResolvedOutcome } = await import('../services/resolution');
            await applyResolvedOutcome(resolutionData, outcome);

            // Execute pipeline for game commands (damageStructure, etc.) if one exists
            // Note: Modifiers are already applied above, so pipeline.execute should only handle game commands
            const pipeline = pipelineRegistry.getPipeline(eventId);

            if (pipeline?.execute) {
                const executeContext = {
                    outcome,
                    kingdom,
                    resolutionData,
                    check: pipeline,
                    metadata: {},
                    modifiersAlreadyApplied: true  // Signal to skip applyPipelineModifiers
                };

                const executeResult = await pipeline.execute(executeContext);
                if (!executeResult.success) {
                    logger.error(`❌ [EventPhaseController] Pipeline execute failed:`, executeResult.error);
                }
            }

            // Complete phase steps
            await completePhaseStepByIndex(EventsPhaseSteps.RESOLVE_EVENT);
            await completePhaseStepByIndex(EventsPhaseSteps.APPLY_MODIFIERS);
            
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
                    if (!kingdom.pendingOutcomes) return;
                    
                    const instance = kingdom.pendingOutcomes.find(i => i.previewId === targetInstanceId);
                    if (instance) {
                        // Store outcome for both rolled and ignored events
                        instance.appliedOutcome = {
                            outcome,
                            actorName: actorName || 'Event Ignored',
                            skillName: skillName || '',
                            effect: outcomeData?.description || '',
                            modifiers: resolvedModifiers,  // ✅ RESOLVED values, not raw modifiers
                            manualEffects: outcomeData?.manualEffects || [],
                            gameCommands: outcomeData?.gameCommands || [],
                            effectsApplied: true,  // ✅ Mark effects as applied inside appliedOutcome (syncs across clients)
                            shortfallResources: []  // Events don't have shortfall resources
                        };
                        
                        // Clear resolution progress after successful application
                        instance.resolutionProgress = undefined;

                    }
                });
            }
            
            // After resolution, handle instance status based on whether event ends
            // - endsEvent: true -> status = 'resolved' (event is done)
            // - endsEvent: false -> status = 'pending' (ongoing, needs to persist for overlays)
            if (!isIgnored) {
                await updateKingdom(kingdom => {
                    // Find the instance (either existing or newly created)
                    const instance = kingdom.pendingOutcomes?.find(
                        i => i.checkType === 'event' && i.checkId === eventId
                    );
                    if (instance) {
                        if (outcomeData?.endsEvent === false) {
                            // Ongoing event - reset to 'pending' so overlays can find it
                            // (storeOutcome sets 'resolved', but ongoing events need to stay 'pending')
                            instance.status = 'pending';
                            logger.info(`[EventPhaseController] Ongoing event ${eventId} - status reset to 'pending'`);
                        } else if (outcomeData?.endsEvent) {
                            instance.status = 'resolved';
                            
                            // If this was a demand-expansion event that ends, remove the 'demanded' feature
                            if (eventId === 'demand-expansion' && instance.metadata?.targetHexId) {
                                const hex = kingdom.hexes?.find((h: any) => h.id === instance.metadata.targetHexId);
                                if (hex?.features) {
                                    hex.features = hex.features.filter((f: any) => f.type !== 'demanded');
                                    logger.info(`[EventPhaseController] Removed 'demanded' feature from hex ${instance.metadata.targetHexId} - event ended`);
                                }
                            }
                        }
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

                    }
                    
                    // If it was the active event, clear it (moves to ongoing section)
                    // ✅ CRITICAL FIX: Check BOTH eventId AND instanceId to prevent clearing wrong event
                    const currentInstanceId = existingInstance?.instanceId || newInstanceId;
                    if (kingdom.turnState.eventsPhase.eventId === eventId && 
                        kingdom.turnState.eventsPhase.eventInstanceId === currentInstanceId) {
                        kingdom.turnState.eventsPhase.eventId = null;
                        kingdom.turnState.eventsPhase.eventInstanceId = null;
                        kingdom.turnState.eventsPhase.eventTriggered = false;

                    } else if (kingdom.turnState.eventsPhase.eventId === eventId) {
                        // Different instance - don't clear the marker

                    }
                });
            }
            
            // NOTE: We DON'T clear immediate event instances here anymore
            // They stay as 'resolved' status and appear in the "Resolved Events" section
            // They will be cleaned up at the start of the NEXT Events phase by startPhase()
            // This allows players to see what events were resolved this turn
            
            // Check if all events have effects applied (phase completion)
            const updatedActor = getKingdomActor();
            const updatedKingdomState = updatedActor?.getKingdomData();
            const pendingInstances = updatedKingdomState?.pendingOutcomes?.filter(
                (i: any) => i.checkType === 'event' && i.status === 'pending'
            ) || [];
            const allEffectsApplied = pendingInstances.length === 0 || pendingInstances.every((i: any) => 
                i.appliedOutcome?.effectsApplied === true
            );
            
            if (allEffectsApplied && !updatedKingdomState?.turnState?.eventsPhase?.eventId) {

                await completePhaseStepByIndex(EventsPhaseSteps.RESOLVE_EVENT);
                await completePhaseStepByIndex(EventsPhaseSteps.APPLY_MODIFIERS);
            }
            
            return { success: true };
        },
        
        /**
         * Ignore event - controller method (called from UI)
         * 
         * @deprecated Use ignoreEventService.ignoreEvent() directly instead.
         * This method is kept for backwards compatibility but delegates to the service.
         */
        async ignoreEvent(eventId: string, metadata?: Record<string, any>): Promise<{ success: boolean; error?: string }> {
            // Delegate to centralized IgnoreEventService
            const { ignoreEventService } = await import('../services/IgnoreEventService');
            return ignoreEventService.ignoreEvent(eventId, {
                isDebugTest: metadata?.isDebugTest || false
            });
        },
        
        /**
         * Get outcome modifiers for an event
         * (Follows same pattern as ActionPhaseController.getActionModifiers)
         */
        getEventModifiers(event: CheckPipeline, outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure') {
            const outcomeData = event.outcomes[outcome];
            
            return {
                description: outcomeData?.description || '',
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

            return allComplete;
        }
    };
}
