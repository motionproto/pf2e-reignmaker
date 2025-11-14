<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import RecruitArmyDialog from '../../view/kingdom/components/RecruitArmyDialog.svelte';
  import OutfitArmyDialog from '../outfit-army/ArmySelectionDialog.svelte';
  
  // Props
  export let outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure' = 'criticalSuccess';
  
  const dispatch = createEventDispatcher();
  
  // Forward confirmation events as 'selection' for OutcomeDisplay
  function handleConfirm(event: CustomEvent) {
    console.log('🔍 [RequestMilitaryAidResolutionDialog] handleConfirm called with:', event.detail);
    
    // For critical success: Get faction name from globalThis (stored by ActionsPhase)
    // and merge it with the army recruitment data
    if (outcome === 'criticalSuccess') {
      const factionName = (globalThis as any).__pendingEconomicAidFactionName;
      console.log('🔍 [RequestMilitaryAidResolutionDialog] Retrieved faction name:', factionName);
      
      const enrichedData = {
        ...event.detail,
        factionName  // Add faction name to the data
      };
      
      console.log('🔍 [RequestMilitaryAidResolutionDialog] Dispatching enriched data:', enrichedData);
      dispatch('selection', enrichedData);
    } else {
      // For success outcome (equipment), pass through unchanged
      dispatch('selection', event.detail);
    }
  }
  
  function handleCancel() {
    dispatch('cancel');
  }
</script>

{#if outcome === 'criticalSuccess'}
  <RecruitArmyDialog exemptFromUpkeep={true} on:confirm={handleConfirm} on:cancel={handleCancel} />
{:else if outcome === 'success'}
  <OutfitArmyDialog on:confirm={handleConfirm} on:cancel={handleCancel} />
{/if}
