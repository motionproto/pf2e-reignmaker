<script lang="ts">
   import { onMount } from 'svelte';
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
   import CheckCard from '../components/CheckCard.svelte';
   import PlayerActionTracker from '../components/PlayerActionTracker.svelte';
   import DebugEventSelector from '../components/DebugEventSelector.svelte';
   import OngoingEventCard from '../components/OngoingEventCard.svelte';
   
   // Initialize controller
   let eventPhaseController: any;
   
   // UI State (no business logic)
   let isRolling = false;
   let currentEvent: EventData | null = null;
   let possibleOutcomes: any[] = [];
   
   // Computed UI state - use shared helper for step completion
   import { getStepCompletion } from '../../../controllers/shared/PhaseHelpers';
   $: currentSteps = $kingdomData.currentPhaseSteps || [];
   $: eventChecked = getStepCompletion(currentSteps, 0); // Step 0 = event-check
   $: eventResolved = getStepCompletion(currentSteps, 1); // Step 1 = resolve-event
   $: eventDC = $kingdomData.eventDC;
   $: activeModifiers = $kingdomData.activeModifiers || [];
   $: stabilityRoll = $kingdomData.eventStabilityRoll || 0;
   $: showStabilityResult = $kingdomData.eventStabilityRoll !== null;
   $: rolledAgainstDC = $kingdomData.eventRollDC || eventDC;
   $: eventWasTriggered = $kingdomData.eventTriggered ?? null;
   
   // Reactively load event when currentEventId changes (for debug selector)
   $: if ($kingdomData.currentEventId) {
      const event = eventService.getEventById($kingdomData.currentEventId);
      if (event) {
         currentEvent = event;
         console.log('[EventsPhase] Event updated via reactive statement:', event.name);
      }
   } else if ($kingdomData.currentEventId === null) {
      currentEvent = null;
      console.log('[EventsPhase] Event cleared via reactive statement');
   }
   
   onMount(async () => {
      // Initialize the controller
      eventPhaseController = await createEventPhaseController(null);
      
      // Initialize the phase (this sets up currentPhaseSteps!)
      await eventPhaseController.startPhase();
      console.log('[EventsPhase] Phase initialized with controller');
      
      // Check if an event was already rolled by another client
      if ($kingdomData.currentEventId) {
         console.log('[EventsPhase] Loading existing event from kingdomData:', $kingdomData.currentEventId);
         const event = eventService.getEventById($kingdomData.currentEventId);
         if (event) {
            currentEvent = event;
         }
      }
   });
   
   // Use controller for event check logic
   async function performEventCheck() {
      if (!eventPhaseController) return;
      
      // Check if another client already rolled for an event
      if ($kingdomData.currentEventId) {
         console.log('[EventsPhase] Event already rolled by another client, loading existing event');
         // Load the event by ID
         const event = eventService.getEventById($kingdomData.currentEventId);
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
   
   // Build possible outcomes for the event
   $: if (currentEvent) {
      (async () => {
         const { buildPossibleOutcomes } = await import('../../../controllers/shared/PossibleOutcomeHelpers');
         possibleOutcomes = buildPossibleOutcomes(currentEvent.effects);
      })();
   }
</script>

<div class="events-phase">
   <!-- Debug Event Selector -->
   <DebugEventSelector type="event" currentItemId={$kingdomData.currentEventId || null} />
   
   <!-- Player Action Tracker -->
   <PlayerActionTracker compact={true} />
   
   {#if currentEvent}
      <!-- Active Event Card -->
      {#if showStabilityResult}
         <div class="event-rolled-banner">
            <i class="fas fa-dice-d20"></i>
            <span>Event Triggered! (Rolled {stabilityRoll} ≥ DC {rolledAgainstDC})</span>
         </div>
      {/if}
      <div class="event-card">
         <div class="event-header">
            <h3 class="event-title">{currentEvent.name}</h3>
         </div>
         
         <div class="event-body">
            <p class="event-description">{currentEvent.description}</p>
            
            <!-- Use CheckCard for event resolution -->
            {#if eventPhaseController}
               <CheckCard
                  checkType="event"
                  item={currentEvent}
                  {isViewingCurrentPhase}
                  controller={eventPhaseController}
                  {possibleOutcomes}
               />
            {/if}
         </div>
      </div>
   {:else}
      <!-- Event Check Section -->
      <div class="event-check-section">
         <h3>Event Check</h3>
         <div class="dc-info">
            <span class="dc-label">Event DC:</span>
            <span class="dc-value">{eventDC}</span>
         </div>
         
         <Button 
            variant="secondary"
            on:click={performEventCheck}
            disabled={!isViewingCurrentPhase || isRolling || eventChecked}
            icon={eventChecked ? 'fas fa-check' : 'fas fa-dice-d20'}
            iconPosition="left"
         >
            {#if eventChecked}
               Event Checked
            {:else if isRolling}
               Rolling...
            {:else}
               Roll for Event
            {/if}
         </Button>
         
         {#if showStabilityResult && eventChecked && eventWasTriggered === false}
            <div class="check-result-display">
               <div class="roll-result failure">
                  <strong>No Event</strong> (Rolled {stabilityRoll} &lt; DC {rolledAgainstDC})
                  <div>DC reduced to {$kingdomData.eventDC} for next turn.</div>
               </div>
            </div>
         {/if}
      </div>
   {/if}
   
   <!-- Ongoing Events - All event modifiers displayed as collapsible cards -->
   {#if activeModifiers.length > 0}
      <div class="ongoing-events-section">
         <h4>Ongoing Events</h4>
         <div class="ongoing-events-list">
            {#each activeModifiers as modifier}
               <OngoingEventCard
                  {modifier}
                  controller={eventPhaseController}
                  {isViewingCurrentPhase}
               />
            {/each}
         </div>
      </div>
   {/if}
</div>

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
   
   .event-traits {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
   }
   
   .event-trait {
      padding: 4px 10px;
      border-radius: var(--radius-full);
      font-size: var(--font-xs);
      font-weight: var(--font-weight-medium);
      line-height: 1.2;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      background: rgba(0, 0, 0, 0.3);
      color: var(--text-secondary);
      border: 1px solid var(--border-subtle);
      
      &.trait-ongoing {
         background: rgba(251, 191, 36, 0.2);
         color: var(--color-amber-light);
         border-color: var(--color-amber);
      }
      
      &.trait-auto-resolve {
         background: rgba(59, 130, 246, 0.2);
         color: var(--color-blue);
         border-color: var(--color-blue);
      }
      
      &.trait-expires {
         background: rgba(100, 116, 139, 0.2);
         color: var(--text-secondary);
         border-color: var(--border-medium);
      }
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
      background: rgba(251, 191, 36, 0.05);
      padding: 20px;
      border-radius: var(--radius-md);
      border: 1px solid var(--color-amber);
      
      h4 {
         margin: 0 0 15px 0;
         color: var(--text-primary);
         font-size: var(--font-lg);
      }
   }
   
   .ongoing-events-list {
      display: flex;
      flex-direction: column;
      gap: 15px;
   }
   
</style>
