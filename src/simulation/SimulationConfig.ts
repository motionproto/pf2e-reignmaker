/**
 * Simulation Configuration Types
 * 
 * Configuration and data structures for running headless kingdom simulations.
 */

import type { KingdomData } from '../actors/KingdomActor';

/**
 * Strategy type for simulated players
 */
export type StrategyType = 'balanced' | 'economic' | 'military' | 'expansion';

/**
 * Output format for simulation reports
 */
export type OutputFormat = 'console' | 'json' | 'html';

/**
 * Configuration for a simulation run
 */
export interface SimulationConfig {
  /** Number of turns to simulate per run */
  turns: number;
  
  /** Number of simulation runs to perform */
  runs: number;
  
  /** Party level (affects DCs) */
  partyLevel: number;
  
  /** Average skill bonus for simulated characters */
  skillBonus: number;
  
  /** Strategy for simulated players */
  strategy: StrategyType;
  
  /** Chance of event occurring per turn (0-100) */
  eventChance: number;
  
  /** Number of simulated players */
  playerCount: number;
  
  /** Actions per player per turn */
  actionsPerPlayer: number;
  
  /** Random seed for reproducibility (optional) */
  seed?: number;
  
  /** Output format */
  outputFormat: OutputFormat;
  
  /** Verbose logging */
  verbose: boolean;
}

/**
 * Default simulation configuration
 * 
 * Level progression: Party level advances from 1 to 16 over the course of 120 turns
 * Skill bonus is now calculated dynamically based on level (see SKILL_BONUS_BY_LEVEL)
 */
export const DEFAULT_CONFIG: SimulationConfig = {
  turns: 120,
  runs: 10,
  partyLevel: 1,  // Starting level (progresses to 16 over turns)
  skillBonus: 7,  // Starting bonus at level 1 (calculated dynamically)
  strategy: 'balanced',
  eventChance: 50,  // Note: eventChance is now ignored - uses actual DC-based rules
  playerCount: 4,
  actionsPerPlayer: 1,  // Per rules: 1 action per player per turn
  outputFormat: 'console',
  verbose: false
};

/**
 * Result of a single action/event/incident
 */
export interface CheckResult {
  checkId: string;
  checkName: string;
  checkType: 'action' | 'event' | 'incident';
  outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
  roll: number;
  total: number;
  dc: number;
  resourceChanges: Record<string, number>;
  /** Details about what was built/created/claimed */
  details?: string;
}

/**
 * Phase details for turn breakdown
 */
export interface PhaseDetails {
  status?: {
    baseUnrest: number;
    fameReset: boolean;
  };
  resources?: {
    worksiteProduction: Record<string, number>;
    settlementGold: number;
  };
  unrest?: {
    incidentTriggered: boolean;
    incidentName?: string;
  };
  events?: {
    eventTriggered: boolean;
    eventName?: string;
    eventDC: number;
  };
  actions?: {
    actionsTaken: string[];
  };
  upkeep?: {
    foodConsumed: number;
    fameConverted: number;
    unrestReduced: number;
  };
}

/**
 * Result of a single simulated turn
 */
export interface TurnResult {
  turn: number;
  
  // Actions performed this turn
  actions: CheckResult[];
  
  // Events that occurred
  events: CheckResult[];
  
  // Incidents that occurred
  incidents: CheckResult[];
  
  // Resource changes from all sources this turn
  totalResourceChanges: Record<string, number>;
  
  // Phase-by-phase breakdown
  phaseDetails: PhaseDetails;
  
  // Snapshot of kingdom state at end of turn
  kingdomSnapshot: {
    resources: Record<string, number>;
    unrest: number;
    fame: number;
    hexCount: number;
    settlementCount: number;
    armyCount: number;
  };
}

/**
 * Result of a complete simulation run
 */
export interface SimulationRunResult {
  runNumber: number;
  turns: TurnResult[];
  finalState: KingdomData;
  
  // Outcome tracking
  outcomeDistribution: Record<string, number>;
  
  // Critical metrics
  peakUnrest: number;
  collapseOccurred: boolean; // Unrest reached 10+
  bankruptcyTurns: number; // Turns with 0 gold
}

/**
 * Aggregate statistics across all simulation runs
 */
export interface SimulationStatistics {
  config: SimulationConfig;
  runCount: number;
  
  // Resource averages
  averageEndGold: number;
  averageEndFood: number;
  averageEndUnrest: number;
  averageEndFame: number;
  
  // Outcome distributions
  totalOutcomes: Record<string, number>;
  outcomePercentages: Record<string, number>;
  
  // Critical metrics
  collapseRate: number; // % of runs that hit unrest >= 10
  averagePeakUnrest: number;
  averageBankruptcyTurns: number;
  
  // Territory growth
  averageHexGrowth: number;
  averageSettlementGrowth: number;
  
  // Unrest analysis
  unrestRecoveryRate: number; // Average unrest removed per turn when trying
  unrestGenerationRate: number; // Average unrest gained per turn
  tippingPointAnalysis: {
    atUnrest5: number; // % of runs that stabilized at unrest 5
    atUnrest7: number; // % of runs that stabilized at unrest 7
    neverRecovered: number; // % of runs that spiraled to collapse
  };
}

/**
 * Complete simulation results
 */
export interface SimulationResults {
  runs: SimulationRunResult[];
  statistics: SimulationStatistics;
  timestamp: string;
}

