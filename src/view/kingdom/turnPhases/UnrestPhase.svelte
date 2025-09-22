<script lang="ts">
   import { kingdomState } from '../../../stores/kingdom';
</script>

<div class="unrest-phase">

   <div class="phase-summary">
      <h4>Unrest Status:</h4>
      <p>Current Unrest: {$kingdomState.unrest}</p>
      <p>Imprisoned Unrest: {$kingdomState.imprisonedUnrest}</p>
      <p class="placeholder">Full unrest calculation and incident handling will be implemented here.</p>
   </div>
</div>

<style lang="scss">

   .phase-summary {
      background: rgba(0, 0, 0, 0.08);
      padding: 15px;
      border-radius: 5px;
      margin-top: 15px;
      
      h4 {
         margin: 0 0 10px 0;
         color: var(--color-text-dark-primary, #b5b3a4);
      }
      
      .placeholder {
         font-style: italic;
         opacity: 0.7;
      }
   }
</style>
