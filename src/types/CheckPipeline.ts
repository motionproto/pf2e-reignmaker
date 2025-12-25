/**
 * CheckPipeline.ts
 *
 * Type definitions for the unified check resolution pipeline.
 * Used by actions, events, and incidents.
 *
 * TO USE: Copy this file to src/types/CheckPipeline.ts
 *
 * NOTE: TypeScript errors about './modifiers' and './events' not found are EXPECTED
 * in this template directory. These imports will work once the file is copied to
 * src/types/ where those modules exist.
 */

// Import existing types from codebase (don't redefine)
import type { EventModifier, ResourceType } from './modifiers';
import type { KingdomSkill } from './events';
import type { KingdomData } from '../actors/KingdomActor';
import type { EventResponseChoices } from './EventResponseChoice';

// Re-export for convenience
export type { EventModifier, ResourceType, KingdomSkill };

// NEW types for pipeline system
export type CheckType = 'action' | 'event' | 'incident';

export type OutcomeType = 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';

/**
 * Doctrine type for skill-based approach tracking
 */
export type DoctrineType = 'virtuous' | 'practical' | 'ruthless';

/**
 * Skill option for a check
 */
export interface SkillOption {
  skill: KingdomSkill;
  description: string;
  doctrine?: DoctrineType;  // Optional doctrine category for approach tracking
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
  
  // Map selection specific (outcome-based adjustments)
  outcomeAdjustment?: {
    criticalSuccess?: {
      count?: number | ((ctx: any) => number);  // Can be static or dynamic
      title?: string;
    };
    success?: {
      count?: number | ((ctx: any) => number);
      title?: string;
    };
    failure?: {
      count?: number | ((ctx: any) => number);
      title?: string;
    };
    criticalFailure?: {
      count?: number | ((ctx: any) => number);
      title?: string;
    };
  };
  
  // NEW: Choice-specific fields
  affectsSkills?: boolean;  // If true, choice filters available skills
  options?: ChoiceOption[];  // Choice options (for type='choice')
  
  // NEW: Personality tracking
  personality?: string;  // Personality trait affected by this choice
  
  [key: string]: any;  // Type-specific properties
}

/**
 * Choice option for choice-based interactions
 */
export interface ChoiceOption {
  id: string;
  label: string;
  description: string;
  icon?: string;  // Emoji or icon class
  skills?: string[];  // Skills available for this choice (if affectsSkills=true)
  modifiers?: EventModifier[];  // Modifiers to apply
  gameCommands?: GameCommand[];  // Game commands to execute
  outcomeModifiers?: {  // Modifiers per outcome (overrides base)
    criticalSuccess?: { [resource: string]: number };
    success?: { [resource: string]: number };
    failure?: { [resource: string]: number };
    criticalFailure?: { [resource: string]: number };
  };
  onComplete?: (choice: any, ctx: any) => Promise<void>;  // Custom logic
  personality?: string;  // Personality trait for this choice
}

/**
 * Outcome definition
 * Uses EventModifier from existing modifiers.ts
 */
export interface Outcome {
  description: string;
  modifiers: EventModifier[];
  gameCommands?: GameCommand[];
  endsCheck?: boolean;
  endsEvent?: boolean;  // For events: whether this outcome ends the ongoing event
  manualEffects?: string[];
  outcomeBadges?: any[];  // UnifiedOutcomeBadge[] for preview badges shown before rolling
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
  calculate?: (context: any) => any | Promise<any>;  // Can be sync or async
  format?: (preview: any) => any[];
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

  // Requirements (actions only) - Availability check
  /**
   * Check if this action is available to perform
   * If not provided, action is always available (after resource cost check)
   * @param kingdom - Current kingdom state
   * @param context - Optional context (e.g., stored instance metadata)
   * @returns Requirement check result
   */
  requirements?: (kingdom: KingdomData, context?: any) => {
    met: boolean;
    reason?: string;
  };

  // Cost (actions only) - Upfront resource costs
  cost?: {
    gold?: number;
    lumber?: number;
    stone?: number;
    ore?: number;
    food?: number;
    [resource: string]: number | undefined;  // Allow any resource type
  };

  // Severity (incidents only) - Use string for explicit intent
  // Events use numeric tier (1, 2, 3) for different purposes
  severity?: 'minor' | 'moderate' | 'major';
  
  // Tier (events only) - Keep for non-incident checks
  tier?: number;

  // Skills
  skills: SkillOption[];

  // Interactions (three optional phases)
  /**
   * Pre-roll interactions - Execute BEFORE skill check
   * Use for: Entity selection, configuration that affects the roll
   * Examples: Select army to train, choose settlement for stipend
   */
  preRollInteractions?: Interaction[];
  
  /**
   * Post-roll interactions - Execute AFTER outcome, BEFORE Apply button
   * Displayed inline in outcome preview
   * Use for: Choices between benefits, optional modifications
   * Examples: Choose +2 Gold OR +1 Fame, select bonus type
   */
  postRollInteractions?: Interaction[];
  
  /**
   * Post-apply interactions - Execute AFTER Apply button clicked
   * Full-screen/modal experiences
   * Use for: Map selections, entity browsers, complex workflows
   * Examples: Select hexes on map, choose hex to fortify
   */
  postApplyInteractions?: Interaction[];

  // Outcomes
  outcomes: {
    criticalSuccess?: Outcome;
    success?: Outcome;
    failure?: Outcome;
    criticalFailure?: Outcome;
  };

  // Preview
  preview: PreviewConfig;

  // Execution (optional custom execution logic)
  /**
   * Execute function - Custom execution logic for the check
   * Called by UnifiedCheckHandler after Apply button is clicked
   * 
   * NOTE: As of execute-first architecture, JSON modifiers are applied BEFORE
   * this function is called. Use execute only for custom logic (hex selection,
   * entity creation, etc.), not for standard modifier application.
   * 
   * @param ctx - Check context with kingdom, metadata, resolutionData
   * @returns Execution result with success/error/message
   */
  execute?: (ctx: any) => Promise<{ success: boolean; error?: string; message?: string }>;
  
  /**
   * Skip default modifier application (opt-out)
   * 
   * Set to true if execute function handles ALL modifier application manually.
   * Default: false (modifiers applied before execute)
   * 
   * Use cases: Legacy actions that need complete control over modifier timing
   */
  skipDefaultModifiers?: boolean;

  // Game commands (actions only)
  gameCommands?: GameCommand[];

  // Traits (events/incidents only)
  traits?: Trait[];

  // Event-specific response choices (events only)
  // These are conceptually different from preRollInteractions (which are for actions)
  // Event response choices represent the player's strategic approach to handling the event
  responseChoices?: EventResponseChoices;
  
  // NEW: Strategic choice (events only)
  // Renamed from responseChoices to clarify purpose - this is the event's strategic approach selector
  // that appears BEFORE skills are shown and determines which skills are available
  strategicChoice?: EventResponseChoices;

  // Persistence (events/incidents only)
  endsCheck?: boolean;  // Default: true
}
