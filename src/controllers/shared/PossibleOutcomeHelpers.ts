/**
 * Shared helper functions for building PossibleOutcome arrays from event/incident/action data
 * Handles missing outcomes gracefully (e.g., incidents where criticalSuccess = success)
 */

export interface PossibleOutcome {
  result: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
  label: string;
  description: string;
  modifiers?: Array<{ resource: string; value: number }>;
}

export interface OutcomeEffects {
  criticalSuccess?: { msg: string; modifiers?: any[] };
  success?: { msg: string; modifiers?: any[] };
  failure?: { msg: string; modifiers?: any[] };
  criticalFailure?: { msg: string; modifiers?: any[] };
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
      const value = mod.value || 0;
      const sign = value > 0 ? '+' : '';
      const resource = mod.resource || '';
      return `${sign}${value} ${resource}`;
    })
    .join(', ');
  
  return `${message} (${modifierText})`;
}

/**
 * Build PossibleOutcome array from effects object
 * Handles missing outcomes gracefully:
 * - If criticalSuccess is missing, uses success effect
 * - Skips any other missing outcomes
 * - Formats messages with placeholder replacement
 * 
 * @param effects - The effects object with outcome keys
 * @returns Array of PossibleOutcome objects for display
 */
export function buildPossibleOutcomes(effects?: OutcomeEffects): PossibleOutcome[] {
  if (!effects) return [];
  
  const outcomes: PossibleOutcome[] = [];
  
  // Critical Success - fallback to success if missing
  const critSuccessEffect = effects.criticalSuccess || effects.success;
  if (critSuccessEffect) {
    outcomes.push({
      result: 'criticalSuccess',
      label: 'Critical Success',
      description: critSuccessEffect.msg,
      modifiers: critSuccessEffect.modifiers || []
    });
  }
  
  // Success
  if (effects.success) {
    outcomes.push({
      result: 'success',
      label: 'Success',
      description: effects.success.msg,
      modifiers: effects.success.modifiers || []
    });
  }
  
  // Failure
  if (effects.failure) {
    outcomes.push({
      result: 'failure',
      label: 'Failure',
      description: effects.failure.msg,
      modifiers: effects.failure.modifiers || []
    });
  }
  
  // Critical Failure
  if (effects.criticalFailure) {
    outcomes.push({
      result: 'criticalFailure',
      label: 'Critical Failure',
      description: effects.criticalFailure.msg,
      modifiers: effects.criticalFailure.modifiers || []
    });
  }
  
  return outcomes;
}
