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
 * Detect modifiers requiring choice buttons (large visual buttons)
 * BREAKING CHANGE: Only recognizes explicit type: "choice-buttons"
 */
export function detectResourceArrayModifiers(modifiers: any[] | undefined): any[] {
  if (!modifiers) return [];
  return modifiers.filter(m => m.type === 'choice-buttons' && Array.isArray(m.resources));
}

/**
 * Detect modifiers requiring dropdown selector (inline dropdown)
 */
export function detectChoiceDropdownModifiers(modifiers: any[] | undefined): any[] {
  if (!modifiers) return [];
  return modifiers.filter(m => m.type === 'choice-dropdown' && Array.isArray(m.resources));
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
  modifiers?: any[],  // CHANGED: Now receives full modifiers array
  resolvedDice?: Map<number | string, number>,
  stateChangeDice?: { key: string; formula: string }[]
): Record<string, any> | undefined {
  // Start with base state changes
  let result = baseStateChanges ? { ...baseStateChanges } : {};
  
  // If we have a choice result, merge it with other modifiers
  // (Don't replace everything - choices are just one part of the outcome)
  if (choiceResult) {
    result = { ...result, ...choiceResult.stateChanges };
  }
  
  // Merge resource array selections
  if (resourceArrayModifiers.length > 0 && resourceArraysResolved) {
    resourceArrayModifiers.forEach((modifier, idx) => {
      const selectedResource = selectedResources.get(idx);
      if (selectedResource) {
        result[selectedResource] = (result[selectedResource] || 0) + modifier.value;
      }
    });
  }
  
  // Process all modifiers (static only - dice are handled by OutcomeBadges component)
  if (modifiers && modifiers.length > 0) {
    modifiers.forEach((modifier, idx) => {
      // Handle choice-dropdown modifiers (need resource selection first)
      if (modifier.type === 'choice-dropdown' && Array.isArray(modifier.resources)) {
        const selectedResource = selectedResources.get(idx);
        if (selectedResource) {
          result[selectedResource] = (result[selectedResource] || 0) + modifier.value;
        }
        return;
      }
      
      // Skip other resource arrays (handled separately above)
      if (Array.isArray(modifier.resources)) return;
      
      // Skip dice modifiers entirely - they're rendered as interactive badges
      // in OutcomeBadges.svelte via diceModifierBadges
      if (modifier.type === 'dice' && modifier.formula) return;
      
      // Also skip legacy dice format (value is a dice formula string)
      if (typeof modifier.value === 'string' && /^-?\d+d\d+([+-]\d+)?$/.test(modifier.value)) return;
      
      // Use static value directly
      if (typeof modifier.value === 'number') {
        result[modifier.resource] = (result[modifier.resource] || 0) + modifier.value;
      }
    });
  }
  
  // Merge resolved dice rolls from stateChanges object
  // This replaces dice formulas (e.g., "1d6") with their rolled values
  if (stateChangeDice && stateChangeDice.length > 0 && resolvedDice) {
    stateChangeDice.forEach((dice) => {
      const rolledValue = resolvedDice.get(`state:${dice.key}`);
      if (rolledValue !== undefined) {
        // Replace formula with rolled value
        result[dice.key] = rolledValue;
      }
    });
  }
  
  // Return undefined if empty, otherwise return the merged result
  return Object.keys(result).length > 0 ? result : undefined;
}
