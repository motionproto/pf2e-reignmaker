/**
 * Simplified Kingdom Modifier System
 * 
 * Modifiers are created from:
 * - Structures (persistent while structure exists)
 * - Diplomatic relations
 * - Custom sources
 * 
 * Applied during Status phase each turn.
 * 
 * NOTE: Events and incidents now use ActiveEventInstance instead of ActiveModifier.
 */

import type { EventModifier } from '../types/modifiers';
import type { CheckPipeline } from '../types/CheckPipeline';

/**
 * Intermediate resolution state for OutcomeDisplay
 * Syncs choice selections and dice rolls across clients
 */
export interface ResolutionState {
  selectedChoice: number | null;
  resolvedDice: Record<number | string, number>;
  selectedResources?: Record<number, string>;
  customComponentData?: any;  // Custom component resolution data (action-specific)
}

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
 * Source types for modifiers (excludes 'event' and 'incident' which now use ActiveEventInstance)
 */
export type ModifierSourceType = 'structure' | 'diplomatic' | 'custom';

/**
 * Active Event Instance - Represents an ongoing event or incident that needs resolution
 * 
 * These are stored in kingdom.activeEventInstances[] and displayed in the "Ongoing Events" section.
 * Each instance has a unique ID to prevent duplicates and track rerolls correctly.
 */
export interface ActiveEventInstance {
  instanceId: string;           // Unique: "demand-structure-1760275035410"
  eventId: string;               // Template ID: "demand-structure"
  eventType: 'event' | 'incident';
  eventData: CheckPipeline;          // Full event object (skills, outcomes, etc.)
  createdTurn: number;
  status: 'pending' | 'resolved';
  
  // Multi-player resolution tracking - shows who is currently working on this event
  resolutionProgress?: {
    playerId: string;                    // Who is currently resolving
    playerName: string;                  // For display ("Alice is resolving...")
    timestamp: number;                   // When they started
    outcome?: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';  // What they rolled
    selectedChoices?: number[];          // Which choice buttons clicked
    rolledDice?: Record<string, number>; // Which dice were rolled { '0': 4, 'state:food': -3 }
  };
  
  appliedOutcome?: {             // Persisted resolution state (survives re-renders)
    outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
    actorName: string;
    skillName: string;
    effect: string;
    modifiers?: any[];           // RESOLVED static values (no dice formulas or choices)
    manualEffects?: string[];
    shortfallResources?: string[];
    effectsApplied?: boolean;    // Track if "Apply Result" was clicked (syncs across clients)
  };
  effectsApplied?: boolean;      // DEPRECATED - moved into appliedOutcome (gates phase completion)
  resolutionState?: ResolutionState;  // Intermediate state (choices, dice rolls) - syncs across clients
}

/**
 * Active modifier affecting the kingdom
 * 
 * These are stored in kingdom.activeModifiers[] and represent persistent effects from:
 * - Structures (e.g., "Tavern: +1 unrest reduction")
 * - Diplomatic relations (e.g., "Allied with Brevoy: +1 gold")
 * - Custom GM-created modifiers
 * 
 * NOTE: Events and incidents no longer use ActiveModifier - they use ActiveEventInstance instead.
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
