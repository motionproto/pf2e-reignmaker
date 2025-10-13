<script lang="ts">
   import { onMount, onDestroy } from 'svelte';
   import { kingdomData, getKingdomActor, updateKingdom, getTurnManager } from '../../../stores/KingdomStore';
   import { TurnPhase } from '../../../actors/KingdomActor';
   import { get } from 'svelte/store';
   
   // Props
   export let isViewingCurrentPhase: boolean = true;
   
   // Import controller instead of services/commands directly
   import { createEventPhaseController } from '../../../controllers/EventPhaseController';
   
   // Import existing services and components
   import type { EventData } from '../../../controllers/events/event-loader';
   import type { EventSkill } from '../../../types/events';
   import { eventService } from '../../../controllers/events/event-loader';
   import Button from '../components/baseComponents/Button.svelte';
   import BaseCheckCard from '../components/BaseCheckCard.svelte';
   import PlayerActionTracker from '../components/PlayerActionTracker.svelte';
   import DebugEventSelector from '../components/DebugEventSelector.svelte';
   import OngoingEventCard from '../components/OngoingEventCard.svelte';
   import AidSelectionDialog from '../components/AidSelectionDialog.svelte';
   import ActionConfirmDialog from '../components/ActionConfirmDialog.svelte';
   import CustomModifierDisplay from '../components/CustomModifierDisplay.svelte';
   import { createGameEffectsService } from '../../../services/GameEffectsService';
   import {
     getCurrentUserCharacter,
     showCharacterSelectionDialog,
     performKingdomActionRoll,
     initializeRollResultHandler
   } from '../../../services/pf2e';
   import { createCheckHandler } from '../../../controllers/shared/CheckHandler';
   import { buildPossibleOutcomes } from '../../../controllers/shared/PossibleOutcomeHelpers';
   // Removed: createCheckResultHandler - now calling controller directly
   
   // Initialize controller and service
   let eventPhaseController: any;
   let gameEffectsService: any;
   let checkHandler: any;
   
   // UI State (no business logic)
   let isRolling = false;
   let currentEvent: EventData | null = null;
   let possibleOutcomes: any[] = [];
   
   // Resolution state for current event
   let eventResolution: {
     outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
     actorName: string;
     skillName: string;
     effect: string;
     stateChanges?: Record<string, any>;
     modifiers?: any[];
     manualEffects?: string[];
     shortfallResources?: string[];
     rollBreakdown?: any;
     isIgnored?: boolean;  // Flag to hide reroll button for ignored events
   } | null = null;
   let eventResolved = false;
   
   // Track resolutions for ongoing events separately
   let ongoingEventResolutions = new Map<string, {
     outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
     actorName: string;
     skillName: string;
     effect: string;
     stateChanges?: Record<string, any>;
     modifiers?: any[];
     manualEffects?: string[];
     shortfallResources?: string[];
     rollBreakdown?: any;
   }>();
   
   // Aid dialog state
   let showAidSelectionDialog = false;
   let showActionConfirm = false;
   let pendingAidSkill = '';
   let pendingSkillExecution: { skill: string } | null = null;
   
   // Current user ID
   let currentUserId: string | null = null;
   
   // Check if current user is GM
   $: isGM = (globalThis as any).game?.user?.isGM || false;
   
   // Computed UI state - use shared helper for step completion
   import { getStepCompletion } from '../../../controllers/shared/PhaseHelpers';
   $: currentSteps = $kingdomData.currentPhaseSteps || [];
   $: eventChecked = getStepCompletion(currentSteps, 0); // Step 0 = event-check
   $: eventResolvedFromState = getStepCompletion(currentSteps, 1); // Step 1 = resolve-event
   $: eventDC = $kingdomData.eventDC || 15;
   // NEW ARCHITECTURE: Read from unified activeCheckInstances filtered by type
   $: activeEventInstances = $kingdomData.activeCheckInstances?.filter(i => i.checkType === 'event') || [];
   $: activeModifiers = $kingdomData.activeModifiers || [];
   
   // ✅ NEW ARCHITECTURE: Get current event instance from turnState.eventId
   $: currentEventInstance = $kingdomData.turnState?.eventsPhase?.eventId 
      ? activeEventInstances.find(i => i.checkId === $kingdomData.turnState?.eventsPhase?.eventId)
      : null;
   
   // Filter instances: ongoing = pending but NOT current, resolved = resolved status
   $: ongoingEventInstances = activeEventInstances.filter(instance => 
      instance.status === 'pending' && 
      instance.checkId !== $kingdomData.turnState?.eventsPhase?.eventId
   );
   $: resolvedEventInstances = activeEventInstances.filter(instance => instance.status === 'resolved');
   $: customModifiers = activeModifiers;  // All modifiers are now custom (no event data)
   
   // Build outcomes for ongoing events from activeCheckInstances  
   $: ongoingEventsWithOutcomes = ongoingEventInstances.map(instance => {
      const event = instance.checkData as EventData;  // NEW ARCHITECTURE: checkData instead of eventData
      const outcomes: Array<{
         type: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
         description: string;
      }> = [];
      
      if (event.effects.criticalSuccess) {
         outcomes.push({ type: 'criticalSuccess', description: event.effects.criticalSuccess.msg });
      }
      if (event.effects.success) {
         outcomes.push({ type: 'success', description: event.effects.success.msg });
      }
      if (event.effects.failure) {
         outcomes.push({ type: 'failure', description: event.effects.failure.msg });
      }
      if (event.effects.criticalFailure) {
         outcomes.push({ type: 'criticalFailure', description: event.effects.criticalFailure.msg });
      }
      
      // Check if someone is currently resolving this event
      const progress = instance.resolutionProgress;
      const isBeingResolved = !!progress;
      const isResolvedByMe = progress?.playerId === currentUserId;
      const isResolvedByOther = isBeingResolved && !isResolvedByMe;
      const resolverName = progress?.playerName || 'Another player';
      
      return {
         instance,
         event,
         outcomes,
         possibleOutcomes: buildPossibleOutcomes(event.effects),
         isBeingResolved,
         isResolvedByMe,
         isResolvedByOther,
         resolverName
      };
   });
   
   $: stabilityRoll = $kingdomData.turnState?.eventsPhase?.eventRoll || 0;
   $: showStabilityResult = $kingdomData.turnState?.eventsPhase?.eventRoll !== null;
   $: rolledAgainstDC = eventDC;
   $: eventWasTriggered = $kingdomData.turnState?.eventsPhase?.eventTriggered ?? null;
   $: activeAidsCount = $kingdomData?.turnState?.eventsPhase?.activeAids?.length || 0;
   
   // Reactively load event when eventId changes (from turnState)
   $: if ($kingdomData.turnState?.eventsPhase?.eventId) {
      const event = eventService.getEventById($kingdomData.turnState.eventsPhase.eventId);
      if (event) {
         currentEvent = event;
         console.log('[EventsPhase] Event updated via reactive statement:', event.name);
      }
   } else if ($kingdomData.turnState?.eventsPhase?.eventId === null) {
      currentEvent = null;
      console.log('[EventsPhase] Event cleared via reactive statement');
   }
   
   onMount(async () => {
      // Initialize the controller and service
      eventPhaseController = await createEventPhaseController(null);
      gameEffectsService = await createGameEffectsService();
      checkHandler = createCheckHandler();
      
      // Initialize the phase (this sets up currentPhaseSteps!)
      await eventPhaseController.startPhase();
      console.log('[EventsPhase] Phase initialized with controller');
      
      // Store current user ID
      const game = (window as any).game;
      currentUserId = game?.user?.id || null;
      
      // Check if an event was already rolled by another client
      if ($kingdomData.turnState?.eventsPhase?.eventId) {
         console.log('[EventsPhase] Loading existing event from turnState:', $kingdomData.turnState.eventsPhase.eventId);
         const event = eventService.getEventById($kingdomData.turnState.eventsPhase.eventId);
         if (event) {
            currentEvent = event;
         }
      }
      
      // Check for persisted applied outcomes
      if ($kingdomData?.turnState?.eventsPhase?.appliedOutcomes && $kingdomData.turnState.eventsPhase.appliedOutcomes.length > 0) {
         const appliedOutcome = $kingdomData?.turnState?.eventsPhase.appliedOutcomes[0];
         if (currentEvent && appliedOutcome && appliedOutcome.eventId === currentEvent.id) {
            // Restore resolved state
            eventResolved = true;
            eventResolution = {
               outcome: appliedOutcome.outcome,
               actorName: appliedOutcome.eventName,
               skillName: appliedOutcome.skillUsed,
               effect: appliedOutcome.effect,
               stateChanges: appliedOutcome.stateChanges,
               modifiers: appliedOutcome.modifiers,
               manualEffects: appliedOutcome.manualEffects
            };
         }
      }
      
      // Listen for roll completion to clear aids
      window.addEventListener('kingdomRollComplete', handleRollComplete as any);
      initializeRollResultHandler();
   });
   
   onDestroy(() => {
      window.removeEventListener('kingdomRollComplete', handleRollComplete as any);
      checkHandler?.cleanup();
   });
   
   // Use controller for event check logic
   async function performEventCheck() {
      if (!eventPhaseController) return;
      
      // Check if another client already rolled for an event
      if ($kingdomData.turnState?.eventsPhase?.eventId) {
         console.log('[EventsPhase] Event already rolled by another client, loading existing event');
         // Load the event by ID
         const event = eventService.getEventById($kingdomData.turnState.eventsPhase.eventId);
         if (event) {
            currentEvent = event;
         }
         return;
      }
      
      isRolling = true;
      
      // Save the current DC before it changes
      const currentDC = eventDC;
      
      // Animate the roll
      setTimeout(async () => {
         // Use the controller to perform the event check
         // The controller handles ALL kingdom updates including step completion
         const checkResult = await eventPhaseController.performEventCheck(currentDC);
         
         // Only update local UI state - kingdom state is managed by controller
         if (checkResult.event) {
            currentEvent = checkResult.event;
         }
         
         // Store the DC that was rolled against for display
         rolledAgainstDC = currentDC;
         
         isRolling = false;
      }, 1000);
   }
   
   // Build possible outcomes for the event (synchronous - must be available for render)
   $: possibleOutcomes = currentEvent ? buildPossibleOutcomes(currentEvent.effects) : [];
   
   // Build outcomes array for BaseCheckCard
   $: eventOutcomes = currentEvent ? (() => {
      const outcomes: Array<{
         type: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
         description: string;
         modifiers?: Array<{ resource: string; value: number }>;
      }> = [];
      
      if (currentEvent.effects.criticalSuccess) {
         outcomes.push({
            type: 'criticalSuccess',
            description: currentEvent.effects.criticalSuccess.msg
         });
      }
      if (currentEvent.effects.success) {
         outcomes.push({
            type: 'success',
            description: currentEvent.effects.success.msg
         });
      }
      if (currentEvent.effects.failure) {
         outcomes.push({
            type: 'failure',
            description: currentEvent.effects.failure.msg
         });
      }
      if (currentEvent.effects.criticalFailure) {
         outcomes.push({
            type: 'criticalFailure',
            description: currentEvent.effects.criticalFailure.msg
         });
      }
      
      return outcomes;
   })() : [];
   
   // Event handler - execute skill check
   async function handleExecuteSkill(event: CustomEvent) {
      if (!checkHandler || !eventPhaseController) return;
      
      const { skill, eventId, outcome } = event.detail;
      
      // Determine which event this skill check is for
      let targetEvent = currentEvent;
      
      // If eventId is provided and it's not the current event, check ongoing events
      if (eventId && (!currentEvent || currentEvent.id !== eventId)) {
         const ongoingEvent = ongoingEventsWithOutcomes.find(item => item.instance.instanceId === eventId);
         if (ongoingEvent) {
            targetEvent = ongoingEvent.event;
         }
      }
      
      if (!targetEvent) {
         console.error('[EventsPhase] No event found for skill check');
         return;
      }
      
      // Store the target event temporarily for the skill check
      const previousEvent = currentEvent;
      currentEvent = targetEvent;
      
      // Check if THIS PLAYER has already performed an action using actionLog
      const actionLog = $kingdomData.turnState?.actionLog || [];
      const hasPlayerActed = actionLog.some((entry: any) => 
         entry.playerId === currentUserId && 
         (entry.phase === TurnPhase.ACTIONS || entry.phase === TurnPhase.EVENTS)
      );
      
      if (hasPlayerActed) {
         // Show confirmation dialog
         pendingSkillExecution = { skill };
         showActionConfirm = true;
         return;
      }
      
      // Mark that this player is starting to resolve (multi-player coordination)
      if (outcome) {
         await eventPhaseController.startResolvingEvent(targetEvent.id, outcome, false);
      }
      
      // Execute the skill check
      await executeSkillCheck(skill);
      
      // Restore previous event if we switched
      if (previousEvent !== targetEvent) {
         currentEvent = previousEvent;
      }
   }
   
   async function executeSkillCheck(skill: string) {
      if (!currentEvent || !checkHandler || !eventPhaseController) return;
      
      // Capture the event ID for closure
      const eventId = currentEvent.id;
      const isOngoingEvent = ongoingEventsWithOutcomes.some(item => item.instance.instanceId === eventId);
      
      // Note: Action spending is handled by GameEffectsService.trackPlayerAction()
      // when the result is applied
      
      await checkHandler.executeCheck({
         checkType: 'event',
         item: currentEvent,
         skill,
         
         onStart: () => {
            console.log(`🎬 [EventsPhase] Starting event check with skill: ${skill}`);
            isRolling = true;
         },
         
         onComplete: async (result: any) => {
            console.log(`✅ [EventsPhase] Event check completed:`, result.outcome);
            isRolling = false;
            
            // ARCHITECTURE: Delegate to controller for outcome data extraction
            if (!currentEvent) return;
            const outcomeData = eventPhaseController.getEventModifiers(currentEvent, result.outcome);
            
            const resolution = {
               outcome: result.outcome,
               actorName: result.actorName,
               skillName: skill,
               effect: outcomeData.msg,
               modifiers: outcomeData.modifiers,
               manualEffects: outcomeData.manualEffects,
               shortfallResources: [],
               rollBreakdown: result.rollBreakdown,
               effectsApplied: false
            };
            
            if (isOngoingEvent) {
               // Store in KingdomActor (synced to all clients!)
               await updateKingdom(kingdom => {
                  if (!kingdom.activeCheckInstances) return;
                  const instance = kingdom.activeCheckInstances.find((i: any) => i.checkType === 'event' && i.checkId === eventId);
                  if (instance) {
                     instance.appliedOutcome = resolution;
                     console.log(`✅ [EventsPhase] Stored ongoing event resolution in instance: ${instance.instanceId}`);
                  }
               });
            } else {
               // Store in main event resolution (local state, current event only)
               eventResolution = resolution;
               eventResolved = true;
            }
         },
         
         onCancel: () => {
            console.log(`🚫 [EventsPhase] Event check cancelled - resetting state`);
            isRolling = false;
            
            if (isOngoingEvent) {
               // Clear resolution from KingdomActor
               updateKingdom(kingdom => {
                  if (!kingdom.activeCheckInstances) return;
                  const instance = kingdom.activeCheckInstances.find((i: any) => i.checkType === 'event' && i.checkId === eventId);
                  if (instance) {
                     instance.appliedOutcome = undefined;
                     console.log(`🚫 [EventsPhase] Cleared ongoing event resolution from instance`);
                  }
               });
            } else {
               eventResolution = null;
               eventResolved = false;
            }
            
            // Note: Canceling doesn't add to actionLog, so player can still act
         },
         
         onError: (error: Error) => {
            console.error(`❌ [EventsPhase] Error in event check:`, error);
            isRolling = false;
            ui?.notifications?.error(`Failed to perform event check: ${error.message}`);
         }
      });
   }
   
   // Event handler - apply result
   async function handleApplyResult(event: CustomEvent) {
      console.log(`📝 [EventsPhase] handleApplyResult called`);
      
      // NEW ARCHITECTURE: event.detail contains both resolution and checkId
      const resolutionData = event.detail.resolution;
      const checkId = event.detail.checkId;
      
      console.log(`� [EventsPhase] Event detail received:`, event.detail);
      console.log(`📋 [EventsPhase] ResolutionData:`, resolutionData);
      console.log(`🔍 [EventsPhase] CheckId:`, checkId);
      
      // Determine which event and resolution to use
      let targetEvent: EventData | null = null;
      let resolution: any = null;
      
      // Check if this is an ongoing event or current event
      if (checkId && checkId !== currentEvent?.id) {
         // Ongoing event - look up by instanceId (not event.id!)
         const ongoingEvent = ongoingEventsWithOutcomes.find(item => item.instance.instanceId === checkId);
         if (ongoingEvent) {
            targetEvent = ongoingEvent.event;
            resolution = ongoingEvent.instance.appliedOutcome;  // ✅ Get from instance
            console.log(`🔄 [EventsPhase] Applying ongoing event: ${targetEvent.name}`);
         }
      } else {
         // Current event
         targetEvent = currentEvent;
         resolution = eventResolution;
         console.log(`📍 [EventsPhase] Applying current event: ${targetEvent?.name}`);
      }
      
      // Validate we have what we need
      if (!resolution || !targetEvent) {
         console.error(`❌ [EventsPhase] Missing resolution or event:`, { resolution, targetEvent });
         return;
      }
      
      console.log(`� [EventsPhase] Applying event result for ${targetEvent?.name}:`, resolution.outcome);
      
      // Call controller directly with ResolutionData
      const { createEventPhaseController } = await import('../../../controllers/EventPhaseController');
      const controller = await createEventPhaseController(null);
      
      // Pass isIgnored flag to controller
      const isIgnored = resolution.isIgnored || false;
      
      const result = await controller.resolveEvent(
         targetEvent.id,
         resolution.outcome,
         resolutionData,
         isIgnored,
         resolution.actorName,
         resolution.skillName
      );
      
      if (result.success) {
         console.log(`✅ [EventsPhase] Event resolution applied successfully`);
         
         // Parse shortfall information from the new result structure
         const shortfalls: string[] = [];
         if (result.applied?.applied?.specialEffects) {
            for (const effect of result.applied.applied.specialEffects) {
               if (effect.startsWith('shortage_penalty:')) {
                  shortfalls.push(effect.split(':')[1]);
               }
            }
         }
         
         if (shortfalls.length > 0) {
            resolution.shortfallResources = shortfalls;
         }
         
         // Note: No manual clearing needed - the reactive statement will handle it
         // when the controller updates turnState.eventsPhase.eventId = null
      } else {
         console.error(`❌ [EventsPhase] Failed to apply event resolution:`, result.error);
         ui?.notifications?.error(`Failed to apply result: ${result.error || 'Unknown error'}`);
      }
   }
   
   // Event handler - cancel resolution
   async function handleCancel() {
      console.log(`🔄 [EventsPhase] User cancelled outcome - resetting for re-roll`);
      
      // Clear local UI state
      eventResolution = null;
      eventResolved = false;
      
      // Note: Canceling doesn't add to actionLog, so player can still act
   }
   
   // Event handler - perform reroll (OutcomeDisplay handles fame)
   async function handlePerformReroll(event: CustomEvent) {
      if (!currentEvent) return;

      const { skill, previousFame } = event.detail;
      console.log(`🔁 [EventsPhase] Performing reroll with skill: ${skill}`);

      // Reset UI state for new roll
      await handleCancel();

      // Small delay to ensure UI updates
      await new Promise(resolve => setTimeout(resolve, 100));

      // Trigger new roll
      try {
         await executeSkillCheck(skill);
      } catch (error) {
         console.error('[EventsPhase] Error during reroll:', error);
         // Restore fame if the roll failed
         const { restoreFameAfterFailedReroll } = await import('../../../controllers/shared/RerollHelpers');
         if (previousFame !== undefined) {
            await restoreFameAfterFailedReroll(previousFame);
         }
         ui?.notifications?.error('Failed to reroll. Fame has been restored.');
      }
   }
   
   // Event handler - ignore event (delegate to controller)
   async function handleIgnore(event: CustomEvent) {
      if (!eventPhaseController) return;
      
      const { checkId } = event.detail;
      
      // Determine which event this ignore is for
      let targetEventId: string | null = null;
      
      // If checkId is provided and it's not the current event, check ongoing events
      if (checkId && (!currentEvent || currentEvent.id !== checkId)) {
         const ongoingEvent = ongoingEventsWithOutcomes.find(item => item.instance.instanceId === checkId);
         if (ongoingEvent) {
            targetEventId = ongoingEvent.event.id;
         }
      } else if (currentEvent) {
         targetEventId = currentEvent.id;
      }
      
      if (!targetEventId) {
         console.error('[EventsPhase] No event found for ignore');
         return;
      }
      
      console.log(`🚫 [EventsPhase] Delegating ignore to controller: ${targetEventId}`);
      
      // ✅ ARCHITECTURE FIX: Delegate to controller, no business logic in UI
      const result = await eventPhaseController.ignoreEvent(targetEventId);
      
      if (result.success) {
         // Clear local state if it was the current event
         if (currentEvent && currentEvent.id === targetEventId) {
            eventResolution = null;
            eventResolved = false;
         }
         console.log(`✅ [EventsPhase] Event ignored successfully`);
      } else {
         console.error(`❌ [EventsPhase] Failed to ignore event: ${result.error}`);
         ui?.notifications?.error(`Failed to ignore event: ${result.error}`);
      }
   }
   
   // Event handler - aid another
   function handleAid() {
      if (!currentEvent) return;
      showAidSelectionDialog = true;
   }
   
   // Aid dialog confirmation
   async function handleAidConfirm(event: CustomEvent) {
      showAidSelectionDialog = false;
      const { skill } = event.detail;
      
      // Execute aid roll similar to ActionsPhase pattern
      await executeAidRoll(skill);
   }
   
   // Aid dialog cancellation
   function handleAidCancel() {
      showAidSelectionDialog = false;
   }
   
   // Execute aid roll
   async function executeAidRoll(skill: string) {
      if (!currentEvent) return;
      
      // Capture currentEvent for closure (prevents null issues)
      const eventForAid = currentEvent;
      const game = (window as any).game;
      
      // Note: Aid action spending is handled by GameEffectsService.trackPlayerAction()
      // when the aid is stored (see aidRollListener below)
      
      // Get character for roll
      let actingCharacter = getCurrentUserCharacter();
      
      if (!actingCharacter) {
         actingCharacter = await showCharacterSelectionDialog();
         if (!actingCharacter) {
            return; // User cancelled
         }
      }
      
      // Listen for roll completion
      const aidRollListener = async (e: any) => {
         const { checkId, outcome, actorName } = e.detail;
         
         if (checkId === `aid-${eventForAid.id}`) {
            window.removeEventListener('kingdomRollComplete', aidRollListener as any);
            
            // Calculate bonus
            const skillSlug = skill.toLowerCase();
            const skillData = actingCharacter.skills?.[skillSlug];
            const proficiencyRank = skillData?.rank || 0;
            
            let bonus = 0;
            let grantKeepHigher = false;
            
            if (outcome === 'criticalSuccess') {
               bonus = 4;
               grantKeepHigher = true;
            } else if (outcome === 'success') {
               if (proficiencyRank === 0) bonus = 1;
               else if (proficiencyRank <= 2) bonus = 2;
               else if (proficiencyRank === 3) bonus = 3;
               else bonus = 4;
            }
            
            // Store aid in turnState
            const actor = getKingdomActor();
            if (actor) {
               await actor.updateKingdom((kingdom) => {
                  if (!kingdom.turnState?.eventsPhase) return;
                  if (!kingdom.turnState.eventsPhase.activeAids) {
                     kingdom.turnState.eventsPhase.activeAids = [];
                  }
                  
                  kingdom.turnState.eventsPhase.activeAids.push({
                     playerId: game.user.id,
                     playerName: game.user.name,
                     characterName: actorName,
                     targetActionId: eventForAid.id,
                     skillUsed: skill,
                     outcome: outcome as any,
                     bonus,
                     grantKeepHigher,
                     timestamp: Date.now()
                  });
               });
               
               if (bonus > 0) {
                  ui?.notifications?.info(`You are now aiding ${eventForAid.name} with a +${bonus} bonus${grantKeepHigher ? ' and keep higher roll' : ''}!`);
               } else {
                  ui?.notifications?.warn(`Your aid attempt failed.`);
               }
            }
         }
      };
      
      window.addEventListener('kingdomRollComplete', aidRollListener as any);
      
      try {
         const characterLevel = actingCharacter.level || 1;
         const dc = eventPhaseController.getEventDC?.(characterLevel) || 15;
         
         await performKingdomActionRoll(
            actingCharacter,
            skill,
            dc,
            `Aid Another: ${eventForAid.name}`,
            `aid-${eventForAid.id}`,
            {
               criticalSuccess: { description: 'Exceptional aid (+4 bonus and keep higher roll)' },
               success: { description: 'Helpful aid (bonus based on proficiency)' },
               failure: { description: 'No effect' },
               criticalFailure: { description: 'No effect' }
            },
            eventForAid.id
         );
      } catch (error) {
         window.removeEventListener('kingdomRollComplete', aidRollListener as any);
         console.error('Error performing aid roll:', error);
         ui?.notifications?.error(`Failed to perform aid: ${error}`);
      }
   }
   
   // Event handler - debug outcome change
   async function handleDebugOutcomeChanged(event: CustomEvent) {
      if (!currentEvent || !eventResolution) return;
      
      const newOutcome = event.detail.outcome;
      console.log(`🐛 [EventsPhase] Debug outcome changed to: ${newOutcome}`);
      
      // Fetch new modifiers for the new outcome
      const outcomeData = eventPhaseController.getEventModifiers(currentEvent, newOutcome);
      
      // Update BOTH outcome AND modifiers
      eventResolution = {
         ...eventResolution,
         outcome: newOutcome,
         effect: outcomeData.msg,
         modifiers: outcomeData.modifiers,
         manualEffects: outcomeData.manualEffects
      };
   }
   
   // Action confirmation dialog handlers
   function handleActionConfirm() {
      if (pendingSkillExecution) {
         executeSkillCheck(pendingSkillExecution.skill);
         pendingSkillExecution = null;
      }
      showActionConfirm = false;
   }
   
   function handleActionCancelDialog() {
      pendingSkillExecution = null;
      showActionConfirm = false;
   }
   
   // Handle roll completion to clear aids
   async function handleRollComplete(event: CustomEvent) {
      const { checkId, checkType } = event.detail;
      
      if (checkType === 'event') {
         // Clear aid modifiers for this specific event after roll completes
         const actor = getKingdomActor();
         if (actor) {
            await actor.updateKingdom((kingdom) => {
               if (kingdom.turnState?.eventsPhase?.activeAids) {
                  const beforeCount = kingdom.turnState.eventsPhase.activeAids.length;
                  kingdom.turnState.eventsPhase.activeAids = 
                     kingdom.turnState.eventsPhase.activeAids.filter(
                        aid => aid.targetActionId !== checkId
                     );
                  const afterCount = kingdom.turnState.eventsPhase.activeAids.length;
                  
                  if (beforeCount > afterCount) {
                     console.log(`🧹 [EventsPhase] Cleared ${beforeCount - afterCount} aid(s) for event: ${checkId}`);
                  }
               }
            });
         }
      }
   }
   
   // Get aid result for the current event  
   $: aidResultForEvent = currentEvent ? (() => {
      const eventId = currentEvent.id; // Capture for closure
      const activeAids = $kingdomData?.turnState?.eventsPhase?.activeAids;
      if (!activeAids || activeAids.length === 0) return null;
      
      // Find the most recent aid for this event
      const aidsForEvent = activeAids.filter((aid: any) => aid.targetActionId === eventId);
      if (aidsForEvent.length === 0) return null;
      
      // Return the most recent aid (highest timestamp)
      const mostRecentAid = aidsForEvent.reduce((latest: any, current: any) => 
         current.timestamp > latest.timestamp ? current : latest
      );
      
      return {
         outcome: mostRecentAid.outcome,
         bonus: mostRecentAid.bonus
      };
   })() : null;
</script>

<div class="events-phase">
   <!-- Debug Event Selector (GM Only) -->
   {#if isGM}
      <DebugEventSelector type="event" currentItemId={$kingdomData.turnState?.eventsPhase?.eventId || null} />
   {/if}
   
   <!-- Event Check Section - Always show if event check hasn't been done, or show result after check -->
   {#if !eventChecked || showStabilityResult}
      <div class="event-check-section">
         <h3>Event Check</h3>
         <div class="dc-info">
            <span class="dc-label">Event DC:</span>
            <span class="dc-value">{eventDC}</span>
         </div>
         
         {#if !eventChecked}
            <Button 
               variant="secondary"
               on:click={performEventCheck}
               disabled={!isViewingCurrentPhase || isRolling}
               icon={isRolling ? 'fas fa-spinner' : 'fas fa-dice-d20'}
               iconPosition="left"
            >
               {#if isRolling}
                  Rolling...
               {:else}
                  Roll for Event
               {/if}
            </Button>
         {:else if eventWasTriggered === true}
            <!-- Event was triggered - show result banner -->
            <div class="check-result-display">
               <div class="roll-result success">
                  <strong>Event Triggered!</strong> (Rolled {stabilityRoll} ≥ DC {rolledAgainstDC})
                  <div>Resolve the event below.</div>
               </div>
            </div>
         {:else if eventWasTriggered === false}
            <!-- No event - show result message -->
            <div class="check-result-display">
               <div class="roll-result failure">
                  <strong>No Event</strong> (Rolled {stabilityRoll} &lt; DC {rolledAgainstDC})
                  <div>DC reduced to {eventDC} for next turn.</div>
               </div>
            </div>
         {/if}
      </div>
   {/if}
   
   <!-- Active Event Card - Show when an event needs to be resolved -->
   {#if currentEventInstance && currentEventInstance.checkData}
      {#key `${currentEventInstance.checkId}-${activeAidsCount}`}
         <BaseCheckCard
            id={currentEventInstance.checkId}
            name={currentEventInstance.checkData.name}
            description={currentEventInstance.checkData.description}
            skills={currentEventInstance.checkData.skills}
            outcomes={eventOutcomes}
            traits={currentEventInstance.checkData.traits || []}
            checkType="event"
            checkInstance={currentEventInstance}
            expandable={false}
            showCompletions={false}
            showAvailability={false}
            showSpecial={false}
            showIgnoreButton={true}
            {isViewingCurrentPhase}
            {possibleOutcomes}
            showAidButton={false}
            aidResult={aidResultForEvent}
            resolved={eventResolved}
            resolution={eventResolution}
            primaryButtonLabel="Apply Result"
            skillSectionTitle="Choose Your Response:"
            on:executeSkill={handleExecuteSkill}
            on:primary={handleApplyResult}
            on:cancel={handleCancel}
            on:performReroll={handlePerformReroll}
            on:ignore={handleIgnore}
            on:aid={handleAid}
            on:debugOutcomeChanged={handleDebugOutcomeChanged}
         />
      {/key}
   {/if}
   
   <!-- Ongoing Events - System-generated events that can be resolved -->
   {#if ongoingEventsWithOutcomes.length > 0}
      <div class="ongoing-events-section">
         <h2 class="ongoing-events-header">Ongoing Events</h2>
         <div class="ongoing-events-list">
            {#each ongoingEventsWithOutcomes as item}
               <div class="ongoing-event-wrapper">
                  <div class="ongoing-badge-container">
                     <span class="ongoing-badge">Ongoing Event</span>
                  </div>
                  <BaseCheckCard
                     id={item.instance.instanceId}
                     name={item.event.name}
                     description={item.event.description}
                     skills={item.event.skills}
                     outcomes={item.outcomes}
                     traits={item.event.traits || []}
                     checkType="event"
                     expandable={false}
                     showCompletions={false}
                     showAvailability={false}
                     showSpecial={false}
                     showIgnoreButton={true}
                     {isViewingCurrentPhase}
                     possibleOutcomes={item.possibleOutcomes}
                     showAidButton={false}
                     resolved={!!item.instance.appliedOutcome}
                     resolution={item.instance.appliedOutcome || null}
                     primaryButtonLabel="Apply Result"
                     skillSectionTitle="Choose Your Response:"
                     resolutionInProgress={item.isBeingResolved}
                     resolvingPlayerName={item.resolverName}
                     isBeingResolvedByOther={item.isResolvedByOther}
                     on:executeSkill={handleExecuteSkill}
                     on:primary={handleApplyResult}
                     on:cancel={handleCancel}
                     on:performReroll={handlePerformReroll}
                     on:ignore={handleIgnore}
                     on:debugOutcomeChanged={handleDebugOutcomeChanged}
                  />
               </div>
            {/each}
         </div>
      </div>
   {/if}
   
   <!-- Resolved Events - Completed events showing their outcomes -->
   {#if resolvedEventInstances.length > 0}
      <div class="resolved-events-section">
         <h2 class="resolved-events-header">Resolved Events</h2>
         <div class="resolved-events-list">
            {#each resolvedEventInstances as instance}
               {@const eventData = instance.checkData}
               <div class="resolved-event-wrapper">
                  <div class="resolved-badge-container">
                     <span class="resolved-badge">Resolved</span>
                  </div>
                  <BaseCheckCard
                     id={instance.checkId}
                     name={eventData.name}
                     description={eventData.description}
                     skills={eventData.skills}
                     outcomes={[]}
                     traits={eventData.traits || []}
                     checkType="event"
                     expandable={false}
                     showCompletions={false}
                     showAvailability={false}
                     showSpecial={false}
                     showIgnoreButton={false}
                     isViewingCurrentPhase={false}
                     possibleOutcomes={[]}
                     showAidButton={false}
                     resolved={true}
                     resolution={instance.appliedOutcome || null}
                     primaryButtonLabel="Apply Result"
                     skillSectionTitle=""
                  />
               </div>
            {/each}
         </div>
      </div>
   {/if}
   
   <!-- Custom Modifiers - User-created or informational modifiers -->
   {#if customModifiers.length > 0}
      <div class="custom-modifiers-section">
         <h2 class="custom-modifiers-header">Custom Modifiers</h2>
         <div class="custom-modifiers-list">
            {#each customModifiers as modifier}
               <CustomModifierDisplay {modifier} />
            {/each}
         </div>
      </div>
   {/if}
</div>

<!-- Aid Selection Dialog -->
<AidSelectionDialog
   bind:show={showAidSelectionDialog}
   actionName={currentEvent?.name || ''}
   on:confirm={handleAidConfirm}
   on:cancel={handleAidCancel}
/>

<!-- Action Confirmation Dialog -->
<ActionConfirmDialog
   bind:show={showActionConfirm}
   on:confirm={handleActionConfirm}
   on:cancel={handleActionCancelDialog}
/>

<style lang="scss">
   /* Styles remain the same - only logic has changed */
   .events-phase {
      display: flex;
      flex-direction: column;
      gap: 20px;
   }
   
   .event-rolled-banner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px;
      margin-bottom: 0.5rem;
      background: rgba(251, 191, 36, 0.1);
      border: 1px solid var(--color-amber);
      border-radius: var(--radius-md);
      color: var(--text-secondary);
      font-size: var(--font-sm);
      font-weight: var(--font-weight-medium);
      
      i {
         color: var(--color-amber-light);
      }
   }
   
   .event-card {
      background: linear-gradient(135deg,
         rgba(31, 31, 35, 0.6),
         rgba(15, 15, 17, 0.4));
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-medium);
      overflow: hidden;
   }
   
   .event-header {
      padding: 20px;
      background: rgba(0, 0, 0, 0.2);
      border-bottom: 1px solid var(--border-subtle);
   }
   
   .event-title {
      margin: 0 0 10px 0;
      font-size: var(--font-3xl);
      font-weight: var(--font-weight-semibold);
      line-height: 1.3;
      color: var(--text-primary);
   }
   
   .header-content {
      display: flex;
      flex-direction: column;
      gap: 10px;
   }
   
   .event-traits {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
   }
   
   .trait-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      background: rgba(100, 116, 139, 0.1);
      border: 1px solid rgba(100, 116, 139, 0.2);
      border-radius: var(--radius-sm);
      font-size: var(--font-sm);
      font-weight: var(--font-weight-medium);
      line-height: 1.2;
      letter-spacing: 0.05em;
      color: var(--text-tertiary);
      text-transform: capitalize;
   }
   
   .event-body {
      padding: 20px;
   }
   
   .event-description {
      font-size: var(--font-md);
      line-height: 1.5;
      color: var(--text-secondary);
      margin-bottom: 15px;
   }
   
   .event-resolution {
      margin-top: 20px;
      
      h4 {
         margin: 0 0 15px 0;
         color: var(--text-primary);
         font-size: var(--font-xl);
         font-weight: var(--font-weight-semibold);
         line-height: 1.4;
      }
   }
   
   .skill-options {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
   }
   
   .ignore-event-section {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid var(--border-subtle);
      text-align: center;
      
      .divider-text {
         position: relative;
         margin-bottom: 15px;
         color: var(--text-tertiary);
         font-size: var(--font-sm);
         font-style: italic;
      }
      
      .ignore-warning {
         margin-top: 10px;
         margin-bottom: 0;
         font-size: var(--font-sm);
         color: var(--color-amber);
         font-style: italic;
         opacity: 0.8;
      }
   }
   
   .event-result-display {
      margin-top: 20px;
   }
   
   .event-check-section {
      background: rgba(0, 0, 0, 0.05);
      padding: 25px;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-subtle);
      text-align: center;
      
      h3 {
         margin: 0 0 15px 0;
         color: var(--text-primary);
         font-size: var(--font-2xl);
         font-weight: var(--font-weight-semibold);
         line-height: 1.3;
      }
   }
   
   .dc-info {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 15px;
      padding: 15px;
      background: linear-gradient(135deg,
         rgba(24, 24, 27, 0.6),
         rgba(31, 31, 35, 0.4));
      border-radius: var(--radius-md);
      border: 1px solid var(--border-default);
      margin-bottom: 20px;
      
      .dc-label {
         font-size: var(--font-lg);
         color: var(--text-secondary);
      }
      
      .dc-value {
         font-size: var(--font-2xl);
         font-weight: var(--font-weight-bold);
         color: var(--color-amber-light);
      }
   }
   
   .check-result-display {
      margin-top: 20px;
      
      .roll-result {
         padding: 15px;
         border-radius: var(--radius-md);
         font-size: var(--font-md);
         
         &.success {
            background: rgba(251, 191, 36, 0.1);
            color: var(--color-amber-light);
            border: 1px solid var(--color-amber);
         }
         
         &.failure {
            background: rgba(34, 197, 94, 0.1);
            color: var(--color-green);
            border: 1px solid var(--color-green-border);
         }
         
         strong {
            display: block;
            margin-bottom: 5px;
            font-size: var(--font-lg);
         }
         
         div {
            opacity: 0.9;
         }
      }
   }
   
   .ongoing-events-section {
      padding: 20px 0;
   }
   
   .ongoing-events-header {
      margin: 0 0 15px 0;
      color: var(--text-accent);
      font-family: var(--base-font);
      font-size: var(--font-xl);
      font-weight: var(--font-weight-normal);
   }
   
   .ongoing-events-list {
      display: flex;
      flex-direction: column;
      gap: 15px;
   }
   
   .ongoing-event-wrapper {
      position: relative;
   }
   
   .ongoing-badge-container {
      position: absolute;
      top: -10px;
      right: 20px;
      z-index: 10;
   }
   
   .ongoing-badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 12px;
      border-radius: var(--radius-full);
      font-size: var(--font-xs);
      font-weight: var(--font-weight-medium);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: rgba(251, 191, 36, 0.2);
      color: var(--color-amber-light);
      border: 1px solid var(--color-amber);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
   }
   
   .resolved-events-section {
      padding: 20px 0;
   }
   
   .resolved-events-header {
      margin: 0 0 15px 0;
      color: var(--text-accent);
      font-family: var(--base-font);
      font-size: var(--font-xl);
      font-weight: var(--font-weight-normal);
   }
   
   .resolved-events-list {
      display: flex;
      flex-direction: column;
      gap: 15px;
   }
   
   .resolved-event-wrapper {
      position: relative;
      opacity: 0.8;
   }
   
   .resolved-badge-container {
      position: absolute;
      top: -10px;
      right: 20px;
      z-index: 10;
   }
   
   .resolved-badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 12px;
      border-radius: var(--radius-full);
      font-size: var(--font-xs);
      font-weight: var(--font-weight-medium);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: rgba(34, 197, 94, 0.2);
      color: var(--color-green);
      border: 1px solid var(--color-green-border);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
   }
   
   .custom-modifiers-section {
      padding: 20px 0;
   }
   
   .custom-modifiers-header {
      margin: 0 0 15px 0;
      color: var(--text-accent);
      font-family: var(--base-font);
      font-size: var(--font-xl);
      font-weight: var(--font-weight-normal);
   }
   
   .custom-modifiers-list {
      display: flex;
      flex-direction: column;
      gap: 15px;
   }
   
</style>
