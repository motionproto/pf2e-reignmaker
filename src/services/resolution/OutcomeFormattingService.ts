/**
 * OutcomeFormattingService - Formatting utilities for outcome display
 * 
 * Handles:
 * - Display properties (icons, labels, colors)
 * - State change formatting
 * - Value formatting
 */

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
 * Create the outcome formatting service
 */
export async function createOutcomeFormattingService() {
  return {
    getOutcomeDisplayProps,
    formatStateChangeLabel,
    formatStateChangeValue,
    getChangeClass
  };
}

export type OutcomeFormattingService = Awaited<ReturnType<typeof createOutcomeFormattingService>>;
