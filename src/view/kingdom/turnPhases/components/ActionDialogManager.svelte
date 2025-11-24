<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import BuildStructureDialog from '../../../kingdom/components/BuildStructureDialog/BuildStructureDialog.svelte';
  import RepairStructureDialog from '../../components/dialogs/RepairStructureDialog.svelte';
  import UpgradeSettlementSelectionDialog from '../../components/dialogs/UpgradeSettlementSelectionDialog.svelte';
  import SharedFactionSelectionDialog from '../../../../pipelines/shared/FactionSelectionDialog.svelte';
  import RequestEconomicAidDialog from '../../components/dialogs/RequestEconomicAidDialog.svelte';
  import RequestMilitaryAidDialog from '../../components/dialogs/RequestMilitaryAidDialog.svelte';
  import AidSelectionDialog from '../../../kingdom/components/AidSelectionDialog.svelte';
  // REMOVED: SettlementSelectionDialog - execute-or-pardon-prisoners migrated to pipeline system
  // import SettlementSelectionDialog from '../../../../actions/execute-or-pardon-prisoners/SettlementSelectionDialog.svelte';
  // REMOVED: ExecuteOrPardonSettlementDialog - execute-or-pardon-prisoners migrated to pipeline system
  // import ExecuteOrPardonSettlementDialog from '../../../../actions/execute-or-pardon-prisoners/SettlementSelectionDialog.svelte';
  import ArmySelectionDialog from '../../components/dialogs/ArmySelectionDialog.svelte';
  import DisbandArmyDialog from '../../components/dialogs/DisbandArmySelectionDialog.svelte';
  // REMOVED: OutfitArmyDialog - outfit-army migrated to pipeline system
  // import OutfitArmyDialog from '../../components/dialogs/OutfitArmySelectionDialog.svelte';
  import RecruitArmyDialog from '../../../kingdom/components/RecruitArmyDialog.svelte';
  import EstablishSettlementNameDialog from '../../../kingdom/components/EstablishSettlementNameDialog.svelte';
  import StructureSelectionDialog from '../../../kingdom/components/StructureSelectionDialog.svelte';

  const dispatch = createEventDispatcher();

  // Dialog visibility props (bind from parent)
  export let showBuildStructureDialog: boolean = false;
  export let showRepairStructureDialog: boolean = false;
  export let showUpgradeSettlementSelectionDialog: boolean = false;
  export let showFactionSelectionDialog: boolean = false;
  export let showInfiltrationDialog: boolean = false;
  export let showRequestEconomicAidDialog: boolean = false;
  export let showRequestMilitaryAidDialog: boolean = false;
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

  function handleMilitaryAidFactionSelected(event: CustomEvent) {
    dispatch('militaryAidFactionSelected', event.detail);
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

  function handleInfiltrationFactionSelected(event: CustomEvent) {
    dispatch('infiltrationFactionSelected', event.detail);
  }

  function handleInfiltrationCancel() {
    dispatch('infiltrationCancel');
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

<!-- Faction Selection Dialog (Diplomatic Mission) -->
<SharedFactionSelectionDialog
  bind:show={showFactionSelectionDialog}
  title="Select Faction for Diplomatic Mission"
  description="Choose a faction to improve relations with through diplomatic efforts."
  filterMode="diplomatic"
  showCost={true}
  cost={4}
  on:confirm={handleFactionSelected}
  on:cancel={handleFactionCancel}
/>

<!-- Faction Selection Dialog (Infiltration) -->
<SharedFactionSelectionDialog
  bind:show={showInfiltrationDialog}
  title="Select Faction to Infiltrate"
  description="Choose a faction to gather intelligence on through covert operations."
  filterMode="espionage"
  showCost={false}
  on:confirm={handleInfiltrationFactionSelected}
  on:cancel={handleInfiltrationCancel}
/>

<!-- Request Economic Aid Dialog -->
<RequestEconomicAidDialog
  bind:show={showRequestEconomicAidDialog}
  on:confirm={handleEconomicAidFactionSelected}
/>

<!-- Request Military Aid Dialog -->
<RequestMilitaryAidDialog
  bind:show={showRequestMilitaryAidDialog}
  on:confirm={handleMilitaryAidFactionSelected}
/>

<!-- Aid Selection Dialog -->
<AidSelectionDialog
  bind:show={showAidSelectionDialog}
  actionName={pendingAidAction?.name || ''}
  on:confirm={handleAidConfirm}
  on:cancel={handleAidCancel}
/>

<!-- Settlement Selection Dialog (Collect Stipend) - REMOVED: using pipeline system now -->
<!-- Settlement Selection Dialog (Execute or Pardon Prisoners) - REMOVED: using pipeline system now -->

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

<!-- Army Selection Dialog (Outfit Army) - REMOVED: using pipeline system now -->

<!-- Recruit Army Dialog -->
<RecruitArmyDialog
  bind:show={showRecruitArmyDialog}
  on:confirm={handleArmyRecruited}
/>

<!-- Establish Settlement Name Dialog -->
<EstablishSettlementNameDialog />

<!-- Structure Selection Dialog (Critical Success) -->
<StructureSelectionDialog />
