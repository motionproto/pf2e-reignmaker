<script lang="ts">
   import { onMount } from 'svelte';
   import { kingdomState } from '../../../stores/kingdom';
   import { gameState, markPhaseStepCompleted, isPhaseStepCompleted, spendPlayerAction } from '../../../stores/gameState';
   import { TurnPhase } from '../../../models/KingdomState';
   import { get } from 'svelte/store';
   
   // Import our new services and commands
   import { EventResolutionService } from '../../../services/domain/EventResolutionService';
   import { diceService } from '../../../services/domain/DiceService';
   import { stateChangeFormatter } from '../../../services/formatters/StateChangeFormatter';
   import { ApplyEventOutcomeCommand } from '../../../commands/impl/ApplyEventOutcomeCommand';
   import { commandExecutor } from '../../../commands/base/CommandExecutor';
   import type { CommandContext } from '../../../commands/base/Command';
   
   // Import existing services and components
   import { eventService, type EventData, type EventSkill, type EventOutcome } from '../../../services/EventService';
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
   } from '../../../api/foundry-actors';
   
   // Initialize services
   let eventResolutionService: EventResolutionService;
   
   // UI State (no business logic)
   let stabilityRoll: number = 0;
   let showStabilityResult = false;
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
   
   // Computed UI state
   $: eventChecked = isPhaseStepCompleted('resolve-event');
   $: eventResolved = isPhaseStepCompleted('resolve-event');
   $: eventDC = $gameState.eventDC;
   $: activeModifiers = $kingdomState.modifiers || [];
   
   onMount(() => {
      const initAsync = async () => {
         await eventService.loadEvents();
         
         // Initialize the event resolution service
         eventResolutionService = new EventResolutionService(eventService);
         
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
   
   // Store pending changes without applying them
   let pendingEventChanges: Map<string, number> | null = null;
   
   // Handle roll result but DON'T apply changes yet
   async function handleRollResult(data: { outcome: string, actorName: string, skillName: string }) {
      if (!currentEvent || !eventResolutionService) return;
      
      const outcome = data.outcome as 'success' | 'failure' | 'criticalSuccess' | 'criticalFailure';
      
      // Update UI state
      resolutionOutcome = outcome;
      resolvedActor = data.actorName || resolvedActor;
      selectedSkill = data.skillName || selectedSkill;
      
      // Spend the player's action
      const game = (window as any).game;
      if (game?.user?.id) {
         spendPlayerAction(game.user.id, TurnPhase.PHASE_IV);
      }
      
      // Calculate what the changes WOULD be, but don't apply them yet
      const eventApplication = eventResolutionService.applyEventOutcome(currentEvent, outcome);
      pendingEventChanges = eventApplication.resourceChanges;
      
      // Update UI with the pending changes for preview
      outcomeMessage = currentEvent.effects?.[outcome]?.msg || '';
      currentEffects = Object.fromEntries(pendingEventChanges);
      
      showResolutionResult = true;
      isRolling = false;
   }
   
   // Use service for stability check logic
   async function performStabilityCheck() {
      if (!eventResolutionService) return;
      
      isRolling = true;
      showStabilityResult = false;
      
      // Animate the roll
      setTimeout(() => {
         // Use the service to perform the stability check
         const checkResult = eventResolutionService.performStabilityCheck(eventDC);
         
         stabilityRoll = checkResult.roll;
         
         // Update game state with new DC
         gameState.update(state => {
            state.eventDC = checkResult.newDC;
            return state;
         });
         
         if (checkResult.event) {
            currentEvent = checkResult.event;
         } else {
            // Mark phase as complete if no event
            if (!eventChecked) {
               markPhaseStepCompleted('resolve-event');
            }
         }
         
         showStabilityResult = true;
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
      if (!currentEvent || !eventResolutionService || isIgnoringEvent) return;
      
      isIgnoringEvent = true;
      
      // Spend the player's action for ignoring the event
      const game = (window as any).game;
      if (game?.user?.id) {
         spendPlayerAction(game.user.id, TurnPhase.PHASE_IV);
      }
      
      try {
         // Calculate what the changes WOULD be for failure, but don't apply them yet
         if (currentEvent.effects?.failure) {
            const eventApplication = eventResolutionService.applyEventOutcome(currentEvent, 'failure');
            pendingEventChanges = eventApplication.resourceChanges;
            
            currentEffects = Object.fromEntries(pendingEventChanges);
            outcomeMessage = currentEvent.effects.failure.msg || `Event "${currentEvent.name}" was ignored - failure effects applied`;
         } else {
            // No failure effects defined
            pendingEventChanges = new Map();
            currentEffects = {};
            outcomeMessage = `Event "${currentEvent.name}" was ignored`;
         }
         
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
      if (pendingEventChanges && currentEvent && resolutionOutcome) {
         const context: CommandContext = {
            kingdomState: get(kingdomState),
            currentTurn: $gameState.currentTurn || 1,
            currentPhase: 'Phase IV: Events',
            actorId: resolvedActor
         };
         
         const command = new ApplyEventOutcomeCommand(
            currentEvent,
            resolutionOutcome,
            eventResolutionService
         );
         
         const result = await commandExecutor.execute(command, context, {
            skipValidation: false
         });
         
         if (result.success) {
            // Mark phase as complete after successfully applying changes
            if (!eventResolved) {
               markPhaseStepCompleted('resolve-event');
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
      pendingEventChanges = null;
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
                           disabled={eventResolved}
                           checkType="event"
                           checkName={currentEvent.name}
                           checkId={currentEvent.id}
                           checkEffects={currentEvent.effects}
                           on:execute={(e) => resolveEventWithSkill(e.detail.skill)}
                        />
                     {/each}
                  </div>
                  
                  <div class="ignore-event-section">
                     <div class="divider-text">or</div>
                     <Button 
                        variant="secondary"
                        on:click={ignoreEvent}
                        disabled={isIgnoringEvent || eventResolved}
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
      <div class="stability-check-section">
         <h3>Roll for Event</h3>
         <div class="dc-info">
            <span class="dc-label">Event DC:</span>
            <span class="dc-value">{eventDC}</span>
         </div>
         
         <Button 
            variant="secondary"
            on:click={performStabilityCheck}
            disabled={isRolling || eventChecked}
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
         
         {#if showStabilityResult}
            <div class="check-result-display">
               {#if currentEvent}
                  <div class="roll-result success">
                     <strong>Event Triggered!</strong> (Rolled {stabilityRoll} &ge; DC {eventDC})
                     <div>Drawing event card...</div>
                  </div>
               {:else}
                  <div class="roll-result failure">
                     <strong>No Event</strong> (Rolled {stabilityRoll} &lt; DC {eventDC})
                     <div>DC reduced to {$gameState.eventDC} for next turn.</div>
                  </div>
               {/if}
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
      font-size: var(--type-heading-1-size);
      font-weight: var(--type-heading-1-weight);
      line-height: var(--type-heading-1-line);
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
      font-size: var(--type-badge-size);
      font-weight: var(--type-badge-weight);
      line-height: var(--type-badge-line);
      letter-spacing: var(--type-badge-spacing);
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
      font-size: var(--type-body-size);
      line-height: var(--type-body-line);
      color: var(--text-secondary);
      margin-bottom: 15px;
   }
   
   .event-resolution {
      margin-top: 20px;
      
      h4 {
         margin: 0 0 15px 0;
         color: var(--text-primary);
         font-size: var(--type-heading-3-size);
         font-weight: var(--type-heading-3-weight);
         line-height: var(--type-heading-3-line);
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
   
   .stability-check-section {
      background: rgba(0, 0, 0, 0.05);
      padding: 25px;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-subtle);
      text-align: center;
      
      h3 {
         margin: 0 0 15px 0;
         color: var(--text-primary);
         font-size: var(--type-heading-2-size);
         font-weight: var(--type-heading-2-weight);
         line-height: var(--type-heading-2-line);
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
         font-weight: bold;
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
         font-weight: 500;
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
