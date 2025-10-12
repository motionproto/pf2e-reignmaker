/**
 * Typed Modifier System
 * 
 * ⚠️ HAND-WRITTEN - DO NOT AUTO-GENERATE ⚠️
 * 
 * This file defines the architectural types for modifiers.
 * The build script (buildscripts/generate-types.py) imports from here
 * rather than generating these types.
 * 
 * Defines type-safe modifiers for events, incidents, and actions.
 * Replaces regex-based detection with explicit type discrimination.
 */

/**
 * Import ResourceType from events (auto-generated, always in sync with data)
 */
import type { ResourceType } from './events';
export type { ResourceType };

export type ModifierDuration = 'immediate' | 'ongoing' | number;

/**
 * Static modifier - Applies a fixed numeric value to a resource
 * 
 * Example:
 *   { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
 */
export interface StaticModifier {
  type: 'static';
  resource: ResourceType;
  value: number;
  duration?: ModifierDuration;
  name?: string;
}

/**
 * Dice value for choice modifiers
 */
export interface DiceValue {
  formula: string;
  negative?: boolean;
}

/**
 * Dice modifier - Requires player to roll dice for the value
 * 
 * Example:
 *   { type: 'dice', resource: 'gold', formula: '2d6', negative: true, duration: 'immediate' }
 */
export interface DiceModifier {
  type: 'dice';
  resource: ResourceType;
  formula: string;  // e.g., '2d6', '1d4+1'
  negative?: boolean;  // true for formulas like '-2d6'
  duration?: ModifierDuration;
  name?: string;
}

/**
 * Choice modifier - Player chooses from multiple resource options
 * 
 * Example:
 *   { 
 *     type: 'choice', 
 *     resources: ['lumber', 'ore', 'food'], 
 *     value: { formula: '2d4+1', negative: true },
 *     negative: true,
 *     duration: 'immediate' 
 *   }
 */
export interface ChoiceModifier {
  type: 'choice';
  resources: ResourceType[];
  value: number | DiceValue;  // Can be static or dice
  negative?: boolean;  // true for loss/penalty, false/undefined for gain
  duration?: ModifierDuration;
  name?: string;
}

/**
 * Union type for all modifier types
 * TypeScript will narrow this based on the 'type' discriminant
 */
export type EventModifier = StaticModifier | DiceModifier | ChoiceModifier;

/**
 * Type guards for modifier discrimination
 */
export function isStaticModifier(modifier: EventModifier): modifier is StaticModifier {
  return modifier.type === 'static';
}

export function isDiceModifier(modifier: EventModifier): modifier is DiceModifier {
  return modifier.type === 'dice';
}

export function isChoiceModifier(modifier: EventModifier): modifier is ChoiceModifier {
  return modifier.type === 'choice';
}

/**
 * Type guards for duration discrimination
 */
export function isTurnCountDuration(duration: ModifierDuration | undefined): duration is number {
  return typeof duration === 'number';
}

export function isImmediateDuration(duration: ModifierDuration | undefined): boolean {
  return duration === 'immediate' || duration === undefined;
}

export function isOngoingDuration(duration: ModifierDuration | undefined): boolean {
  return duration === 'ongoing';
}

/**
 * Game effect types (for actions like recruiting armies)
 */
export interface GameEffect {
  type: 'recruitArmy' | 'disbandArmy' | 'damageStructure' | string;
  description: string;
  [key: string]: any;  // Allow additional type-specific properties
}

/**
 * Outcome effects structure (for events/incidents/actions)
 */
export interface OutcomeEffects {
  msg?: string;                    // Description message
  modifiers: EventModifier[];      // Typed modifiers
  manualEffects?: string[];        // GM instructions (not automated)
  gameEffects?: GameEffect[];      // System-automated effects
  endsEvent?: boolean;             // Whether this outcome ends the event
}

/**
 * Complete outcome structure for all outcome types
 */
export interface EventEffects {
  criticalSuccess?: OutcomeEffects;
  success?: OutcomeEffects;
  failure?: OutcomeEffects;
  criticalFailure?: OutcomeEffects;
}

/**
 * Helper type for resolution data passed from OutcomeDisplay
 * (Already defined in events.ts but included here for reference)
 */
export interface ResolutionData {
  numericModifiers: Array<{ resource: ResourceType; value: number }>;
  manualEffects: string[];
  complexActions: any[];
}
