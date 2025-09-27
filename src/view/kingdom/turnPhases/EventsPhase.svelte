<script lang="ts">
   import { onMount } from 'svelte';
   import { kingdomState } from '../../../stores/kingdom';
   import { gameState, markPhaseStepCompleted, isPhaseStepCompleted } from '../../../stores/gameState';
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
   import ResolutionDisplay from '../components/ResolutionDisplay.svelte';
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
   
   // Use command pattern for state mutations
   async function handleRollResult(data: { outcome: string, actorName: string, skillName: string }) {
      if (!currentEvent || !eventResolutionService) return;
      
      const outcome = data.outcome as 'success' | 'failure' | 'criticalSuccess' | 'criticalFailure';
      
      // Update UI state
      resolutionOutcome = outcome;
      resolvedActor = data.actorName || resolvedActor;
      selectedSkill = data.skillName || selectedSkill;
      
      // Create command context
      const context: CommandContext = {
         kingdomState: get(kingdomState),
         currentTurn: $gameState.currentTurn || 1,
         currentPhase: 'Phase IV: Events',
         actorId: data.actorName
      };
      
      // Create and execute command for applying event outcome
      const command = new ApplyEventOutcomeCommand(
         currentEvent,
         outcome,
         eventResolutionService
      );
      
      const result = await commandExecutor.execute(command, context, {
         skipValidation: false
      });
      
      if (result.success) {
         // Format the state changes for display
         const formattedChanges = stateChangeFormatter.formatStateChanges(
            result.data?.appliedChanges || new Map()
         );
         
         // Update UI with formatted results
         outcomeMessage = currentEvent.effects?.[outcome]?.msg || '';
         currentEffects = Object.fromEntries(result.data?.appliedChanges || new Map());
         
         showResolutionResult = true;
         isRolling = false;
         
         if (!eventResolved) {
            markPhaseStepCompleted('resolve-event');
         }
      } else {
         console.error('Failed to apply event outcome:', result.error);
      }
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
         
         setTimeout(() => {
            if (!eventResolved) {
               markPhaseStepCompleted('resolve-event');
            }
         }, 1000);
         
      } catch (error) {
         console.error("Error resolving event with skill:", error);
      } finally {
         isRolling = false;
      }
   }
   
   async function ignoreEvent() {
      if (!currentEvent || !eventResolutionService || isIgnoringEvent) return;
      
      isIgnoringEvent = true;
      
      try {
         const context: CommandContext = {
            kingdomState: get(kingdomState),
            currentTurn: $gameState.currentTurn || 1,
            currentPhase: 'Phase IV: Events'
         };
         
         // Always apply failure effects when ignoring an event
         if (currentEvent.effects?.failure) {
            const command = new ApplyEventOutcomeCommand(
               currentEvent,
               'failure',
               eventResolutionService
            );
            
            const result = await commandExecutor.execute(command, context, {
               skipValidation: false
            });
            
            if (result.success) {
               currentEffects = Object.fromEntries(result.data?.appliedChanges || new Map());
               outcomeMessage = currentEvent.effects.failure.msg || `Event "${currentEvent.name}" was ignored - failure effects applied`;
            }
         } else {
            // No failure effects defined
            outcomeMessage = `Event "${currentEvent.name}" was ignored`;
         }
         
         // Show resolution result
         resolutionOutcome = 'failure';
         showResolutionResult = true;
         
         // Mark phase as complete
         if (!eventResolved) {
            markPhaseStepCompleted('resolve-event');
         }
      } finally {
         isIgnoringEvent = false;
      }
   }
   
   function completeEventResolution() {
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
   }
   
   // Helper functions that only format data for display
   function getEventSkills(event: EventData): EventSkill[] {
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
                  <ResolutionDisplay
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
                     <strong>Event Triggered!</strong> (Rolled {stabilityRoll} vs DC {eventDC})
                     <div>Drawing event card...</div>
                  </div>
               {:else}
                  <div class="roll-result failure">
                     <strong>No Event</strong> (Rolled {stabilityRoll} vs DC {eventDC})
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
