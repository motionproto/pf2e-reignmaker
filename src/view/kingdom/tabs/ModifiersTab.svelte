<script lang="ts">
   import { kingdomState } from '../../../stores/kingdom';
</script>

<div class="modifiers-tab">
   <h2>Modifiers</h2>
   <p>Active kingdom modifiers and effects.</p>
   
   <div class="modifiers-list">
      {#if $kingdomState.ongoingModifiers.length > 0}
         {#each $kingdomState.ongoingModifiers as modifier}
            <div class="modifier-card">
               <h4>{modifier.name}</h4>
               <p>{modifier.description}</p>
               {#if modifier.duration > 0}
                  <p class="duration">Turns remaining: {modifier.remainingTurns}</p>
               {/if}
            </div>
         {/each}
      {:else}
         <p class="no-modifiers">No active modifiers.</p>
      {/if}
   </div>
</div>

<style lang="scss">
   .modifiers-tab {
      h2 {
         margin: 0 0 15px 0;
         color: var(--color-text-dark-primary, #b5b3a4);
      }
   }
   
   .modifiers-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
   }
   
   .modifier-card {
      background: rgba(0, 0, 0, 0.1);
      padding: 15px;
      border-radius: 5px;
      
      h4 {
         margin: 0 0 5px 0;
         color: var(--color-primary, #5e0000);
      }
      
      p {
         margin: 5px 0;
         color: var(--color-text-dark-secondary, #7a7971);
      }
      
      .duration {
         font-size: 0.9em;
         font-style: italic;
      }
   }
   
   .no-modifiers {
      color: var(--color-text-dark-secondary, #7a7971);
      font-style: italic;
   }
</style>
