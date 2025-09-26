<script lang="ts">
   import { onMount } from 'svelte';
   import { kingdomState, addModifier } from '../../../stores/kingdom';
   import { gameState, markPhaseStepCompleted, isPhaseStepCompleted } from '../../../stores/gameState';
   import { eventService, type EventData, type EventSkill, type EventOutcome } from '../../../services/EventService';
   import { modifierService } from '../../../services/ModifierService';
   import { get } from 'svelte/store';
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
   
   // State for event handling
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
   let character: any = null; // Track the selected character
   
   // Check if steps are completed
   $: eventChecked = isPhaseStepCompleted('resolve-event');
   $: eventResolved = isPhaseStepCompleted('resolve-event');
   
   // Event DC from game state
   $: eventDC = $gameState.eventDC;
   
   // Load events on mount and setup roll result listener
   onMount(() => {
      const initAsync = async () => {
         await eventService.loadEvents();
         
         // Initialize the roll result handler if in Foundry
         if (typeof (window as any).game !== 'undefined') {
            initializeRollResultHandler();
         }
      };
      
      initAsync();
      
      // Listen for kingdom roll complete events
      const handleKingdomRoll = (event: CustomEvent) => {
         // Only handle events that match our current event
         if (!currentEvent || event.detail.checkId !== currentEvent.id) {
            return;
         }
         
         // Only handle event type checks
         if (event.detail.checkType !== 'event') {
            return;
         }
         
         handleRollResult(event.detail);
      };
      
      window.addEventListener('kingdomRollComplete', handleKingdomRoll as EventListener);
      
      // Cleanup on component destroy
      return () => {
         window.removeEventListener('kingdomRollComplete', handleKingdomRoll as EventListener);
      };
   });
   
   // Handle roll results from Foundry
   function handleRollResult(data: { outcome: string, actorName: string, skillName: string }) {
      if (!currentEvent) return;
      
      const outcome = data.outcome as 'success' | 'failure' | 'criticalSuccess' | 'criticalFailure';
      
      // Update our state based on the roll result
      resolutionOutcome = outcome;
      resolvedActor = data.actorName || resolvedActor;
      selectedSkill = data.skillName || selectedSkill;
      
      // Get the appropriate effect based on outcome
      // NOTE: When players attempt resolution (regardless of outcome), we apply immediate effects only
      // Modifiers are ONLY created when the event is skipped entirely
      if (outcome === 'criticalSuccess' && currentEvent.effects?.criticalSuccess) {
         outcomeMessage = currentEvent.effects.criticalSuccess.msg;
         currentEffects = currentEvent.effects.criticalSuccess.modifiers;
         applyEventOutcome(currentEvent.effects.criticalSuccess);
      } else if (outcome === 'success' && currentEvent.effects?.success) {
         outcomeMessage = currentEvent.effects.success.msg;
         currentEffects = currentEvent.effects.success.modifiers;
         applyEventOutcome(currentEvent.effects.success);
      } else if (outcome === 'criticalFailure' && currentEvent.effects?.criticalFailure) {
         outcomeMessage = currentEvent.effects.criticalFailure.msg;
         currentEffects = currentEvent.effects.criticalFailure.modifiers;
         applyEventOutcome(currentEvent.effects.criticalFailure);
         // NO LONGER create modifier here - only when skipped
      } else if (outcome === 'failure' && currentEvent.effects?.failure) {
         outcomeMessage = currentEvent.effects.failure.msg;
         currentEffects = currentEvent.effects.failure.modifiers;
         applyEventOutcome(currentEvent.effects.failure);
         // NO LONGER create modifier here - only when skipped
      }
      
      showResolutionResult = true;
      isRolling = false;
      
      if (!eventResolved) {
         markPhaseStepCompleted('resolve-event');
      }
   }
   
   function performStabilityCheck() {
      isRolling = true;
      showStabilityResult = false;
      
      // Animate the roll
      setTimeout(() => {
         // Roll for event
         stabilityRoll = Math.floor(Math.random() * 20) + 1;
         const currentDC = eventDC; // Store the DC before any changes
         const success = stabilityRoll >= currentDC;
         
         if (success) {
            // Event triggered!
            gameState.update(state => {
               state.eventDC = 16; // Reset DC
               return state;
            });
            
            // Get a random event from the EventService
            const event = eventService.getRandomEvent();
            if (event) {
               currentEvent = event;
            }
         } else {
            // No event, reduce DC
            gameState.update(state => {
               state.eventDC = Math.max(6, state.eventDC - 5);
               return state;
            });
            
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
         // Prepare the outcomes for the roll
         const outcomes = {
            criticalSuccess: currentEvent.effects?.criticalSuccess || null,
            success: currentEvent.effects?.success || null,
            failure: currentEvent.effects?.failure || null,
            criticalFailure: currentEvent.effects?.criticalFailure || null
         };
         
         // Use the unified performKingdomSkillCheck with type='event'
         await performKingdomSkillCheck(
            skill,
            'event',
            currentEvent.name,
            currentEvent.id,
            outcomes
         );
         
         // The roll result will be handled by Foundry's chat system
         // We'll need to listen for the result and update our state accordingly
         // For now, mark as resolved after a delay
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
   
   function applyEventOutcome(outcome: EventOutcome) {
      if (!outcome?.modifiers) return;
      
      kingdomState.update(state => {
         // Apply modifiers based on selector
         for (const modifier of outcome.modifiers) {
            if (!modifier.enabled) continue;
            
            switch (modifier.selector) {
               case 'gold':
                  const currentGold = state.resources.get('gold') || 0;
                  state.resources.set('gold', Math.max(0, currentGold + modifier.value));
                  break;
               case 'food':
                  const currentFood = state.resources.get('food') || 0;
                  state.resources.set('food', Math.max(0, currentFood + modifier.value));
                  break;
               case 'resources':
                  // Generic resources (lumber, stone, ore)
                  const resourceTypes = ['lumber', 'stone', 'ore'];
                  resourceTypes.forEach(resource => {
                     const current = state.resources.get(resource) || 0;
                     state.resources.set(resource, Math.max(0, current + modifier.value));
                  });
                  break;
               case 'unrest':
                  state.unrest = Math.max(0, state.unrest + modifier.value);
                  break;
               case 'fame':
                  state.fame = Math.max(0, Math.min(3, state.fame + modifier.value));
                  break;
               default:
                  console.warn(`Unknown modifier selector: ${modifier.selector}`);
            }
         }
         
         return state;
      });
   }
   
   function completeEventResolution() {
      // Reset state
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
   
   // NEW: Skip event and create persistent modifier
   function skipEvent() {
      if (!currentEvent) return;
      
      // Check if event can create a persistent modifier
      if (currentEvent.ifUnresolved) {
         const modifier = eventService.handleUnresolvedEvent(currentEvent, $gameState.currentTurn || 1);
         if (modifier) {
            addModifier(modifier);
            
            // Show notification that modifier was created
            outcomeMessage = `You chose not to address the ${currentEvent.name}. This will have ongoing consequences...`;
            currentEffects = null;
            showResolutionResult = true;
            resolutionOutcome = 'failure'; // Use failure styling for skipped events
         }
      } else {
         // Event has no persistent effects, just mark as complete
         outcomeMessage = `The ${currentEvent.name} passes without your intervention.`;
         currentEffects = null;
         showResolutionResult = true;
         resolutionOutcome = 'failure';
      }
      
      // Mark phase as complete
      if (!eventResolved) {
         markPhaseStepCompleted('resolve-event');
      }
   }
   
   // Helper function to format effect changes
   function formatEffects(effects: any): string[] {
      const effectsList: string[] = [];
      
      if (!effects) return effectsList;
      
      if (effects.gold !== undefined && effects.gold !== 0) {
         effectsList.push(`${effects.gold > 0 ? '+' : ''}${effects.gold} Gold`);
      }
      if (effects.unrest !== undefined && effects.unrest !== 0) {
         effectsList.push(`${effects.unrest > 0 ? '+' : ''}${effects.unrest} Unrest`);
      }
      if (effects.fame !== undefined && effects.fame !== 0) {
         effectsList.push(`${effects.fame > 0 ? '+' : ''}${effects.fame} Fame`);
      }
      
      // Other resources
      const resources = ['food', 'lumber', 'stone', 'ore', 'luxuries'];
      resources.forEach(resource => {
         if (effects[resource] !== undefined && effects[resource] !== 0) {
            const name = resource.charAt(0).toUpperCase() + resource.slice(1);
            effectsList.push(`${effects[resource] > 0 ? '+' : ''}${effects[resource]} ${name}`);
         }
      });
      
      return effectsList;
   }
   
   // Helper to get available skills for the event
   function getEventSkills(event: EventData): EventSkill[] {
      // Return the skills from the event's new structure
      return event.skills || [];
   }
   
   // Get active modifiers to display
   $: activeModifiers = $kingdomState.modifiers || [];
   
   // Helper to build outcomes array for an event
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
            {#if currentEvent.ifUnresolved?.type}
               <div class="event-traits">
                  <span class="event-trait trait-{currentEvent.ifUnresolved.type}">
                     {currentEvent.ifUnresolved.type}
                  </span>
               </div>
            {/if}
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
                  
                  <!-- Skip Event Option -->
                  <div class="skip-event-section">
                     <div class="divider-with-text">
                        <span>OR</span>
                     </div>
                     <button
                        class="skip-event-btn"
                        on:click={skipEvent}
                        disabled={eventResolved}
                     >
                        <i class="fas fa-forward"></i>
                        Skip Event (Don't Attempt Resolution)
                     </button>
                     {#if currentEvent.ifUnresolved}
                        <p class="skip-warning">
                           <i class="fas fa-exclamation-triangle"></i>
                           Warning: Skipping this event will create an ongoing problem for your kingdom
                        </p>
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
                     <strong>Event Triggered!</strong> (Rolled {stabilityRoll} vs DC 16)
                     <div>Drawing event card...</div>
                  </div>
               {:else}
                  <div class="roll-result failure">
                     <strong>No Event</strong> (Rolled {stabilityRoll} vs DC {eventDC + 5})
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
                           {modifier.duration} turns
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
   
   .skill-btn {
      padding: 12px;
      background: var(--btn-secondary-bg);
      color: var(--text-primary);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: var(--type-button-size);
      font-weight: var(--type-button-weight);
      line-height: var(--type-button-line);
      letter-spacing: var(--type-button-spacing);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all var(--transition-fast);
      
      &:hover:not(:disabled) {
         background: var(--btn-secondary-hover);
         border-color: var(--border-strong);
         transform: translateY(-1px);
         box-shadow: var(--shadow-md);
      }
      
      &:disabled {
         opacity: var(--opacity-disabled);
         cursor: not-allowed;
         background: var(--color-gray-700);
      }
      
      &.selected {
         background: var(--color-amber);
         color: var(--color-gray-900);
      }
      
      i {
         font-size: 16px;
      }
   }
   
   .event-result-display {
      margin-top: 20px;
   }
   
   .resolution-result {
      padding: 20px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: var(--radius-md);
      
      .roll-display {
         font-size: var(--font-md);
         margin-bottom: 15px;
         color: var(--text-secondary);
         
         .roll-value {
            font-size: var(--font-lg);
            font-weight: bold;
            color: var(--color-amber);
            margin: 0 5px;
         }
         
         .penalty {
            color: var(--color-red);
         }
         
         .total {
            font-weight: bold;
            color: var(--text-primary);
         }
      }
      
      .outcome-message {
         padding: 12px;
         border-radius: var(--radius-md);
         font-weight: 500;
         margin-bottom: 15px;
         
         &.success {
            background: rgba(34, 197, 94, 0.1);
            color: var(--color-green);
            border: 1px solid var(--color-green-border);
         }
         
         &.failure {
            background: rgba(239, 68, 68, 0.1);
            color: var(--color-red);
            border: 1px solid var(--color-red);
         }
      }
      
      .outcome-effects {
         display: flex;
         gap: 12px;
         flex-wrap: wrap;
         margin-bottom: 20px;
         
         .effect-item {
            padding: 6px 12px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: var(--radius-md);
            border: 1px solid var(--border-subtle);
            font-size: var(--font-sm);
            font-weight: 600;
            color: var(--text-primary);
         }
      }
      
      .btn-primary {
         padding: 10px 16px;
         background: var(--btn-primary-bg);
         color: white;
         border: none;
         border-radius: var(--radius-md);
         cursor: pointer;
         font-size: var(--type-button-size);
         font-weight: var(--type-button-weight);
         line-height: var(--type-button-line);
         letter-spacing: var(--type-button-spacing);
         display: flex;
         align-items: center;
         gap: 8px;
         transition: all var(--transition-fast);
         
         &:hover {
            background: var(--btn-primary-hover);
            transform: translateY(-1px);
            box-shadow: var(--shadow-md);
         }
         
         &:disabled {
            opacity: var(--opacity-disabled);
            cursor: not-allowed;
         }
      }
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
      
      .event-description {
         color: var(--text-secondary);
         margin-bottom: 20px;
         font-size: var(--type-body-size);
         line-height: var(--type-body-line);
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
   
   .skip-event-section {
      margin-top: 20px;
      padding-top: 20px;
      
      .divider-with-text {
         position: relative;
         text-align: center;
         margin: 20px 0;
         
         &::before {
            content: '';
            position: absolute;
            left: 0;
            top: 50%;
            width: 100%;
            height: 1px;
            background: var(--border-subtle);
         }
         
         span {
            background: rgba(31, 31, 35, 0.6);
            padding: 0 15px;
            position: relative;
            color: var(--text-secondary);
            font-size: var(--font-sm);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
         }
      }
      
      .skip-event-btn {
         width: 100%;
         padding: 12px 20px;
         background: rgba(239, 68, 68, 0.1);
         border: 1px solid var(--color-red);
         border-radius: var(--radius-md);
         color: var(--color-red);
         font-size: var(--type-button-size);
         font-weight: var(--type-button-weight);
         line-height: var(--type-button-line);
         letter-spacing: var(--type-button-spacing);
         cursor: pointer;
         display: flex;
         align-items: center;
         justify-content: center;
         gap: 8px;
         transition: all var(--transition-fast);
         
         i {
            font-size: 16px;
         }
         
         &:hover:not(:disabled) {
            background: rgba(239, 68, 68, 0.2);
            border-color: var(--color-red-light);
            transform: translateY(-1px);
            box-shadow: var(--shadow-md);
         }
         
         &:disabled {
            opacity: var(--opacity-disabled);
            cursor: not-allowed;
         }
      }
      
      .skip-warning {
         margin: 10px 0 0 0;
         padding: 10px;
         background: rgba(251, 191, 36, 0.1);
         border: 1px solid var(--color-amber);
         border-radius: var(--radius-sm);
         color: var(--color-amber-light);
         font-size: var(--font-sm);
         text-align: center;
         
         i {
            margin-right: 5px;
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
