/**
 * Report Generator
 * 
 * Generates reports from simulation results in various formats:
 * - Console (ASCII tables and charts)
 * - JSON (raw data)
 * - HTML (styled report with Nivo charts)
 */

import type { SimulationResults, SimulationStatistics, SimulationRunResult } from './SimulationConfig';
import { StatisticsCollector } from './StatisticsCollector';
import {
  generateLineChart,
  generateOutcomeChart,
  type LineChartData
} from './NivoChartGenerator';

/**
 * Report generator for simulation results
 */
export class ReportGenerator {
  private statsCollector = new StatisticsCollector();
  
  /**
   * Print formatted console report
   */
  printConsoleReport(results: SimulationResults): void {
    const stats = results.statistics;
    
    this.printHeader('SIMULATION RESULTS SUMMARY');
    
    // Configuration
    this.printSection('Configuration');
    console.log(`  Turns per run: ${stats.config.turns}`);
    console.log(`  Number of runs: ${stats.runCount}`);
    console.log(`  Party level: ${stats.config.partyLevel}`);
    console.log(`  Strategy: ${stats.config.strategy}`);
    console.log('');
    
    // Outcome Distribution
    this.printSection('Outcome Distribution');
    const totalChecks = Object.values(stats.totalOutcomes).reduce((a, b) => a + b, 0);
    console.log(`  Total checks: ${totalChecks}`);
    console.log(`  Critical Success: ${stats.totalOutcomes.criticalSuccess} (${stats.outcomePercentages.criticalSuccess}%)`);
    console.log(`  Success:          ${stats.totalOutcomes.success} (${stats.outcomePercentages.success}%)`);
    console.log(`  Failure:          ${stats.totalOutcomes.failure} (${stats.outcomePercentages.failure}%)`);
    console.log(`  Critical Failure: ${stats.totalOutcomes.criticalFailure} (${stats.outcomePercentages.criticalFailure}%)`);
    console.log('');
    
    // Resource Averages
    this.printSection('Average End-of-Game Resources');
    console.log(`  Gold:   ${stats.averageEndGold}`);
    console.log(`  Food:   ${stats.averageEndFood}`);
    console.log(`  Unrest: ${stats.averageEndUnrest}`);
    console.log(`  Fame:   ${stats.averageEndFame}`);
    console.log('');
    
    // Territory Growth
    this.printSection('Territory Growth');
    console.log(`  Average hex growth: +${stats.averageHexGrowth}`);
    console.log(`  Average settlement growth: +${stats.averageSettlementGrowth}`);
    console.log('');
    
    // Critical Metrics
    this.printSection('Critical Metrics');
    const collapseStatus = stats.collapseRate > 20 ? '⚠️  HIGH' : stats.collapseRate > 5 ? '⚡ MODERATE' : '✓ LOW';
    console.log(`  Collapse rate: ${stats.collapseRate}% ${collapseStatus}`);
    console.log(`  Average peak unrest: ${stats.averagePeakUnrest}`);
    console.log(`  Average bankruptcy turns: ${stats.averageBankruptcyTurns}`);
    console.log('');
    
    // Action Distribution
    this.printSection('ACTION DISTRIBUTION');
    const actionAnalysis = this.statsCollector.analyzeActionDistribution(results.runs);
    
    console.log('  By Category:');
    const sortedCategories = Object.entries(actionAnalysis.byCategory)
      .sort((a, b) => b[1] - a[1]);
    for (const [category, count] of sortedCategories) {
      const pct = ((count / actionAnalysis.totalActions) * 100).toFixed(1);
      console.log(`    ${category}: ${count} (${pct}%)`);
    }
    console.log('');
    
    console.log('  Top 10 Actions:');
    const sortedActions = Object.entries(actionAnalysis.byAction)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);
    for (const [actionId, data] of sortedActions) {
      const pct = ((data.count / actionAnalysis.totalActions) * 100).toFixed(1);
      console.log(`    ${actionId}: ${data.count} (${pct}%) | Success: ${data.successRate}% | Crit: ${data.critRate}%`);
    }
    console.log('');
    
    // Unrest Death Spiral Analysis
    this.printSection('UNREST DEATH SPIRAL ANALYSIS');
    
    const unrestAnalysis = this.statsCollector.analyzeUnrest(results.runs);
    
    console.log('  Recovery Effectiveness:');
    const recoveryRate = (unrestAnalysis.successfulRecoveries / Math.max(1, unrestAnalysis.recoveryAttempts) * 100).toFixed(1);
    console.log(`    Recovery attempts: ${unrestAnalysis.recoveryAttempts}`);
    console.log(`    Successful recoveries: ${unrestAnalysis.successfulRecoveries} (${recoveryRate}%)`);
    console.log('');
    
    console.log('  Unrest Trends:');
    const totalChanges = unrestAnalysis.unrestIncreases + unrestAnalysis.unrestDecreases + unrestAnalysis.unrestStable;
    console.log(`    Increases: ${unrestAnalysis.unrestIncreases} (${(unrestAnalysis.unrestIncreases/totalChanges*100).toFixed(1)}%)`);
    console.log(`    Decreases: ${unrestAnalysis.unrestDecreases} (${(unrestAnalysis.unrestDecreases/totalChanges*100).toFixed(1)}%)`);
    console.log(`    Stable:    ${unrestAnalysis.unrestStable} (${(unrestAnalysis.unrestStable/totalChanges*100).toFixed(1)}%)`);
    console.log('');
    
    console.log('  Stabilization Rates (once reaching threshold):');
    console.log(`    At unrest 5: ${stats.tippingPointAnalysis.atUnrest5}% stabilized`);
    console.log(`    At unrest 7: ${stats.tippingPointAnalysis.atUnrest7}% stabilized`);
    console.log(`    Never recovered: ${stats.tippingPointAnalysis.neverRecovered}%`);
    console.log('');
    
    if (unrestAnalysis.tippingPoints.length > 0) {
      console.log('  Tipping Points (collapse rate after reaching level):');
      for (const tp of unrestAnalysis.tippingPoints) {
        const bar = this.makeBar(tp.collapseRate, 100, 20);
        console.log(`    Unrest ${tp.unrestLevel}: ${bar} ${tp.collapseRate}%`);
      }
      console.log('');
    }
    
    // Unrest Progression Chart
    this.printSection('Unrest Progression (Turn-by-Turn Average)');
    const unrestProgression = this.statsCollector.getResourceProgression(results.runs, 'unrest');
    this.printAsciiChart(unrestProgression.map(p => p.avg), 'Unrest', 15);
    console.log('');
    
    // Gold Progression Chart
    this.printSection('Gold Progression (Turn-by-Turn Average)');
    const goldProgression = this.statsCollector.getResourceProgression(results.runs, 'gold');
    this.printAsciiChart(goldProgression.map(p => p.avg), 'Gold', 15);
    console.log('');
    
    // Warnings and Recommendations
    this.printSection('BALANCE ANALYSIS');
    this.printBalanceWarnings(stats, unrestAnalysis);
  }
  
  /**
   * Generate HTML report
   */
  generateHtmlReport(results: SimulationResults): string {
    const stats = results.statistics;
    const unrestAnalysis = this.statsCollector.analyzeUnrest(results.runs);
    
    const unrestProgression = this.statsCollector.getResourceProgression(results.runs, 'unrest');
    const goldProgression = this.statsCollector.getResourceProgression(results.runs, 'gold');
    const foodProgression = this.statsCollector.getResourceProgression(results.runs, 'food');
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kingdom Simulation Report</title>
  <style>
    :root {
      /* Surfaces & Backgrounds */
      --empty: hsl(229, 34%, 3%);
      --surface-lowest: hsl(240, 30%, 8%);
      --surface-low: hsl(240, 25%, 11%);
      --surface: hsl(240, 20%, 14%);
      --surface-high: hsl(229, 20%, 16%);
      --surface-higher: hsl(229, 20%, 18%);
      
      /* Text Colors */
      --text-primary: hsl(0, 0%, 98%);
      --text-secondary: hsl(216, 12%, 78%);
      --text-muted: hsl(240, 5%, 56%);
      
      /* Brand/Primary (Crimson) */
      --color-crimson: hsl(0, 58%, 50%);
      --color-crimson-light: hsl(0, 78%, 57%);
      
      /* Accent (Amber/Gold) */
      --color-amber: hsl(38, 91%, 50%);
      --color-amber-light: hsl(44, 97%, 56%);
      --color-gold: hsl(41, 100%, 40%);
      
      /* Status Colors */
      --status-critical-success: hsl(217, 100%, 65%);
      --status-success: hsl(122, 39%, 49%);
      --status-failure: hsl(36, 100%, 50%);
      --status-critical-failure: hsl(4, 66%, 58%);
      
      /* Resource Icon Colors */
      --icon-gold: hsl(44, 97%, 56%);
      --icon-food: hsl(29, 48%, 64%);
      --icon-lumber: hsl(142, 71%, 45%);
      --icon-stone: hsl(240, 5%, 56%);
      --icon-ore: hsl(217, 100%, 80%);
      
      /* Unrest Colors */
      --icon-unrest-none: hsl(240, 5%, 56%);
      --icon-unrest-minor: hsl(36, 100%, 50%);
      --icon-unrest-moderate: hsl(0, 58%, 50%);
      --icon-unrest-major: hsl(4, 66%, 58%);
      
      /* Borders */
      --border-default: hsl(240, 5%, 32%);
      --border-subtle: hsl(240, 5%, 22%);
      
      /* Semantic shortcuts */
      --bg: var(--empty);
      --primary: var(--color-crimson);
      --secondary: var(--surface-low);
      --text: var(--text-primary);
      --text-dim: var(--text-muted);
      --success: var(--status-success);
      --warning: var(--color-amber);
      --danger: var(--status-critical-failure);
    }
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 2rem;
    }
    
    h1, h2, h3 { color: var(--color-crimson-light); margin-bottom: 1rem; }
    h1 { font-size: 2rem; border-bottom: 2px solid var(--color-crimson); padding-bottom: 0.5rem; }
    h2 { font-size: 1.5rem; margin-top: 2rem; }
    h3 { font-size: 1.2rem; color: var(--text-primary); }
    
    .container { max-width: 1200px; margin: 0 auto; }
    
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin: 1.5rem 0; }
    
    .card {
      background: var(--surface);
      border-radius: 8px;
      padding: 1.5rem;
      border: 1px solid var(--border-subtle);
    }
    
    .stat { margin-bottom: 0.75rem; }
    .stat-label { color: var(--text-muted); font-size: 0.875rem; }
    .stat-value { font-size: 1.5rem; font-weight: bold; }
    .stat-value.success { color: var(--status-success); }
    .stat-value.warning { color: var(--color-amber); }
    .stat-value.danger { color: var(--status-critical-failure); }
    
    .progress-bar {
      height: 8px;
      background: var(--surface-low);
      border-radius: 4px;
      overflow: hidden;
      margin-top: 0.25rem;
    }
    .progress-fill {
      height: 100%;
      background: var(--color-crimson);
      transition: width 0.3s;
    }
    .progress-fill.success { background: var(--status-success); }
    .progress-fill.warning { background: var(--color-amber); }
    .progress-fill.danger { background: var(--status-critical-failure); }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
    }
    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid var(--border-subtle);
    }
    th { color: var(--text-muted); font-weight: 500; }
    
    .chart {
      background: var(--surface-low);
      border-radius: 4px;
      padding: 1rem;
      height: 200px;
      display: flex;
      align-items: flex-end;
      gap: 2px;
    }
    .chart-bar {
      flex: 1;
      background: var(--color-crimson);
      min-width: 4px;
      border-radius: 2px 2px 0 0;
      transition: height 0.3s;
    }
    
    .nivo-chart {
      background: var(--secondary);
      border-radius: 8px;
      padding: 1rem;
      min-height: 300px;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    
    .nivo-chart svg {
      max-width: 100%;
    }
    
    .warning-box {
      background: rgba(251, 191, 36, 0.1);
      border: 1px solid var(--warning);
      border-radius: 8px;
      padding: 1rem;
      margin: 1rem 0;
    }
    .warning-box.danger {
      background: rgba(239, 68, 68, 0.1);
      border-color: var(--danger);
    }
    .warning-box h4 { color: var(--warning); margin-bottom: 0.5rem; }
    .warning-box.danger h4 { color: var(--danger); }
    
    .timestamp { color: var(--text-dim); font-size: 0.875rem; margin-top: 2rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Kingdom Simulation Report</h1>
    
    <h2>Configuration</h2>
    <div class="grid">
      <div class="card">
        <div class="stat">
          <div class="stat-label">Simulation Runs</div>
          <div class="stat-value">${stats.runCount}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Turns per Run</div>
          <div class="stat-value">${stats.config.turns}</div>
        </div>
      </div>
      <div class="card">
        <div class="stat">
          <div class="stat-label">Party Level</div>
          <div class="stat-value">${stats.config.partyLevel}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Strategy</div>
          <div class="stat-value">${stats.config.strategy}</div>
        </div>
      </div>
    </div>
    
    <h2>Outcome Distribution</h2>
    <div class="card">
      <table>
        <tr>
          <th>Outcome</th>
          <th>Count</th>
          <th>Percentage</th>
          <th></th>
        </tr>
        <tr>
          <td>Critical Success</td>
          <td>${stats.totalOutcomes.criticalSuccess}</td>
          <td>${stats.outcomePercentages.criticalSuccess}%</td>
          <td><div class="progress-bar"><div class="progress-fill success" style="width: ${stats.outcomePercentages.criticalSuccess}%"></div></div></td>
        </tr>
        <tr>
          <td>Success</td>
          <td>${stats.totalOutcomes.success}</td>
          <td>${stats.outcomePercentages.success}%</td>
          <td><div class="progress-bar"><div class="progress-fill success" style="width: ${stats.outcomePercentages.success}%"></div></div></td>
        </tr>
        <tr>
          <td>Failure</td>
          <td>${stats.totalOutcomes.failure}</td>
          <td>${stats.outcomePercentages.failure}%</td>
          <td><div class="progress-bar"><div class="progress-fill warning" style="width: ${stats.outcomePercentages.failure}%"></div></div></td>
        </tr>
        <tr>
          <td>Critical Failure</td>
          <td>${stats.totalOutcomes.criticalFailure}</td>
          <td>${stats.outcomePercentages.criticalFailure}%</td>
          <td><div class="progress-bar"><div class="progress-fill danger" style="width: ${stats.outcomePercentages.criticalFailure}%"></div></div></td>
        </tr>
      </table>
    </div>
    
    <h2>End-Game Averages</h2>
    <div class="grid">
      <div class="card">
        <div class="stat">
          <div class="stat-label">Gold</div>
          <div class="stat-value">${stats.averageEndGold}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Food</div>
          <div class="stat-value">${stats.averageEndFood}</div>
        </div>
      </div>
      <div class="card">
        <div class="stat">
          <div class="stat-label">Unrest</div>
          <div class="stat-value ${stats.averageEndUnrest >= 5 ? 'danger' : stats.averageEndUnrest >= 3 ? 'warning' : 'success'}">${stats.averageEndUnrest}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Fame</div>
          <div class="stat-value">${stats.averageEndFame}</div>
        </div>
      </div>
      <div class="card">
        <div class="stat">
          <div class="stat-label">Hex Growth</div>
          <div class="stat-value">+${stats.averageHexGrowth}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Settlement Growth</div>
          <div class="stat-value">+${stats.averageSettlementGrowth}</div>
        </div>
      </div>
    </div>
    
    <h2>Action Distribution</h2>
    ${this.generateActionAnalysisHtml(results.runs)}
    
    <h2>Unrest Death Spiral Analysis</h2>
    <div class="grid">
      <div class="card">
        <h3>Critical Metrics</h3>
        <div class="stat">
          <div class="stat-label">Collapse Rate (Unrest ≥ 10)</div>
          <div class="stat-value ${stats.collapseRate > 20 ? 'danger' : stats.collapseRate > 5 ? 'warning' : 'success'}">${stats.collapseRate}%</div>
        </div>
        <div class="stat">
          <div class="stat-label">Average Peak Unrest</div>
          <div class="stat-value">${stats.averagePeakUnrest}</div>
        </div>
      </div>
      <div class="card">
        <h3>Stabilization Rates</h3>
        <div class="stat">
          <div class="stat-label">At Unrest 5</div>
          <div class="stat-value">${stats.tippingPointAnalysis.atUnrest5}%</div>
        </div>
        <div class="stat">
          <div class="stat-label">At Unrest 7</div>
          <div class="stat-value">${stats.tippingPointAnalysis.atUnrest7}%</div>
        </div>
        <div class="stat">
          <div class="stat-label">Never Recovered</div>
          <div class="stat-value ${stats.tippingPointAnalysis.neverRecovered > 20 ? 'danger' : ''}">${stats.tippingPointAnalysis.neverRecovered}%</div>
        </div>
      </div>
    </div>
    
    <h2>Resource Progression</h2>
    
    <div class="card" style="margin-bottom: 1.5rem;">
      <h3>💰 Gold & 🌾 Food Over Time</h3>
      <div class="nivo-chart">
        ${this.generateResourceChart(results.runs, ['gold', 'food'])}
      </div>
    </div>
    
    <div class="card" style="margin-bottom: 1.5rem;">
      <h3>😤 Unrest & 🗺️ Territory Over Time</h3>
      <div class="nivo-chart">
        ${this.generateResourceChart(results.runs, ['unrest', 'hexes'])}
      </div>
    </div>
    
    <h2>Material Resources</h2>
    <div class="card" style="margin-bottom: 1.5rem;">
      <h3>🪵 Lumber, 🪨 Stone & ⛏️ Ore Over Time</h3>
      <div class="nivo-chart">
        ${this.generateResourceChart(results.runs, ['lumber', 'stone', 'ore'])}
      </div>
    </div>
    
    <h2>Kingdom Growth Summary</h2>
    <div class="card">
      <p style="color: var(--text-dim); margin-bottom: 1rem; font-size: 0.875rem;">
        Starting conditions per Reignmaker rules: Sponsored settlement + 6 adjacent hexes claimed, 4 gold seed capital, resources collected from adjacent terrain
      </p>
      <table>
        <tr>
          <th>Metric</th>
          <th>Start</th>
          <th>End (Avg)</th>
          <th>Growth</th>
        </tr>
        <tr>
          <td>🗺️ Territory (Hexes)</td>
          <td>7</td>
          <td>${stats.averageHexGrowth + 7}</td>
          <td style="color: ${stats.averageHexGrowth > 0 ? 'var(--success)' : 'var(--text-dim)'};">+${stats.averageHexGrowth}</td>
        </tr>
        <tr>
          <td>🏘️ Settlements</td>
          <td>1</td>
          <td>${stats.averageSettlementGrowth + 1}</td>
          <td style="color: ${stats.averageSettlementGrowth > 0 ? 'var(--success)' : 'var(--text-dim)'};">+${stats.averageSettlementGrowth}</td>
        </tr>
        <tr>
          <td>💰 Gold</td>
          <td>4</td>
          <td>${stats.averageEndGold}</td>
          <td style="color: var(--success);">+${(stats.averageEndGold - 4).toFixed(1)}</td>
        </tr>
        <tr>
          <td>🌾 Food</td>
          <td>2</td>
          <td>${stats.averageEndFood}</td>
          <td style="color: ${stats.averageEndFood >= 2 ? 'var(--success)' : 'var(--warning)'};">${stats.averageEndFood >= 2 ? '+' : ''}${(stats.averageEndFood - 2).toFixed(1)}</td>
        </tr>
        <tr>
          <td>⭐ Fame</td>
          <td>0</td>
          <td>${stats.averageEndFame}</td>
          <td style="color: var(--success);">+${stats.averageEndFame}</td>
        </tr>
        <tr>
          <td>😤 Unrest</td>
          <td>0</td>
          <td>${stats.averageEndUnrest}</td>
          <td style="color: ${stats.averageEndUnrest <= 3 ? 'var(--success)' : stats.averageEndUnrest <= 5 ? 'var(--warning)' : 'var(--danger)'};">+${stats.averageEndUnrest}</td>
        </tr>
      </table>
    </div>
    
    ${this.generateWarningsHtml(stats, unrestAnalysis)}
    
    <h2>Settlements Summary</h2>
    ${this.generateSettlementsSummaryHtml(results.runs[0])}
    
    <h2>Turn-by-Turn Breakdown</h2>
    ${this.generateTurnBreakdownHtml(results.runs[0])}
    
    <p class="timestamp">Generated: ${results.timestamp}</p>
  </div>
</body>
</html>`;
  }
  
  /**
   * Generate settlements summary showing each settlement's tier and structures
   */
  private generateSettlementsSummaryHtml(run: SimulationRunResult): string {
    if (!run || !run.turns || run.turns.length === 0) {
      return '<p style="color: var(--text-muted);">No settlement data available</p>';
    }
    
    // Get final kingdom state from the run
    const finalState = run.finalState;
    
    // Get settlements from the final kingdom state
    const settlements = finalState?.settlements || [];
    
    if (settlements.length === 0) {
      return '<p style="color: var(--text-muted);">No settlements established</p>';
    }
    
    const tierColors: Record<string, string> = {
      'Village': 'var(--text-secondary)',
      'Town': 'var(--color-amber)',
      'City': 'var(--status-success)',
      'Metropolis': 'var(--status-critical-success)'
    };
    
    const tierIcons: Record<string, string> = {
      'Village': '🏘️',
      'Town': '🏛️',
      'City': '🏙️',
      'Metropolis': '👑'
    };
    
    const settlementCards = settlements.map((settlement: any, index: number) => {
      const tier = settlement.tier || 'Village';
      const structures = settlement.structures || [];
      const color = tierColors[tier] || 'var(--text-secondary)';
      const icon = tierIcons[tier] || '🏘️';
      
      const structureList = structures.length > 0 
        ? structures.map((s: any) => `
            <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.25rem 0; border-bottom: 1px solid var(--border-subtle);">
              <span style="color: var(--text-muted);">•</span>
              <span>${s.name || s.id}</span>
            </div>
          `).join('')
        : '<p style="color: var(--text-muted); font-style: italic;">No structures yet</p>';
      
      return `
        <div class="card" style="flex: 1; min-width: 250px;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
            <span style="font-size: 1.5rem;">${icon}</span>
            <div>
              <h3 style="margin: 0; color: ${color};">${settlement.name || `Settlement ${index + 1}`}</h3>
              <span style="color: var(--text-muted); font-size: 0.9rem;">${tier}</span>
            </div>
          </div>
          <div style="font-size: 0.85rem;">
            <div style="font-weight: bold; margin-bottom: 0.5rem; color: var(--text-secondary);">
              Structures (${structures.length}):
            </div>
            ${structureList}
          </div>
        </div>
      `;
    }).join('');
    
    return `
      <div style="margin-bottom: 1rem;">
        <p style="color: var(--text-secondary);">
          <strong>${settlements.length}</strong> settlement${settlements.length !== 1 ? 's' : ''} established
        </p>
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 1rem;">
        ${settlementCards}
      </div>
    `;
  }
  
  /**
   * Generate turn-by-turn breakdown table
   */
  private generateTurnBreakdownHtml(run: SimulationRunResult): string {
    if (!run || !run.turns || run.turns.length === 0) {
      return '<p style="color: var(--text-dim);">No turn data available</p>';
    }
    
    const outcomeIcon = (outcome: string): string => {
      switch (outcome) {
        case 'criticalSuccess': return '⭐';
        case 'success': return '✓';
        case 'failure': return '✗';
        case 'criticalFailure': return '💀';
        default: return '?';
      }
    };
    
    const outcomeColor = (outcome: string): string => {
      switch (outcome) {
        case 'criticalSuccess': return 'var(--status-critical-success)';
        case 'success': return 'var(--status-success)';
        case 'failure': return 'var(--status-failure)';
        case 'criticalFailure': return 'var(--status-critical-failure)';
        default: return 'var(--text-muted)';
      }
    };
    
    const formatActions = (actions: any[]): string => {
      if (!actions || actions.length === 0) return '-';
      return actions.map(action => {
        const name = action.checkId.replace(/-/g, ' ');
        const icon = outcomeIcon(action.outcome);
        const color = outcomeColor(action.outcome);
        const details = action.details || '';
        return `<div style="margin-bottom: 0.25rem; color: ${color};">${name}, ${icon} ${details}</div>`;
      }).join('');
    };
    
    const incomeCell = (value: number | undefined, cssVar: string): string => {
      if (!value || value === 0) return '<span style="color: var(--text-muted);">-</span>';
      return `<span style="color: var(${cssVar});">+${value}</span>`;
    };
    
    // Calculate level for a turn (same formula as KingdomSimulator)
    const getLevelForTurn = (turn: number, totalTurns: number = 120, targetLevel: number = 16): number => {
      const level = 1 + Math.round((turn - 1) * (targetLevel - 1) / (totalTurns - 1));
      return Math.min(Math.max(1, level), targetLevel);
    };
    
    const totalTurns = run.turns.length;
    
    return `
    <div class="card" style="overflow-x: auto;">
      <p style="color: var(--text-dim); margin-bottom: 1rem; font-size: 0.8rem;">
        Legend: ⭐ Critical Success | ✓ Success | ✗ Failure | 💀 Critical Failure
      </p>
      <table style="font-size: 0.8rem; width: 100%;">
        <thead>
          <tr style="background: var(--surface-darker);">
            <th style="width: 40px;">Turn</th>
            <th style="width: 35px; text-align: center;" title="Party Level">Lvl</th>
            <th style="width: 40px; text-align: center;" title="Gold Income">💰</th>
            <th style="width: 40px; text-align: center;" title="Food Income">🌾</th>
            <th style="width: 40px; text-align: center;" title="Lumber Income">🪵</th>
            <th style="width: 40px; text-align: center;" title="Stone Income">🪨</th>
            <th style="width: 90px;">Events</th>
            <th style="width: 70px;">Incidents</th>
            <th>Actions (4 players)</th>
            <th style="width: 45px; text-align: center;" title="Gold Total">💰</th>
            <th style="width: 45px; text-align: center;" title="Unrest">😤</th>
            <th style="width: 45px; text-align: center;" title="Territory (Hexes)">⬡</th>
          </tr>
        </thead>
        <tbody>
          ${run.turns.map(turn => {
            const pd = turn.phaseDetails || {};
            const snap = turn.kingdomSnapshot;
            const actions = turn.actions || [];
            const prod = pd.resources?.worksiteProduction || {};
            const settlementGold = pd.resources?.settlementGold || 0;
            const totalGold = (prod.gold || 0) + settlementGold;
            const level = getLevelForTurn(turn.turn, totalTurns);
            
            const unrestColor = snap.unrest > 5 ? 'var(--icon-unrest-major)' : snap.unrest > 2 ? 'var(--icon-unrest-minor)' : 'var(--icon-unrest-none)';
            
            // Format incidents from the incidents array
            const incidents = turn.incidents || [];
            const incidentHtml = incidents.length > 0 
              ? incidents.map(inc => `<span style="color: var(--status-critical-failure);">💥 ${inc.checkName?.replace(/-/g, ' ') || 'Incident'}</span>`).join('<br>')
              : '<span style="color: var(--text-muted);">-</span>';
            
            return `
            <tr style="border-bottom: 1px solid var(--border-subtle); vertical-align: top;">
              <td style="text-align: center; font-weight: bold;">${turn.turn}</td>
              <td style="text-align: center; color: var(--text-secondary);">${level}</td>
              <td style="text-align: center;">${incomeCell(totalGold, '--icon-gold')}</td>
              <td style="text-align: center;">${incomeCell(prod.food, '--icon-food')}</td>
              <td style="text-align: center;">${incomeCell(prod.lumber, '--icon-lumber')}</td>
              <td style="text-align: center;">${incomeCell(prod.stone, '--icon-stone')}</td>
              <td style="font-size: 0.75rem;">
                ${pd.events?.eventTriggered 
                  ? `<span style="color: var(--color-amber);">⚡ ${pd.events.eventName || 'Event'}</span>` 
                  : `<span style="color: var(--text-muted);">DC${pd.events?.eventDC || '?'}</span>`}
              </td>
              <td style="font-size: 0.75rem;">
                ${incidentHtml}
              </td>
              <td style="font-size: 0.75rem;">
                ${formatActions(actions)}
              </td>
              <td style="text-align: center; color: var(--icon-gold);">${snap.resources.gold || 0}</td>
              <td style="text-align: center; color: ${unrestColor};">${snap.unrest}</td>
              <td style="text-align: center; color: var(--text-secondary);">${snap.hexCount}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
  }

  /**
   * Print a section header
   */
  private printHeader(title: string): void {
    console.log('');
    console.log('═'.repeat(50));
    console.log(`  ${title}`);
    console.log('═'.repeat(50));
    console.log('');
  }
  
  /**
   * Print a section title
   */
  private printSection(title: string): void {
    console.log(`▸ ${title}`);
    console.log('─'.repeat(40));
  }
  
  /**
   * Make a simple ASCII bar
   */
  private makeBar(value: number, max: number, width: number): string {
    const filled = Math.round((value / max) * width);
    return '█'.repeat(filled) + '░'.repeat(width - filled);
  }
  
  /**
   * Print ASCII chart
   */
  private printAsciiChart(values: number[], label: string, height: number): void {
    if (values.length === 0) return;
    
    const maxValue = Math.max(...values, 1);
    const minValue = Math.min(...values);
    const range = maxValue - minValue || 1;
    
    // Sample values if too many
    const maxPoints = 40;
    let sampled = values;
    if (values.length > maxPoints) {
      const step = Math.ceil(values.length / maxPoints);
      sampled = values.filter((_, i) => i % step === 0);
    }
    
    // Build chart lines
    for (let row = height; row >= 0; row--) {
      const threshold = minValue + (range * row / height);
      let line = row === height ? `${maxValue.toFixed(0).padStart(4)} │` :
                 row === 0 ? `${minValue.toFixed(0).padStart(4)} │` :
                 '     │';
      
      for (const val of sampled) {
        const normalizedValue = (val - minValue) / range;
        const chartRow = Math.round(normalizedValue * height);
        line += chartRow >= row ? '█' : ' ';
      }
      
      console.log(line);
    }
    
    // X-axis
    console.log('     └' + '─'.repeat(sampled.length));
    console.log(`      Turn 1${' '.repeat(Math.max(0, sampled.length - 10))}Turn ${values.length}`);
  }
  
  /**
   * Print balance warnings and recommendations
   */
  private printBalanceWarnings(stats: SimulationStatistics, unrestAnalysis: any): void {
    const warnings: { level: 'warning' | 'danger'; message: string }[] = [];
    
    // High collapse rate
    if (stats.collapseRate > 20) {
      warnings.push({
        level: 'danger',
        message: `HIGH COLLAPSE RATE: ${stats.collapseRate}% of kingdoms reached critical unrest (≥10). This suggests unrest recovery mechanisms are insufficient.`
      });
    } else if (stats.collapseRate > 5) {
      warnings.push({
        level: 'warning',
        message: `Moderate collapse rate: ${stats.collapseRate}% of kingdoms reached critical unrest.`
      });
    }
    
    // Low stabilization rates
    if (stats.tippingPointAnalysis.atUnrest5 < 50) {
      warnings.push({
        level: 'danger',
        message: `TIPPING POINT AT 5: Only ${stats.tippingPointAnalysis.atUnrest5}% of kingdoms stabilized after reaching unrest 5. Recovery may be too difficult.`
      });
    }
    
    // High unrest generation
    if (stats.unrestGenerationRate > 0.6) {
      warnings.push({
        level: 'warning',
        message: `High unrest generation: Unrest increases ${(stats.unrestGenerationRate * 100).toFixed(0)}% of turns. Consider reducing failure penalties.`
      });
    }
    
    // Low recovery effectiveness
    if (stats.unrestRecoveryRate < 0.5) {
      warnings.push({
        level: 'warning',
        message: `Low recovery effectiveness: Only ${(stats.unrestRecoveryRate * 100).toFixed(0)}% of recovery attempts succeed. Consider buffing unrest-reduction actions.`
      });
    }
    
    // High failure rate
    const failureRate = stats.outcomePercentages.failure + stats.outcomePercentages.criticalFailure;
    if (failureRate > 50) {
      warnings.push({
        level: 'warning',
        message: `High failure rate: ${failureRate.toFixed(0)}% of checks fail. DCs may be too high for party level ${stats.config.partyLevel}.`
      });
    }
    
    // Print warnings
    if (warnings.length === 0) {
      console.log('  ✓ No major balance issues detected');
      console.log('  ✓ Unrest mechanics appear sustainable');
      console.log('  ✓ Resource economy is functional');
    } else {
      for (const warning of warnings) {
        const icon = warning.level === 'danger' ? '🚨' : '⚠️';
        console.log(`  ${icon} ${warning.message}`);
        console.log('');
      }
    }
    
    // Recommendations
    console.log('');
    console.log('Recommendations:');
    if (stats.collapseRate > 10) {
      console.log('  • Increase unrest reduction from "Deal with Unrest" action');
      console.log('  • Add structures that provide passive unrest reduction');
      console.log('  • Reduce unrest penalties from critical failures');
    }
    if (failureRate > 40) {
      console.log('  • Consider reducing base DCs or increasing structure bonuses');
    }
    if (stats.averageEndGold < 5) {
      console.log('  • Economic actions may need higher rewards');
    }
  }
  
  /**
   * Generate action analysis HTML section
   */
  private generateActionAnalysisHtml(runs: SimulationRunResult[]): string {
    const actionAnalysis = this.statsCollector.analyzeActionDistribution(runs);
    
    // Sort categories and actions
    const sortedCategories = Object.entries(actionAnalysis.byCategory)
      .sort((a, b) => b[1] - a[1]);
    const sortedActions = Object.entries(actionAnalysis.byAction)
      .sort((a, b) => b[1].count - a[1].count);
    
    // Color map for categories
    const categoryColors: Record<string, string> = {
      'Stability': '#ef4444',
      'Economic': '#fbbf24',
      'Infrastructure': '#8b5a2b',
      'Urban Planning': '#a78bfa',
      'Territory': '#60a5fa',
      'Military': '#94a3b8',
      'Diplomatic': '#4ade80',
      'Other': '#666'
    };

    return `
    <div class="grid">
      <div class="card">
        <h3>Actions by Category</h3>
        <table>
          <tr><th>Category</th><th>Count</th><th>%</th><th></th></tr>
          ${sortedCategories.map(([category, count]) => {
            const pct = ((count / actionAnalysis.totalActions) * 100).toFixed(1);
            const color = categoryColors[category] || '#666';
            return `
            <tr>
              <td style="color: ${color};">● ${category}</td>
              <td>${count}</td>
              <td>${pct}%</td>
              <td><div class="progress-bar"><div class="progress-fill" style="width: ${pct}%; background: ${color};"></div></div></td>
            </tr>`;
          }).join('')}
        </table>
      </div>
      
      <div class="card">
        <h3>Top 15 Actions</h3>
        <table>
          <tr><th>Action</th><th>Count</th><th>Success</th><th>Crit</th></tr>
          ${sortedActions.slice(0, 15).map(([actionId, data]) => {
            const pct = ((data.count / actionAnalysis.totalActions) * 100).toFixed(1);
            const successColor = data.successRate >= 70 ? 'var(--success)' : data.successRate >= 50 ? 'var(--warning)' : 'var(--danger)';
            return `
            <tr>
              <td>${actionId}</td>
              <td>${data.count} (${pct}%)</td>
              <td style="color: ${successColor};">${data.successRate}%</td>
              <td>${data.critRate}%</td>
            </tr>`;
          }).join('')}
        </table>
      </div>
    </div>
    
    `;
  }

  /**
   * Generate resource progression chart using Nivo
   */
  private generateResourceChart(runs: SimulationRunResult[], resources: string[]): string {
    const colorMap: Record<string, string> = {
      gold: '#fbbf24',
      food: '#4ade80',
      lumber: '#8b5a2b',
      stone: '#94a3b8',
      ore: '#f97316',
      unrest: '#ef4444',
      fame: '#a78bfa',
      hexes: '#60a5fa'
    };

    const data: LineChartData[] = resources.map(resource => {
      const progression = this.statsCollector.getResourceProgression(runs, resource);
      return {
        id: resource.charAt(0).toUpperCase() + resource.slice(1),
        color: colorMap[resource] || '#e94560',
        data: progression.map(p => ({ x: p.turn, y: p.avg }))
      };
    });

    try {
      return generateLineChart(data, 700, 280, {
        xLabel: 'Turn',
        yLabel: 'Value',
        enableArea: true
      });
    } catch (error) {
      // Fallback to simple display if Nivo fails
      return `<p style="color: var(--text-dim);">Chart generation failed. Data: ${JSON.stringify(data.map(d => ({ id: d.id, points: d.data.length })))}</p>`;
    }
  }

  /**
   * Generate warnings HTML
   */
  private generateWarningsHtml(stats: SimulationStatistics, unrestAnalysis: any): string {
    const warnings: string[] = [];
    
    if (stats.collapseRate > 20) {
      warnings.push(`<div class="warning-box danger">
        <h4>🚨 High Collapse Rate</h4>
        <p>${stats.collapseRate}% of kingdoms reached critical unrest (≥10). Unrest recovery mechanisms may be insufficient.</p>
      </div>`);
    }
    
    if (stats.tippingPointAnalysis.atUnrest5 < 50) {
      warnings.push(`<div class="warning-box danger">
        <h4>🚨 Tipping Point Detected</h4>
        <p>Only ${stats.tippingPointAnalysis.atUnrest5}% of kingdoms stabilized after reaching unrest 5. This suggests a death spiral is likely once unrest reaches this level.</p>
      </div>`);
    }
    
    if (stats.unrestRecoveryRate < 0.5) {
      warnings.push(`<div class="warning-box">
        <h4>⚠️ Low Recovery Rate</h4>
        <p>Only ${(stats.unrestRecoveryRate * 100).toFixed(0)}% of unrest recovery attempts succeed. Consider buffing the "Deal with Unrest" action.</p>
      </div>`);
    }
    
    if (warnings.length === 0) {
      return `<div class="card" style="background: rgba(74, 222, 128, 0.1); border-color: var(--success);">
        <h3 style="color: var(--success);">✓ Balance Assessment: HEALTHY</h3>
        <p>No major balance issues detected. Unrest mechanics appear sustainable and resource economy is functional.</p>
      </div>`;
    }
    
    return `<h2>Balance Warnings</h2>${warnings.join('')}`;
  }
}

