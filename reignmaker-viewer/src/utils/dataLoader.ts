/**
 * Data loading utilities for simulation results
 * Loads simulation data from the reignmaker-sim results directory
 */

import type { SimulationData, SimulationInfo, TurnReport, Hex, AnalysisReport } from '../types/simulation';
import { loadTurnReport as convertTurnReport, detectFormatVersion } from './formatConverter';

// Base path to simulation results (relative to React app)
// const RESULTS_BASE_PATH = '../../reignmaker-sim/results';

/**
 * Get list of available simulations
 */
export async function getAvailableSimulations(): Promise<SimulationInfo[]> {
  try {
    // In development, we'll fetch from the file system via Vite
    // This will need to be adjusted based on how we serve the data

    // For now, return mock data - we'll implement proper loading
    // when we set up the data serving mechanism
    const response = await fetch('/api/simulations');
    const simulations: SimulationInfo[] = await response.json();
    return simulations;
  } catch (error) {
    console.error('Failed to load simulations:', error);
    return [];
  }
}

/**
 * Load a specific simulation's summary data
 */
export async function loadSimulation(simulationId: string): Promise<SimulationData | null> {
  try {
    const response = await fetch(`/api/simulations/${simulationId}/summary.json`);
    if (!response.ok) {
      throw new Error(`Failed to load simulation ${simulationId}`);
    }
    const data: SimulationData = await response.json();
    return data;
  } catch (error) {
    console.error(`Failed to load simulation ${simulationId}:`, error);
    return null;
  }
}

/**
 * Load a specific turn's data
 * @param fullHexMap - Optional full hex map for optimized format conversion
 */
export async function loadTurn(
  simulationId: string,
  turnNumber: number,
  fullHexMap?: Hex[]
): Promise<TurnReport | null> {
  try {
    const turnFile = `turn-${String(turnNumber).padStart(2, '0')}.json`;
    const response = await fetch(`/api/simulations/${simulationId}/turns/${turnFile}`);
    if (!response.ok) {
      throw new Error(`Failed to load turn ${turnNumber}`);
    }
    const data = await response.json();

    // Check format version and convert if needed
    const version = detectFormatVersion(data);
    if (version === 2 && fullHexMap) {
      console.log(`Turn ${turnNumber}: Converting from optimized format (v2)`);
      return convertTurnReport(data, fullHexMap);
    }

    return data as TurnReport;
  } catch (error) {
    console.error(`Failed to load turn ${turnNumber}:`, error);
    return null;
  }
}

/**
 * Load all turns for a simulation
 * @param fullHexMap - Optional full hex map for optimized format conversion
 */
export async function loadAllTurns(
  simulationId: string,
  totalTurns: number,
  fullHexMap?: Hex[]
): Promise<TurnReport[]> {
  const turns: TurnReport[] = [];

  // Load turns in parallel
  const turnPromises = Array.from({ length: totalTurns }, (_, i) =>
    loadTurn(simulationId, i + 1, fullHexMap)
  );

  const results = await Promise.all(turnPromises);

  // Filter out null results
  for (const turn of results) {
    if (turn) {
      turns.push(turn);
    }
  }

  console.log(`Loaded ${turns.length}/${totalTurns} turns for simulation ${simulationId}`);
  return turns;
}

/**
 * Run a new simulation
 */
export async function runSimulation(params: { turns: number }): Promise<{ runId: string; status: string } | null> {
  try {
    console.log('Sending simulation request with params:', params);
    const response = await fetch('/api/run-simulation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });

    console.log('Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('API error response:', errorData);
      throw new Error(errorData.error || `Failed to start simulation (${response.status})`);
    }

    const data = await response.json();
    console.log('Simulation started successfully:', data);
    return data;
  } catch (error) {
    console.error('Failed to run simulation:', error);
    return null;
  }
}

/**
 * Check simulation status
 */
export async function checkSimulationStatus(runId: string): Promise<{
  status: string;
  logs: string[];
  exitCode?: number;
  runtime: number;
} | null> {
  try {
    const response = await fetch(`/api/simulation-status/${runId}`);
    if (!response.ok) {
      throw new Error('Failed to check simulation status');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to check simulation status:', error);
    return null;
  }
}

/**
 * Load balance analysis report for a simulation
 */
export async function loadAnalysisReport(simulationId: string): Promise<AnalysisReport | null> {
  try {
    const response = await fetch(`/api/simulations/${simulationId}/balance-analysis.json`);
    if (!response.ok) {
      console.log(`No analysis report found for ${simulationId}`);
      return null;
    }
    const data: AnalysisReport = await response.json();
    return data;
  } catch (error) {
    console.error(`Failed to load analysis report for ${simulationId}:`, error);
    return null;
  }
}
