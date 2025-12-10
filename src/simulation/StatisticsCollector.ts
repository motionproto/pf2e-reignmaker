/**
 * Statistics Collector
 * 
 * Collects and analyzes statistics from simulation runs.
 * Special focus on unrest death spiral detection.
 */

import type {
  SimulationConfig,
  SimulationRunResult,
  SimulationStatistics,
  TurnResult
} from './SimulationConfig';

/**
 * Analyze unrest patterns to detect death spirals
 */
export interface UnrestAnalysis {
  /** Average unrest at each turn number across all runs */
  unrestByTurn: number[];
  
  /** Turns where unrest increased vs decreased */
  unrestIncreases: number;
  unrestDecreases: number;
  unrestStable: number;
  
  /** Recovery attempts: turns where unrest-reduction actions were taken */
  recoveryAttempts: number;
  successfulRecoveries: number;
  
  /** Point of no return analysis */
  turnsToCollapse: number[]; // For runs that collapsed, how many turns from first unrest
  tippingPoints: {
    unrestLevel: number;
    collapseRate: number; // % of runs that collapsed after reaching this level
  }[];
}

/**
 * Collect and compute statistics from simulation results
 */
export class StatisticsCollector {
  /**
   * Compute aggregate statistics from multiple simulation runs
   */
  computeStatistics(
    runs: SimulationRunResult[],
    config: SimulationConfig
  ): SimulationStatistics {
    if (runs.length === 0) {
      throw new Error('No simulation runs to analyze');
    }
    
    // Aggregate outcome distribution
    const totalOutcomes: Record<string, number> = {
      criticalSuccess: 0,
      success: 0,
      failure: 0,
      criticalFailure: 0
    };
    
    let totalGold = 0;
    let totalFood = 0;
    let totalUnrest = 0;
    let totalFame = 0;
    let totalPeakUnrest = 0;
    let totalBankruptcyTurns = 0;
    let collapseCount = 0;
    let totalHexGrowth = 0;
    let totalSettlementGrowth = 0;
    let totalFinalHexes = 0;
    let totalFinalSettlements = 0;
    const actionCounts: Record<string, number> = {};
    let totalActions = 0;
    
    for (const run of runs) {
      // Sum outcomes
      for (const [outcome, count] of Object.entries(run.outcomeDistribution)) {
        totalOutcomes[outcome] = (totalOutcomes[outcome] || 0) + count;
      }
      
      // End state metrics
      totalGold += run.finalState.resources?.gold || 0;
      totalFood += run.finalState.resources?.food || 0;
      totalUnrest += run.finalState.unrest || 0;
      totalFame += run.finalState.fame || 0;
      
      // Critical metrics
      totalPeakUnrest += run.peakUnrest;
      totalBankruptcyTurns += run.bankruptcyTurns;
      if (run.collapseOccurred) collapseCount++;
      
      // Final state metrics (absolute values)
      const endHexes = run.finalState.hexes?.filter(h => h.claimedBy === 'player').length || 0;
      totalFinalHexes += endHexes;
      totalFinalSettlements += run.finalState.settlements?.length || 0;
      
      // Growth metrics - based on Reignmaker rules starting conditions
      // First settlement claims hex + all 6 adjacent = 7 hexes
      const startHexes = 7;
      totalHexGrowth += endHexes - startHexes;
      
      const startSettlements = 1; // Sponsored first settlement
      totalSettlementGrowth += (run.finalState.settlements?.length || 0) - startSettlements;
      
      // Action counts
      for (const turn of run.turns) {
        for (const action of turn.actions) {
          actionCounts[action.checkId] = (actionCounts[action.checkId] || 0) + 1;
          totalActions++;
        }
      }
    }
    
    // Calculate total checks for percentages
    const totalChecks = Object.values(totalOutcomes).reduce((a, b) => a + b, 0);
    
    // Calculate outcome percentages
    const outcomePercentages: Record<string, number> = {};
    for (const [outcome, count] of Object.entries(totalOutcomes)) {
      outcomePercentages[outcome] = totalChecks > 0 
        ? Math.round((count / totalChecks) * 1000) / 10 
        : 0;
    }
    
    // Unrest analysis
    const unrestAnalysis = this.analyzeUnrest(runs);
    
    // Calculate outcome distribution as decimals for formatPercent()
    const outcomeDistribution: Record<string, number> = {};
    for (const [outcome, percentage] of Object.entries(outcomePercentages)) {
      outcomeDistribution[outcome] = percentage / 100; // Convert to decimal
    }
    
    // Average resource values
    const avgGold = Math.round(totalGold / runs.length * 10) / 10;
    const avgUnrest = Math.round(totalUnrest / runs.length * 10) / 10;
    const avgHexes = Math.round(totalFinalHexes / runs.length * 10) / 10;
    const avgSettlements = Math.round(totalFinalSettlements / runs.length * 10) / 10;
    
    return {
      config,
      runCount: runs.length,
      
      // Averages
      averageEndGold: avgGold,
      averageEndFood: Math.round(totalFood / runs.length * 10) / 10,
      averageEndUnrest: avgUnrest,
      averageEndFame: Math.round(totalFame / runs.length * 10) / 10,
      
      // Territory averages
      avgFinalHexes: avgHexes,
      avgSettlements,
      
      // Outcomes
      totalOutcomes,
      outcomePercentages,
      outcomeDistribution,
      
      // Actions
      actionCounts,
      totalActions,
      
      // Critical metrics - collapseRate as decimal (0-1) for formatPercent()
      collapseRate: collapseCount / runs.length,
      averagePeakUnrest: Math.round(totalPeakUnrest / runs.length * 10) / 10,
      averageBankruptcyTurns: Math.round(totalBankruptcyTurns / runs.length * 10) / 10,
      
      // Growth
      averageHexGrowth: Math.round(totalHexGrowth / runs.length * 10) / 10,
      averageSettlementGrowth: Math.round(totalSettlementGrowth / runs.length * 10) / 10,
      
      // Unrest analysis
      unrestRecoveryRate: unrestAnalysis.successfulRecoveries / Math.max(1, unrestAnalysis.recoveryAttempts),
      unrestGenerationRate: unrestAnalysis.unrestIncreases / Math.max(1, unrestAnalysis.unrestIncreases + unrestAnalysis.unrestDecreases + unrestAnalysis.unrestStable),
      tippingPointAnalysis: {
        atUnrest5: this.calculateStabilizationRate(runs, 5),
        atUnrest7: this.calculateStabilizationRate(runs, 7),
        neverRecovered: Math.round((collapseCount / runs.length) * 100)
      },
      
      // Aliases for UI compatibility
      avgFinalGold: avgGold,
      avgFinalUnrest: avgUnrest
    };
  }
  
  /**
   * Detailed unrest analysis
   */
  analyzeUnrest(runs: SimulationRunResult[]): UnrestAnalysis {
    const unrestByTurn: number[] = [];
    let unrestIncreases = 0;
    let unrestDecreases = 0;
    let unrestStable = 0;
    let recoveryAttempts = 0;
    let successfulRecoveries = 0;
    const turnsToCollapse: number[] = [];
    
    for (const run of runs) {
      let previousUnrest = 0;
      let firstUnrestTurn = -1;
      
      for (let i = 0; i < run.turns.length; i++) {
        const turn = run.turns[i];
        const currentUnrest = turn.kingdomSnapshot.unrest;
        
        // Track unrest by turn
        if (!unrestByTurn[i]) unrestByTurn[i] = 0;
        unrestByTurn[i] += currentUnrest;
        
        // Track changes
        if (currentUnrest > previousUnrest) {
          unrestIncreases++;
          if (firstUnrestTurn === -1 && currentUnrest >= 1) {
            firstUnrestTurn = i;
          }
        } else if (currentUnrest < previousUnrest) {
          unrestDecreases++;
        } else {
          unrestStable++;
        }
        
        // Track recovery attempts (deal-with-unrest actions)
        const recoveryActions = turn.actions.filter(a => 
          a.checkId === 'deal-with-unrest' || a.checkId === 'arrest-dissidents'
        );
        recoveryAttempts += recoveryActions.length;
        successfulRecoveries += recoveryActions.filter(a => 
          a.outcome === 'success' || a.outcome === 'criticalSuccess'
        ).length;
        
        previousUnrest = currentUnrest;
      }
      
      // Track turns to collapse
      if (run.collapseOccurred && firstUnrestTurn >= 0) {
        const collapseTurn = run.turns.findIndex(t => t.kingdomSnapshot.unrest >= 10);
        if (collapseTurn >= 0) {
          turnsToCollapse.push(collapseTurn - firstUnrestTurn);
        }
      }
    }
    
    // Average unrest by turn
    for (let i = 0; i < unrestByTurn.length; i++) {
      unrestByTurn[i] = Math.round(unrestByTurn[i] / runs.length * 10) / 10;
    }
    
    // Calculate tipping points
    const tippingPoints = this.calculateTippingPoints(runs);
    
    return {
      unrestByTurn,
      unrestIncreases,
      unrestDecreases,
      unrestStable,
      recoveryAttempts,
      successfulRecoveries,
      turnsToCollapse,
      tippingPoints
    };
  }
  
  /**
   * Calculate collapse rate at each unrest level
   */
  private calculateTippingPoints(runs: SimulationRunResult[]): UnrestAnalysis['tippingPoints'] {
    const tippingPoints: UnrestAnalysis['tippingPoints'] = [];
    
    for (let unrestLevel = 1; unrestLevel <= 9; unrestLevel++) {
      let runsReachingLevel = 0;
      let runsCollapsedAfter = 0;
      
      for (const run of runs) {
        const reachedLevel = run.turns.some(t => t.kingdomSnapshot.unrest >= unrestLevel);
        if (reachedLevel) {
          runsReachingLevel++;
          if (run.collapseOccurred) {
            runsCollapsedAfter++;
          }
        }
      }
      
      if (runsReachingLevel > 0) {
        tippingPoints.push({
          unrestLevel,
          collapseRate: Math.round((runsCollapsedAfter / runsReachingLevel) * 100)
        });
      }
    }
    
    return tippingPoints;
  }
  
  /**
   * Calculate what % of runs stabilized at a given unrest level
   * (reached that level but eventually reduced it without collapsing)
   */
  private calculateStabilizationRate(runs: SimulationRunResult[], unrestLevel: number): number {
    let runsReachingLevel = 0;
    let runsStabilized = 0;
    
    for (const run of runs) {
      const reachedLevel = run.turns.some(t => t.kingdomSnapshot.unrest >= unrestLevel);
      if (reachedLevel) {
        runsReachingLevel++;
        
        // Stabilized = reached level but didn't collapse AND ended with lower unrest
        if (!run.collapseOccurred && 
            (run.finalState.unrest || 0) < unrestLevel) {
          runsStabilized++;
        }
      }
    }
    
    if (runsReachingLevel === 0) return 100; // Never reached this level
    return Math.round((runsStabilized / runsReachingLevel) * 100);
  }
  
  /**
   * Analyze action frequency across all runs
   */
  analyzeActionDistribution(runs: SimulationRunResult[]): {
    byAction: Record<string, { count: number; successRate: number; critRate: number }>;
    byCategory: Record<string, number>;
    byTurn: Array<Record<string, number>>;
    totalActions: number;
  } {
    const byAction: Record<string, { count: number; successes: number; crits: number }> = {};
    const byCategory: Record<string, number> = {};
    const byTurn: Array<Record<string, number>> = [];
    let totalActions = 0;

    // Category mapping
    const categoryMap: Record<string, string> = {
      'collect-stipend': 'Economic',
      'sell-surplus': 'Economic',
      'purchase-resources': 'Economic',
      'request-economic-aid': 'Economic',
      'claim-hexes': 'Territory',
      'send-scouts': 'Territory',
      'establish-settlement': 'Urban Planning',
      'build-structure': 'Urban Planning',
      'upgrade-settlement': 'Urban Planning',
      'repair-structure': 'Urban Planning',
      'build-roads': 'Infrastructure',
      'create-worksite': 'Infrastructure',
      'fortify-hex': 'Infrastructure',
      'harvest-resources': 'Infrastructure',
      'deal-with-unrest': 'Stability',
      'arrest-dissidents': 'Stability',
      'execute-or-pardon-prisoners': 'Stability',
      'recruit-unit': 'Military',
      'train-army': 'Military',
      'deploy-army': 'Military',
      'outfit-army': 'Military',
      'disband-army': 'Military',
      'tend-wounded': 'Military',
      'request-military-aid': 'Military',
      'diplomatic-mission': 'Diplomatic',
      'aid-another': 'Diplomatic',
      'infiltration': 'Diplomatic'
    };

    for (const run of runs) {
      for (let t = 0; t < run.turns.length; t++) {
        const turn = run.turns[t];
        
        // Initialize turn tracking if needed
        if (!byTurn[t]) byTurn[t] = {};
        
        for (const action of turn.actions) {
          totalActions++;
          
          // Track by action ID
          if (!byAction[action.checkId]) {
            byAction[action.checkId] = { count: 0, successes: 0, crits: 0 };
          }
          byAction[action.checkId].count++;
          
          if (action.outcome === 'success' || action.outcome === 'criticalSuccess') {
            byAction[action.checkId].successes++;
          }
          if (action.outcome === 'criticalSuccess') {
            byAction[action.checkId].crits++;
          }
          
          // Track by category
          const category = categoryMap[action.checkId] || 'Other';
          byCategory[category] = (byCategory[category] || 0) + 1;
          
          // Track by turn
          byTurn[t][action.checkId] = (byTurn[t][action.checkId] || 0) + 1;
        }
      }
    }

    // Convert to percentages
    const result: Record<string, { count: number; successRate: number; critRate: number }> = {};
    for (const [actionId, data] of Object.entries(byAction)) {
      result[actionId] = {
        count: data.count,
        successRate: Math.round((data.successes / data.count) * 100),
        critRate: Math.round((data.crits / data.count) * 100)
      };
    }

    return { byAction: result, byCategory, byTurn, totalActions };
  }

  /**
   * Get turn-by-turn resource progression for charting
   */
  getResourceProgression(
    runs: SimulationRunResult[],
    resource: string
  ): { turn: number; min: number; max: number; avg: number }[] {
    const progression: { turn: number; min: number; max: number; avg: number }[] = [];
    
    if (runs.length === 0 || runs[0].turns.length === 0) return progression;
    
    const turnCount = runs[0].turns.length;
    
    for (let t = 0; t < turnCount; t++) {
      const values: number[] = [];
      
      for (const run of runs) {
        if (run.turns[t]) {
          let value: number;
          if (resource === 'unrest') {
            value = run.turns[t].kingdomSnapshot.unrest;
          } else if (resource === 'fame') {
            value = run.turns[t].kingdomSnapshot.fame;
          } else if (resource === 'hexes') {
            value = run.turns[t].kingdomSnapshot.hexCount;
          } else {
            value = run.turns[t].kingdomSnapshot.resources[resource] || 0;
          }
          values.push(value);
        }
      }
      
      if (values.length > 0) {
        progression.push({
          turn: t + 1,
          min: Math.min(...values),
          max: Math.max(...values),
          avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) / 10
        });
      }
    }
    
    return progression;
  }
}

/**
 * Singleton instance
 */
export const statisticsCollector = new StatisticsCollector();

