/**
 * Shared helper functions for building PossibleOutcome arrays from event/incident/action data
 * Handles missing outcomes gracefully (e.g., incidents where criticalSuccess = success)
 */

export interface PossibleOutcome {
  result: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
  label: string;
  description: string;
}

export interface OutcomeEffects {
  criticalSuccess?: { msg: string; modifiers?: any[] };
  success?: { msg: string; modifiers?: any[] };
  failure?: { msg: string; modifiers?: any[] };
  criticalFailure?: { msg: string; modifiers?: any[] };
}

/**
 * Capitalize first letter of a string
 */
function capitalize(str: string | undefined | null): string {
  if (!str || typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Format a modifier value for display
 * - Removes leading signs if the message already has them (avoid "--1")
 * - Includes the resource name (e.g., "1d4 gold" instead of just "1d4")
 * - Wraps in <span> with light font weight for visual distinction
 * 
 * @param value - The modifier value (e.g., -1d4, 2, "-2d4")
 * @param resourceName - The resource name (e.g., "gold", "unrest")
 * @param messageContext - The surrounding text to detect existing signs
 * @returns Formatted HTML string
 */
function formatModifierValue(value: number | string, resourceName: string, messageContext: string): string {
  let displayValue = String(value);
  
  // If the message has a sign before the placeholder, strip the sign from the value
  // e.g., "Lose {gold}" with value "-1d4" should show "Lose 1d4 gold" not "Lose -1d4 gold"
  const hasSignBefore = /[+-]\s*\{/.test(messageContext);
  
  if (hasSignBefore && displayValue.startsWith('-')) {
    displayValue = displayValue.substring(1); // Remove leading minus
  } else if (hasSignBefore && displayValue.startsWith('+')) {
    displayValue = displayValue.substring(1); // Remove leading plus
  }
  
  // Special case: handle leading negative without sign before placeholder
  // e.g., "{gold}" with value "-1d4" should show "-1d4 gold"
  // But "Lose {gold}" with value "-1d4" should show "Lose 1d4 gold"
  
  // Add the resource name, capitalized
  const formattedResourceName = capitalize(resourceName);
  const fullValue = `${displayValue} ${formattedResourceName}`;
  
  // Wrap in span with light font weight
  return `<span style="font-weight: 300">${fullValue}</span>`;
}

/**
 * Auto-generate effect text from modifiers
 * @param modifiers - Array of modifiers with resource and value
 * @returns Generated effect text (e.g., "+2 Gold, -1 Unrest")
 */
function generateEffectText(modifiers?: any[]): string {
  if (!modifiers || modifiers.length === 0) return '';
  
  const effects: string[] = [];
  
  for (const modifier of modifiers) {
    const resource = capitalize(modifier.resource);
    if (!resource) continue; // Skip if no valid resource
    
    let value = String(modifier.value || 0);
    
    // Add + prefix for positive numbers (if not already present)
    if (!value.startsWith('-') && !value.startsWith('+')) {
      if (Number(value) > 0 || value.includes('d')) {
        value = '+' + value;
      }
    }
    
    effects.push(`${value} ${resource}`);
  }
  
  return effects.join(', ');
}

/**
 * Format an outcome message by appending auto-generated effects
 * Messages contain ONLY flavor text; effects are generated from modifiers
 * 
 * @param message - Flavor text only (e.g., "Major discovery")
 * @param modifiers - Array of modifiers with resource and value
 * @returns Formatted message with auto-generated effects (e.g., "Major discovery: +2 Gold, -1 Unrest")
 */
export function formatOutcomeMessage(message: string, modifiers?: any[]): string {
  if (!modifiers || modifiers.length === 0) return message;
  
  const effectText = generateEffectText(modifiers);
  
  if (!effectText) return message;
  
  // Append effect text to flavor text
  return `${message}: <span style="font-weight: 300">${effectText}</span>`;
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
      description: formatOutcomeMessage(critSuccessEffect.msg, critSuccessEffect.modifiers)
    });
  }
  
  // Success
  if (effects.success) {
    outcomes.push({
      result: 'success',
      label: 'Success',
      description: formatOutcomeMessage(effects.success.msg, effects.success.modifiers)
    });
  }
  
  // Failure
  if (effects.failure) {
    outcomes.push({
      result: 'failure',
      label: 'Failure',
      description: formatOutcomeMessage(effects.failure.msg, effects.failure.modifiers)
    });
  }
  
  // Critical Failure
  if (effects.criticalFailure) {
    outcomes.push({
      result: 'criticalFailure',
      label: 'Critical Failure',
      description: formatOutcomeMessage(effects.criticalFailure.msg, effects.criticalFailure.modifiers)
    });
  }
  
  return outcomes;
}
