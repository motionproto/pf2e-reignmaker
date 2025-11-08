<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import BuildStructureDialog from '../../../kingdom/components/BuildStructureDialog/BuildStructureDialog.svelte';
  import RepairStructureDialog from '../../../../actions/repair-structure/RepairStructureDialog.svelte';
  import UpgradeSettlementSelectionDialog from '../../../../actions/upgrade-settlement/UpgradeSettlementSelectionDialog.svelte';
  import FactionSelectionDialog from '../../../../actions/establish-diplomatic-relations/FactionSelectionDialog.svelte';
  import RequestEconomicAidDialog from '../../../../actions/request-economic-aid/RequestEconomicAidDialog.svelte';
  import AidSelectionDialog from '../../../kingdom/components/AidSelectionDialog.svelte';
  import SettlementSelectionDialog from '../../../../actions/collect-stipend/SettlementSelectionDialog.svelte';
  import ExecuteOrPardonSettlementDialog from '../../../../actions/execute-or-pardon-prisoners/SettlementSelectionDialog.svelte';
  import ArmySelectionDialog from '../../../../actions/train-army/ArmySelectionDialog.svelte';
  import DisbandArmyDialog from '../../../../actions/disband-army/ArmySelectionDialog.svelte';
  import OutfitArmyDialog from '../../../../actions/outfit-army/ArmySelectionDialog.svelte';
  import RecruitArmyDialog from '../../../kingdom/components/RecruitArmyDialog.svelte';
  import EstablishSettlementNameDialog from '../../../kingdom/components/EstablishSettlementNameDialog.svelte';
  import StructureSelectionDialog from '../../../kingdom/components/StructureSelectionDialog.svelte';

  const dispatch = createEventDispatcher();

  // Dialog visibility props (bind from parent)
  export let showBuildStructureDialog: boolean = false;
  export let showRepairStructureDialog: boolean = false;
  export let showUpgradeSettlementSelectionDialog: boolean = false;
  export let showFactionSelectionDialog: boolean = false;
  export let showRequestEconomicAidDialog: boolean = false;
  export let showAidSelectionDialog: boolean = false;
  export let showSettlementSelectionDialog: boolean = false;
  export let showExecuteOrPardonSettlementDialog: boolean = false;
  export let showTrainArmyDialog: boolean = false;
  export let showDisbandArmyDialog: boolean = false;
  export let showOutfitArmyDialog: boolean = false;
  export let showRecruitArmyDialog: boolean = false;

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

  function handleEconomicAidFactionSelected(event: CustomEvent) {
    dispatch('economicAidFactionSelected', event.detail);
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

  function handleArmySelectedForDisbanding(event: CustomEvent) {
    dispatch('armySelectedForDisbanding', event.detail);
  }

  function handleArmySelectedForOutfitting(event: CustomEvent) {
    dispatch('armySelectedForOutfitting', event.detail);
  }

  function handleArmyRecruited(event: CustomEvent) {
    dispatch('armyRecruited', event.detail);
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

<!-- Request Economic Aid Dialog -->
<RequestEconomicAidDialog
  bind:show={showRequestEconomicAidDialog}
  on:confirm={handleEconomicAidFactionSelected}
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

<!-- Army Selection Dialog (Disband Army) -->
<DisbandArmyDialog
  bind:show={showDisbandArmyDialog}
  on:armySelected={handleArmySelectedForDisbanding}
/>

<!-- Army Selection Dialog (Outfit Army) -->
<OutfitArmyDialog
  bind:show={showOutfitArmyDialog}
  on:armySelected={handleArmySelectedForOutfitting}
/>

<!-- Recruit Army Dialog -->
<RecruitArmyDialog
  bind:show={showRecruitArmyDialog}
  on:confirm={handleArmyRecruited}
/>

<!-- Establish Settlement Name Dialog -->
<EstablishSettlementNameDialog />

<!-- Structure Selection Dialog (Critical Success) -->
<StructureSelectionDialog />
