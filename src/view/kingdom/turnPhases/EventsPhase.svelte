<script lang="ts">
   import { kingdomState } from '../../../stores/kingdom';
</script>

<div class="events-phase">
   <h3>Phase IV: Events</h3>
   <p>Resolve kingdom events for this turn.</p>
   
   {#if $kingdomState.currentEvent}
      <div class="current-event">
         <h4>{$kingdomState.currentEvent.name}</h4>
         <p>{$kingdomState.currentEvent.description}</p>
      </div>
   {:else}
      <div class="phase-summary">
         <p class="placeholder">No events this turn. Event system will be fully implemented here.</p>
      </div>
   {/if}
</div>

<style lang="scss">
   .events-phase {
      h3 {
         margin: 0 0 20px 0;
         color: var(--color-primary, #5e0000);
      }
      
      p {
         margin: 5px 0;
         color: var(--color-text-dark-secondary, #7a7971);
      }
   }
   
   .current-event {
      background: rgba(94, 0, 0, 0.1);
      padding: 15px;
      border-radius: 5px;
      border: 1px solid var(--color-primary, #5e0000);
      
      h4 {
         margin: 0 0 10px 0;
         color: var(--color-primary, #5e0000);
      }
   }
   
   .phase-summary {
      background: rgba(0, 0, 0, 0.08);
      padding: 15px;
      border-radius: 5px;
      margin-top: 15px;
      
      .placeholder {
         font-style: italic;
         opacity: 0.7;
      }
   }
</style>
