/**
 * Shared helper functions for building PossibleOutcome arrays from pipeline outcomes
 */

import type { EventModifier } from '../../types/modifiers';
import type { Outcome } from '../../types/CheckPipeline';

export interface PossibleOutcome {
  result: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
  label: string;
  description: string;
  modifiers: EventModifier[];
  manualEffects: string[];
  gameCommands: any[];
  outcomeBadges: any[];
}

// Re-use the Outcome type from CheckPipeline for consistency
export interface OutcomeEffects {
  criticalSuccess?: Outcome;
  success?: Outcome;
  failure?: Outcome;
  criticalFailure?: Outcome;
}

/**
 * Check if any outcome in the event has endsEvent: false (is ongoing)
 */
function hasOngoingOutcome(outcomes: OutcomeEffects): boolean {
  const allOutcomes = [
    outcomes.criticalSuccess,
    outcomes.success,
    outcomes.failure,
    outcomes.criticalFailure
  ].filter(Boolean) as Outcome[];
  
  return allOutcomes.some(o => o.endsEvent === false);
}

/**
 * Build PossibleOutcome array from pipeline outcomes
 * 
 * If criticalSuccess is missing, uses success outcome for that slot.
 * 
 * @param outcomes - Pipeline outcomes object
 * @param isEvent - If true, adds "Ends Event" badge for ongoing events
 */
export function buildPossibleOutcomes(outcomes?: OutcomeEffects, isEvent: boolean = false): PossibleOutcome[] {
  if (!outcomes) return [];
  
  const results: PossibleOutcome[] = [];
  
  // Only show "Ends Event" badges if this event has at least one ongoing outcome
  const showEndsEventBadges = isEvent && hasOngoingOutcome(outcomes);
  
  // Critical Success - use success if criticalSuccess is missing
  const critSuccessOutcome = outcomes.criticalSuccess ?? outcomes.success;
  if (critSuccessOutcome) {
    const outcomeBadges = [...(critSuccessOutcome.outcomeBadges ?? [])];
    // Only show "Ends Event" badge on outcomes that end the event (for ongoing events)
    if (showEndsEventBadges && critSuccessOutcome.endsEvent !== false) {
      outcomeBadges.push({
        icon: 'fa-check-circle',
        template: 'Ends Event',
        variant: 'positive'
      });
    }
    
    results.push({
      result: 'criticalSuccess',
      label: 'Critical Success',
      description: critSuccessOutcome.description,
      modifiers: critSuccessOutcome.modifiers,
      manualEffects: critSuccessOutcome.manualEffects ?? [],
      gameCommands: critSuccessOutcome.gameCommands ?? [],
      outcomeBadges
    });
  }
  
  if (outcomes.success) {
    const outcomeBadges = [...(outcomes.success.outcomeBadges ?? [])];
    if (showEndsEventBadges && outcomes.success.endsEvent !== false) {
      outcomeBadges.push({
        icon: 'fa-check-circle',
        template: 'Ends Event',
        variant: 'positive'
      });
    }
    
    results.push({
      result: 'success',
      label: 'Success',
      description: outcomes.success.description,
      modifiers: outcomes.success.modifiers,
      manualEffects: outcomes.success.manualEffects ?? [],
      gameCommands: outcomes.success.gameCommands ?? [],
      outcomeBadges
    });
  }
  
  if (outcomes.failure) {
    const outcomeBadges = [...(outcomes.failure.outcomeBadges ?? [])];
    if (showEndsEventBadges && outcomes.failure.endsEvent !== false) {
      outcomeBadges.push({
        icon: 'fa-check-circle',
        template: 'Ends Event',
        variant: 'positive'
      });
    }
    
    results.push({
      result: 'failure',
      label: 'Failure',
      description: outcomes.failure.description,
      modifiers: outcomes.failure.modifiers,
      manualEffects: outcomes.failure.manualEffects ?? [],
      gameCommands: outcomes.failure.gameCommands ?? [],
      outcomeBadges
    });
  }
  
  if (outcomes.criticalFailure) {
    const outcomeBadges = [...(outcomes.criticalFailure.outcomeBadges ?? [])];
    if (showEndsEventBadges && outcomes.criticalFailure.endsEvent !== false) {
      outcomeBadges.push({
        icon: 'fa-check-circle',
        template: 'Ends Event',
        variant: 'positive'
      });
    }
    
    results.push({
      result: 'criticalFailure',
      label: 'Critical Failure',
      description: outcomes.criticalFailure.description,
      modifiers: outcomes.criticalFailure.modifiers,
      manualEffects: outcomes.criticalFailure.manualEffects ?? [],
      gameCommands: outcomes.criticalFailure.gameCommands ?? [],
      outcomeBadges
    });
  }
  
  return results;
}

/**
 * Format an outcome message with its modifiers for display
 * 
 * @param message - The outcome message
 * @param modifiers - Array of modifiers to apply
 * @returns Formatted message with modifier summary
 */
export function formatOutcomeMessage(message: string, modifiers?: any[]): string {
  if (!modifiers || modifiers.length === 0) {
    return message;
  }
  
  // Build modifier summary
  const modifierText = modifiers
    .map(mod => {
      // Handle dice modifiers (type: 'dice', formula: '2d6', negative: true)
      if (mod.type === 'dice' && mod.formula) {
        const action = mod.negative ? 'Lose' : 'Gain';
        const resource = mod.resource || '';
        return `${action} ${mod.formula} ${resource}`;
      }
      
      // Handle static modifiers (type: 'static', value: number)
      const value = mod.value || 0;
      const sign = value > 0 ? '+' : '';
      const resource = mod.resource || '';
      return `${sign}${value} ${resource}`;
    })
    .join(', ');
  
  return `${message} (${modifierText})`;
}

