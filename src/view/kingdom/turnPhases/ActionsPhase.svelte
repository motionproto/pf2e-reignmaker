<script lang="ts">
   import { kingdomState } from '../../../stores/kingdom';
   import { availableActions, selectedAction } from '../../../stores/turn';
</script>

<div class="actions-phase">

   <div class="phase-summary">
      <p class="placeholder">Kingdom action selection and execution will be implemented here.</p>
      <p>Available actions will be displayed based on kingdom state and phase requirements.</p>
   </div>
</div>

<style lang="scss">
   .actions-phase {
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
