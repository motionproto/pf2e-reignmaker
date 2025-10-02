/**
 * Action Types for Kingdom Actions
 * 
 * Standardized structure for player actions with consistent
 * skill options, effects, and outcome handling.
 */

/**
 * Represents a skill option for an action
 */
export interface SkillOption {
  skill: string;
  description: string;
}

/**
 * Represents the effect of an action outcome
 */
export interface ActionEffect {
  description: string;
  modifiers?: any; // Can be Map or object
}

/**
 * Raw JSON structure for action effects
 */
export interface ActionEffectJson {
  description: string;
  modifiers?: any;
}

/**
 * Raw JSON structure for player actions (for JSON parsing)
 */
export interface PlayerActionJson {
  id: string;
  name: string;
  category: string;
  brief?: string;
  description: string;
  skills: SkillOption[];
  effects: {
    criticalSuccess?: ActionEffectJson;
    success?: ActionEffectJson;
    failure?: ActionEffectJson;
    criticalFailure?: ActionEffectJson;
  };
  proficiencyScaling?: Record<string, number>;
  special?: string;
  costs?: Record<string, number>;
  failureCausesUnrest?: boolean;
  requirements?: string[];
}

/**
 * Represents a player action that can be taken during the kingdom turn
 */
export interface PlayerAction {
  id: string;
  name: string;
  category: string;
  brief?: string; // Brief one-line description
  description: string; // Full description
  skills: SkillOption[];
  criticalSuccess: ActionEffect;
  success: ActionEffect;
  failure: ActionEffect;
  criticalFailure: ActionEffect;
  proficiencyScaling?: Map<string, number> | null;
  special?: string | null;
  cost?: Map<string, number> | null; // For actions that have resource costs
  failureCausesUnrest?: boolean;
  requirements?: string[];
}

/**
 * Action category types
 */
export type ActionCategory = 
  | "uphold-stability"
  | "military-operations"
  | "expand-borders"
  | "urban-planning"
  | "foreign-affairs"
  | "economic-actions";
