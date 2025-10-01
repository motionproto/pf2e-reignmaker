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
   
   // Safe fallback for phase info
   $: safePhaseInfo = phaseInfo || { displayName: 'Unknown Phase', description: 'Phase information not found' };
   
   // Define phase icons
   const phaseIcons = {
      [TurnPhase.STATUS]: 'fas fa-chart-line',
      [TurnPhase.RESOURCES]: 'fas fa-coins',
      [TurnPhase.UNREST]: 'fas fa-fire',
      [TurnPhase.EVENTS]: 'fas fa-dice',
      [TurnPhase.ACTIONS]: 'fas fa-hammer',
      [TurnPhase.UPKEEP]: 'fas fa-check-circle'
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
      title={safePhaseInfo.displayName}
      description={safePhaseInfo.description}
      icon={displayPhaseIcon}
      onNextPhase={handleAdvancePhase}
      isUpkeepPhase={displayPhase === TurnPhase.UPKEEP}
   />
   
   <!-- Phase Bar underneath phase header -->
   <PhaseBar />
   
   <div class="phase-content">
      {#if displayPhase === TurnPhase.STATUS}
         <StatusPhase isViewingCurrentPhase={displayPhase === actualPhase} />
      {:else if displayPhase === TurnPhase.RESOURCES}
         <ResourcesPhase isViewingCurrentPhase={displayPhase === actualPhase} />
      {:else if displayPhase === TurnPhase.UNREST}
         <UnrestPhase isViewingCurrentPhase={displayPhase === actualPhase} />
      {:else if displayPhase === TurnPhase.EVENTS}
         <EventsPhase isViewingCurrentPhase={displayPhase === actualPhase} />
      {:else if displayPhase === TurnPhase.ACTIONS}
         <ActionsPhase isViewingCurrentPhase={displayPhase === actualPhase} />
      {:else if displayPhase === TurnPhase.UPKEEP}
         <UpkeepPhase isViewingCurrentPhase={displayPhase === actualPhase} />
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
