<script lang="ts">
   import { kingdomState } from '../../../stores/kingdom';
   import { gameState, advancePhase, viewingPhase, setViewingPhase } from '../../../stores/gameState';
   import { TurnPhase, TurnPhaseConfig } from '../../../models/KingdomState';
   import { onMount } from 'svelte';
   
   // Components
   import PhaseBar from '../components/PhaseBar.svelte';
   import PhaseHeader from '../components/PhaseHeader.svelte';
   
   // Phase components  
   import StatusPhase from '../turnPhases/StatusPhase.svelte';
   import ResourcesPhase from '../turnPhases/ResourcesPhase.svelte';
   import UnrestPhase from '../turnPhases/UnrestPhase.svelte';
   import EventsPhase from '../turnPhases/EventsPhase.svelte';
   import ActionsPhase from '../turnPhases/ActionsPhase.svelte';
   import ResolutionPhase from '../turnPhases/ResolutionPhase.svelte';
   
   // Initialize viewing phase if not set
   onMount(() => {
      if (!$viewingPhase) {
         setViewingPhase($gameState.currentPhase);
      }
   });
   
   // Get phase info based on what the user is viewing
   $: displayPhase = $viewingPhase || $gameState.currentPhase;
   $: phaseInfo = displayPhase ? TurnPhaseConfig[displayPhase] : TurnPhaseConfig[$gameState.currentPhase];
   $: actualPhase = $gameState.currentPhase;
   
   // Define phase icons
   const phaseIcons = {
      [TurnPhase.PHASE_I]: 'fas fa-chart-line',
      [TurnPhase.PHASE_II]: 'fas fa-coins',
      [TurnPhase.PHASE_III]: 'fas fa-fire',
      [TurnPhase.PHASE_IV]: 'fas fa-dice',
      [TurnPhase.PHASE_V]: 'fas fa-hammer',
      [TurnPhase.PHASE_VI]: 'fas fa-check-circle'
   };
   
   $: displayPhaseIcon = phaseIcons[displayPhase as TurnPhase];
   
   function handleAdvancePhase() {
      advancePhase();
   }
   
   // Helper to show if we're viewing a different phase than active
   $: isViewingDifferentPhase = displayPhase !== actualPhase;
</script>

<div class="turn-management">
   <!-- Phase Bar at the top -->
   <PhaseBar />
   
   <!-- Phase header with gradient styling -->
   <PhaseHeader 
      title={phaseInfo.displayName}
      description={phaseInfo.description}
      icon={displayPhaseIcon}
   />
   
   <div class="phase-content">
      {#if displayPhase === TurnPhase.PHASE_I}
         <StatusPhase />
      {:else if displayPhase === TurnPhase.PHASE_II}
         <ResourcesPhase />
      {:else if displayPhase === TurnPhase.PHASE_III}
         <UnrestPhase />
      {:else if displayPhase === TurnPhase.PHASE_IV}
         <EventsPhase />
      {:else if displayPhase === TurnPhase.PHASE_V}
         <ActionsPhase />
      {:else if displayPhase === TurnPhase.PHASE_VI}
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
      gap: 8px;
   }
   
   .phase-content {
      flex: 1;
      background: rgba(255, 255, 255, 0.03);
      padding: 12px;
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
