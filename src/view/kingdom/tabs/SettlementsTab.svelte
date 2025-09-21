<script lang="ts">
   import { kingdomState } from '../../../stores/kingdom';
</script>

<div class="settlements-tab">
   <h2>Settlements</h2>
   <p>Settlement management will be implemented here.</p>
   
   <!-- Placeholder for settlements list -->
   <div class="settlements-list">
      {#each $kingdomState.settlements as settlement}
         <div class="settlement-card">
            <h3>{settlement.name}</h3>
            <p>Tier: {settlement.tier}</p>
         </div>
      {:else}
         <p class="no-settlements">No settlements established yet.</p>
      {/each}
   </div>
</div>

<style lang="scss">
   .settlements-tab {
      h2 {
         margin: 0 0 15px 0;
         color: var(--color-text-dark-primary, #b5b3a4);
      }
   }
   
   .settlements-list {
      display: grid;
      gap: 15px;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
   }
   
   .settlement-card {
      background: rgba(0, 0, 0, 0.1);
      padding: 15px;
      border-radius: 5px;
      
      h3 {
         margin: 0 0 10px 0;
         color: var(--color-primary, #5e0000);
      }
      
      p {
         margin: 5px 0;
         color: var(--color-text-dark-secondary, #7a7971);
      }
   }
   
   .no-settlements {
      color: var(--color-text-dark-secondary, #7a7971);
      font-style: italic;
   }
</style>
