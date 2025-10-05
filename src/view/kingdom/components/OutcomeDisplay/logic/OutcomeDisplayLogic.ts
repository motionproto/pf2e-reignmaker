/**
 * OutcomeDisplayHelpers - Display logic for OutcomeDisplay component
 * Handles UI-specific state change computation
 * 
 * NOTE: Formatting and dice rolling logic moved to services/resolution/
 */

import { rollDiceFormula } from '../../../../../services/resolution';

// Dice formula detection regex
const DICE_PATTERN = /^-?\d+d\d+([+-]\d+)?$/;

/**
 * Process choice selection - roll dice formulas and generate result
 */
export function processChoiceSelection(choice: any): { effect: string; stateChanges: Record<string, number> } {
  // Roll all dice formulas in modifiers
  const resourceValues: Record<string, number> = {};
  
  if (choice.modifiers) {
    for (const modifier of choice.modifiers) {
      const value = modifier.value;
      
      // Check if value is a dice formula
      if (typeof value === 'string' && DICE_PATTERN.test(value)) {
        // Roll the dice
        const rolled = rollDiceFormula(value);
        resourceValues[modifier.resource] = rolled;
      } else if (typeof value === 'number') {
        resourceValues[modifier.resource] = value;
      }
    }
  }
  
  // Replace {resource} placeholders in label with rolled values
  let resultLabel = choice.label;
  for (const [resource, value] of Object.entries(resourceValues)) {
    resultLabel = resultLabel.replace(new RegExp(`\\{${resource}\\}`, 'g'), String(Math.abs(value)));
  }
  
  return {
    effect: resultLabel,
    stateChanges: resourceValues
  };
}

/**
 * Detect modifiers with resource arrays (requiring player selection)
 */
export function detectResourceArrayModifiers(modifiers: any[] | undefined): any[] {
  if (!modifiers) return [];
  return modifiers.filter(m => Array.isArray(m.resource));
}

/**
 * Compute display state changes by merging base changes with resource selections and dice rolls
 */
export function computeDisplayStateChanges(
  baseStateChanges: Record<string, any> | undefined,
  choiceResult: { stateChanges: Record<string, any> } | null,
  resourceArrayModifiers: any[],
  selectedResources: Map<number, string>,
  resourceArraysResolved: boolean,
  diceModifiers?: any[],
  resolvedDice?: Map<number | string, number>
): Record<string, any> | undefined {
  // If we have a choice result, use it exclusively
  if (choiceResult) {
    return choiceResult.stateChanges;
  }
  
  // Start with base state changes
  let result = baseStateChanges ? { ...baseStateChanges } : {};
  
  // Merge resource array selections
  if (resourceArrayModifiers.length > 0 && resourceArraysResolved) {
    resourceArrayModifiers.forEach((modifier, idx) => {
      const selectedResource = selectedResources.get(idx);
      if (selectedResource) {
        result[selectedResource] = (result[selectedResource] || 0) + modifier.value;
      }
    });
  }
  
  // Merge resolved dice rolls
  if (diceModifiers && diceModifiers.length > 0 && resolvedDice) {
    diceModifiers.forEach((modifier) => {
      const rolledValue = resolvedDice.get(modifier.originalIndex);
      if (rolledValue !== undefined) {
        result[modifier.resource] = (result[modifier.resource] || 0) + rolledValue;
      }
    });
  }
  
  // Return undefined if empty, otherwise return the merged result
  return Object.keys(result).length > 0 ? result : undefined;
}
