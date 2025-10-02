<script lang="ts">
   import { onMount } from 'svelte';
   import { kingdomData, getKingdomActor, updateKingdom, getTurnManager } from '../../../stores/KingdomStore';
   import { TurnPhase } from '../../../actors/KingdomActor';
   import { get } from 'svelte/store';
   
   // Props
   export let isViewingCurrentPhase: boolean = true;
   
   // Import controller instead of services/commands directly
   import { createEventPhaseController } from '../../../controllers/EventPhaseController';
   import { stateChangeFormatter } from '../../../services/formatters/StateChangeFormatter';
   
   // Import existing services and components
   import type { EventData, EventSkill, EventOutcome } from '../../../services/domain/events/EventService';
   import { EventProvider } from '../../../controllers/events/EventProvider';
   import Button from '../components/baseComponents/Button.svelte';
   import PossibleOutcomes from '../components/PossibleOutcomes.svelte';
   import type { PossibleOutcome } from '../components/PossibleOutcomes.svelte';
   import SkillTag from '../components/SkillTag.svelte';
   import OutcomeDisplay from '../components/OutcomeDisplay.svelte';
   import PlayerActionTracker from '../components/PlayerActionTracker.svelte';
   import { 
      performKingdomSkillCheck,
      getCurrentUserCharacter,
      showCharacterSelectionDialog,
      initializeRollResultHandler
   } from '../../../services/pf2e';
   
   // Initialize controller
   let eventPhaseController: any;
   
   // UI State (no business logic)
   let isRolling = false;
   let selectedSkill = '';
   let resolutionRoll: number = 0;
   let showResolutionResult = false;
   let currentEvent: EventData | null = null;
   let resolutionOutcome: 'success' | 'failure' | 'criticalSuccess' | 'criticalFailure' | null = null;
   let outcomeMessage: string = '';
   let currentEffects: any = null;
   let unresolvedEvent: EventData | null = null;
   let resolvedActor: string = '';
   let character: any = null;
   let isIgnoringEvent = false;
   let rolledAgainstDC: number = 0; // Store the DC that was actually rolled against
   let pendingEventOutcome: {
      event: EventData;
      outcome: 'success' | 'failure' | 'criticalSuccess' | 'criticalFailure';
      effects: Map<string, any>;
   } | null = null;
   
   // Computed UI state - use currentPhaseSteps array with index-based approach
   $: currentSteps = $kingdomData.currentPhaseSteps || [];
   $: eventChecked = currentSteps[0]?.completed === 1; // Step 0 = event-check
   $: eventResolved = currentSteps[1]?.completed === 1; // Step 1 = resolve-event
   $: eventDC = $kingdomData.eventDC;
   $: activeModifiers = $kingdomData.modifiers || [];
   $: stabilityRoll = $kingdomData.eventStabilityRoll || 0;
   $: showStabilityResult = $kingdomData.eventStabilityRoll !== null;
   $: rolledAgainstDC = $kingdomData.eventRollDC || eventDC;
   
   onMount(() => {
      const initAsync = async () => {
         // Initialize the controller - no need for eventService parameter
         eventPhaseController = await createEventPhaseController(null);
         
         // Check if an event was already rolled by another client
         if ($kingdomData.currentEventId) {
            console.log('[EventsPhase] Loading existing event from kingdomData:', $kingdomData.currentEventId);
            const event = await EventProvider.getEventById($kingdomData.currentEventId);
            if (event) {
               currentEvent = event;
         // Also mark that we've checked for events so the button shows correctly
         if (!eventChecked) {
            const { PhaseHandler } = await import('../../../models/turn-manager/phase-handler');
            await PhaseHandler.completePhaseStepByIndex(0); // Step 0 = event-check
         }
            }
         } else if ($kingdomData.currentEventId === null && eventChecked) {
            // Another client rolled and got no event - we should show that
            console.log('[EventsPhase] No event was rolled by another client');
            // The values should be synced via Foundry actor
         }
         
         if (typeof (window as any).game !== 'undefined') {
            initializeRollResultHandler();
         }
      };
      
      initAsync();
      
      // Listen for kingdom roll complete events
      const handleKingdomRoll = (event: CustomEvent) => {
         if (!currentEvent || event.detail.checkId !== currentEvent.id) {
            return;
         }
         
         if (event.detail.checkType !== 'event') {
            return;
         }
         
         handleRollResult(event.detail);
      };
      
      window.addEventListener('kingdomRollComplete', handleKingdomRoll as EventListener);
      
      return () => {
         window.removeEventListener('kingdomRollComplete', handleKingdomRoll as EventListener);
      };
   });
   
   // Handle roll result but DON'T apply changes yet
   async function handleRollResult(data: { outcome: string, actorName: string, skillName: string }) {
      if (!currentEvent || !eventPhaseController) return;
      
      const outcome = data.outcome as 'success' | 'failure' | 'criticalSuccess' | 'criticalFailure';
      
      // Update UI state
      resolutionOutcome = outcome;
      resolvedActor = data.actorName || resolvedActor;
      selectedSkill = data.skillName || selectedSkill;
      
      // Spend the player's action
      const game = (window as any).game;
      if (game?.user?.id) {
         const turnManager = getTurnManager();
         if (turnManager) {
            turnManager.spendPlayerAction(game.user.id, TurnPhase.EVENTS);
         }
      }
      
      // Calculate preview of effects without applying
      const effects = currentEvent.effects?.[outcome];
      const previewEffects = new Map<string, any>();
      
      if (effects && effects.modifiers) {
         // Parse modifiers array to extract resource changes
         for (const modifier of effects.modifiers) {
            if (modifier.enabled && modifier.selector) {
               previewEffects.set(modifier.selector, (previewEffects.get(modifier.selector) || 0) + modifier.value);
            }
         }
      }
      
      // Store pending outcome for later application
      pendingEventOutcome = {
         event: currentEvent,
         outcome,
         effects: previewEffects
      };
      
      // Update UI with the pending changes for preview
      outcomeMessage = currentEvent.effects?.[outcome]?.msg || '';
      currentEffects = Object.fromEntries(previewEffects);
      
      showResolutionResult = true;
      isRolling = false;
   }
   
   // Use controller for event check logic
   async function performEventCheck() {
      if (!eventPhaseController) return;
      
      // Check if another client already rolled for an event
      if ($kingdomData.currentEventId) {
         console.log('[EventsPhase] Event already rolled by another client, loading existing event');
         // Load the event by ID
         const event = await EventProvider.getEventById($kingdomData.currentEventId);
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
         const checkResult = await eventPhaseController.performEventCheck(currentDC);
         
         // Update kingdom state with roll results and new DC for multiplayer sync
         await updateKingdom(kingdom => {
            kingdom.eventDC = checkResult.newDC;
            kingdom.eventStabilityRoll = checkResult.roll;
            kingdom.eventRollDC = currentDC;
            kingdom.eventTriggered = checkResult.triggered;
            
            if (checkResult.event) {
               kingdom.currentEventId = checkResult.event.id;
            } else {
               kingdom.currentEventId = null;
            }
         });
         
         if (checkResult.event) {
            currentEvent = checkResult.event;
         }
         
         // Always mark step as complete after rolling (whether event or not)
         if (!eventChecked) {
            const { PhaseHandler } = await import('../../../models/turn-manager/phase-handler');
            await PhaseHandler.completePhaseStepByIndex(0); // Step 0 = event-check
         }
         
         isRolling = false;
      }, 1000);
   }
   
   async function resolveEventWithSkill(skill: string) {
      if (!currentEvent) return;
      
      selectedSkill = skill;
      showResolutionResult = false;
      isRolling = true;
      
      try {
         const outcomes = {
            criticalSuccess: currentEvent.effects?.criticalSuccess || null,
            success: currentEvent.effects?.success || null,
            failure: currentEvent.effects?.failure || null,
            criticalFailure: currentEvent.effects?.criticalFailure || null
         };
         
         await performKingdomSkillCheck(
            skill,
            'event',
            currentEvent.name,
            currentEvent.id,
            outcomes
         );
         
         // Don't mark as complete here - wait for the OK button
         
      } catch (error) {
         console.error("Error resolving event with skill:", error);
      } finally {
         isRolling = false;
      }
   }
   
   async function ignoreEvent() {
      if (!currentEvent || !eventPhaseController || isIgnoringEvent) return;
      
      isIgnoringEvent = true;
      
      // Spend the player's action for ignoring the event
      const game = (window as any).game;
      if (game?.user?.id) {
         const turnManager = getTurnManager();
         if (turnManager) {
            turnManager.spendPlayerAction(game.user.id, TurnPhase.EVENTS);
         }
      }
      
      try {
         // Calculate preview effects for failure outcome
         const effects = currentEvent.effects?.failure;
         const previewEffects = new Map<string, any>();
         
         if (effects && effects.modifiers) {
            // Parse modifiers array to extract resource changes
            for (const modifier of effects.modifiers) {
               if (modifier.enabled && modifier.selector) {
                  previewEffects.set(modifier.selector, (previewEffects.get(modifier.selector) || 0) + modifier.value);
               }
            }
         }
         
         // Store pending outcome for later application
         pendingEventOutcome = {
            event: currentEvent,
            outcome: 'failure',
            effects: previewEffects
         };
         
         currentEffects = Object.fromEntries(previewEffects);
         outcomeMessage = currentEvent.effects?.failure?.msg || `Event "${currentEvent.name}" was ignored - failure effects applied`;
         
         // Show resolution result
         resolutionOutcome = 'failure';
         showResolutionResult = true;
      } finally {
         isIgnoringEvent = false;
      }
   }
   
   // Apply the pending changes when user clicks OK
   async function completeEventResolution() {
      // Apply the pending changes if they exist
      if (pendingEventOutcome && eventPhaseController) {
         const result = await eventPhaseController.applyEventOutcome(
            pendingEventOutcome.event,
            pendingEventOutcome.outcome,
            get(kingdomData),
            $kingdomData.currentTurn || 1
         );
         
         if (result.success) {
            // Kingdom state automatically updated via Foundry actor
            
            // Mark phase as complete after successfully applying changes
            if (!eventResolved) {
               const { PhaseHandler } = await import('../../../models/turn-manager/phase-handler');
               await PhaseHandler.completePhaseStepByIndex(1); // Step 1 = resolve-event
            }
            
            // Handle unresolved event if any
            if (result.unresolvedEvent) {
               unresolvedEvent = result.unresolvedEvent;
            }
         } else {
            console.error('Failed to apply event outcome:', result.error);
         }
      }
      
      // Reset UI state
      currentEvent = null;
      selectedSkill = '';
      showResolutionResult = false;
      resolutionOutcome = null;
      outcomeMessage = '';
      currentEffects = null;
      unresolvedEvent = null;
      resolvedActor = '';
      character = null;
      pendingEventOutcome = null;
      
      // Clear event roll state for next turn using new updateKingdom function
      await updateKingdom(kingdom => {
         kingdom.eventStabilityRoll = null;
         kingdom.eventRollDC = null;
         kingdom.eventTriggered = null;
      });
      
      // Reset controller state for next phase
      if (eventPhaseController) {
         eventPhaseController.resetState();
      }
   }
   
   // Helper functions that only format data for display
   function getEventSkills(event: EventData): EventSkill[] {
      // All events now use the consistent new format with skill objects
      return event.skills || [];
   }
   
   function buildEventOutcomes(event: EventData): PossibleOutcome[] {
      const outcomes: PossibleOutcome[] = [];
      
      if (event.effects?.criticalSuccess) {
         outcomes.push({
            result: 'criticalSuccess',
            label: 'Critical Success',
            description: event.effects.criticalSuccess.msg
         });
      }
      
      if (event.effects?.success) {
         outcomes.push({
            result: 'success',
            label: 'Success',
            description: event.effects.success.msg
         });
      }
      
      if (event.effects?.failure) {
         outcomes.push({
            result: 'failure',
            label: 'Failure',
            description: event.effects.failure.msg
         });
      }
      
      if (event.effects?.criticalFailure) {
         outcomes.push({
            result: 'criticalFailure',
            label: 'Critical Failure',
            description: event.effects.criticalFailure.msg
         });
      }
      
      return outcomes;
   }
</script>

<div class="events-phase">
   <!-- Player Action Tracker -->
   <PlayerActionTracker compact={true} />
   
   {#if currentEvent}
      <!-- Active Event Card -->
      <div class="event-card">
         {#if showStabilityResult}
            <div class="event-rolled-banner">
               <i class="fas fa-dice-d20"></i>
               <span>Event Triggered! (Rolled {stabilityRoll} ≥ DC {rolledAgainstDC})</span>
            </div>
         {/if}
         <div class="event-header">
            <h3 class="event-title">{currentEvent.name}</h3>
         </div>
         
         <div class="event-body">
            <p class="event-description">{currentEvent.description}</p>
            
            {#if !showResolutionResult}
               <!-- Show possible outcomes -->
               {#if currentEvent}
                  {@const eventOutcomes = buildEventOutcomes(currentEvent)}
                  {#if eventOutcomes.length > 0}
                     <PossibleOutcomes outcomes={eventOutcomes} showTitle={true} />
                  {/if}
               {/if}
               
               <div class="event-resolution">
                  <h4>Choose Your Response:</h4>
                  <div class="skill-options">
                     {#each getEventSkills(currentEvent) as skillOption}
                        <SkillTag
                           skill={skillOption.skill}
                           description={skillOption.description}
                           selected={selectedSkill === skillOption.skill}
                           disabled={!isViewingCurrentPhase || eventResolved}
                           on:execute={(e) => resolveEventWithSkill(e.detail.skill)}
                        />
                     {/each}
                  </div>
                  
                  <div class="ignore-event-section">
                     <div class="divider-text">or</div>
                     <Button 
                        variant="secondary"
                        on:click={ignoreEvent}
                        disabled={!isViewingCurrentPhase || isIgnoringEvent || eventResolved}
                        icon="fas fa-times-circle"
                        iconPosition="left"
                     >
                        {#if isIgnoringEvent}
                           Ignoring Event...
                        {:else}
                           Ignore Event
                        {/if}
                     </Button>
                     {#if currentEvent.effects?.failure}
                        <p class="ignore-warning">Failure effects will be applied</p>
                     {/if}
                  </div>
               </div>
            {/if}
            
            {#if showResolutionResult && resolutionOutcome}
               <div class="event-result-display">
                  <OutcomeDisplay
                     outcome={resolutionOutcome}
                     actorName={resolvedActor || "The Kingdom"}
                     skillName={selectedSkill}
                     effect={outcomeMessage}
                     stateChanges={currentEffects}
                     showFameReroll={false}
                     on:primary={completeEventResolution}
                  />
               </div>
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
         
         {#if showStabilityResult && eventChecked}
            <div class="check-result-display">
               <div class="roll-result failure">
                  <strong>No Event</strong> (Rolled {stabilityRoll} &lt; DC {rolledAgainstDC})
                  <div>DC reduced to {$kingdomData.eventDC} for next turn.</div>
               </div>
            </div>
         {/if}
      </div>
   {/if}
   
   <!-- Active Modifiers Display -->
   {#if activeModifiers.length > 0}
      <div class="modifiers-section">
         <h4>Active Modifiers</h4>
         <div class="modifiers-list">
            {#each activeModifiers as modifier}
               <div class="modifier-item severity-{modifier.severity}">
                  <div class="modifier-header">
                     <span class="modifier-name">{modifier.name}</span>
                     {#if modifier.duration !== 'permanent' && modifier.duration !== 'until-resolved'}
                        <span class="modifier-duration">
                           {stateChangeFormatter.formatDuration(modifier.duration)}
                        </span>
                     {/if}
                  </div>
                  {#if modifier.description}
                     <p class="modifier-description">{modifier.description}</p>
                  {/if}
               </div>
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
      
      &.trait-continuous {
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
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
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
   
   .modifiers-section {
      background: rgba(0, 0, 0, 0.05);
      padding: 20px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
      
      h4 {
         margin: 0 0 15px 0;
         color: var(--text-primary);
         font-size: var(--font-lg);
      }
   }
   
   .modifiers-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
   }
   
   .modifier-item {
      padding: 12px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
      
      &.severity-beneficial {
         border-left: 3px solid var(--color-green);
      }
      
      &.severity-neutral {
         border-left: 3px solid var(--color-blue);
      }
      
      &.severity-dangerous {
         border-left: 3px solid var(--color-amber);
      }
      
      &.severity-critical {
         border-left: 3px solid var(--color-red);
      }
      
      .modifier-header {
         display: flex;
         justify-content: space-between;
         align-items: center;
         margin-bottom: 5px;
      }
      
      .modifier-name {
         color: var(--text-primary);
         font-weight: var(--font-weight-medium);
      }
      
      .modifier-duration {
         font-size: var(--font-sm);
         color: var(--text-secondary);
         opacity: 0.8;
      }
      
      .modifier-description {
         font-size: var(--font-sm);
         color: var(--text-secondary);
         margin: 0;
         line-height: 1.4;
      }
   }
</style>
