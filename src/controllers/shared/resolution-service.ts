/**
 * Shared Resolution Service - Common logic for actions, events, and incidents
 * 
 * This service provides shared utilities for:
 * - DC calculation (level-based progression)
 * - Resource change aggregation
 * - State preparation with bounds checking
 * - Modifier creation
 * - Skill validation
 */

import type { KingdomData } from '../../actors/KingdomActor';
import type { ActiveModifier } from '../../models/Modifiers';
import type { EventModifier } from '../../types/events';

/**
 * OngoingEffect - Structure for unresolved event/incident effects
 * This matches the JSON structure of the ifUnresolved field
 */
export interface OngoingEffect {
  name: string;
  description: string;
  tier: number;
  icon?: string;
  modifiers: EventModifier[];
  resolvedWhen?: any;  // TODO: Define ResolutionCondition type when needed
}

/**
 * Calculate DC based on kingdom/character level
 * Uses standard PF2e level-based DC progression
 */
export function getLevelBasedDC(level: number): number {
  const dcByLevel: Record<number, number> = {
    1: 15, 2: 16, 3: 18, 4: 19, 5: 20,
    6: 22, 7: 23, 8: 24, 9: 26, 10: 27,
    11: 28, 12: 30, 13: 31, 14: 32, 15: 34,
    16: 35, 17: 36, 18: 38, 19: 39, 20: 40
  };
  
  return dcByLevel[level] || 15;
}

/**
 * Aggregate resource changes from multiple modifiers
 * Only applies immediate and permanent duration modifiers
 * Skips resource array modifiers (require player choice)
 */
export function aggregateResourceChanges(
  modifiers: EventModifier[]
): Map<string, number> {
  const changes = new Map<string, number>();
  
  for (const modifier of modifiers) {
    // Skip resource arrays (player must choose which resource)
    if (Array.isArray(modifier.resource)) {
      continue;
    }
    
    if (modifier.duration === 'immediate' || modifier.duration === 'permanent') {
      // TypeScript now knows modifier.resource is a single ResourceType, not an array
      const resourceValue = typeof modifier.value === 'number' ? modifier.value : 0;
      const current = changes.get(modifier.resource) || 0;
      changes.set(modifier.resource, current + resourceValue);
    }
  }
  
  return changes;
}

/**
 * Apply resource changes to kingdom state with bounds checking
 * Returns partial kingdom data for updating
 */
export function prepareStateChanges(
  currentState: KingdomData,
  resourceChanges: Map<string, number>
): Partial<KingdomData> {
  const updates: Partial<KingdomData> = {
    resources: { ...currentState.resources }
  };
  
  // Apply resource changes with bounds checking
  for (const [resource, change] of resourceChanges) {
    if (resource === 'unrest') {
      // Unrest has minimum of 0
      updates.unrest = Math.max(0, (currentState.unrest || 0) + change);
    } else if (resource === 'fame') {
      // Fame is capped between 0 and 3
      updates.fame = Math.max(0, Math.min(3, (currentState.fame || 0) + change));
    } else if (updates.resources) {
      // Standard resources have minimum of 0
      const current = updates.resources[resource] || 0;
      updates.resources[resource] = Math.max(0, current + change);
    }
  }
  
  return updates;
}

/**
 * Create an ActiveModifier from an unresolved event or incident
 */
export function createUnresolvedModifier(
  unresolvedEffect: OngoingEffect,
  sourceType: 'event' | 'incident',
  sourceId: string,
  sourceName: string,
  currentTurn: number
): ActiveModifier {
  return {
    id: `unresolved-${sourceType}-${sourceId}-${Date.now()}`,
    name: unresolvedEffect.name,
    description: unresolvedEffect.description,
    icon: unresolvedEffect.icon,
    tier: unresolvedEffect.tier,
    sourceType,
    sourceId,
    sourceName,
    startTurn: currentTurn,
    modifiers: unresolvedEffect.modifiers,
    resolvedWhen: unresolvedEffect.resolvedWhen
  };
}

/**
 * Check if a resolution option can use a specific skill
 */
export function canResolveWithSkill(
  skills: Array<{ skill: string }> | undefined,
  targetSkill: string
): boolean {
  if (!skills) return false;
  return skills.some(s => s.skill === targetSkill);
}

/**
 * Merge multiple resource change maps into one
 * Useful when combining effects from multiple sources
 */
export function mergeResourceChanges(
  ...changeMaps: Map<string, number>[]
): Map<string, number> {
  const merged = new Map<string, number>();
  
  for (const changeMap of changeMaps) {
    for (const [resource, change] of changeMap) {
      const current = merged.get(resource) || 0;
      merged.set(resource, current + change);
    }
  }
  
  return merged;
}

/**
 * Map incident severity to tier for modifier creation
 * Note: Incident severity (minor/moderate/major) is DISTINCT from the removed modifier severity system
 */
export function mapIncidentSeverityToTier(
  severity?: 'minor' | 'moderate' | 'major'
): number {
  switch (severity) {
    case 'major':
      return 3;
    case 'moderate':
      return 2;
    case 'minor':
      return 1;
    default:
      return 1;
  }
}

/**
 * Format resource changes for display
 */
export function formatResourceChanges(
  changes: Map<string, number>
): string[] {
  const messages: string[] = [];
  
  for (const [resource, change] of changes) {
    const sign = change >= 0 ? '+' : '';
    const resourceName = resource.charAt(0).toUpperCase() + resource.slice(1);
    messages.push(`${resourceName}: ${sign}${change}`);
  }
  
  return messages;
}

/**
 * Validate that required resources are available
 */
export function hasRequiredResources(
  currentState: KingdomData,
  requiredResources: Map<string, number>
): { valid: boolean; missing: Map<string, number> } {
  const missing = new Map<string, number>();
  
  for (const [resource, required] of requiredResources) {
    const available = currentState.resources[resource] || 0;
    if (available < required) {
      missing.set(resource, required - available);
    }
  }
  
  return {
    valid: missing.size === 0,
    missing
  };
}

/**
 * Apply multiple state changes in sequence
 * Returns the cumulative partial state
 */
export function applyMultipleStateChanges(
  currentState: KingdomData,
  ...changeSequence: Map<string, number>[]
): Partial<KingdomData> {
  let cumulative = currentState;
  let finalUpdates: Partial<KingdomData> = {};
  
  for (const changes of changeSequence) {
    const updates = prepareStateChanges(cumulative, changes);
    
    // Merge updates
    cumulative = {
      ...cumulative,
      ...updates,
      resources: {
        ...cumulative.resources,
        ...updates.resources
      }
    };
    
    // Track final updates
    finalUpdates = {
      ...finalUpdates,
      ...updates,
      resources: {
        ...finalUpdates.resources,
        ...updates.resources
      }
    };
  }
  
  return finalUpdates;
}
