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
 * Represents a modifier from an action outcome (aligned with EventModifier)
 */
export interface ActionModifier {
  name: string;
  resource: string; // Resource type (gold, food, lumber, stone, ore, unrest, fame, etc.)
  value: number;
  duration: 'immediate' | 'ongoing' | 'permanent' | 'turns';
  turns?: number; // Required if duration === 'turns'
}

/**
 * Represents a choice option in an action outcome
 */
export interface ActionChoice {
  label: string;
  icon?: string;
  modifiers?: ActionModifier[];
}

/**
 * Represents the effect of an action outcome
 */
export interface ActionEffect {
  description: string;
  modifiers?: ActionModifier[]; // Resource changes (gold, food, unrest, etc.)
  gameCommands?: import('./game-commands').GameCommand[]; // Gameplay commands (claim hexes, build structures, etc.)
  choices?: ActionChoice[]; // Player choice options
}

/**
 * Raw JSON structure for action effects
 */
export interface ActionEffectJson {
  description: string;
  modifiers?: ActionModifier[];
  gameCommands?: import('./game-commands').GameCommand[];
  choices?: ActionChoice[];
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
  conditionalSkills?: import('../../types/player-actions').ConditionalSkillGroup[];
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
  conditionalSkills?: import('../../types/player-actions').ConditionalSkillGroup[];
  criticalSuccess: ActionEffect;
  success: ActionEffect;
  failure: ActionEffect;
  criticalFailure: ActionEffect;
  effects?: {  // Optional nested structure (for backward compatibility with JSON format)
    criticalSuccess?: ActionEffect;
    success?: ActionEffect;
    failure?: ActionEffect;
    criticalFailure?: ActionEffect;
  };
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
