/**
 * CheckPipeline.ts
 * 
 * Type definitions for the unified check resolution pipeline.
 * Used by actions, events, and incidents.
 * 
 * TO USE: Copy this file to src/types/CheckPipeline.ts
 */

export type CheckType = 'action' | 'event' | 'incident';

export type OutcomeType = 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';

export type ResourceType = 
  | 'gold' | 'food' | 'lumber' | 'stone' | 'ore' | 'luxuries'
  | 'unrest' | 'fame' | 'control';

/**
 * Skill option for a check
 */
export interface SkillOption {
  skill: string;
  description: string;
}

/**
 * Interaction types
 */
export type InteractionType =
  | 'entity-selection'
  | 'map-selection'
  | 'configuration'
  | 'text-input'
  | 'dice'
  | 'choice'
  | 'allocation'
  | 'compound'
  | 'confirmation';

export interface Interaction {
  type: InteractionType;
  id?: string;
  label?: string;
  required?: boolean;
  condition?: (ctx: any) => boolean;
  [key: string]: any;  // Type-specific properties
}

/**
 * Typed modifier (from existing system)
 */
export interface EventModifier {
  type: 'static' | 'dice' | 'choice';
  resource: string | string[];
  value?: number;
  formula?: string;
  operation?: 'add' | 'subtract';
  duration?: 'immediate' | 'ongoing';
  negative?: boolean;
}

/**
 * Outcome definition
 */
export interface Outcome {
  description: string;
  modifiers: EventModifier[];
  gameCommands?: GameCommand[];
  endsCheck?: boolean;
  manualEffects?: string[];
}

/**
 * Game command (actions only)
 */
export interface GameCommand {
  type: string;
  [key: string]: any;  // Command-specific parameters
}

/**
 * Trait (events/incidents only)
 */
export type Trait = 'ongoing' | 'dangerous' | 'beneficial';

/**
 * Preview configuration
 */
export interface PreviewConfig {
  calculate?: (context: any) => any;
  format?: (preview: any) => any[];
  providedByInteraction?: boolean;  // True for map-selection actions
}

/**
 * Complete pipeline configuration for a check
 */
export interface CheckPipeline {
  // Identity
  id: string;
  name: string;
  description: string;
  checkType: CheckType;
  
  // Category (actions only)
  category?: string;
  
  // Tier/Severity (events/incidents only)
  tier?: number;
  severity?: 'minor' | 'moderate' | 'major';
  
  // Skills
  skills: SkillOption[];
  
  // Interactions
  preRollInteractions?: Interaction[];
  postRollInteractions?: Interaction[];
  
  // Outcomes
  outcomes: {
    criticalSuccess?: Outcome;
    success?: Outcome;
    failure?: Outcome;
    criticalFailure?: Outcome;
  };
  
  // Preview
  preview: PreviewConfig;
  
  // Game commands (actions only)
  gameCommands?: GameCommand[];
  
  // Traits (events/incidents only)
  traits?: Trait[];
  
  // Persistence (events/incidents only)
  endsCheck?: boolean;  // Default: true
}
