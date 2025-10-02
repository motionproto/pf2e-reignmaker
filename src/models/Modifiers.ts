/**
 * Simplified Kingdom Modifier System
 * 
 * Modifiers are created from:
 * - Unresolved events/incidents (ongoing effects)
 * - Structures (persistent while structure exists)
 * - Diplomatic relations
 * 
 * Applied during Status phase each turn.
 */

import type { EventModifier, ResolutionCondition } from '../controllers/events/types';

/**
 * Source types for modifiers
 */
export type ModifierSourceType = 'event' | 'incident' | 'structure' | 'diplomatic';

/**
 * Active modifier affecting the kingdom
 */
export interface ActiveModifier {
  id: string;
  name: string;
  description: string;
  icon?: string;
  tier: number;
  
  // Source tracking
  sourceType: ModifierSourceType;
  sourceId: string;
  sourceName: string;
  
  // Timing
  startTurn: number;
  
  // Effects (uses same format as events!)
  modifiers: EventModifier[];
  
  // Resolution (optional - only for resolvable modifiers)
  resolvedWhen?: ResolutionCondition;
}

/**
 * Result of attempting to resolve a modifier
 */
export interface ResolutionResult {
  success: boolean;
  msg: string;
  removed: boolean;
}
