<script lang="ts">
   import { kingdomState } from '../../../stores/kingdom';
   import { gameState, markPhaseStepCompleted, isPhaseStepCompleted } from '../../../stores/gameState';
   
   // Check if steps are completed
   $: gainFameCompleted = isPhaseStepCompleted('gain-fame');
   $: applyModifiersCompleted = isPhaseStepCompleted('apply-modifiers');
   
   function gainFame() {
      // Gain 1 Fame
      kingdomState.update(state => {
         state.fame += 1;
         return state;
      });
      markPhaseStepCompleted('gain-fame');
   }
   
   function applyOngoingModifiers() {
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
      <div class="phase-step" class:completed={gainFameCompleted}>
         <button 
            on:click={gainFame} 
            disabled={gainFameCompleted}
            class="step-button"
         >
            {#if gainFameCompleted}
               <i class="fas fa-check"></i>
            {:else}
               <i class="fas fa-star"></i>
            {/if}
            Gain 1 Fame
         </button>
         <p class="step-description">Your kingdom gains 1 Fame point this turn.</p>
      </div>
      
      <div class="phase-step" class:completed={applyModifiersCompleted}>
         <button 
            on:click={applyOngoingModifiers} 
            disabled={applyModifiersCompleted}
            class="step-button"
         >
            {#if applyModifiersCompleted}
               <i class="fas fa-check"></i>
            {:else}
               <i class="fas fa-magic"></i>
            {/if}
            Apply Ongoing Modifiers
         </button>
         <p class="step-description">Apply all ongoing effects and reduce their duration.</p>
      </div>
   </div>
   
   <div class="phase-summary">
      <h4>Current Status:</h4>
      <p>Fame: {$kingdomState.fame}</p>
      <p>Active Modifiers: {$kingdomState.ongoingModifiers.length}</p>
   </div>
</div>

<style lang="scss">
   .status-phase {
      h3 {
         margin: 0 0 20px 0;
         color: var(--color-primary, #5e0000);
      }
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
      border-radius: 5px;
      
      &.completed {
         background: rgba(0, 200, 0, 0.1);
      }
   }
   
   .step-button {
      padding: 8px 16px;
      background: var(--color-primary, #5e0000);
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 1em;
      display: flex;
      align-items: center;
      gap: 8px;
      
      &:hover:not(:disabled) {
         background: var(--color-primary-dark, #3e0000);
      }
      
      &:disabled {
         opacity: 0.6;
         cursor: default;
      }
      
      i {
         font-size: 0.9em;
      }
   }
   
   .step-description {
      margin: 10px 0 0 0;
      color: var(--color-text-dark-secondary, #7a7971);
      font-size: 0.9em;
   }
   
   .phase-summary {
      background: rgba(0, 0, 0, 0.08);
      padding: 15px;
      border-radius: 5px;
      
      h4 {
         margin: 0 0 10px 0;
         color: var(--color-text-dark-primary, #b5b3a4);
      }
      
      p {
         margin: 5px 0;
         color: var(--color-text-dark-secondary, #7a7971);
      }
   }
</style>
