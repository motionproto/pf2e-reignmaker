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
import OutfitArmySelectionDialog from '../../dialogs/OutfitArmySelectionDialog.svelte';

export const COMPONENT_REGISTRY: Record<string, any> = {
  'ResourceChoiceSelector': ResourceChoiceSelector,
  'SellResourceSelector': SellResourceSelector,
  'PurchaseResourceSelector': PurchaseResourceSelector,
  'RecruitArmyDialog': RecruitArmyDialog,
  'OutfitArmySelectionDialog': OutfitArmySelectionDialog,
  // Add more injectable components here as needed
};
