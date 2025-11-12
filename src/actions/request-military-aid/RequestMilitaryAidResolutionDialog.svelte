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
    
    // Dispatch as 'selection' event (OutcomeDisplay expects this)
    // Include the data directly (no modifiers for recruit army)
    dispatch('selection', event.detail);
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
