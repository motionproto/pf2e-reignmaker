/**
 * Simulation Data Types
 * Matches the JSON structure from reignmaker-sim outputs
 */

export interface Hex {
  id: string;
  row: number;
  col: number;
  terrain: string;
  claimedBy: string | null;
  hasRoad: boolean;
  features: string[];
}

export interface Structure {
  id: string;
  name: string;
  type: string;
  tier: number;
  damaged: boolean;
}

export interface Settlement {
  name: string;
  tier: string;
  level: number;
  structures?: Structure[];      // Legacy format (full objects)
  structureIds?: string[];       // Current format (just IDs)
  hexId: string;
  isCapital: boolean;
  isConnected: boolean;
}

export interface Resources {
  gold: number;
  food: number;
  lumber: number;
  stone: number;
  ore: number;
  foodCapacity: number;
}

export interface Worksite {
  type: string;
  production: number;
  hexId: string;
}

export interface BuildQueueItem {
  id: string;
  structureId: string;
  structureName: string;
  settlementName: string;
  totalCost: {
    lumber: number;
    stone: number;
    ore: number;
  };
  paidAmounts: Record<string, number>;
  progress: number;
  isCompleted: boolean;
}

export interface KingdomState {
  turn: number;
  hexesClaimed: number;
  hexes: Hex[];
  settlements: Settlement[];
  resources: Resources;
  unrest: number;
  unrestImprisoned: number;
  prisonCapacity: number;
  unrestTier: number;
  unrestTierName: string;
  fame: number;
  armies: any[];
  worksites: Worksite[];
  structures: any[];
  buildQueue: BuildQueueItem[];
  factionAttitudes: Record<string, number>;
  eventDC: number;
  demandedHexes: any[];
  isAtWar: boolean;
}

export interface PhaseResult {
  phase: string;
  description: string;
  changes: string[];
}

export interface TurnState {
  hexesClaimed: number;
  resources: Resources;
  unrest: number;
  fame: number;
  worksites: number;
  settlements: number;
  armies: number;
  buildQueue: number;
  prisonCapacity: number;
  unrestImprisoned: number;
  // Full state data for map visualization
  hexes?: Hex[];
  settlementsList?: Settlement[];
  worksitesList?: Worksite[];
}

export interface OutcomeTracker {
  critSuccess: number;
  success: number;
  failure: number;
  critFailure: number;
}

export interface PlayerAction {
  playerName: string;
  actionName: string;
  skill: string;
  roll: number;
  outcome: string;
  effects: string[];
}

export interface EventResult {
  eventName: string;
  approach: string;
  skill: string;
  roll: number;
  dc: number;
  outcome: string;
  effects: string[];
}

export interface IncidentResult {
  incidentName: string;
  skill: string;
  roll: number;
  dc: number;
  outcome: string;
  effects: string[];
}

export interface ResourceSnapshot {
  source: string;
  gold: number;
  food: number;
  lumber: number;
  stone: number;
  ore: number;
  unrest: number;
  fame: number;
}

export interface TurnReport {
  turnNumber: number;
  level: number;
  dc: number;
  skillBonus: number;
  phases: PhaseResult[];
  startState: TurnState;
  endState: TurnState;
  outcomes: OutcomeTracker;
  playerActions: PlayerAction[];
  eventResult?: EventResult;
  incidentResult?: IncidentResult;
  resourceSnapshots: ResourceSnapshot[];
}

export interface SimulationConfig {
  turns: number;
  model: string;
  mode?: string;
  features: string[];
  collapsed: boolean;
  collapseReason: string;
}

// Balance configuration for tracking simulation parameters
export interface BalanceConfig {
  foodProduction: {
    plains: number;
    hills: number;
    swamp: number;
    water: number;
  };
  unrest: {
    hexesPerUnrest: number;
    hexUnrestEnabled: boolean;
    metropolisComplexityUnrest: number;
  };
  fame: {
    basePerTurn: number;
    unrestConversion: number;
    goldConversion: number;
    critSuccessBonus: number;
  };
  resourceDecay: {
    lumberDecays: boolean;
    stoneDecays: boolean;
    oreDecays: boolean;
  };
  commerce: {
    sellRates: { resourceCost: number; goldGain: number }[];
    buyRates: { goldCost: number; resourceGain: number }[];
  };
}

export interface SimulationSummary {
  totalTurns: number;
  finalState: KingdomState;
  collapsed: boolean;
  collapseReason: string;
}

export interface SimulationData {
  config: SimulationConfig;
  balanceConfig?: BalanceConfig;
  summary: SimulationSummary;
  turnFiles: string[];
}

export interface SimulationInfo {
  id: string;
  path: string;
  config: SimulationConfig;
  totalTurns: number;
  collapsed: boolean;
}

// ============================================================================
// BALANCE ANALYSIS TYPES
// ============================================================================

export interface UnrestSource {
  source: string;
  amount: number;
  turn: number;
}

export interface UnrestSink {
  method: string;
  amount: number;
  turn: number;
}

export interface UnrestTurnData {
  turn: number;
  startUnrest: number;
  endUnrest: number;
  delta: number;
  tier: number;
  tierName: string;
  sources: UnrestSource[];
  sinks: UnrestSink[];
  prisonCapacity: number;
  imprisoned: number;
  incidentOccurred: boolean;
  incidentSeverity?: string;
  incidentOutcome?: string;
}

export interface UnrestAnalysis {
  perTurn: UnrestTurnData[];
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
  sourceBreakdown: Record<string, { total: number; occurrences: number; avgPerOccurrence: number }>;
  topSources: string[];
  sinkBreakdown: Record<string, { total: number; occurrences: number; avgPerOccurrence: number }>;
  effectiveSinks: string[];
  incidentsByTier: Record<string, { count: number; resolved: number; failed: number }>;
  incidentRate: number;
  spikes: { turn: number; delta: number; cause: string; recovered: boolean; turnsToRecover?: number }[];
  avgRecoveryTime: number;
  deathSpirals: number;
  prisonUtilization: number;
  imprisonmentRate: number;
  balanceIndicators: {
    tooEasy: boolean;
    tooPunishing: boolean;
    prisonUseless: boolean;
    wellBalanced: boolean;
  };
}

export interface ResourceFlowTotals {
  totalIncome: { gold: number; food: number; lumber: number; stone: number; ore: number };
  totalExpenses: { gold: number; food: number; lumber: number; stone: number; ore: number };
  avgNetFlow: { gold: number; food: number; lumber: number; stone: number; ore: number };
  avgSustainability: number;
}

export interface ResourceFlowPerTurn {
  turn: number;
  income: {
    gold: number;
    food: number;
    lumber: number;
    stone: number;
    ore: number;
    sources: {
      settlements: number;
      worksites: { food: number; lumber: number; stone: number; ore: number };
      events: number;
      actions: number;
    };
  };
  expenses: {
    gold: number;
    food: number;
    lumber: number;
    stone: number;
    ore: number;
    categories: {
      feeding: number;
      armies: number;
      construction: number;
      decay: number;
      events: number;
    };
  };
  netFlow: {
    gold: number;
    food: number;
    lumber: number;
    stone: number;
    ore: number;
  };
  sustainabilityRatio: number;
}

export interface ResourceFlowAnalysis {
  perTurn: ResourceFlowPerTurn[];
  totals: ResourceFlowTotals;
  bottlenecks: string[];
  surpluses: string[];
}

export interface ActionStats {
  actionName: string;
  attempts: number;
  outcomes: { criticalSuccess: number; success: number; failure: number; criticalFailure: number };
  successRate: number;
  critRate: number;
  failureRate: number;
  avgRoll: number;
}

export interface ActionEffectivenessAnalysis {
  byAction: ActionStats[];
  overall: {
    totalActions: number;
    successRate: number;
    critRate: number;
    failureRate: number;
  };
  mostEffective: string[];
  leastEffective: string[];
  mostUsed: string[];
  underutilized: string[];
}

export interface ProgressionPerTurn {
  turn: number;
  hexesClaimed: number;
  settlements: number;
  settlementsByTier: { village: number; town: number; city: number; metropolis: number };
  structures: number;
  worksites: number;
  armies: number;
  buildQueueDepth: number;
}

export interface ProgressionAnalysis {
  perTurn: ProgressionPerTurn[];
  expansionRate: number;
  structureBuildRate: number;
  worksiteRate: number;
  settlementUpgrades: number;
  milestones: { turn: number; event: string }[];
}

export interface BalanceAssessment {
  overallHealth: 'healthy' | 'concerning' | 'problematic';
  issues: string[];
  recommendations: string[];
}

export interface AnalysisReport {
  simulationId: string;
  turnsAnalyzed: number;
  generatedAt: string;
  resourceFlow: ResourceFlowAnalysis;
  actionEffectiveness: ActionEffectivenessAnalysis;
  unrest: UnrestAnalysis;
  progression: ProgressionAnalysis;
  balanceAssessment: BalanceAssessment;
}
