<script lang="ts">
   import { onMount, onDestroy } from 'svelte';
   import { kingdomData, getKingdomActor, updateKingdom, getTurnManager } from '../../../stores/KingdomStore';
   import { TurnPhase } from '../../../actors/KingdomActor';
   import { get } from 'svelte/store';
   
   // Props
   export let isViewingCurrentPhase: boolean = true;
   export let hideUntrainedSkills: boolean = true;
   export let onToggleUntrained: ((value: boolean) => void) | undefined = undefined;
   
  // Import controller instead of services/commands directly
  import { createEventPhaseController } from '../../../controllers/EventPhaseController';
  
  // Import existing services and components
  import type { CheckPipeline } from '../../../types/CheckPipeline';
  import type { EventSkill } from '../../../types/events';
  import { pipelineRegistry } from '../../../pipelines/PipelineRegistry';
   import Button from '../components/baseComponents/Button.svelte';
   import BaseCheckCard from '../components/BaseCheckCard.svelte';
   import PlayerActionTracker from '../components/PlayerActionTracker.svelte';
   import EventDebugPanel from '../../debug/EventDebugPanel.svelte';
   import SimpleEventSelector from '../../debug/SimpleEventSelector.svelte';
   import { isDebugPanelEnabled } from '../../../debug/debugConfig';
   import OngoingEventCard from '../components/OngoingEventCard.svelte';
   import AidSelectionDialog from '../components/AidSelectionDialog.svelte';
   import EventInstanceList from './components/EventInstanceList.svelte';
   import { createGameCommandsService } from '../../../services/GameCommandsService';
   import { logger } from '../../../utils/Logger';
   import {
     getCurrentUserCharacter,
     showCharacterSelectionDialog,
     performKingdomActionRoll
   } from '../../../services/pf2e';
   import { buildPossibleOutcomes } from '../../../controllers/shared/PossibleOutcomeHelpers';
   import { buildEventOutcomes } from '../../../controllers/shared/EventOutcomeHelpers';
   import { getApproachOutcomeBadges } from '../../../controllers/shared/ApproachOutcomeBadges';

   // Initialize controller and service
   let eventPhaseController: any;
   let gameCommandsService: any;
   
   // UI State (no business logic)
   let isRolling = false;
   let currentEvent: CheckPipeline | null = null;
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
     isIgnored?: boolean;
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
   let pendingAidSkill = '';
   
   // Current user ID
   let currentUserId: string | null = null;
   
   // Load current event data from instance when available
   $: if (currentEventInstance && currentEventInstance.checkData) {
      currentEvent = currentEventInstance.checkData as CheckPipeline;
   }
   
   // Check if current user is GM
   $: isGM = (globalThis as any).game?.user?.isGM || false;
   
   // Computed UI state - use shared helper for step completion
   import { getStepCompletion } from '../../../controllers/shared/PhaseHelpers';
   $: currentSteps = $kingdomData.currentPhaseSteps || [];
   $: eventChecked = getStepCompletion(currentSteps, 0); // Step 0 = event-check
   $: eventResolvedFromState = getStepCompletion(currentSteps, 1); // Step 1 = resolve-event
   $: eventDC = $kingdomData.eventDC || 15;
   // NEW ARCHITECTURE: Read from OutcomePreview (pendingOutcomes) instead of legacy activeCheckInstances
   $: activeEventInstances = $kingdomData?.pendingOutcomes?.filter(i => i.checkType === 'event') || [];
   
   // ✅ NEW ARCHITECTURE: Get current event instance from turnState.eventInstanceId (precise matching)
   $: currentEventInstance = $kingdomData.turnState?.eventsPhase?.eventInstanceId 
      ? activeEventInstances.find(i => i.previewId === $kingdomData.turnState?.eventsPhase?.eventInstanceId)
      : null;
   
   // Filter instances: ongoing = all events EXCEPT the current event (regardless of status)
   // Debug mode should be completely separate - don't show ANY debug instances as ongoing
   // Resolved ongoing events show their resolution inline (no separate "Resolved" section)
   $: currentEventInstanceId = $kingdomData.turnState?.eventsPhase?.eventInstanceId;
   $: ongoingEventInstances = isGM ? [] : activeEventInstances.filter(instance => 
      instance.previewId !== currentEventInstanceId
   );
   
   // Build outcomes for ongoing events from pendingOutcomes  
   $: ongoingEventsWithOutcomes = ongoingEventInstances.map(instance => {
      const event = instance.checkData as CheckPipeline;  // NEW ARCHITECTURE: checkData instead of eventData
      
      // Safety check - if event or outcomes is missing, return empty
      if (!event || !event.outcomes) {
         console.warn('[EventsPhase] Invalid event data in instance:', instance);
         return {
            instance,
            event,
            outcomes: [],
            isResolved: false
         };
      }
      
      // Use shared helper to build outcomes
      const outcomes = buildEventOutcomes(event);
      
      // Check if someone is currently resolving this event
      const progress = instance.resolutionProgress;
      const isBeingResolved = !!progress;
      const isResolvedByMe = progress?.playerId === currentUserId;
      const isResolvedByOther = isBeingResolved && !isResolvedByMe;
      const resolverName = progress?.playerName || 'Another player';
      
      // Derive resolved state from instance status (shows resolution inline)
      const isResolved = instance.status !== 'pending';
      
      return {
         instance,
         event,
         outcomes,
         possibleOutcomes: (() => {
            const outcomes = buildPossibleOutcomes(event.outcomes, true);
            const selectedApproach = $kingdomData.turnState?.eventsPhase?.selectedApproach;
            
            // If event has strategic choice and approach is selected, inject approach-specific badges
            if (event.strategicChoice && selectedApproach) {
               outcomes.forEach(outcome => {
                  const approachBadges = getApproachOutcomeBadges(
                     event.id,
                     selectedApproach,
                     outcome.result
                  );
                  outcome.outcomeBadges = approachBadges;
               });
            }
            
            return outcomes;
         })(),
         isBeingResolved,
         isResolvedByMe,
         isResolvedByOther,
         resolverName,
         isResolved
      };
   });
   
   $: stabilityRoll = $kingdomData.turnState?.eventsPhase?.eventRoll || 0;
   $: showStabilityResult = $kingdomData.turnState?.eventsPhase?.eventRoll !== null;
   $: rolledAgainstDC = eventDC;
   $: eventWasTriggered = $kingdomData.turnState?.eventsPhase?.eventTriggered ?? null;
   $: activeAidsCount = $kingdomData?.turnState?.eventsPhase?.activeAids?.length || 0;
   
  // Reactively load event when eventId changes (from turnState)
  $: if ($kingdomData.turnState?.eventsPhase?.eventId) {
     const event = pipelineRegistry.getPipeline($kingdomData.turnState.eventsPhase.eventId);
     if (event) {
        currentEvent = event;

     }
  } else if ($kingdomData.turnState?.eventsPhase?.eventId === null) {
     currentEvent = null;

   }
   
   onMount(async () => {
      console.log('🔵 [EventsPhase] Component mounting...');
      
      // Initialize the controller and service
      eventPhaseController = await createEventPhaseController();
      gameCommandsService = await createGameCommandsService();
      
      // Initialize the phase (this sets up currentPhaseSteps!)
      await eventPhaseController.startPhase();

      // Store current user ID
      const game = (window as any).game;
      currentUserId = game?.user?.id || null;
      
      // Check if an event was already rolled by another client
      if ($kingdomData.turnState?.eventsPhase?.eventId) {

         const event = pipelineRegistry.getPipeline($kingdomData.turnState.eventsPhase.eventId);
         if (event) {
            currentEvent = event;
         }
      }
      
      // ✅ REFACTOR: Removed persisted outcome restoration - kingdom state is the source of truth
      // currentEventInstance.appliedOutcome is automatically restored from KingdomActor flags
      
      // Listen for roll completion to clear aids
      console.log('🔵 [EventsPhase] Adding event listener for kingdomRollComplete');
      window.addEventListener('kingdomRollComplete', handleRollComplete as any);
   });
   
   onDestroy(() => {
      console.log('🔴 [EventsPhase] Component unmounting, removing event listener');
      window.removeEventListener('kingdomRollComplete', handleRollComplete as any);

      // Clear deduplication set
      processedRolls.clear();
   });
   
   // Use controller for event check logic
   async function performEventCheck() {
      if (!eventPhaseController) return;
      
      // Check if another client already rolled for an event
      if ($kingdomData.turnState?.eventsPhase?.eventId) {

         // Load the event by ID
         const event = pipelineRegistry.getPipeline($kingdomData.turnState.eventsPhase.eventId);
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
   // Inject approach-specific badges if an approach has been selected
   $: possibleOutcomes = currentEvent ? (() => {
      const event = currentEvent; // Capture for closure
      const outcomes = buildPossibleOutcomes(event.outcomes, true);
      const selectedApproach = $kingdomData.turnState?.eventsPhase?.selectedApproach;
      
      // If event has strategic choice and approach is selected, inject approach-specific badges
      if (event.strategicChoice && selectedApproach) {
         outcomes.forEach(outcome => {
            const approachBadges = getApproachOutcomeBadges(
               event.id,
               selectedApproach,
               outcome.result
            );
            outcome.outcomeBadges = approachBadges;
         });
      }
      
      return outcomes;
   })() : [];
   
   // Build outcomes array for BaseCheckCard
   // Build outcomes for current event using shared helper
   $: eventOutcomes = (currentEvent && currentEvent.outcomes) 
      ? buildEventOutcomes(currentEvent) 
      : [];
   
   // Event handler - execute skill check
   async function handleExecuteSkill(event: CustomEvent) {
      if (!eventPhaseController) return;
      
      const { skill, eventId, checkId, outcome } = event.detail;
      
      // Determine which event this skill check is for
      let targetEvent = currentEvent;
      let targetInstanceId: string | null = null;
      
      // If eventId is provided and it's not the current event, check ongoing events
      if (eventId && (!currentEvent || currentEvent.id !== eventId)) {
         const ongoingEvent = ongoingEventsWithOutcomes.find(item => item.instance.previewId === eventId);
         if (ongoingEvent) {
            targetEvent = ongoingEvent.event;
            targetInstanceId = ongoingEvent.instance.previewId;
         }
      }
      
      // Also check by checkId (which IS the instanceId for ongoing events)
      if (!targetEvent && checkId) {
         const ongoingEvent = ongoingEventsWithOutcomes.find(item => item.instance.previewId === checkId);
         if (ongoingEvent) {
            targetEvent = ongoingEvent.event;
            targetInstanceId = ongoingEvent.instance.previewId;
         }
      }
      
      if (!targetEvent) {
         logger.error('[EventsPhase] No event found for skill check');
         return;
      }
      
      // Store the target event temporarily for the skill check
      const previousEvent = currentEvent;
      currentEvent = targetEvent;
      
      // Mark that this player is starting to resolve (multi-player coordination)
      if (outcome) {
         await eventPhaseController.startResolvingEvent(targetEvent.id, outcome, false);
      }
      
      // Execute the skill check
      await executeSkillCheck(skill, targetInstanceId);
      
      // Restore previous event if we switched
      if (previousEvent !== targetEvent) {
         currentEvent = previousEvent;
      }
   }
   
   async function executeSkillCheck(skill: string, targetInstanceId: string | null = null) {
      if (!currentEvent) return;

      // Capture the event for closure
      const targetEvent = currentEvent;

      try {
         isRolling = true;

         // Use PipelineCoordinator for events (same as actions/incidents)
         const { getPipelineCoordinator } = await import('../../../services/PipelineCoordinator');
         const { getCurrentUserCharacter } = await import('../../../services/pf2e');

         const pipelineCoordinator = await getPipelineCoordinator();
         const actingCharacter = getCurrentUserCharacter();
         if (!actingCharacter) {
            throw new Error('No character selected');
         }

         await pipelineCoordinator.executePipeline(targetEvent.id, {
            checkType: 'event',
            actor: {
               selectedSkill: skill,
               fullActor: actingCharacter,
               actorName: actingCharacter.name,
               actorId: actingCharacter.id,
               level: actingCharacter.level || 1,
               proficiencyRank: 0
            }
         });

         // Pipeline handles everything: roll, create instance, calculate preview, wait for apply

      } catch (error) {
         if ((error as Error).message === 'Action cancelled by user') {
            logger.info('[EventsPhase] User cancelled event check');
         } else {
            logger.error(`❌ [EventsPhase] Error in event check:`, error);
            ui?.notifications?.error(`Failed to perform event check: ${(error as Error).message}`);
         }
      } finally {
         isRolling = false;
      }
   }
   
   // Event handler - apply result
   async function handleApplyResult(event: CustomEvent) {
      console.log('🟡 [EventsPhase] handleApplyResult called', event.detail);
      
      // Get resolution data and instance ID from the event
      const resolutionData = event.detail.resolution;
      const checkId = event.detail.checkId;

      // Find the instance to get the previewId
      let instanceId: string | null = null;

      // Check current event instance first
      if (currentEventInstance && currentEventInstance.previewId) {
         instanceId = currentEventInstance.previewId;
         console.log('🟡 [EventsPhase] Using currentEventInstance.previewId:', instanceId);
      }

      // If checkId is provided and differs, look up ongoing event instance
      // Note: For main events, checkId is the event ID (e.g., 'archaeological-find')
      // For ongoing events, checkId is the previewId (UUID)
      if (checkId && checkId !== currentEventInstance?.previewId && !instanceId) {
         const ongoingEvent = ongoingEventsWithOutcomes.find(item => item.instance.previewId === checkId);
         if (ongoingEvent) {
            instanceId = ongoingEvent.instance.previewId;
            console.log('🟡 [EventsPhase] Found ongoing event instance:', instanceId);
         }
      }

      if (!instanceId) {
         logger.error(`❌ [EventsPhase] No instance ID found for apply result. checkId: ${checkId}`);
         return;
      }

      console.log('🟡 [EventsPhase] Calling pipelineCoordinator.confirmApply with instanceId:', instanceId);
      
      // Use PipelineCoordinator to confirm and execute (same as actions/incidents)
      const { getPipelineCoordinator } = await import('../../../services/PipelineCoordinator');
      const pipelineCoordinator = await getPipelineCoordinator();
      await pipelineCoordinator.confirmApply(instanceId, resolutionData);
      
      console.log('🟡 [EventsPhase] confirmApply completed');

      // Pipeline handles Steps 7-9: post-apply interactions, execute, cleanup
   }
   
   // Event handler - cancel resolution
   async function handleCancel() {
      // Clear the instance via OutcomePreviewService if we have one
      if (currentEventInstance) {
         const { createOutcomePreviewService } = await import('../../../services/OutcomePreviewService');
         const outcomePreviewService = await createOutcomePreviewService();
         await outcomePreviewService.clearInstance(currentEventInstance.previewId);
      }

      // Clear local UI state
      eventResolution = null;
      eventResolved = false;

      // Note: Canceling doesn't add to actionLog, so player can still act
   }
   
   // NOTE: Reroll handling has been moved to OutcomeDisplay.svelte
   // OutcomeDisplay now calls PipelineCoordinator.rerollFromStep3() directly
   // This eliminates duplicate reroll handlers across phase components
   
   // Event handler - ignore event (delegate to controller)
   async function handleIgnore(event: CustomEvent) {
      const { checkId } = event.detail;
      
      // Determine which event this ignore is for
      let targetEventId: string | null = null;
      
      // If checkId is provided and it's not the current event, check ongoing events
      if (checkId && (!currentEvent || currentEvent.id !== checkId)) {
         const ongoingEvent = ongoingEventsWithOutcomes.find(item => item.instance.previewId === checkId);
         if (ongoingEvent) {
            targetEventId = ongoingEvent.event.id;
         }
      } else if (currentEvent) {
         targetEventId = currentEvent.id;
      }
      
      if (!targetEventId) {
         logger.error('[EventsPhase] No event found for ignore');
         return;
      }

      // ✅ Use centralized IgnoreEventService for consistent handling
      const { ignoreEventService } = await import('../../../services/IgnoreEventService');
      const result = await ignoreEventService.ignoreEvent(targetEventId);
      
      if (result.success) {
         // Clear local state if it was the current event
         if (currentEvent && currentEvent.id === targetEventId) {
            eventResolution = null;
            eventResolved = false;
         }

      } else {
         logger.error(`❌ [EventsPhase] Failed to ignore event: ${result.error}`);
         ui?.notifications?.error(`Failed to ignore event: ${result.error}`);
      }
   }
   
   // Event handler - aid another
   function handleAid(event: CustomEvent) {
      const { checkId } = event.detail;
      
      // Determine which event this aid is for
      let targetEvent = currentEvent;
      
      // If checkId is provided and different from currentEvent, look up ongoing event
      if (checkId && (!currentEvent || currentEvent.id !== checkId)) {
         const ongoingEvent = ongoingEventsWithOutcomes.find(item => item.instance.previewId === checkId);
         if (ongoingEvent) {
            targetEvent = ongoingEvent.event;
         }
      }
      
      if (!targetEvent) {
         logger.error('[EventsPhase] No event found for aid');
         return;
      }
      
      // Check if THIS PLAYER has already performed an action using actionLog
      const actionLog = $kingdomData.turnState?.actionLog || [];
      const hasPlayerActed = actionLog.some((entry: any) => 
         entry.playerId === currentUserId && 
         (entry.phase === TurnPhase.ACTIONS || entry.phase === TurnPhase.EVENTS)
      );
      
      // Store target event temporarily for the aid dialog
      currentEvent = targetEvent;
      
      // No confirmation needed - aid checks are allowed even after acting
      // (BaseCheckCard handles confirmation for skill checks, not aid)
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
      
      // Note: Aid action spending is handled by GameCommandsService.trackPlayerAction()
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
            
            // Calculate bonus (including penalty for critical failure)
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
            } else if (outcome === 'criticalFailure') {
               bonus = -1;  // PF2e rules: critical failure imposes a -1 penalty
            }
            // outcome === 'failure' stays at 0 (no effect)
            
            // Store aids that have any effect (bonus or penalty)
            if (bonus !== 0) {
               // Store aid in turnState
               const actor = getKingdomActor();
               if (actor) {
                  await actor.updateKingdomData((kingdom: any) => {
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
                  
                  // Track the aid as a player action (counts towards action limit)
                  await gameCommandsService.trackPlayerAction(
                     game.user.id,
                     game.user.name,
                     actorName,
                     `aid-${eventForAid.id}-${outcome}`,
                     TurnPhase.EVENTS
                  );
                  
                  const bonusText = bonus > 0 ? `+${bonus}` : `${bonus}`;
                  ui?.notifications?.info(`You are now aiding ${eventForAid.name} with a ${bonusText} ${bonus > 0 ? 'bonus' : 'penalty'}${grantKeepHigher ? ' and keep higher roll' : ''}!`);
               }
            } else {
               // Failed aid (no bonus/penalty) - track action but don't store (allows retry)
               await gameCommandsService.trackPlayerAction(
                  game.user.id,
                  game.user.name,
                  actorName,
                  `aid-${eventForAid.id}-${outcome}`,
                  TurnPhase.EVENTS
               );
               
               ui?.notifications?.warn(`Your aid attempt failed. You can try again with a different skill.`);
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
         logger.error('Error performing aid roll:', error);
         ui?.notifications?.error(`Failed to perform aid: ${error}`);
      }
   }
   
   
   // Deduplication tracking for roll events
   const processedRolls = new Set<string>();
   const DEDUPLICATION_TIMEOUT = 2000; // 2 seconds
   
   // Handle roll completion to clear aids
   async function handleRollComplete(event: CustomEvent) {
      const { checkId, checkType, outcome, actorName, rollBreakdown } = event.detail;
      
      if (checkType === 'event') {
         // DEDUPLICATION: Create a unique key for this roll
         const rollKey = `${checkId}-${outcome}-${actorName}-${rollBreakdown?.d20Result || 0}-${rollBreakdown?.total || 0}`;
         
         // Check if we've already processed this exact roll
         if (processedRolls.has(rollKey)) {
            console.log('⚠️ [EventsPhase] Duplicate roll event detected, skipping:', rollKey);
            return;
         }
         
         // Mark as processed
         processedRolls.add(rollKey);
         
         // Clean up after timeout
         setTimeout(() => {
            processedRolls.delete(rollKey);
         }, DEDUPLICATION_TIMEOUT);
         
         console.log('✅ [EventsPhase] Processing roll event:', rollKey);
         
         // Clear aid modifiers for this specific event after roll completes
         const actor = getKingdomActor();
         if (actor) {
            await actor.updateKingdomData((kingdom: any) => {
               if (kingdom.turnState?.eventsPhase?.activeAids) {
                  const beforeCount = kingdom.turnState.eventsPhase.activeAids.length;
                  kingdom.turnState.eventsPhase.activeAids = 
                     kingdom.turnState.eventsPhase.activeAids.filter(
                        (aid: any) => aid.targetActionId !== checkId
                     );
                  const afterCount = kingdom.turnState.eventsPhase.activeAids.length;
                  
                  if (beforeCount > afterCount) {

                  }
               }
            });
         }
      }
   }
   
   // Helper function to get aid result for any event ID
   function getAidResultForEvent(eventId: string) {
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
   }
   
   // Debug function to clear all events (ongoing and resolved)
   async function handleClearAllEvents() {
      if (!isGM) return;
      
      const Dialog = (globalThis as any).Dialog;
      const confirmed = await Dialog.confirm({
         title: 'Clear All Events',
         content: '<p>Are you sure you want to clear all ongoing and resolved events? This cannot be undone.</p>',
         yes: () => true,
         no: () => false,
         defaultYes: false
      });
      
      if (!confirmed) return;
      
      await updateKingdom(kingdom => {
         if (!kingdom.pendingOutcomes) return;
         
         // Filter out all event check instances (both pending and resolved)
         const beforeCount = kingdom.pendingOutcomes.length;
         kingdom.pendingOutcomes = kingdom.pendingOutcomes.filter(
            (instance: any) => instance.checkType !== 'event'
         );
         const afterCount = kingdom.pendingOutcomes.length;
         const removedCount = beforeCount - afterCount;
         
         logger.info(`🗑️ [EventsPhase] Cleared ${removedCount} event instances`);
      });
      
      // Clear local UI state
      eventResolution = null;
      eventResolved = false;
      currentEvent = null;
      
      ui?.notifications?.info('All events have been cleared.');
   }
</script>

<div class="events-phase">
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
   
   <!-- Simple Event Selector (GM Only) - Always shown for GMs -->
   {#if isGM}
      <SimpleEventSelector />
   {/if}
   
   <!-- Event Debug Panel (GM Only) - Full testing panel for all events -->
   <!-- Controlled by DEBUG_PANELS.events in src/debug/debugConfig.ts -->
   {#if isGM && isDebugPanelEnabled('events')}
      <EventDebugPanel {hideUntrainedSkills} />
   {/if}
   
   <!-- Active Event Card - Show when an event needs to be resolved -->
   
   {#if currentEventInstance && currentEventInstance.checkData}
      {@const isEventResolved = currentEventInstance.status !== 'pending'}
      {#key `${currentEventInstance.checkId}-${activeAidsCount}`}
         <BaseCheckCard
            id={currentEventInstance.checkId}
            name={currentEventInstance.checkData.name}
            description={currentEventInstance.checkData.description}
            skills={currentEventInstance.checkData.skills}
            outcomes={eventOutcomes}
            traits={currentEventInstance.checkData.traits || []}
            checkType="event"
            outcomePreview={currentEventInstance}
            strategicChoice={currentEventInstance.checkData.strategicChoice}
            expandable={false}
            showCompletions={false}
            showAvailability={false}
            showSpecial={false}
            showIgnoreButton={!isEventResolved}
            {isViewingCurrentPhase}
            {possibleOutcomes}
            showAidButton={!isEventResolved}
            aidResult={currentEvent ? getAidResultForEvent(currentEvent.id) : null}
            resolved={isEventResolved}
            resolution={currentEventInstance.appliedOutcome || eventResolution}
            skillSectionTitle="Choose Your Response:"
            {hideUntrainedSkills}
            on:executeSkill={handleExecuteSkill}
            on:primary={handleApplyResult}
            on:cancel={handleCancel}
            on:ignore={handleIgnore}
            on:aid={handleAid}
         />
      {/key}
   {/if}
   
   <!-- Ongoing Events - System-generated events that can be resolved -->
   {#if ongoingEventsWithOutcomes.length > 0}
      <div class="ongoing-events-section">
         <h2 class="ongoing-events-header">Ongoing Events</h2>
         <div class="ongoing-events-list">
            {#each ongoingEventsWithOutcomes as item}
               <BaseCheckCard
                  id={item.instance.previewId}
                  outcomePreview={item.instance}
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
                  showIgnoreButton={!item.isResolved}
                  {isViewingCurrentPhase}
                  possibleOutcomes={item.possibleOutcomes}
                  showAidButton={!item.isResolved}
                  aidResult={getAidResultForEvent(item.event.id)}
                  skillSectionTitle="Choose Your Response:"
                  {hideUntrainedSkills}
                  resolutionInProgress={item.isBeingResolved}
                  resolvingPlayerName={item.resolverName}
                  isBeingResolvedByOther={item.isResolvedByOther}
                  resolved={item.isResolved}
                  resolution={item.instance.appliedOutcome || null}
                  on:executeSkill={handleExecuteSkill}
                  on:primary={handleApplyResult}
                  on:cancel={handleCancel}
                  on:ignore={handleIgnore}
                  on:aid={handleAid}
               />
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

<style lang="scss">
   /* Styles remain the same - only logic has changed */
   .events-phase {
      display: flex;
      flex-direction: column;
      gap: var(--space-20);
   }
   
   .event-rolled-banner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-8);
      padding: var(--space-10);
      margin-bottom: var(--space-8);
      background: var(--surface-accent-low);
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
      padding: var(--space-20);
      background: var(--overlay-low);
      border-bottom: 1px solid var(--border-faint);
   }
   
   .event-title {
      margin: 0 0 var(--space-10) 0;
      font-size: var(--font-3xl);
      font-weight: var(--font-weight-semibold);
      line-height: 1.3;
      color: var(--text-primary);
   }
   
   .header-content {
      display: flex;
      flex-direction: column;
      gap: var(--space-10);
   }
   
   .event-traits {
      display: flex;
      gap: var(--space-6);
      flex-wrap: wrap;
   }
   
   .trait-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-2) var(--space-8);
      background: rgba(100, 116, 139, 0.1);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-sm);
      font-size: var(--font-sm);
      font-weight: var(--font-weight-medium);
      line-height: 1.2;
      letter-spacing: 0.05rem;
      color: var(--text-tertiary);
      text-transform: capitalize;
   }
   
   .event-body {
      padding: var(--space-20);
   }
   
   .event-description {
      font-size: var(--font-md);
      line-height: 1.5;
      color: var(--text-secondary);
      margin-bottom: var(--space-16);
   }
   
   .event-resolution {
      margin-top: var(--space-20);
      
      h4 {
         margin: 0 0 var(--space-16) 0;
         color: var(--text-primary);
         font-size: var(--font-xl);
         font-weight: var(--font-weight-semibold);
         line-height: 1.4;
      }
   }
   
   .skill-options {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-10);
   }
   
   .ignore-event-section {
      margin-top: var(--space-20);
      padding-top: var(--space-20);
      border-top: 1px solid var(--border-faint);
      text-align: center;
      
      .divider-text {
         position: relative;
         margin-bottom: var(--space-16);
         color: var(--text-tertiary);
         font-size: var(--font-sm);
         font-style: italic;
      }
      
      .ignore-warning {
         margin-top: var(--space-10);
         margin-bottom: 0;
         font-size: var(--font-sm);
         color: var(--color-amber);
         font-style: italic;
         opacity: 0.8;
      }
   }
   
   .event-result-display {
      margin-top: var(--space-20);
   }
   
   .event-check-section {
      background: var(--overlay-lowest);
      padding: var(--space-24);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-faint);
      text-align: center;
      
      h3 {
         margin: 0 0 var(--space-16) 0;
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
      gap: var(--space-16);
      padding: var(--space-16);
      background: linear-gradient(135deg,
         rgba(24, 24, 27, 0.6),
         rgba(31, 31, 35, 0.4));
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
      margin-bottom: var(--space-20);
      
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
      margin-top: var(--space-20);
      
      .roll-result {
         padding: var(--space-16);
         border-radius: var(--radius-md);
         font-size: var(--font-md);
         
         &.success {
            background: var(--surface-accent-low);
            color: var(--color-amber-light);
            border: 1px solid var(--color-amber);
         }
         
         &.failure {
            background: var(--surface-success-low);
            color: var(--color-green);
            border: 1px solid var(--color-green-border);
         }
         
         strong {
            display: block;
            margin-bottom: var(--space-4);
            font-size: var(--font-lg);
         }
         
         div {
            opacity: 0.9;
         }
      }
   }
   
   .ongoing-events-section {
      padding: var(--space-20) 0;
   }
   
   .ongoing-events-header {
      margin: 0 0 var(--space-16) 0;
      color: var(--text-accent);
      font-size: var(--font-xl);
      font-weight: var(--font-weight-normal);
   }
   
   .ongoing-events-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-16);
   }
   
</style>
