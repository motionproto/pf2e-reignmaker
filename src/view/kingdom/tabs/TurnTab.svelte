<script lang="ts">
   import { kingdomData, advancePhase, viewingPhase, setViewingPhase } from '../../../stores/KingdomStore';
   import { TurnPhase, TurnPhaseConfig } from '../../../models/KingdomState';
   import { onMount } from 'svelte';
   
   // Components
   import PhaseBar from '../components/PhaseBar.svelte';
   import PhaseHeader from '../components/PhaseHeader.svelte';
   
   // Phase components - Using refactored versions for clean architecture
   import StatusPhase from '../turnPhases/StatusPhase.svelte';
   import ResourcesPhase from '../turnPhases/ResourcesPhase.svelte';
   import UnrestPhase from '../turnPhases/UnrestPhase.svelte';
   import EventsPhase from '../turnPhases/EventsPhase.svelte';
   import ActionsPhase from '../turnPhases/ActionsPhase.svelte';
   import UpkeepPhase from '../turnPhases/UpkeepPhase.svelte';
   
   // Track the last known current phase to detect when it changes
   let lastCurrentPhase: TurnPhase | null = null;
   
   // Always sync viewing phase with current phase on mount
   // This ensures proper initialization even when kingdomData loads asynchronously
   onMount(() => {
      setViewingPhase($kingdomData.currentPhase);
      lastCurrentPhase = $kingdomData.currentPhase;
   });
   
   // When current phase changes, auto-sync viewing phase if user was viewing the old current phase
   $: if ($kingdomData.currentPhase !== lastCurrentPhase) {
      // Phase has changed - if user was viewing the old current phase, update to new current phase
      if ($viewingPhase === lastCurrentPhase || !$viewingPhase) {
         setViewingPhase($kingdomData.currentPhase);
      }
      lastCurrentPhase = $kingdomData.currentPhase;
   }
   
   // Get phase info based on what the user is viewing
   $: displayPhase = $viewingPhase || $kingdomData.currentPhase;
   $: phaseInfo = displayPhase ? TurnPhaseConfig[displayPhase] : TurnPhaseConfig[$kingdomData.currentPhase];
   $: actualPhase = $kingdomData.currentPhase;
   
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
   />
   
   <!-- Phase Bar underneath phase header -->
   <PhaseBar />
   
   <div class="phase-content">
      {#if displayPhase === TurnPhase.PHASE_I}
         <StatusPhase isViewingCurrentPhase={!isViewingDifferentPhase} />
      {:else if displayPhase === TurnPhase.PHASE_II}
         <ResourcesPhase isViewingCurrentPhase={!isViewingDifferentPhase} />
      {:else if displayPhase === TurnPhase.PHASE_III}
         <UnrestPhase isViewingCurrentPhase={!isViewingDifferentPhase} />
      {:else if displayPhase === TurnPhase.PHASE_IV}
         <EventsPhase isViewingCurrentPhase={!isViewingDifferentPhase} />
      {:else if displayPhase === TurnPhase.PHASE_V}
         <ActionsPhase isViewingCurrentPhase={!isViewingDifferentPhase} />
      {:else if displayPhase === TurnPhase.PHASE_VI}
         <UpkeepPhase isViewingCurrentPhase={!isViewingDifferentPhase} />
      {/if}
   </div>
</div>

<style lang="scss">
   .turn-management {
      display: flex;
      flex-direction: column;
      height: 100%;
    
   }
   
   .phase-content {
      flex: 1;
      background: rgba(255, 255, 255, 0.03);
      padding: 12px;
      border-radius: 5px;
      overflow-y: auto;
   }
</style>
