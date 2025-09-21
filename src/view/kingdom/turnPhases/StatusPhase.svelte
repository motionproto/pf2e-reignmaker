<script lang="ts">
   import { kingdomState, markPhaseStepCompleted } from '../../../stores/kingdom';
   
   // Check if steps are completed
   $: gainFameCompleted = $kingdomState.isPhaseStepCompleted('gain-fame');
   $: applyModifiersCompleted = $kingdomState.isPhaseStepCompleted('apply-modifiers');
   
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

<div>
   <h3 class="tw-text-xl tw-font-bold tw-text-primary tw-mb-5">Phase I: Kingdom Status</h3>
   
   <div class="tw-space-y-3 tw-mb-5">
      <!-- Gain Fame Step -->
      <div class="tw-card {gainFameCompleted ? 'tw-bg-success/10' : 'tw-bg-base-200'}">
         <div class="tw-card-body tw-p-4">
            <button 
               on:click={gainFame} 
               disabled={gainFameCompleted}
               class="tw-btn {gainFameCompleted ? 'tw-btn-success' : 'tw-btn-primary'} tw-w-fit"
            >
               {#if gainFameCompleted}
                  <i class="fas fa-check"></i>
               {:else}
                  <i class="fas fa-star"></i>
               {/if}
               Gain 1 Fame
            </button>
            <p class="tw-text-sm tw-text-base-content/60 tw-mt-2">
               Your kingdom gains 1 Fame point this turn.
            </p>
         </div>
      </div>
      
      <!-- Apply Modifiers Step -->
      <div class="tw-card {applyModifiersCompleted ? 'tw-bg-success/10' : 'tw-bg-base-200'}">
         <div class="tw-card-body tw-p-4">
            <button 
               on:click={applyOngoingModifiers} 
               disabled={applyModifiersCompleted}
               class="tw-btn {applyModifiersCompleted ? 'tw-btn-success' : 'tw-btn-primary'} tw-w-fit"
            >
               {#if applyModifiersCompleted}
                  <i class="fas fa-check"></i>
               {:else}
                  <i class="fas fa-magic"></i>
               {/if}
               Apply Ongoing Modifiers
            </button>
            <p class="tw-text-sm tw-text-base-content/60 tw-mt-2">
               Apply all ongoing effects and reduce their duration.
            </p>
         </div>
      </div>
   </div>
   
   <!-- Phase Summary -->
   <div class="tw-alert tw-alert-info">
      <div>
         <h4 class="tw-font-bold">Current Status:</h4>
         <div class="tw-flex tw-gap-4 tw-mt-2">
            <span class="tw-badge tw-badge-lg tw-badge-secondary">
               Fame: {$kingdomState.fame}
            </span>
            <span class="tw-badge tw-badge-lg tw-badge-accent">
               Active Modifiers: {$kingdomState.ongoingModifiers.length}
            </span>
         </div>
      </div>
   </div>
</div>
