/**
 * OutcomeDisplayHelpers - Business logic for OutcomeDisplay component
 * Handles dice rolling, resource selection, and state change computation
 */

// Dice formula detection regex
const DICE_PATTERN = /^-?\d+d\d+([+-]\d+)?$/;

/**
 * Get display properties for outcome types (icons, labels, colors)
 */
export function getOutcomeDisplayProps(outcomeType: string) {
  switch(outcomeType) {
    case 'criticalSuccess':
      return { icon: 'fas fa-star', label: 'Critical Success', colorClass: 'critical-success' };
    case 'success':
      return { icon: 'fas fa-thumbs-up', label: 'Success', colorClass: 'success' };
    case 'failure':
      return { icon: 'fas fa-thumbs-down', label: 'Failure', colorClass: 'failure' };
    case 'criticalFailure':
      return { icon: 'fas fa-skull', label: 'Critical Failure', colorClass: 'critical-failure' };
    default:
      return { icon: 'fas fa-question', label: 'Unknown', colorClass: 'neutral' };
  }
}

/**
 * Format state change key to human-readable label
 */
export function formatStateChangeLabel(key: string): string {
  const labels: Record<string, string> = {
    'gold': 'Gold',
    'unrest': 'Unrest',
    'fame': 'Fame',
    'food': 'Food',
    'wood': 'Wood',
    'stone': 'Stone',
    'metal': 'Metal',
    'lumber': 'Lumber',
    'ore': 'Ore',
    'hexesClaimed': 'Hexes Claimed',
    'structuresBuilt': 'Structures Built',
    'roadsBuilt': 'Roads Built',
    'armyRecruited': 'Army Recruited',
    'resources': 'Resources',
    'structureCostReduction': 'Structure Cost',
    'imprisonedUnrest': 'Imprisoned Unrest',
    'imprisonedUnrestRemoved': 'Prisoners Released',
    'settlementFounded': 'Settlement Founded',
    'armyLevel': 'Army Level',
    'meta': 'Next Action Bonus'
  };
  return labels[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
}

/**
 * Format state change value for display
 */
export function formatStateChangeValue(change: any): string {
  if (typeof change === 'number') {
    return change > 0 ? `+${change}` : `${change}`;
  }
  if (typeof change === 'boolean') {
    return change ? 'Yes' : 'No';
  }
  if (typeof change === 'string') {
    return change;
  }
  if (typeof change === 'object' && change !== null) {
    // Handle aid bonus from aid-another action
    if (change.aidBonus !== undefined) {
      let bonusText = '';
      if (typeof change.aidBonus === 'number') {
        bonusText = change.aidBonus > 0 ? `+${change.aidBonus} circumstance bonus` : `${change.aidBonus} circumstance penalty`;
      } else {
        bonusText = String(change.aidBonus);
      }
      
      if (change.rerollOnFailure) {
        bonusText += ' (can reroll on failure)';
      }
      
      return bonusText;
    }
    if (change.nextActionBonus !== undefined) {
      return change.nextActionBonus > 0 ? `+${change.nextActionBonus}` : `${change.nextActionBonus}`;
    }
    if (change.from !== undefined && change.to !== undefined) {
      return `${change.from} → ${change.to}`;
    }
    if (change.added) {
      return `+${change.added}`;
    }
    if (change.removed) {
      return `-${change.removed}`;
    }
  }
  return String(change);
}

/**
 * Get CSS class for state change value (positive/negative/neutral)
 */
export function getChangeClass(change: any, key?: string): string {
  const negativeBenefitKeys = ['unrest', 'cost', 'damage', 'imprisoned'];
  const isNegativeBenefit = key && negativeBenefitKeys.some(k => key.toLowerCase().includes(k));
  
  if (typeof change === 'number') {
    if (isNegativeBenefit) {
      return change < 0 ? 'positive' : change > 0 ? 'negative' : 'neutral';
    }
    return change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
  }
  
  if (typeof change === 'boolean') {
    return change ? 'positive' : 'neutral';
  }
  
  if (typeof change === 'string') {
    if (change.includes('+') || change.includes('extra') || change.includes('double')) {
      return 'positive';
    }
    if (change.includes('half') || change.includes('50%')) {
      return key && key.includes('Cost') ? 'positive' : 'neutral';
    }
    if (change === 'all' || change === '1d4') {
      return key && key.includes('Removed') ? 'positive' : 'neutral';
    }
  }
  
  if (typeof change === 'object' && change !== null) {
    // Handle aid bonus from aid-another action
    if (change.aidBonus !== undefined) {
      if (typeof change.aidBonus === 'number' && change.aidBonus > 0) {
        return 'positive';
      } else if (typeof change.aidBonus === 'number' && change.aidBonus < 0) {
        return 'negative';
      }
      return 'neutral';
    }
    if (change.nextActionBonus !== undefined) {
      return change.nextActionBonus > 0 ? 'positive' : change.nextActionBonus < 0 ? 'negative' : 'neutral';
    }
    if (change.to > change.from) return 'positive';
    if (change.to < change.from) return 'negative';
    if (change.added) return 'positive';
    if (change.removed) return 'negative';
  }
  
  return 'neutral';
}

/**
 * Roll a dice formula (e.g., "1d4", "2d6+1", "-1d4", "-2d6-1")
 */
export function rollDiceFormula(formula: string): number {
  // Handle negative prefix
  const isNegative = formula.startsWith('-');
  const cleanFormula = isNegative ? formula.substring(1) : formula;
  
  // Parse the dice formula
  const match = cleanFormula.match(/(\d+)d(\d+)(?:([+-])(\d+))?/i);
  if (!match) {
    console.error(`Invalid dice formula: ${formula}`);
    return 0;
  }
  
  const count = parseInt(match[1]);
  const sides = parseInt(match[2]);
  const bonusSign = match[3]; // '+' or '-'
  const bonusValue = match[4] ? parseInt(match[4]) : 0;
  
  // Calculate bonus
  let bonus = 0;
  if (bonusSign === '+') {
    bonus = bonusValue;
  } else if (bonusSign === '-') {
    bonus = -bonusValue;
  }
  
  // Roll dice
  let total = bonus;
  for (let i = 0; i < count; i++) {
    total += Math.floor(Math.random() * sides) + 1;
  }
  
  // Apply negative if needed
  return isNegative ? -total : total;
}

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
 * Detect modifiers with dice formula values (requiring player to roll)
 */
export function detectDiceModifiers(modifiers: any[] | undefined): any[] {
  if (!modifiers) return [];
  return modifiers
    .map((m, index) => ({ ...m, originalIndex: index }))
    .filter(m => typeof m.value === 'string' && DICE_PATTERN.test(m.value));
}

/**
 * Detect dice formulas in stateChanges (requiring player to roll)
 * Returns array of { key: string, formula: string } objects
 */
export function detectStateChangeDice(stateChanges: Record<string, any> | undefined): { key: string; formula: string }[] {
  if (!stateChanges) return [];
  
  return Object.entries(stateChanges)
    .filter(([_, value]) => typeof value === 'string' && DICE_PATTERN.test(value))
    .map(([key, formula]) => ({ key, formula }));
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
