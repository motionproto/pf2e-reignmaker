<script lang="ts">
   import { kingdomState } from '../../../stores/kingdom';
   import { availableActions, selectedAction } from '../../../stores/turn';
</script>

<div class="actions-phase">
   <h3>Phase V: Actions</h3>
   <p>Perform kingdom actions for this turn.</p>
   
   <div class="phase-summary">
      <p class="placeholder">Kingdom action selection and execution will be implemented here.</p>
      <p>Available actions will be displayed based on kingdom state and phase requirements.</p>
   </div>
</div>

<style lang="scss">
   .actions-phase {
      h3 {
         margin: 0 0 20px 0;
         color: var(--color-primary, #5e0000);
      }
      
      p {
         margin: 5px 0;
         color: var(--color-text-dark-secondary, #7a7971);
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
