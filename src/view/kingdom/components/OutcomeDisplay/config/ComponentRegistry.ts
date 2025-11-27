/**
 * OutcomeDisplay Component Registry
 * 
 * Maps component names to actual component classes for dynamic rendering.
 * Add new custom components here to make them available for pipelines.
 */

import ResourceChoiceSelector from '../components/ResourceChoiceSelector.svelte';
import SellResourceSelector from '../components/SellResourceSelector.svelte';
import PurchaseResourceSelector from '../components/PurchaseResourceSelector.svelte';
import RecruitArmyDialog from '../../RecruitArmyDialog.svelte';
import OutfitArmyResolution from '../../OutfitArmyResolution.svelte';
import TrainArmyResolution from '../../TrainArmyResolution.svelte';
import DisbandArmyResolution from '../../DisbandArmyResolution.svelte';
import BuildStructureDialog from '../../BuildStructureDialog/BuildStructureDialog.svelte';
import RepairStructureDialog from '../../RepairStructure/RepairStructureDialog.svelte';
import RepairCostChoice from '../../RepairStructure/RepairCostChoice.svelte';

export const COMPONENT_REGISTRY: Record<string, any> = {
  'ResourceChoiceSelector': ResourceChoiceSelector,
  'SellResourceSelector': SellResourceSelector,
  'PurchaseResourceSelector': PurchaseResourceSelector,
  'RecruitArmyDialog': RecruitArmyDialog,
  'OutfitArmyResolution': OutfitArmyResolution,
  'TrainArmyResolution': TrainArmyResolution,
  'DisbandArmyResolution': DisbandArmyResolution,
  'BuildStructureDialog': BuildStructureDialog,
  'RepairStructureDialog': RepairStructureDialog,
  'RepairCostChoice': RepairCostChoice,
  // Add more injectable components here as needed
};
