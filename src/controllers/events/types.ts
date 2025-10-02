/**
 * Standardized Event/Incident Types
 * 
 * Unified structure for kingdom events and incidents with consistent
 * modifier format and level-based DC resolution.
 */

export interface KingdomEvent {
  id: string;
  name: string;
  description: string;
  tier: number;
  traits: string[];
  location?: string;
  skills: EventSkill[];
  effects: EventEffects;
  ifUnresolved?: OngoingEffect;
}

export interface EventSkill {
  skill: string;
  description: string;
}

export interface EventEffects {
  criticalSuccess?: EventOutcome;
  success?: EventOutcome;
  failure?: EventOutcome;
  criticalFailure?: EventOutcome;
}

export interface EventOutcome {
  msg: string;
  endsEvent: boolean;
  modifiers: EventModifier[];
}

export interface EventModifier {
  name: string;
  resource: ResourceType;
  value: number;
  duration: ModifierDuration;
  turns?: number;  // Required if duration === 'turns'
}

export type ResourceType = 
  | 'gold' 
  | 'food' 
  | 'ore' 
  | 'stone' 
  | 'lumber' 
  | 'luxuries' 
  | 'unrest' 
  | 'fame';

export type ModifierDuration = 
  | 'immediate'   // Applied once, right now
  | 'ongoing'     // Applied each turn until resolved
  | 'permanent'   // Applied once, never removed (stat change)
  | 'turns';      // Applied for N turns, then expires

export interface OngoingEffect {
  name: string;
  description: string;
  tier: number;
  icon: string;
  modifiers: EventModifier[];
  resolvedWhen?: ResolutionCondition;
}

export interface ResolutionCondition {
  type: 'skill' | 'condition';
  skillResolution?: SkillResolution;
  conditionResolution?: ConditionResolution;
}

export interface SkillResolution {
  dcAdjustment: number;  // Modifier to level-based DC
  onSuccess?: ResolutionOutcome;
  onFailure?: ResolutionOutcome;
}

export interface ConditionResolution {
  condition: string;  // e.g., "build:temple,hospital"
  description: string;
  onConditionMet: ResolutionOutcome;
}

export interface ResolutionOutcome {
  msg: string;
  removeAllModifiers?: boolean;
}

// Incident-specific types (same structure as events)
export interface KingdomIncident extends KingdomEvent {
  severity?: 'minor' | 'moderate' | 'major';
}
