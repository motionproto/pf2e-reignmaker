<script lang="ts">
   import { kingdomState, advancePhase } from '../../../stores/kingdom';
   import { TurnPhase, TurnPhaseConfig } from '../../../models/KingdomState';
   
   // Components
   import PhaseBar from '../components/PhaseBar.svelte';
   
   // Phase components  
   import StatusPhase from '../turnPhases/StatusPhase.svelte';
   import ResourcesPhase from '../turnPhases/ResourcesPhase.svelte';
   import UnrestPhase from '../turnPhases/UnrestPhase.svelte';
   import EventsPhase from '../turnPhases/EventsPhase.svelte';
   import ActionsPhase from '../turnPhases/ActionsPhase.svelte';
   import ResolutionPhase from '../turnPhases/ResolutionPhase.svelte';
   
   // Get phase info
   $: phaseInfo = TurnPhaseConfig[$kingdomState.currentPhase as TurnPhase];
   
   function handleAdvancePhase() {
      advancePhase();
   }
</script>

<div class="turn-management">
   <!-- Phase title at the top of the container -->
   <div class="phase-title">
      <h2>{phaseInfo.displayName}</h2>
      <p>{phaseInfo.description}</p>
   </div>
   
   <!-- Phase Bar underneath phase title -->
   <PhaseBar />
   
   <div class="phase-content">
      {#if $kingdomState.currentPhase === TurnPhase.PHASE_I}
         <StatusPhase />
      {:else if $kingdomState.currentPhase === TurnPhase.PHASE_II}
         <ResourcesPhase />
      {:else if $kingdomState.currentPhase === TurnPhase.PHASE_III}
         <UnrestPhase />
      {:else if $kingdomState.currentPhase === TurnPhase.PHASE_IV}
         <EventsPhase />
      {:else if $kingdomState.currentPhase === TurnPhase.PHASE_V}
         <ActionsPhase />
      {:else if $kingdomState.currentPhase === TurnPhase.PHASE_VI}
         <ResolutionPhase />
      {/if}
   </div>
   
   <div class="phase-controls">
      <button 
         class="phase-advance-button"
         on:click={handleAdvancePhase}
      >
         Advance to Next Phase
         <i class="fas fa-arrow-right"></i>
      </button>
   </div>
</div>

<style lang="scss">
   .turn-management {
      display: flex;
      flex-direction: column;
      height: 100%;
      gap: 15px;
   }
   
   .phase-title {
      padding: 0;
      margin-bottom: 10px;
      
      h2 {
         margin: 0 0 8px 0;
         color: var(--color-primary, #5e0000);
         font-size: 1.8em;
         font-weight: 700;
         text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
      }
      
      p {
         margin: 0;
         color: var(--color-text-dark-secondary, #7a7971);
         font-style: italic;
         font-size: 0.95em;
      }
   }
   
   .phase-content {
      flex: 1;
      background: rgba(255, 255, 255, 0.03);
      padding: 15px;
      border-radius: 5px;
      overflow-y: auto;
   }
   
   .phase-controls {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
   }
   
   .phase-advance-button {
      padding: 10px 20px;
      background: var(--color-primary, #5e0000);
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 1em;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
      
      &:hover {
         background: var(--color-primary-dark, #3e0000);
         transform: translateY(-1px);
         box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
      }
      
      i {
         font-size: 0.9em;
      }
   }
</style>
