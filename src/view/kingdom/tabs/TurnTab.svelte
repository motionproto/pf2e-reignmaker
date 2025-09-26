<script lang="ts">
   import { kingdomState } from '../../../stores/kingdom';
   import { gameState, advancePhase, viewingPhase, setViewingPhase } from '../../../stores/gameState';
   import { TurnPhase, TurnPhaseConfig } from '../../../models/KingdomState';
   import { onMount } from 'svelte';
   
   // Components
   import PhaseBar from '../components/PhaseBar.svelte';
   import PhaseHeader from '../components/PhaseHeader.svelte';
   
   // Phase components - Using refactored versions for clean architecture
   import StatusPhase from '../turnPhases/StatusPhaseRefactored.svelte';
   import ResourcesPhase from '../turnPhases/ResourcesPhaseRefactored.svelte';
   import UnrestPhase from '../turnPhases/UnrestPhaseRefactored.svelte';
   import EventsPhase from '../turnPhases/EventsPhaseRefactored.svelte';
   import ActionsPhase from '../turnPhases/ActionsPhaseRefactored.svelte';
   import UpkeepPhase from '../turnPhases/UpkeepPhaseRefactored.svelte';
   
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
   <!-- Phase header with gradient styling -->
   <PhaseHeader 
      title={phaseInfo.displayName}
      description={phaseInfo.description}
      icon={displayPhaseIcon}
      onNextPhase={handleAdvancePhase}
      isUpkeepPhase={displayPhase === TurnPhase.PHASE_VI}
      currentTurn={$gameState.currentTurn}
   />
   
   <!-- Phase Bar underneath phase header -->
   <PhaseBar />
   
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
         <UpkeepPhase />
      {/if}
   </div>
</div>

<style lang="scss">
   .turn-management {
      display: flex;
      flex-direction: column;
      height: 100%;
      gap: px;
   }
   
   .phase-content {
      flex: 1;
      background: rgba(255, 255, 255, 0.03);
      padding: 12px;
      border-radius: 5px;
      overflow-y: auto;
   }
</style>
