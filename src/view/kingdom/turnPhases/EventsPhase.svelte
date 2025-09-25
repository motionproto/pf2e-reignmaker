<script lang="ts">
   import { kingdomState } from '../../../stores/kingdom';
   import { gameState, markPhaseStepCompleted, isPhaseStepCompleted } from '../../../stores/gameState';
   import type { KingdomEvent, EventOutcome } from '../../../models/Events';
   
   // State for event handling
   let stabilityRoll: number = 0;
   let showStabilityResult = false;
   let isRolling = false;
   let selectedSkill = '';
   let resolutionRoll: number = 0;
   let showResolutionResult = false;
   let currentOutcome: EventOutcome | null = null;
   
   // Check if steps are completed
   $: eventChecked = isPhaseStepCompleted('event-check');
   $: eventResolved = isPhaseStepCompleted('event-resolve');
   
   // Current event from kingdom state
   $: currentEvent = $kingdomState.currentEvent;
   $: continuousEvents = $kingdomState.continuousEvents;
   $: eventDC = $gameState.eventDC;
   
   function performStabilityCheck() {
      isRolling = true;
      showStabilityResult = false;
      
      // Animate the roll
      setTimeout(() => {
         // Roll for event
         stabilityRoll = Math.floor(Math.random() * 20) + 1;
         const success = stabilityRoll >= eventDC;
         
         if (success) {
            // Event triggered!
            gameState.update(state => {
               state.eventDC = 16; // Reset DC
               return state;
            });
            
            // Get a random event
            const event = $gameState.eventManager.getRandomEvent();
            if (event) {
               kingdomState.update(state => {
                  state.currentEvent = event;
                  return state;
               });
            }
         } else {
            // No event, reduce DC
            gameState.update(state => {
               state.eventDC = Math.max(6, state.eventDC - 5);
               return state;
            });
         }
         
         showStabilityResult = true;
         isRolling = false;
         
         if (!eventChecked) {
            markPhaseStepCompleted('event-check');
         }
      }, 1000);
   }
   
   function resolveEventWithSkill(skill: string) {
      if (!currentEvent) return;
      
      selectedSkill = skill;
      showResolutionResult = false;
      
      // Animate the roll
      setTimeout(() => {
         // Roll for resolution (simplified - would use character modifiers in real game)
         resolutionRoll = Math.floor(Math.random() * 20) + 1;
         const modifier = 5; // Base modifier
         const unrestPenalty = Math.max(-4, -Math.floor($kingdomState.unrest / 5));
         const total = resolutionRoll + modifier + unrestPenalty;
         
         // Get party level DC (defaulting to level 3)
         const partyLevel = 3; // Would come from Foundry API
         const dc = getDCByLevel(partyLevel);
         
         // Determine outcome
         let outcome: EventOutcome | undefined;
         if (total >= dc + 10 && currentEvent.criticalSuccess) {
            outcome = currentEvent.criticalSuccess;
         } else if (total >= dc && currentEvent.success) {
            outcome = currentEvent.success;
         } else if (total <= dc - 10 && currentEvent.criticalFailure) {
            outcome = currentEvent.criticalFailure;
         } else if (currentEvent.failure) {
            outcome = currentEvent.failure;
         }
         
         if (outcome) {
            currentOutcome = outcome;
            applyEventOutcome(outcome);
         }
         
         showResolutionResult = true;
         
         if (!eventResolved) {
            markPhaseStepCompleted('event-resolve');
         }
      }, 1000);
   }
   
   function getDCByLevel(level: number): number {
      const dcByLevel: Record<number, number> = {
         1: 15, 2: 16, 3: 18, 4: 19, 5: 20,
         6: 22, 7: 23, 8: 24, 9: 26, 10: 27
      };
      return dcByLevel[level] || 15 + level;
   }
   
   function applyEventOutcome(outcome: EventOutcome) {
      kingdomState.update(state => {
         // Apply gold change
         if (outcome.goldChange) {
            const currentGold = state.resources.get('gold') || 0;
            state.resources.set('gold', Math.max(0, currentGold + outcome.goldChange));
         }
         
         // Apply unrest change
         if (outcome.unrestChange) {
            state.unrest = Math.max(0, state.unrest + outcome.unrestChange);
         }
         
         // Apply fame change
         if (outcome.fameChange) {
            state.fame = Math.max(0, Math.min(3, state.fame + outcome.fameChange));
         }
         
         // Apply resource changes
         if (outcome.resourceChanges) {
            outcome.resourceChanges.forEach((amount, resource) => {
               const current = state.resources.get(resource) || 0;
               state.resources.set(resource, Math.max(0, current + amount));
            });
         }
         
         return state;
      });
   }
   
   function completeEventResolution() {
      // Clear event or add to continuous
      if (currentEvent) {
         kingdomState.update(state => {
            if (currentEvent.isContinuous && currentOutcome && 
                (currentOutcome !== currentEvent.success && currentOutcome !== currentEvent.criticalSuccess)) {
               // Add to continuous events if it persists
               if (!state.continuousEvents.find(e => e.id === currentEvent.id)) {
                  state.continuousEvents.push(currentEvent);
               }
            }
            state.currentEvent = null;
            return state;
         });
      }
      
      // Reset state
      selectedSkill = '';
      showResolutionResult = false;
      currentOutcome = null;
   }
   
   // Helper function to format effect changes
   function formatEffects(outcome: EventOutcome): string[] {
      const effects: string[] = [];
      
      if (outcome.goldChange) {
         effects.push(`${outcome.goldChange > 0 ? '+' : ''}${outcome.goldChange} Gold`);
      }
      if (outcome.unrestChange) {
         effects.push(`${outcome.unrestChange > 0 ? '+' : ''}${outcome.unrestChange} Unrest`);
      }
      if (outcome.fameChange) {
         effects.push(`${outcome.fameChange > 0 ? '+' : ''}${outcome.fameChange} Fame`);
      }
      if (outcome.resourceChanges) {
         outcome.resourceChanges.forEach((amount, resource) => {
            if (amount !== 0) {
               effects.push(`${amount > 0 ? '+' : ''}${amount} ${resource.charAt(0).toUpperCase() + resource.slice(1)}`);
            }
         });
      }
      
      return effects;
   }
</script>

<div class="events-phase">
   {#if currentEvent}
      <!-- Active Event Card -->
      <div class="event-card">
         <div class="event-header">
            <h3 class="event-title">{currentEvent.name}</h3>
            <div class="event-traits">
               {#each currentEvent.traits as trait}
                  <span class="event-trait trait-{trait.toLowerCase()}">{trait}</span>
               {/each}
            </div>
         </div>
         
         {#if currentEvent.imagePath}
            <div class="event-image-container">
               <img src="{currentEvent.imagePath}" alt="{currentEvent.name}" class="event-image">
            </div>
         {/if}
         
         <div class="event-body">
            <p class="event-description">{currentEvent.description}</p>
            
            {#if currentEvent.special}
               <div class="event-special">
                  <i class="fas fa-info-circle"></i> {currentEvent.special}
               </div>
            {/if}
            
            {#if !showResolutionResult}
               <div class="event-resolution">
                  <h4>Choose Your Response:</h4>
                  <div class="skill-options">
                     {#each currentEvent.skills as skill}
                        <button 
                           class="skill-btn {selectedSkill === skill ? 'selected' : ''}"
                           on:click={() => resolveEventWithSkill(skill)}
                           disabled={eventResolved}
                        >
                           <i class="fas fa-dice-d20"></i> {skill}
                        </button>
                     {/each}
                  </div>
               </div>
            {/if}
            
            {#if showResolutionResult && currentOutcome}
               <div class="event-result-display">
                  <div class="resolution-result">
                     <div class="roll-display">
                        <strong>{selectedSkill} Check:</strong> 
                        <span class="roll-value">{resolutionRoll}</span> + 5 
                        {#if Math.floor($kingdomState.unrest / 5) > 0}
                           <span class="penalty">-{Math.floor($kingdomState.unrest / 5)} (unrest)</span>
                        {/if}
                        = <span class="total">{resolutionRoll + 5 - Math.floor($kingdomState.unrest / 5)}</span>
                     </div>
                     <div class="outcome-message {currentOutcome === currentEvent.success || currentOutcome === currentEvent.criticalSuccess ? 'success' : 'failure'}">
                        {currentOutcome.message}
                     </div>
                     {#if formatEffects(currentOutcome).length > 0}
                        <div class="outcome-effects">
                           {#each formatEffects(currentOutcome) as effect}
                              <span class="effect-item">{effect}</span>
                           {/each}
                        </div>
                     {/if}
                     <button class="btn-primary" on:click={completeEventResolution}>
                        Continue
                     </button>
                  </div>
               </div>
            {/if}
         </div>
      </div>
   {:else}
      <!-- Stability Check Section -->
      <div class="stability-check-section">
         <h3>Kingdom Events Check</h3>
         <p class="event-description">
            The kingdom must make a Stability Check to see if an event occurs this turn.
         </p>
         <div class="dc-info">
            <span class="dc-label">Event DC:</span>
            <span class="dc-value">{eventDC}</span>
         </div>
         
         <button 
            class="btn-primary event-check-btn"
            on:click={performStabilityCheck}
            disabled={isRolling || eventChecked}
         >
            <i class="fas fa-dice-d20 {isRolling ? 'spinning' : ''}"></i> 
            {#if eventChecked}
               Check Complete
            {:else if isRolling}
               Rolling...
            {:else}
               Roll Stability Check
            {/if}
         </button>
         
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
   
   <!-- Continuous Events Display -->
   {#if continuousEvents.length > 0}
      <div class="continuous-events-section">
         <h4>Ongoing Events</h4>
         <div class="continuous-events-list">
            {#each continuousEvents as event}
               <div class="continuous-event-item">
                  <span class="event-name">{event.name}</span>
                  {#if event.traits.length > 0}
                     <span class="event-trait trait-{event.traits[0].toLowerCase()}">{event.traits[0]}</span>
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
      
      &.trait-fortune {
         background: rgba(34, 197, 94, 0.2);
         color: var(--color-green);
         border-color: var(--color-green-border);
      }
      
      &.trait-misfortune {
         background: rgba(239, 68, 68, 0.2);
         color: var(--color-red);
         border-color: var(--color-red);
      }
      
      &.trait-supernatural {
         background: rgba(147, 51, 234, 0.2);
         color: var(--color-purple);
         border-color: var(--color-purple);
      }
      
      &.trait-continuous {
         background: rgba(251, 191, 36, 0.2);
         color: var(--color-amber-light);
         border-color: var(--color-amber);
      }
   }
   
   .event-image-container {
      width: 100%;
      height: 250px;
      overflow: hidden;
      background: rgba(0, 0, 0, 0.5);
      
      .event-image {
         width: 100%;
         height: 100%;
         object-fit: cover;
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
   
   .event-special {
      display: flex;
      align-items: start;
      gap: 10px;
      padding: 12px;
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid var(--color-blue);
      border-radius: var(--radius-md);
      margin-bottom: 20px;
      
      i {
         color: var(--color-blue);
         margin-top: 2px;
      }
      
      color: var(--color-blue-light);
      font-size: var(--font-sm);
      line-height: 1.5;
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
   
   .event-check-btn {
      padding: 12px 24px;
      background: var(--btn-secondary-bg);
      color: var(--text-primary);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: var(--type-button-size);
      font-weight: var(--type-button-weight);
      line-height: var(--type-button-line);
      letter-spacing: var(--type-button-spacing);
      display: inline-flex;
      align-items: center;
      gap: 10px;
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
      
      i.spinning {
         animation: spin 1s linear infinite;
      }
   }
   
   @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
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
   
   .continuous-events-section {
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
   
   .continuous-events-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
   }
   
   .continuous-event-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
      
      .event-name {
         color: var(--text-primary);
         font-weight: 500;
      }
   }
</style>
