<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import AidSelectionDialog from '../../../kingdom/components/AidSelectionDialog.svelte';
  import EstablishSettlementNameDialog from '../../../kingdom/components/EstablishSettlementNameDialog.svelte';
  import StructureSelectionDialog from '../../../kingdom/components/StructureSelectionDialog.svelte';

  const dispatch = createEventDispatcher();

  // Dialog visibility props (bind from parent)
  // Only Aid Selection Dialog is still actively used - other dialogs are handled by pipeline
  export let showAidSelectionDialog: boolean = false;

  // Pending action data props
  export let pendingAidAction: { id: string; name: string } | null = null;

  // Event handlers - dispatch to parent
  function handleAidConfirm(event: CustomEvent) {
    dispatch('aidConfirm', event.detail);
  }

  function handleAidCancel() {
    dispatch('aidCancel');
  }
</script>

<!-- Aid Selection Dialog - still actively used -->
<AidSelectionDialog
  bind:show={showAidSelectionDialog}
  actionName={pendingAidAction?.name || ''}
  on:confirm={handleAidConfirm}
  on:cancel={handleAidCancel}
/>

<!-- Establish Settlement Name Dialog - used by establish-settlement pipeline -->
<EstablishSettlementNameDialog />

<!-- Structure Selection Dialog (Critical Success) - used by build-structure pipeline -->
<StructureSelectionDialog />
