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

import type { EventModifier } from '../types/modifiers';

/**
 * Resolution condition for modifiers that can be resolved
 */
export interface ResolutionCondition {
  type: 'skill' | 'condition';
  skillResolution?: {
    dcAdjustment: number;
  };
  conditionResolution?: {
    description: string;
  };
}

/**
 * Source types for modifiers
 */
export type ModifierSourceType = 'event' | 'incident' | 'structure' | 'diplomatic' | 'custom';

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
  
  // Original event/incident data (for ongoing events that need skill resolution)
  originalEventData?: any;
}

/**
 * Result of attempting to resolve a modifier
 */
export interface ResolutionResult {
  success: boolean;
  msg: string;
  removed: boolean;
}
