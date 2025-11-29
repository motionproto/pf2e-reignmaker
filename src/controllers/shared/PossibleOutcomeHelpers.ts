/**
 * Shared helper functions for building PossibleOutcome arrays from event/incident/action data
 * Handles missing outcomes gracefully (e.g., incidents where criticalSuccess = success)
 */

import type { EventModifier } from '../../types/modifiers';

export interface PossibleOutcome {
  result: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
  label: string;
  description: string;
  modifiers?: EventModifier[];
  manualEffects?: string[];
  gameCommands?: any[];
  outcomeBadges?: any[];  // UnifiedOutcomeBadge[] for condition badges from pipeline
}

export interface OutcomeEffects {
  criticalSuccess?: { msg?: string; description?: string; modifiers?: EventModifier[]; manualEffects?: string[]; gameCommands?: any[] };
  success?: { msg?: string; description?: string; modifiers?: EventModifier[]; manualEffects?: string[]; gameCommands?: any[] };
  failure?: { msg?: string; description?: string; modifiers?: EventModifier[]; manualEffects?: string[]; gameCommands?: any[] };
  criticalFailure?: { msg?: string; description?: string; modifiers?: EventModifier[]; manualEffects?: string[]; gameCommands?: any[] };
}

/**
 * Build PossibleOutcome array from outcomes object
 * Handles missing outcomes gracefully:
 * - If criticalSuccess is missing, uses success outcome
 * - Skips any other missing outcomes
 * - Formats messages with placeholder replacement
 * 
 * @param outcomes - The outcomes object with outcome keys (can be called "effects" or "outcomes" in the data)
 * @returns Array of PossibleOutcome objects for display
 */
export function buildPossibleOutcomes(outcomes?: OutcomeEffects): PossibleOutcome[] {
  if (!outcomes) return [];
  
  const results: PossibleOutcome[] = [];
  
  // Critical Success - fallback to success if missing
  const critSuccessEffect = outcomes.criticalSuccess || outcomes.success;
  if (critSuccessEffect) {
    results.push({
      result: 'criticalSuccess',
      label: 'Critical Success',
      description: critSuccessEffect.msg || critSuccessEffect.description || '',
      modifiers: critSuccessEffect.modifiers || [],
      manualEffects: critSuccessEffect.manualEffects || [],
      gameCommands: critSuccessEffect.gameCommands || []
    });
  }
  
  // Success
  if (outcomes.success) {
    results.push({
      result: 'success',
      label: 'Success',
      description: outcomes.success.msg || outcomes.success.description || '',
      modifiers: outcomes.success.modifiers || [],
      manualEffects: outcomes.success.manualEffects || [],
      gameCommands: outcomes.success.gameCommands || []
    });
  }
  
  // Failure
  if (outcomes.failure) {
    results.push({
      result: 'failure',
      label: 'Failure',
      description: outcomes.failure.msg || outcomes.failure.description || '',
      modifiers: outcomes.failure.modifiers || [],
      manualEffects: outcomes.failure.manualEffects || [],
      gameCommands: outcomes.failure.gameCommands || []
    });
  }
  
  // Critical Failure
  if (outcomes.criticalFailure) {
    results.push({
      result: 'criticalFailure',
      label: 'Critical Failure',
      description: outcomes.criticalFailure.msg || outcomes.criticalFailure.description || '',
      modifiers: outcomes.criticalFailure.modifiers || [],
      manualEffects: outcomes.criticalFailure.manualEffects || [],
      gameCommands: outcomes.criticalFailure.gameCommands || []
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

