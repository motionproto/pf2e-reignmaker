/**
 * Shared helper functions for processing outcome data
 * Used by both EventsPhase and UnrestPhase to maintain consistency
 */

const DICE_PATTERN = /^-?\d+d\d+([+-]\d+)?$/;

/**
 * Calculate state changes from outcome modifiers
 * Parses modifiers array and aggregates resource changes into a single object
 * Preserves dice formula strings for dice roller UI
 * 
 * @param modifiers - Array of modifiers from an outcome (events/incidents)
 * @returns Object with resource changes for StateChanges component
 * 
 * @example
 * const modifiers = [
 *   { resource: 'gold', value: 5 },
 *   { resource: 'unrest', value: -1 },
 *   { resource: 'gold', value: '-1d4' }  // Preserved as string
 * ];
 * calculateStateChanges(modifiers); // { gold: '-1d4', unrest: -1 }
 */
export function calculateStateChanges(modifiers?: any[]): Record<string, any> {
  if (!modifiers || modifiers.length === 0) return {};
  
  const changes = new Map<string, any>();
  
  for (const modifier of modifiers) {
    // Skip modifiers with resource arrays (they require player choice)
    if (!Array.isArray(modifier.resource)) {
      const value = modifier.value;
      
      // Check if value is a dice formula
      if (typeof value === 'string' && DICE_PATTERN.test(value)) {
        // Preserve dice formulas as strings for dice roller UI
        changes.set(modifier.resource, value);
      } else {
        // Aggregate numeric values
        const currentValue = changes.get(modifier.resource) || 0;
        changes.set(modifier.resource, currentValue + value);
      }
    }
  }
  
  return Object.fromEntries(changes);
}
