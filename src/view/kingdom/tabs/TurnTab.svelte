<script lang="ts">
   import { kingdomState, advancePhase } from '../../../stores/kingdom';
   import { TurnPhase, TurnPhaseConfig } from '../../../models/KingdomState';
   
   // Phase components  
   import StatusPhase from '../turnPhases/StatusPhase.svelte';
   import ResourcesPhase from '../turnPhases/ResourcesPhase.svelte';
   import UnrestPhase from '../turnPhases/UnrestPhase.svelte';
   import EventsPhase from '../turnPhases/EventsPhase.svelte';
   import ActionsPhase from '../turnPhases/ActionsPhase.svelte';
   import ResolutionPhase from '../turnPhases/ResolutionPhase.svelte';
   
   // Get phase info
   $: phaseInfo = TurnPhaseConfig[$kingdomState.currentPhase];
   
   function handleAdvancePhase() {
      advancePhase();
   }
</script>

<div class="tw-flex tw-flex-col tw-h-full tw-gap-4">
   <!-- Turn Header -->
   <div class="tw-card tw-bg-base-300 tw-card-compact">
      <div class="tw-card-body">
         <h2 class="tw-card-title tw-text-2xl">Turn {$kingdomState.currentTurn}</h2>
         <div class="tw-divider tw-my-2"></div>
         <div class="tw-alert tw-alert-info">
            <div>
               <h3 class="tw-font-bold tw-text-lg">{phaseInfo.displayName}</h3>
               <p class="tw-text-sm tw-italic tw-mt-1">{phaseInfo.description}</p>
            </div>
         </div>
      </div>
   </div>
   
   <!-- Phase Content -->
   <div class="tw-flex-1 tw-card tw-bg-base-200/50 tw-overflow-y-auto">
      <div class="tw-card-body">
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
   </div>
   
   <!-- Phase Controls -->
   <div class="tw-flex tw-justify-end tw-gap-2">
      <button 
         class="tw-btn tw-btn-primary"
         on:click={handleAdvancePhase}
      >
         Advance to Next Phase
         <i class="fas fa-arrow-right"></i>
      </button>
   </div>
</div>
