<script lang="ts">
   import { kingdomState, collectResources, processFoodConsumption, markPhaseStepCompleted } from '../../../stores/kingdom';
   import { totalProduction, foodConsumption } from '../../../stores/kingdom';
   
   // Check if steps are completed
   $: collectCompleted = $kingdomState.isPhaseStepCompleted('collect-resources');
   $: consumeCompleted = $kingdomState.isPhaseStepCompleted('consume-food');
   
   function handleCollectResources() {
      collectResources();
      markPhaseStepCompleted('collect-resources');
   }
   
   function handleFoodConsumption() {
      const shortage = processFoodConsumption();
      if (shortage > 0) {
         console.log(`Food shortage! Added ${shortage} unrest.`);
      }
      markPhaseStepCompleted('consume-food');
   }
</script>

<div class="resources-phase">
   <h3>Phase II: Resources</h3>
   
   <div class="phase-steps">
      <div class="phase-step" class:completed={collectCompleted}>
         <button 
            on:click={handleCollectResources} 
            disabled={collectCompleted}
            class="step-button"
         >
            {#if collectCompleted}
               <i class="fas fa-check"></i>
            {:else}
               <i class="fas fa-coins"></i>
            {/if}
            Collect Resources
         </button>
         <p class="step-description">Collect resources from all worksites and settlements.</p>
      </div>
      
      <div class="phase-step" class:completed={consumeCompleted}>
         <button 
            on:click={handleFoodConsumption} 
            disabled={consumeCompleted}
            class="step-button"
         >
            {#if consumeCompleted}
               <i class="fas fa-check"></i>
            {:else}
               <i class="fas fa-drumstick-bite"></i>
            {/if}
            Consume Food
         </button>
         <p class="step-description">Settlements and armies consume food. Shortage causes unrest.</p>
      </div>
   </div>
   
   <div class="phase-summary">
      <h4>Resource Summary:</h4>
      <p>Food Consumption: {$foodConsumption} per turn</p>
      <p>Current Food: {$kingdomState.resources.get('food') || 0}</p>
   </div>
</div>

<style lang="scss">
   .resources-phase {
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
