<script lang="ts">
   import { kingdomState } from '../../../stores/kingdom';
   import { gameState, markPhaseStepCompleted, isPhaseStepCompleted, canOperatePhase } from '../../../stores/gameState';
   import { TurnPhase } from '../../../models/KingdomState';
   import Button from '../components/baseComponents/Button.svelte';
   
   // Constants
   const MAX_FAME = 3;
   
   // Check if steps are completed
   $: gainFameCompleted = isPhaseStepCompleted('gain-fame');
   $: applyModifiersCompleted = isPhaseStepCompleted('apply-modifiers');
   
   // Check if this phase can be operated
   $: canOperate = canOperatePhase(TurnPhase.PHASE_I);
   
   // Check if fame is at maximum
   $: fameAtMax = $kingdomState.fame >= MAX_FAME;
   
   function gainFame() {
      if (!canOperate) {
         console.warn('Cannot operate Status Phase - previous phases not complete');
         return;
      }
      
      // Gain 1 Fame (max 3)
      kingdomState.update(state => {
         if (state.fame < MAX_FAME) {
            state.fame = Math.min(state.fame + 1, MAX_FAME);
         }
         return state;
      });
      markPhaseStepCompleted('gain-fame');
   }
   
   function applyOngoingModifiers() {
      if (!canOperate) {
         console.warn('Cannot operate Status Phase - previous phases not complete');
         return;
      }
      
      // Apply ongoing modifiers
      kingdomState.update(state => {
         state.ongoingModifiers.forEach(modifier => {
            modifier.effect(state);
            if (modifier.duration > 0) {
               modifier.remainingTurns--;
            }
         });
         // Remove expired modifiers
         state.ongoingModifiers = state.ongoingModifiers.filter(
            m => m.duration === -1 || m.remainingTurns > 0
         );
         return state;
      });
      markPhaseStepCompleted('apply-modifiers');
   }
</script>

<div class="status-phase">

   <div class="phase-steps">
      <div class="phase-step fame-step" class:completed={gainFameCompleted}>
         <!-- Centered Fame Display -->
         <div class="fame-container">
            <div class="fame-stars-display">
               <div class="fame-stars">
                  {#each Array(MAX_FAME) as _, i}
                     <i 
                        class="{i < $kingdomState.fame ? 'fas' : 'far'} fa-star star-icon" 
                        class:filled={i < $kingdomState.fame}
                     ></i>
                  {/each}
               </div>
               <p class="fame-count">Fame: {$kingdomState.fame} / {MAX_FAME}</p>
            </div>
            
            <Button
               variant="secondary"
               on:click={gainFame}
               disabled={gainFameCompleted || fameAtMax || !canOperate}
               icon={gainFameCompleted ? 'fas fa-check' : 'fas fa-star'}
               tooltip={!canOperate ? 'Complete previous phases first' : undefined}
            >
               {#if gainFameCompleted}
                  Fame Gained
               {:else if fameAtMax}
                  Fame at Maximum
               {:else if !canOperate}
                  Complete Previous Phases
               {:else}
                  Gain 1 Fame
               {/if}
            </Button>
            
            <p class="step-description">
               {#if fameAtMax}
                  Your kingdom has achieved maximum fame!
               {:else}
                  Your kingdom gains 1 Fame point this turn.
               {/if}
            </p>
         </div>
      </div>
      
      <div class="phase-step" class:completed={applyModifiersCompleted}>
         <Button
            variant="secondary"
            on:click={applyOngoingModifiers}
            disabled={applyModifiersCompleted || !canOperate}
            icon={applyModifiersCompleted ? 'fas fa-check' : 'fas fa-magic'}
            tooltip={!canOperate ? 'Complete previous phases first' : undefined}
         >
            {#if applyModifiersCompleted}
               Modifiers Applied
            {:else if !canOperate}
               Complete Previous Phases
            {:else}
               Apply Ongoing Modifiers
            {/if}
         </Button>
         <p class="step-description">Apply all ongoing effects and reduce their duration.</p>
         
         {#if $kingdomState.ongoingModifiers.length > 0}
            <div class="modifiers-list">
               <h5>Active Modifiers:</h5>
               <ul>
                  {#each $kingdomState.ongoingModifiers as modifier}
                     <li class="modifier-item">
                        <strong>{modifier.name}</strong>
                        {#if modifier.description}
                           <span class="modifier-description">: {modifier.description}</span>
                        {/if}
                        {#if modifier.duration > 0}
                           <span class="modifier-duration">({modifier.remainingTurns} turns remaining)</span>
                        {/if}
                     </li>
                  {/each}
               </ul>
            </div>
         {/if}
      </div>
   </div>
   
   <div class="phase-summary">
      <h4>Phase Summary:</h4>
      <p>Current Fame: {$kingdomState.fame} / {MAX_FAME}</p>
      <p>Active Modifiers: {$kingdomState.ongoingModifiers.length}</p>
      {#if $kingdomState.ongoingModifiers.length > 0}
         <p class="modifier-count">
            {$kingdomState.ongoingModifiers.filter(m => m.duration > 0).length} temporary, 
            {$kingdomState.ongoingModifiers.filter(m => m.duration === -1).length} permanent
         </p>
      {/if}
   </div>
</div>

<style lang="scss">
   
   .fame-step {
      text-align: center;
   }
   
   .fame-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 15px;
   }
   
   .fame-stars-display {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 15px 25px;
      background: linear-gradient(135deg, 
         rgba(15, 15, 17, 0.4), 
         rgba(24, 24, 27, 0.3));
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-subtle);
   }
   
   .fame-stars {
      display: flex;
      gap: 12px;
      justify-content: center;
      align-items: center;
   }
   
   .star-icon {
      font-size: 48px;
      transition: all 0.3s ease;
      color: var(--color-gray-600);
      
      &.filled {
         color: var(--color-amber-light);
         text-shadow: 
            0 0 20px rgba(251, 191, 36, 0.4),
            0 2px 4px rgba(0, 0, 0, 0.3);
         transform: scale(1.05);
         
         &:hover {
            transform: scale(1.1) rotate(5deg);
         }
      }
      
      &:not(.filled) {
         opacity: 0.3;
         
         &:hover {
            opacity: 0.5;
            transform: scale(1.05);
         }
      }
   }
   
   .fame-count {
      margin: 0;
      color: var(--color-amber-light);
      font-size: var(--type-label-size);
      font-weight: var(--type-label-weight);
      line-height: var(--type-label-line);
      letter-spacing: var(--type-label-spacing);
      text-transform: uppercase;
   }
   
   .phase-steps {
      display: flex;
      flex-direction: column;
      gap: 15px;
      margin-bottom: 20px;
   }
   
   .phase-step {
      background: rgba(0, 0, 0, 0.05);
      padding: 15px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
      transition: all 0.2s ease;
      
      &.completed {
         background: rgba(34, 197, 94, 0.1);
         border-color: var(--color-green-border);
      }
      
      &:hover:not(.completed) {
         background: rgba(0, 0, 0, 0.08);
         border-color: var(--border-default);
      }
   }
   
   
   .step-description {
      margin: 10px 0 0 0;
      color: var(--text-tertiary);
      font-size: var(--type-body-size);
      line-height: var(--type-body-line);
   }
   
   .modifiers-list {
      margin-top: 15px;
      padding: 12px;
      background: rgba(0, 0, 0, 0.1);
      border-radius: var(--radius-md);
      border-left: 3px solid var(--color-amber);
      
      h5 {
         margin: 0 0 8px 0;
         color: var(--color-amber-light);
         font-size: var(--type-heading-3-size);
         font-weight: var(--type-heading-3-weight);
         line-height: var(--type-heading-3-line);
      }
      
      ul {
         margin: 0;
         padding-left: 20px;
         list-style-type: none;
      }
   }
   
   .modifier-item {
      margin: 6px 0;
      color: var(--text-secondary);
      font-size: var(--type-body-size);
      line-height: var(--type-body-line);
      position: relative;
      
      &::before {
         content: "▸";
         position: absolute;
         left: -15px;
         color: var(--color-amber);
      }
      
      strong {
         color: var(--text-primary);
         font-weight: 600;
      }
      
      .modifier-description {
         color: var(--text-secondary);
      }
      
      .modifier-duration {
         color: var(--color-amber);
         font-size: var(--font-xs);
         margin-left: 4px;
         font-style: italic;
      }
   }
   
   .phase-summary {
      background: linear-gradient(135deg,
         rgba(var(--color-gray-850), 0.5),
         rgba(var(--color-gray-800), 0.3));
      padding: 15px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
      
      h4 {
         margin: 0 0 10px 0;
         color: var(--text-primary);
         font-size: var(--type-heading-2-size);
         font-weight: var(--type-heading-2-weight);
         line-height: var(--type-heading-2-line);
      }
      
      p {
         margin: 5px 0;
         color: var(--text-secondary);
         font-size: var(--type-body-size);
         line-height: var(--type-body-line);
         
         &.modifier-count {
            font-size: var(--type-body-size);
            color: var(--text-tertiary);
            font-style: italic;
         }
      }
   }
</style>
