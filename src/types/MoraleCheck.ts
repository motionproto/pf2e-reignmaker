/**
 * Morale Check Type Definitions
 * 
 * Types for the army morale check system used in:
 * - Mass Desertion Threat incident
 * - Upkeep phase for unsupported armies
 * - Future garrison/keep face mechanics
 */

import type { Army } from '../models/Army';

/**
 * Outcome degree for morale checks
 */
export type MoraleOutcome = 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';

/**
 * Skills available for morale checks
 */
export type MoraleSkill = 'diplomacy' | 'intimidation';

/**
 * Result of a single army's morale check
 */
export interface MoraleCheckResult {
  armyId: string;
  armyName: string;
  outcome: MoraleOutcome;
  disbanded: boolean;
  unrestGained: number;
  actorName: string;
  skillName: string;
  rollBreakdown?: any;
}

/**
 * Army data with morale check status for the panel
 */
export interface ArmyMoraleStatus {
  army: Army;
  hexId: string | null;
  tokenImage: string | null;
  status: 'pending' | 'checking' | 'completed';
  result?: MoraleCheckResult;
}

/**
 * Panel state machine states
 */
export type MoralePanelState = 'selection' | 'waiting-for-roll' | 'showing-result' | 'completed';

/**
 * Configuration for morale check execution
 */
export interface MoraleCheckConfig {
  /** Army IDs to check morale for */
  armyIds: string[];
  /** Optional DC override (defaults to party level based DC) */
  dc?: number;
  /** Reason for the morale check (for display/logging) */
  reason?: 'incident' | 'upkeep' | 'garrison' | 'other';
}

/**
 * Morale check outcome effects based on Reignmaker Rules:
 * - Critical Success: Army rallies (reset turnsUnsupported, no unrest)
 * - Success: Army stays (+1 Unrest)
 * - Failure: Army disbands (+1 Unrest)
 * - Critical Failure: Army disbands (+2 Unrest)
 */
export const MORALE_OUTCOMES = {
  criticalSuccess: {
    disband: false,
    unrest: 0,
    resetUnsupported: true,
    description: 'Army rallies! Morale restored.'
  },
  success: {
    disband: false,
    unrest: 1,
    resetUnsupported: false,
    description: 'Army remains, but morale is shaken.'
  },
  failure: {
    disband: true,
    unrest: 1,
    resetUnsupported: false,
    description: 'Army deserts! Troops scatter.'
  },
  criticalFailure: {
    disband: true,
    unrest: 2,
    resetUnsupported: false,
    description: 'Army mutinies! Complete desertion.'
  }
} as const;

