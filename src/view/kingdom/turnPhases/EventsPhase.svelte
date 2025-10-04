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
   let outcomeApplied = false; // Track when outcome has been applied
   let rollBreakdown: any = null; // Roll breakdown data from PF2e system
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
   $: activeModifiers = $kingdomData.activeModifiers || [];
   $: stabilityRoll = $kingdomData.eventStabilityRoll || 0;
   $: showStabilityResult = $kingdomData.eventStabilityRoll !== null;
   $: rolledAgainstDC = $kingdomData.eventRollDC || eventDC;
   $: eventWasTriggered = $kingdomData.eventTriggered ?? null;
   
   onMount(() => {
      const initAsync = async () => {
         // Initialize the controller - no need for eventService parameter
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
         
         // Capture roll breakdown if available
         if (event.detail.rollBreakdown) {
            console.log('📊 [EventsPhase] Roll breakdown received:', event.detail.rollBreakdown);
            rollBreakdown = event.detail.rollBreakdown;
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
            // EventModifier has resource property, not selector
            // Skip modifiers with resource arrays (they require player choice)
            if (!Array.isArray(modifier.resource)) {
               previewEffects.set(modifier.resource, (previewEffects.get(modifier.resource) || 0) + modifier.value);
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
         
         console.log('[EventsPhase] ignoreEvent() - failure modifiers:', effects?.modifiers);
         
         if (effects && effects.modifiers) {
            // Parse modifiers array to extract resource changes
            for (const modifier of effects.modifiers) {
               // EventModifier has resource property, not selector
               // Skip modifiers with resource arrays (they require player choice)
               if (!Array.isArray(modifier.resource)) {
                  previewEffects.set(modifier.resource, (previewEffects.get(modifier.resource) || 0) + modifier.value);
               } else {
                  console.log('[EventsPhase] Skipping resource array modifier - requires user selection:', modifier);
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
         
         // Import the display name helper
         const { getEventDisplayName } = await import('../../../types/event-helpers');
         const eventName = getEventDisplayName(currentEvent);
         outcomeMessage = currentEvent.effects?.failure?.msg || `Event "${eventName}" was ignored - failure effects applied`;
         
         console.log('[EventsPhase] Setting resolutionOutcome to failure, modifiers will be:', currentEvent.effects?.failure?.modifiers);
         
         // Show resolution result
         resolutionOutcome = 'failure';
         showResolutionResult = true;
      } finally {
         isIgnoringEvent = false;
      }
   }
   
   // Handle fame reroll
   async function handleRerollWithFame() {
      if (!currentEvent || !selectedSkill) {
         console.error('[EventsPhase] Cannot reroll - missing event or skill');
         return;
      }
      
      // Import shared reroll helpers
      const { canRerollWithFame, deductFameForReroll, restoreFameAfterFailedReroll } = 
         await import('../../../controllers/shared/RerollHelpers');
      
      // Check if reroll is possible
      const fameCheck = await canRerollWithFame();
      if (!fameCheck.canReroll) {
         ui.notifications?.warn(fameCheck.error || 'Not enough fame to reroll');
         return;
      }
      
      // Deduct fame
      const deductResult = await deductFameForReroll();
      if (!deductResult.success) {
         ui.notifications?.error(deductResult.error || 'Failed to deduct fame');
         return;
      }
      
      console.log(`💎 [EventsPhase] Rerolling with fame (${fameCheck.currentFame} → ${fameCheck.currentFame - 1})`);
      
      // Reset UI state for new roll
      showResolutionResult = false;
      resolutionOutcome = null;
      outcomeMessage = '';
      currentEffects = null;
      pendingEventOutcome = null;
      outcomeApplied = false;
      rollBreakdown = null;
      
      // Small delay to ensure UI updates
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Trigger new roll with same skill
      try {
         await resolveEventWithSkill(selectedSkill);
      } catch (error) {
         console.error('[EventsPhase] Error during reroll:', error);
         
         // Restore fame on error
         if (deductResult.previousFame !== undefined) {
            await restoreFameAfterFailedReroll(deductResult.previousFame);
         }
         
         ui.notifications?.error('Failed to reroll. Fame has been restored.');
      }
   }
   
   // Apply the pending changes when user clicks OK
   async function completeEventResolution() {
      console.log('[EventsPhase] completeEventResolution() called');
      
      // Apply the pending changes if they exist
      if (pendingEventOutcome && eventPhaseController) {
         console.log('[EventsPhase] Applying pending outcome:', pendingEventOutcome.outcome);
         
         const result = await eventPhaseController.applyEventOutcome(
            pendingEventOutcome.event,
            pendingEventOutcome.outcome,
            get(kingdomData),
            $kingdomData.currentTurn || 1
         );
         
         console.log('[EventsPhase] applyEventOutcome result:', result);
         
         if (result.success) {
            // Handle unresolved event if any
            if (result.unresolvedEvent) {
               unresolvedEvent = result.unresolvedEvent;
            }
            
            // Keep the outcome visible but mark it as applied
            outcomeApplied = true;
            pendingEventOutcome = null;
            
            console.log('✅ [EventsPhase] Event resolution applied successfully');
         } else {
            console.error('[EventsPhase] Failed to apply event outcome:', result.error);
         }
      } else {
         console.warn('[EventsPhase] No pending outcome or controller not available');
      }
   }
   
   // Helper functions that only format data for display
   function getEventSkills(event: EventData): EventSkill[] {
      // All events now use the consistent new format with skill objects
      return event.skills || [];
   }
   
   async function buildEventOutcomes(event: EventData): Promise<PossibleOutcome[]> {
      // Use shared helper to handle missing outcomes gracefully
      const { buildPossibleOutcomes } = await import('../../../controllers/shared/PossibleOutcomeHelpers');
      return buildPossibleOutcomes(event.effects);
   }
</script>

<div class="events-phase">
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
            
            {#if !showResolutionResult}
               <!-- Show possible outcomes -->
               {#if currentEvent}
                  {#await buildEventOutcomes(currentEvent) then eventOutcomes}
                     {#if eventOutcomes.length > 0}
                        <PossibleOutcomes outcomes={eventOutcomes} showTitle={true} />
                     {/if}
                  {/await}
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
                     modifiers={currentEvent?.effects?.[resolutionOutcome]?.modifiers}
                     rollBreakdown={rollBreakdown}
                     primaryButtonLabel="Apply Result"
                     applied={outcomeApplied}
                     choices={currentEvent?.effects?.[resolutionOutcome]?.choices}
                     on:primary={completeEventResolution}
                     on:reroll={handleRerollWithFame}
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
   
   <!-- Active Modifiers Display -->
   {#if activeModifiers.length > 0}
      <div class="modifiers-section">
         <h4>Active Modifiers</h4>
         <div class="modifiers-list">
            {#each activeModifiers as modifier}
               <div class="modifier-item">
                  <div class="modifier-header">
                     <span class="modifier-name">{modifier.name}</span>
                     <span class="modifier-tier">Tier {modifier.tier}</span>
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
      border-left: 3px solid var(--color-blue);
      
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
