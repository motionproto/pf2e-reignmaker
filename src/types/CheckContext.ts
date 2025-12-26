/**
 * CheckContext.ts
 *
 * Single data object passed through all pipeline phases.
 *
 * TO USE: Copy this file to src/types/CheckContext.ts
 */

import type { OutcomeType } from './CheckPipeline';

/**
 * Actor context - character who performed the check
 */
export interface ActorContext {
  // Basic info
  actorId: string;
  actorName: string;
  level: number;

  // Skill info
  selectedSkill: string;
  selectedDoctrine?: 'idealist' | 'practical' | 'ruthless';  // Doctrine of selected skill option
  proficiencyRank: number;  // 0 = untrained, 1 = trained, 2 = expert, 3 = master, 4 = legendary
  
  // Full skill data (for future use)
  skillData?: {
    rank: number;
    modifier?: number;
    breakdown?: string;
    [key: string]: any;
  };
  
  // Full actor object (for future use - careful with serialization)
  fullActor?: any;
}

/**
 * Resolution data from post-roll interactions
 */
export interface ResolutionData {
  // Dice rolls (key = storeAs from interaction)
  diceRolls: Record<string, number>;

  // Choice selections (key = storeAs from interaction)
  choices: Record<string, string>;

  // Allocation amounts (key = storeAs from interaction)
  allocations: Record<string, number>;

  // Text inputs (key = storeAs from interaction)
  textInputs: Record<string, string>;

  // Compound form data (key = component id)
  compoundData: Record<string, any>;

  // Numeric modifiers (final resolved values)
  numericModifiers: Array<{
    resource: string;
    value: number;
  }>;

  // Manual effects (displayed but not auto-applied)
  manualEffects: string[];

  // Custom component data (action-specific)
  customComponentData?: any;
}

/**
 * Metadata from pre-roll interactions
 */
export interface CheckMetadata {
  // Entity selections (settlementId, factionId, armyId, structureId)
  [key: string]: any;

  // Map selections (selectedHexes, path, location)
  selectedHexes?: string[];
  path?: string[];
  location?: { x: number; y: number };

  // Configuration choices
  resourceType?: string;
  quantity?: number;

  // Text inputs
  customName?: string;

  // Acting character info
  actorId?: string;
  actorName?: string;
}

/**
 * Complete context for check execution
 */
export interface CheckContext {
  // Check definition
  check: any;  // PlayerAction | KingdomEvent | KingdomIncident

  // Outcome
  outcome: OutcomeType;

  // Kingdom state
  kingdom: any;  // KingdomData
  
  // Actor context (character who performed the check)
  actor?: ActorContext;

  // Resolution data (from post-roll interactions)
  resolutionData: ResolutionData;

  // Metadata (from pre-roll interactions)
  metadata: CheckMetadata;

  // Check instance ID (for state updates)
  instanceId?: string;
}

/**
 * Create empty resolution data
 */
export function createEmptyResolutionData(): ResolutionData {
  return {
    diceRolls: {},
    choices: {},
    allocations: {},
    textInputs: {},
    compoundData: {},
    numericModifiers: [],
    manualEffects: [],
    customComponentData: null
  };
}

/**
 * Create empty metadata
 */
export function createEmptyMetadata(): CheckMetadata {
  return {};
}
