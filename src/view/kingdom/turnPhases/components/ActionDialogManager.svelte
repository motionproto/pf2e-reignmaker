<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import BuildStructureDialog from '../../../kingdom/components/BuildStructureDialog/BuildStructureDialog.svelte';
  import RepairStructureDialog from '../../../../actions/repair-structure/RepairStructureDialog.svelte';
  import UpgradeSettlementSelectionDialog from '../../../../actions/upgrade-settlement/UpgradeSettlementSelectionDialog.svelte';
  import FactionSelectionDialog from '../../../../actions/establish-diplomatic-relations/FactionSelectionDialog.svelte';
  import AidSelectionDialog from '../../../kingdom/components/AidSelectionDialog.svelte';
  import SettlementSelectionDialog from '../../../../actions/collect-stipend/SettlementSelectionDialog.svelte';
  import ExecuteOrPardonSettlementDialog from '../../../../actions/execute-or-pardon-prisoners/SettlementSelectionDialog.svelte';
  import ArmySelectionDialog from '../../../../actions/train-army/ArmySelectionDialog.svelte';

  const dispatch = createEventDispatcher();

  // Dialog visibility props (bind from parent)
  export let showBuildStructureDialog: boolean = false;
  export let showRepairStructureDialog: boolean = false;
  export let showUpgradeSettlementSelectionDialog: boolean = false;
  export let showFactionSelectionDialog: boolean = false;
  export let showAidSelectionDialog: boolean = false;
  export let showSettlementSelectionDialog: boolean = false;
  export let showExecuteOrPardonSettlementDialog: boolean = false;
  export let showTrainArmyDialog: boolean = false;

  // Pending action data props
  export let pendingAidAction: { id: string; name: string } | null = null;

  // Event handlers - dispatch to parent
  function handleStructureQueued(event: CustomEvent) {
    dispatch('structureQueued', event.detail);
  }

  function handleRepairStructureSelected(event: CustomEvent) {
    dispatch('repairStructureSelected', event.detail);
  }

  function handleUpgradeSettlementSelected(event: CustomEvent) {
    dispatch('upgradeSettlementSelected', event.detail);
  }

  function handleFactionSelected(event: CustomEvent) {
    dispatch('factionSelected', event.detail);
  }

  function handleSettlementSelected(event: CustomEvent) {
    dispatch('settlementSelected', event.detail);
  }

  function handleExecuteOrPardonSettlementSelected(event: CustomEvent) {
    dispatch('executeOrPardonSettlementSelected', event.detail);
  }

  function handleArmySelectedForTraining(event: CustomEvent) {
    dispatch('armySelectedForTraining', event.detail);
  }

  function handleAidConfirm(event: CustomEvent) {
    dispatch('aidConfirm', event.detail);
  }

  function handleAidCancel() {
    dispatch('aidCancel');
  }

  function handleUpgradeCancel() {
    dispatch('upgradeCancel');
  }

  function handleFactionCancel() {
    dispatch('factionCancel');
  }
</script>

<!-- Build Structure Dialog -->
<BuildStructureDialog
  bind:show={showBuildStructureDialog}
  on:structureQueued={handleStructureQueued}
/>

<!-- Repair Structure Dialog -->
<RepairStructureDialog
  bind:show={showRepairStructureDialog}
  on:structureSelected={handleRepairStructureSelected}
/>

<!-- Upgrade Settlement Selection Dialog -->
<UpgradeSettlementSelectionDialog
  bind:show={showUpgradeSettlementSelectionDialog}
  on:confirm={handleUpgradeSettlementSelected}
  on:cancel={handleUpgradeCancel}
/>

<!-- Faction Selection Dialog -->
<FactionSelectionDialog
  bind:show={showFactionSelectionDialog}
  on:confirm={handleFactionSelected}
  on:cancel={handleFactionCancel}
/>

<!-- Aid Selection Dialog -->
<AidSelectionDialog
  bind:show={showAidSelectionDialog}
  actionName={pendingAidAction?.name || ''}
  on:confirm={handleAidConfirm}
  on:cancel={handleAidCancel}
/>

<!-- Settlement Selection Dialog (Collect Stipend) -->
<SettlementSelectionDialog
  bind:show={showSettlementSelectionDialog}
  on:settlementSelected={handleSettlementSelected}
/>

<!-- Settlement Selection Dialog (Execute or Pardon Prisoners) -->
<ExecuteOrPardonSettlementDialog
  bind:show={showExecuteOrPardonSettlementDialog}
  on:settlementSelected={handleExecuteOrPardonSettlementSelected}
/>

<!-- Army Selection Dialog (Train Army) -->
<ArmySelectionDialog
  bind:show={showTrainArmyDialog}
  on:armySelected={handleArmySelectedForTraining}
/>
