/**
 * InlineActionHelpers - Utilities for actions with custom resolution components
 * 
 * These helpers support actions that use customResolution.execute() to apply
 * changes inline during action resolution (after roll succeeds, before completion).
 * 
 * Distinct from ActionHelpers.ts which provides general validation/lookup utilities.
 */

import type { KingdomData } from '../../actors/KingdomActor';
import { 
  createErrorResult, 
  createSuccessResult,
  type ResolveResult 
} from './ActionHelpers';

/**
 * Resource change to apply to kingdom
 */
export interface ResourceChange {
  resource: 'gold' | 'food' | 'lumber' | 'stone' | 'ore';
  amount: number; // Positive = add, negative = subtract
}

/**
 * Apply resource changes to kingdom data
 * 
 * This is the shared pattern for actions with custom resolution components
 * that need to modify kingdom resources (e.g., Harvest Resources, Purchase Resources).
 * 
 * @param changes - Array of resource changes to apply
 * @param actionId - Action ID for logging/error messages
 * @returns Success/error result
 * 
 * @example
 * // Harvest 3 lumber
 * await applyResourceChanges([
 *   { resource: 'lumber', amount: 3 }
 * ], 'harvest-resources');
 * 
 * @example
 * // Purchase 2 stone for 10 gold
 * await applyResourceChanges([
 *   { resource: 'gold', amount: -10 },
 *   { resource: 'stone', amount: 2 }
 * ], 'purchase-resources');
 */
export async function applyResourceChanges(
  changes: ResourceChange[],
  actionId: string
): Promise<ResolveResult> {
  try {
    // Get kingdom actor
    const { getKingdomActor } = await import('../../stores/KingdomStore');
    const actor = getKingdomActor();
    
    if (!actor) {
      return createErrorResult('Kingdom actor not found');
    }
    
    // Apply all resource changes
    await actor.updateKingdomData((kingdom: KingdomData) => {
      // Initialize resources if needed
      if (!kingdom.resources) {
        kingdom.resources = { food: 0, lumber: 0, stone: 0, ore: 0, gold: 0 };
      }
      
      // Apply each change
      for (const change of changes) {
        const current = kingdom.resources[change.resource] || 0;
        kingdom.resources[change.resource] = current + change.amount;
      }
    });
    
    return createSuccessResult('Resources applied successfully');
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResult(`Failed to apply resource changes: ${errorMsg}`);
  }
}

/**
 * Format resource changes for display messages
 * 
 * @param changes - Resource changes to format
 * @returns Human-readable string describing the changes
 * 
 * @example
 * formatResourceChanges([
 *   { resource: 'gold', amount: -10 },
 *   { resource: 'stone', amount: 2 }
 * ])
 * // => "spent 10 gold, gained 2 stone"
 */
export function formatResourceChanges(changes: ResourceChange[]): string {
  const parts: string[] = [];
  
  for (const change of changes) {
    const resourceName = change.resource.charAt(0).toUpperCase() + change.resource.slice(1);
    const absAmount = Math.abs(change.amount);
    
    if (change.amount > 0) {
      parts.push(`gained ${absAmount} ${resourceName}`);
    } else if (change.amount < 0) {
      parts.push(`spent ${absAmount} ${resourceName}`);
    }
  }
  
  return parts.join(', ');
}
