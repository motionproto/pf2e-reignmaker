/**
 * Types for Balance Lab batch analysis data
 */

export interface TurnData {
  turn: number;
  unrest: number;
  gold: number;
  food: number;
  lumber: number;
  stone: number;
  ore: number;
  hexes: number;
  structures: number;
  worksites: number;
}

export interface ActionStats {
  name: string;
  attempts: number;
  successes: number;
  critSuccesses: number;
  failures: number;
  critFailures: number;
}

export interface HexData {
  id: string;
  row: number;
  col: number;
  terrain: string;
  claimedBy: string | null;
  hasRoad: boolean;
  features: string[];
}

export interface SettlementData {
  name: string;
  hexId: string;
  tier: string;
  level: number;
  structureCount: number;
  isCapital: boolean;
}

export interface WorksiteData {
  type: string;
  hexId: string;
  production: number;
}

export interface MapState {
  turn: number;
  hexes: HexData[];
  settlements: SettlementData[];
  worksites: WorksiteData[];
}

// Unrest Analysis Types
export interface UnrestBreakdownEntry {
  total: number;
  occurrences: number;
  avgPerOccurrence: number;
}

export interface UnrestAnalysis {
  avgUnrest: number;
  maxUnrest: number;
  minUnrest: number;
  volatility: number;
  timeInTier: {
    stable: number;
    discontent: number;
    turmoil: number;
    rebellion: number;
  };
  sourceBreakdown: Record<string, UnrestBreakdownEntry>;
  topSources: string[];
  sinkBreakdown: Record<string, UnrestBreakdownEntry>;
  effectiveSinks: string[];
  deathSpirals: number;
  prisonUtilization: number;
  imprisonmentRate: number;
}

export interface RunResult {
  strategy: string;
  runNumber: number;
  success: boolean;
  collapsed: boolean;
  turnsCompleted: number;
  finalUnrest: number;
  finalGold: number;
  finalFood: number;
  hexesClaimed: number;
  structures: number;
  worksites: number;
  settlements: number;
  simulationFolder?: string;
  analysisPath?: string;
  turnData?: TurnData[];
  actionStats?: ActionStats[];
  mapStates?: MapState[];
  unrestAnalysis?: UnrestAnalysis;
}

export interface StrategyStats {
  strategy: string;
  runs: number;
  survivalRate: number;
  avgTurnsCompleted: number;
  avgFinalUnrest: number;
  avgFinalGold: number;
  avgFinalFood: number;
  avgHexesClaimed: number;
  avgStructures: number;
  avgWorksites: number;
  avgSettlements: number;
  stdUnrest: number;
  stdStructures: number;
  avgSuccessRate?: number;
  avgFoodSustainability?: number;
  results: RunResult[];
}

export interface BatchConfig {
  runs: number;
  turns: number;
  strategies: string[];
  outputDir: string;
}

export interface BatchReport {
  batchId: string;
  generatedAt: string;
  config: BatchConfig;
  strategies: Record<string, StrategyStats>;
  rankings: {
    bySurvival: string[];
    byStructures: string[];
    byExpansion: string[];
    byStability: string[];
  };
  insights: string[];
}

// Strategy colors for consistent visualization
export const STRATEGY_COLORS: Record<string, string> = {
  'food-first': '#22c55e',        // Green
  'aggressive-expansion': '#ef4444', // Red
  'structure-focus': '#3b82f6',    // Blue
  'balanced': '#a855f7',           // Purple
  'random': '#6b7280',             // Gray
};

export const STRATEGY_LABELS: Record<string, string> = {
  'food-first': 'Food First',
  'aggressive-expansion': 'Aggressive',
  'structure-focus': 'Structure Focus',
  'balanced': 'Balanced',
  'random': 'Random (Baseline)',
};

// Complete list of all kingdom actions
export const ALL_KINGDOM_ACTIONS = [
  'Aid Another',
  'Arrest Dissidents',
  'Build Roads',
  'Build Structure',
  'Claim Hexes',
  'Create Worksite',
  'Deal with Unrest',
  'Deploy Army',
  'Diplomatic Mission',
  'Disband Army',
  'Establish Settlement',
  'Execute or Pardon Prisoners',
  'Fortify Hex',
  'Harvest Resources',
  'Infiltration',
  'Outfit Army',
  'Purchase Resources',
  'Recruit Army',
  'Repair Structure',
  'Request Economic Aid',
  'Request Military Aid',
  'Sell Surplus',
  'Send Scouts',
  'Tend Wounded',
  'Train Army',
  'Upgrade Settlement',
] as const;

// Helper to calculate median of an array
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}
