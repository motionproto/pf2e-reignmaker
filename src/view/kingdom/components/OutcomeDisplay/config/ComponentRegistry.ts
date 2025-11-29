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
import TendWoundedResolution from '../components/TendWoundedResolution.svelte';
import TendWoundedArmySelector from '../../../../actions/components/TendWoundedArmySelector.svelte';
import BuildStructureDialog from '../../BuildStructureDialog/BuildStructureDialog.svelte';
import RepairStructureDialog from '../../RepairStructure/RepairStructureDialog.svelte';
import RepairCostChoice from '../../RepairStructure/RepairCostChoice.svelte';
import ArrestDissidentsResolution from '../components/ArrestDissidentsResolution.svelte';
import StructureSelectionDialog from '../../StructureSelectionDialog.svelte';

export const COMPONENT_REGISTRY: Record<string, any> = {
  'ResourceChoiceSelector': ResourceChoiceSelector,
  'SellResourceSelector': SellResourceSelector,
  'PurchaseResourceSelector': PurchaseResourceSelector,
  'RecruitArmyDialog': RecruitArmyDialog,
  'OutfitArmyResolution': OutfitArmyResolution,
  'TrainArmyResolution': TrainArmyResolution,
  'DisbandArmyResolution': DisbandArmyResolution,
  'TendWoundedResolution': TendWoundedResolution,
  'TendWoundedArmySelector': TendWoundedArmySelector,
  'BuildStructureDialog': BuildStructureDialog,
  'RepairStructureDialog': RepairStructureDialog,
  'RepairCostChoice': RepairCostChoice,
  'ArrestDissidentsResolution': ArrestDissidentsResolution,
  'StructureSelectionDialog': StructureSelectionDialog,
  // Add more injectable components here as needed
};
