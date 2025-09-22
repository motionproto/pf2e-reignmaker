<script lang="ts">
   import { kingdomState, clearNonStorableResources } from '../../../stores/kingdom';
   import { gameState, incrementTurn, setCurrentPhase, resetPhaseSteps } from '../../../stores/gameState';
   import { TurnPhase } from '../../../models/KingdomState';
   
   function endTurn() {
      clearNonStorableResources();
      incrementTurn();
      // Reset phase to Phase I for next turn
      setCurrentPhase(TurnPhase.PHASE_I);
      resetPhaseSteps();
   }
</script>

<div class="resolution-phase">
   
   <div class="phase-summary">
      <h4>Turn Summary:</h4>
      <p>Turn {$gameState.currentTurn} is complete.</p>
      <p>Non-storable resources (lumber, stone, ore) will be cleared.</p>
      <p>Gold and Food will carry over to the next turn.</p>
   </div>
   
   <div class="phase-actions">
      <button class="end-turn-button" on:click={endTurn}>
         <i class="fas fa-check-circle"></i>
         End Turn and Start Turn {$gameState.currentTurn + 1}
      </button>
   </div>
</div>

<style lang="scss">
   .resolution-phase {
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
      
      h4 {
         margin: 0 0 10px 0;
         color: var(--color-text-dark-primary, #b5b3a4);
      }
   }
   
   .phase-actions {
      margin-top: 20px;
      display: flex;
      justify-content: center;
   }
   
   .end-turn-button {
      padding: 12px 24px;
      background: var(--color-primary, #5e0000);
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 1.1em;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: all 0.2s ease;
      
      &:hover {
         background: var(--color-primary-dark, #3e0000);
         transform: translateY(-1px);
         box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
      }
      
      i {
         font-size: 1.1em;
      }
   }
</style>
