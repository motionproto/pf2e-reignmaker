<script lang="ts">
   import { kingdomData, advancePhase, viewingPhase, setViewingPhase } from '../../../stores/KingdomStore';
   import { TurnPhase, TurnPhaseConfig } from '../../../actors/KingdomActor';
   import { onMount } from 'svelte';
   
   // Components
   import PhaseBar from '../components/PhaseBar.svelte';
   import PhaseHeader from '../components/PhaseHeader.svelte';
   import PlayerActionTracker from '../components/PlayerActionTracker.svelte';
   
   // Setup Tab for Turn 0
   import SetupTab from './SetupTab.svelte';
   
   // Phase components - Using refactored versions for clean architecture
   import StatusPhase from '../turnPhases/StatusPhase.svelte';
   import ResourcesPhase from '../turnPhases/ResourcesPhase.svelte';
   import UnrestPhase from '../turnPhases/UnrestPhase.svelte';
   import EventsPhase from '../turnPhases/EventsPhase.svelte';
   import ActionsPhase from '../turnPhases/ActionsPhase.svelte';
   import UpkeepPhase from '../turnPhases/UpkeepPhase.svelte';
   
   // Primary source: actual current phase from KingdomActor (always authoritative)
   $: actualPhase = $kingdomData.currentPhase;
   
   // Display phase: use viewingPhase only if explicitly set and different from actual
   // This makes KingdomActor the primary source of truth for phase display
   $: displayPhase = ($viewingPhase && $viewingPhase !== actualPhase) 
      ? $viewingPhase 
      : actualPhase;
   
   // Debug which phase is being displayed

   // Initialize viewingPhase to match actual phase only on mount
   // Don't use reactive statement as it interferes with manual phase selection
   onMount(() => {
      if (actualPhase && !$viewingPhase) {
         setViewingPhase(actualPhase);
      }
   });
   $: phaseInfo = displayPhase ? TurnPhaseConfig[displayPhase] : TurnPhaseConfig[$kingdomData.currentPhase];
   
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
   {#if $kingdomData.currentTurn === 0}
      <!-- Turn 0: Setup Phase -->
      <SetupTab />
   {:else}
      <!-- Regular Turn Phases -->
      <!-- Phase header with gradient styling -->
      <!-- Note: Button behavior (onNextPhase, isUpkeepPhase) is always tied to the ACTUAL phase, not the viewing phase -->
      <PhaseHeader 
         title={safePhaseInfo.displayName}
         description={safePhaseInfo.description}
         icon={displayPhaseIcon}
         onNextPhase={handleAdvancePhase}
         isUpkeepPhase={actualPhase === TurnPhase.UPKEEP}
         isViewingActualPhase={displayPhase === actualPhase}
      />
      
      <!-- Phase Bar underneath phase header -->
      <PhaseBar />
      
      <!-- Player Action Tracker underneath phase bar (only shown in Events and Actions phases) -->
      {#if displayPhase === TurnPhase.EVENTS || displayPhase === TurnPhase.ACTIONS}
         <PlayerActionTracker />
      {/if}
      
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
   {/if}
</div>

<style lang="scss">
   .turn-management {
      display: flex;
      flex-direction: column;
      height: 100%;
    
   }
   
   .phase-content {
      flex: 1;
      background: transparent;
      padding: var(--space-12);
      border-radius: 0;
      overflow-y: auto;
   }
</style>
