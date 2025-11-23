/**
 * Converts JSON modifiers to unified outcome badges
 * This replaces the automatic conversion that was previously done in OutcomeBadges.svelte
 */

import { getResourceIcon } from '../../view/kingdom/utils/presentation';
import type { UnifiedOutcomeBadge } from '../../types/OutcomeBadge';

export interface ModifierConversionContext {
  modifiers: any[];
  instanceMetadata?: any;
}

/**
 * Convert an array of modifiers to outcome badges
 * @param modifiers Array of modifiers from JSON outcome
 * @param instanceMetadata Optional metadata for context-specific formatting
 * @returns Array of UnifiedOutcomeBadge
 */
export function convertModifiersToBadges(
  modifiers: any[],
  instanceMetadata?: any
): UnifiedOutcomeBadge[] {
  if (!modifiers || modifiers.length === 0) {
    return [];
  }

  return modifiers
    .map((mod: any, index: number) => ({ ...mod, originalIndex: index }))
    .filter((mod: any) => {
      // Include dice modifiers
      if (mod.type === 'dice' && mod.formula) return true;
      // Include static modifiers with resource
      if (mod.type === 'static' && mod.resource && typeof mod.value === 'number') return true;
      return false;
    })
    .map((mod: any): UnifiedOutcomeBadge | null => {
      // Handle dice modifiers
      if (mod.type === 'dice') {
        const formula = mod.formula || mod.value;
        const resource = mod.resource;
        // Check both mod.negative flag AND formula for minus sign
        const isNegative = mod.negative || (typeof formula === 'string' && formula.startsWith('-'));
        
        // DEBUG: Log the values to trace the bug
        console.log('🔍 [convertModifiersToBadges] Dice modifier:', {
          formula,
          resource,
          negative: mod.negative,
          isNegative,
          rawMod: mod
        });
        
        if (resource === 'imprisonedUnrest') {
          const settlementName = instanceMetadata?.settlement?.name || 'settlement';
          return {
            icon: 'fa-gavel',
            template: `Remove {{value}} imprisoned unrest from ${settlementName}`,
            value: { type: 'dice', formula: formula.replace(/^-/, '') },
            variant: 'positive'
          };
        }
        
        const resourceName = resource.charAt(0).toUpperCase() + resource.slice(1);
        const action = isNegative ? 'Lose' : 'Gain';
        
        // Special case: For unrest, losing is good (green), gaining is bad (red)
        let variant: 'positive' | 'negative';
        if (resource === 'unrest') {
          variant = isNegative ? 'positive' : 'negative';  // Inverted logic
        } else {
          variant = isNegative ? 'negative' : 'positive';  // Normal logic
        }
        
        return {
          icon: getResourceIcon(resource),
          template: `${action} {{value}} ${resourceName}`,
          value: { type: 'dice', formula: formula.replace(/^-/, '') },
          variant
        };
      }
      
      // Handle static modifiers
      if (mod.type === 'static') {
        const resource = mod.resource;
        const value = mod.value;
        const isNegative = value < 0;
        const action = isNegative ? 'Lose' : 'Gain';
        const resourceName = resource.charAt(0).toUpperCase() + resource.slice(1);
        
        // Special case: For unrest, losing is good (green), gaining is bad (red)
        let variant: 'positive' | 'negative';
        if (resource === 'unrest') {
          variant = isNegative ? 'positive' : 'negative';  // Inverted logic
        } else {
          variant = isNegative ? 'negative' : 'positive';  // Normal logic
        }
        
        return {
          icon: getResourceIcon(resource),
          template: `${action} {{value}} ${resourceName}`,
          value: { type: 'static', amount: Math.abs(value) },
          variant
        };
      }
      
      return null;
    })
    .filter((badge): badge is UnifiedOutcomeBadge => badge !== null);
}
