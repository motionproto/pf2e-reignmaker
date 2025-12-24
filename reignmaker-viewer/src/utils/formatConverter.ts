/**
 * Format Converter for ReignMaker Viewer
 * Handles conversion between optimized (v2) and legacy (v1) formats
 */

import type { TurnReport, Hex, ResourceSnapshot } from '../types/simulation';

export interface OptimizedTurnReport {
  version: 2;
  turnNumber: number;
  level: number;
  dc: number;
  skillBonus: number;
  phases: any[];
  startState: any;
  hexChanges: {
    claimed?: string[];
    unclaimed?: string[];
    roads?: string[];
  };
  endState: any;
  outcomes: any;
  playerActions: any[];
  eventResult?: any;
  incidentResult?: any;
  resourceDeltas: Array<{
    source: string;
    changes: {
      gold?: number;
      food?: number;
      lumber?: number;
      stone?: number;
      ore?: number;
      unrest?: number;
      fame?: number;
    };
  }>;
}

/**
 * Detect format version from turn report data
 */
export function detectFormatVersion(data: any): 1 | 2 {
  if ('version' in data && data.version === 2) {
    return 2;
  }
  return 1; // Legacy format
}

/**
 * Reconstruct full resource snapshots from deltas
 */
function reconstructResourceSnapshots(
  optimized: OptimizedTurnReport
): ResourceSnapshot[] {
  const snapshots: ResourceSnapshot[] = [];
  let currentSnapshot: ResourceSnapshot = {
    source: '',
    gold: optimized.startState.resources.gold,
    food: optimized.startState.resources.food,
    lumber: optimized.startState.resources.lumber,
    stone: optimized.startState.resources.stone,
    ore: optimized.startState.resources.ore,
    unrest: optimized.startState.unrest,
    fame: optimized.startState.fame
  };

  for (const delta of optimized.resourceDeltas) {
    const newSnapshot: ResourceSnapshot = {
      source: delta.source,
      gold: delta.changes.gold ?? currentSnapshot.gold,
      food: delta.changes.food ?? currentSnapshot.food,
      lumber: delta.changes.lumber ?? currentSnapshot.lumber,
      stone: delta.changes.stone ?? currentSnapshot.stone,
      ore: delta.changes.ore ?? currentSnapshot.ore,
      unrest: delta.changes.unrest ?? currentSnapshot.unrest,
      fame: delta.changes.fame ?? currentSnapshot.fame
    };
    snapshots.push(newSnapshot);
    currentSnapshot = newSnapshot;
  }

  return snapshots;
}

/**
 * Reconstruct full turn report from optimized format
 */
export function reconstructFullTurnReport(
  optimized: OptimizedTurnReport,
  fullHexMap: Hex[]
): TurnReport {
  // Reconstruct resource snapshots
  const resourceSnapshots = reconstructResourceSnapshots(optimized);

  // Clone the hex map and apply changes
  const hexes = fullHexMap.map(h => ({ ...h }));

  // Apply hex changes
  if (optimized.hexChanges.claimed) {
    for (const hexId of optimized.hexChanges.claimed) {
      const hex = hexes.find(h => h.id === hexId);
      if (hex) hex.claimedBy = 'player';
    }
  }

  if (optimized.hexChanges.unclaimed) {
    for (const hexId of optimized.hexChanges.unclaimed) {
      const hex = hexes.find(h => h.id === hexId);
      if (hex) hex.claimedBy = null;
    }
  }

  if (optimized.hexChanges.roads) {
    for (const hexId of optimized.hexChanges.roads) {
      const hex = hexes.find(h => h.id === hexId);
      if (hex) hex.hasRoad = true;
    }
  }

  return {
    turnNumber: optimized.turnNumber,
    level: optimized.level,
    dc: optimized.dc,
    skillBonus: optimized.skillBonus,
    phases: optimized.phases,
    startState: optimized.startState,
    endState: {
      ...optimized.endState,
      hexes,
      settlementsList: optimized.endState.settlementsList,
      worksitesList: optimized.endState.worksitesList
    },
    outcomes: optimized.outcomes,
    playerActions: optimized.playerActions,
    eventResult: optimized.eventResult,
    incidentResult: optimized.incidentResult,
    resourceSnapshots
  };
}

/**
 * Load turn report and auto-convert if optimized format
 */
export function loadTurnReport(
  data: any,
  fullHexMap: Hex[]
): TurnReport {
  const version = detectFormatVersion(data);

  if (version === 2) {
    return reconstructFullTurnReport(data as OptimizedTurnReport, fullHexMap);
  }

  // Legacy format - return as is
  return data as TurnReport;
}
