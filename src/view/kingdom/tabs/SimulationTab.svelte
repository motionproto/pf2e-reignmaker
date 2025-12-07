<script lang="ts">
   import { onMount } from 'svelte';
   import { kingdomData } from '../../../stores/KingdomStore';
   import type { KingdomData } from '../../../actors/KingdomActor';
   import { HeadlessSimulator } from '../../../simulation/HeadlessSimulator';
   import { StatisticsCollector } from '../../../simulation/StatisticsCollector';
   import { BalancedStrategy } from '../../../simulation/strategies';
   import type { SimulationConfig, SimulationRunResult, SimulationResults } from '../../../simulation/SimulationConfig';
   import { DEFAULT_CONFIG } from '../../../simulation/SimulationConfig';
   import { initializeStructures } from '../../../simulation/ProductionDataAdapter';
   
   // Configuration state
   let hexesPerUnrest = 8;
   let fameConversion: 'none' | 'unrest' | 'gold' = 'none';
   let structureGold = 0;
   let selectedView: 'avg' | number = 'avg';
   
   // Simulation state
   let isRunning = false;
   let statusMessage = '';
   let results: SimulationResults | null = null;
   let error: string | null = null;
   
   // Load saved settings on mount
   onMount(() => {
      const saved = localStorage.getItem('simSettings');
      if (saved) {
         try {
            const settings = JSON.parse(saved);
            hexesPerUnrest = settings.hexesPerUnrest ?? 8;
            fameConversion = settings.fameConversion ?? 'none';
            structureGold = settings.structureGold ?? 0;
         } catch (e) {
            console.warn('Failed to load simulation settings:', e);
         }
      }
   });
   
   // Save settings when they change
   function saveSettings() {
      localStorage.setItem('simSettings', JSON.stringify({
         hexesPerUnrest,
         fameConversion,
         structureGold
      }));
   }
   
   // Create a starter kingdom for simulation
   function createStarterKingdom(): KingdomData {
      // Use current kingdom data as base if available, otherwise create default
      const current = $kingdomData;
      
      if (current && current.hexes && current.hexes.length > 0) {
         // Deep clone current kingdom state
         return JSON.parse(JSON.stringify(current));
      }
      
      // Default starter kingdom
      return {
         name: 'Simulated Kingdom',
         hexes: [],
         settlements: [{
            id: 'settlement-starter',
            name: 'Starting Village',
            tier: 'Village',
            level: 1,
            hexId: '0.0',
            structures: [],
            lots: [{ id: 'lot-0', structures: [] }],
            wasFedLastTurn: true
         }],
         resources: { gold: 4, food: 2, lumber: 1, stone: 4, ore: 0 },
         unrest: 0,
         fame: 0,
         size: 1,
         armies: [],
         buildQueue: [],
         partyLevel: 1
      };
   }
   
   // Run simulation
   async function runSimulation() {
      isRunning = true;
      error = null;
      statusMessage = 'Initializing structures...';
      
      // Save settings
      saveSettings();
      
      try {
         // Initialize structures from the service
         await initializeStructures();
         const config: SimulationConfig = {
            ...DEFAULT_CONFIG,
            turns: 120,
            runs: 6,
            hexesPerUnrest,
            fameConvertsToUnrest: fameConversion === 'unrest',
            fameConvertsToGold: fameConversion === 'gold',
            structureGoldCostPerTier: structureGold
         };
         
         const runs: SimulationRunResult[] = [];
         
         for (let i = 0; i < config.runs; i++) {
            statusMessage = `Running simulation ${i + 1} of ${config.runs}...`;
            
            // Allow UI to update
            await new Promise(resolve => setTimeout(resolve, 10));
            
            const starterKingdom = createStarterKingdom();
            const strategy = new BalancedStrategy(Math.random);
            const simulator = new HeadlessSimulator(config, strategy);
            const result = simulator.runSimulation(starterKingdom);
            result.runNumber = i + 1;
            runs.push(result);
         }
         
         statusMessage = 'Computing statistics...';
         await new Promise(resolve => setTimeout(resolve, 10));
         
         const collector = new StatisticsCollector();
         const statistics = collector.computeStatistics(runs, config);
         
         results = {
            runs,
            statistics,
            timestamp: new Date().toISOString()
         };
         
         statusMessage = `Completed ${config.runs} simulations`;
         
      } catch (e) {
         console.error('Simulation error:', e);
         error = e instanceof Error ? e.message : String(e);
         statusMessage = 'Simulation failed';
      } finally {
         isRunning = false;
      }
   }
   
   // Reactive computations for display
   $: runIndex = typeof selectedView === 'number' ? selectedView : -1;
   $: currentRun = runIndex >= 0 ? results?.runs[runIndex] : null;
   $: displayStats = results?.statistics;
   
   // Format numbers for display
   function formatNumber(n: number | undefined, decimals = 1): string {
      if (n === undefined) return '-';
      return n.toFixed(decimals);
   }
   
   function formatPercent(n: number | undefined): string {
      if (n === undefined) return '-';
      return `${(n * 100).toFixed(0)}%`;
   }
</script>

<div class="simulation-tab">
   <div class="config-bar">
      <h2>🧪 Kingdom Simulation</h2>
      
      <div class="config-group">
         <label for="hexesPerUnrest">Hexes/Unrest</label>
         <input 
            type="number" 
            id="hexesPerUnrest" 
            bind:value={hexesPerUnrest}
            min="1" 
            max="1000"
            disabled={isRunning}
         />
      </div>
      
      <div class="config-group">
         <label for="fameConversion">Fame</label>
         <select 
            id="fameConversion" 
            bind:value={fameConversion}
            disabled={isRunning}
         >
            <option value="none">None</option>
            <option value="unrest">→Unrest</option>
            <option value="gold">→Gold</option>
         </select>
      </div>
      
      <div class="config-group">
         <label for="structureGold">Gold/Tier</label>
         <input 
            type="number" 
            id="structureGold"
            bind:value={structureGold}
            min="0" 
            max="10"
            disabled={isRunning}
         />
      </div>
      
      <button 
         class="run-button"
         on:click={runSimulation}
         disabled={isRunning}
      >
         {isRunning ? '⏳ Running...' : '▶ Run Simulation'}
      </button>
      
      {#if results}
         <div class="config-group">
            <label for="viewSelector">View</label>
            <select 
               id="viewSelector" 
               bind:value={selectedView}
               disabled={isRunning}
            >
               <option value="avg">Average (6 runs)</option>
               {#each results.runs as run, i}
                  <option value={i}>Run {i + 1}</option>
               {/each}
            </select>
         </div>
      {/if}
      
      <span class="status">{statusMessage}</span>
   </div>
   
   {#if error}
      <div class="error-message">
         <i class="fas fa-exclamation-triangle"></i>
         {error}
      </div>
   {/if}
   
   {#if results && displayStats}
      <div class="results-container">
         <!-- Summary Stats -->
         <div class="card summary-card">
            <h3>End-Game {selectedView === 'avg' ? 'Averages' : `Results (Run ${runIndex + 1})`}</h3>
            <div class="stat-grid">
               <div class="stat-box">
                  <span class="stat-icon">🪙</span>
                  <span class="stat-label">Gold</span>
                  <span class="stat-value">
                     {#if selectedView === 'avg'}
                        {formatNumber(displayStats.avgFinalGold)}
                     {:else}
                        {currentRun?.finalState.resources.gold ?? '-'}
                     {/if}
                  </span>
               </div>
               <div class="stat-box">
                  <span class="stat-icon">😤</span>
                  <span class="stat-label">Unrest</span>
                  <span class="stat-value">
                     {#if selectedView === 'avg'}
                        {formatNumber(displayStats.avgFinalUnrest)}
                     {:else}
                        {currentRun?.finalState.unrest ?? '-'}
                     {/if}
                  </span>
               </div>
               <div class="stat-box">
                  <span class="stat-icon">⬡</span>
                  <span class="stat-label">Territory</span>
                  <span class="stat-value">
                     {#if selectedView === 'avg'}
                        {formatNumber(displayStats.avgFinalHexes)}
                     {:else}
                        {currentRun?.finalState.hexes?.filter(h => h.claimedBy === 'player').length ?? '-'}
                     {/if}
                  </span>
               </div>
               <div class="stat-box">
                  <span class="stat-icon">🏛️</span>
                  <span class="stat-label">Settlements</span>
                  <span class="stat-value">
                     {#if selectedView === 'avg'}
                        {formatNumber(displayStats.avgSettlements)}
                     {:else}
                        {currentRun?.finalState.settlements?.length ?? '-'}
                     {/if}
                  </span>
               </div>
               <div class="stat-box danger">
                  <span class="stat-icon">💀</span>
                  <span class="stat-label">Collapse Rate</span>
                  <span class="stat-value">{formatPercent(displayStats.collapseRate)}</span>
               </div>
            </div>
         </div>
         
         <!-- Outcome Distribution -->
         <div class="card">
            <h3>Outcome Distribution</h3>
            <div class="outcome-grid">
               <div class="outcome-item crit-success">
                  <span class="outcome-label">⭐ Critical Success</span>
                  <span class="outcome-value">{formatPercent(displayStats.outcomeDistribution?.criticalSuccess)}</span>
               </div>
               <div class="outcome-item success">
                  <span class="outcome-label">✓ Success</span>
                  <span class="outcome-value">{formatPercent(displayStats.outcomeDistribution?.success)}</span>
               </div>
               <div class="outcome-item failure">
                  <span class="outcome-label">✗ Failure</span>
                  <span class="outcome-value">{formatPercent(displayStats.outcomeDistribution?.failure)}</span>
               </div>
               <div class="outcome-item crit-failure">
                  <span class="outcome-label">💀 Critical Failure</span>
                  <span class="outcome-value">{formatPercent(displayStats.outcomeDistribution?.criticalFailure)}</span>
               </div>
            </div>
         </div>
         
         <!-- Action Distribution -->
         {#if displayStats.actionCounts}
            <div class="card">
               <h3>Action Distribution</h3>
               <div class="action-list">
                  {#each Object.entries(displayStats.actionCounts).sort((a, b) => b[1] - a[1]) as [action, count]}
                     <div class="action-item">
                        <span class="action-name">{action}</span>
                        <div class="action-bar-container">
                           <div 
                              class="action-bar" 
                              style="width: {Math.min(100, (count / (displayStats.totalActions || 1)) * 100 * 3)}%"
                           ></div>
                        </div>
                        <span class="action-percent">
                           {formatPercent(count / (displayStats.totalActions || 1))}
                        </span>
                     </div>
                  {/each}
               </div>
            </div>
         {/if}
         
         <!-- Configuration Used -->
         <div class="card config-summary">
            <h3>Simulation Configuration</h3>
            <div class="config-details">
               <span><strong>Turns:</strong> 120</span>
               <span><strong>Runs:</strong> 6</span>
               <span><strong>Party Level:</strong> 1→16</span>
               <span><strong>Hexes/Unrest:</strong> {hexesPerUnrest}</span>
               <span><strong>Fame:</strong> {fameConversion}</span>
               <span><strong>Gold/Tier:</strong> {structureGold}</span>
            </div>
         </div>
      </div>
   {:else if !isRunning}
      <div class="no-results">
         <i class="fas fa-flask"></i>
         <p>Configure simulation parameters above and click <strong>Run Simulation</strong> to test kingdom balance.</p>
         <p class="hint">The simulation will run 6 independent 120-turn games to analyze outcomes.</p>
      </div>
   {/if}
</div>

<style lang="scss">
   @import '../../../styles/variables.css';
   
   .simulation-tab {
      display: flex;
      flex-direction: column;
      gap: var(--space-16);
      height: 100%;
   }
   
   .config-bar {
      display: flex;
      align-items: center;
      gap: var(--space-16);
      flex-wrap: wrap;
      padding: var(--space-12);
      background: var(--surface-low);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
      
      h2 {
         color: var(--color-primary-light);
         font-size: var(--font-lg);
         margin: 0;
         margin-right: var(--space-8);
      }
   }
   
   .config-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      
      label {
         color: var(--text-muted);
         font-size: var(--font-sm);
      }
      
      input, select {
         padding: var(--space-6) var(--space-8);
         background: var(--surface);
         border: 1px solid var(--border-subtle);
         border-radius: var(--radius-sm);
         color: var(--text-primary);
         font-size: var(--font-md);
         width: 5rem;
         
         &:focus {
            outline: none;
            border-color: var(--color-primary);
         }
         
         &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
         }
      }
      
      select {
         width: 7rem;
      }
   }
   
   .run-button {
      padding: var(--space-8) var(--space-16);
      background: var(--color-primary);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      font-size: var(--font-md);
      cursor: pointer;
      transition: background 0.2s;
      
      &:hover:not(:disabled) {
         background: var(--color-primary-light);
      }
      
      &:disabled {
         background: var(--text-muted);
         cursor: wait;
      }
   }
   
   .status {
      color: var(--text-muted);
      font-size: var(--font-sm);
      margin-left: auto;
   }
   
   .error-message {
      padding: var(--space-12);
      background: var(--color-danger);
      color: white;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      gap: var(--space-8);
   }
   
   .results-container {
      display: flex;
      flex-direction: column;
      gap: var(--space-16);
      overflow-y: auto;
   }
   
   .card {
      background: var(--surface-low);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
      padding: var(--space-16);
      
      h3 {
         color: var(--text-primary);
         font-size: var(--font-lg);
         margin: 0 0 var(--space-12) 0;
         border-bottom: 1px solid var(--border-subtle);
         padding-bottom: var(--space-8);
      }
   }
   
   .stat-grid {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-12);
   }
   
   .stat-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-12);
      background: var(--surface);
      border-radius: var(--radius-md);
      min-width: 6rem;
      
      .stat-icon {
         font-size: var(--font-xl);
      }
      
      .stat-label {
         font-size: var(--font-sm);
         color: var(--text-muted);
      }
      
      .stat-value {
         font-size: var(--font-lg);
         font-weight: var(--font-weight-bold);
         color: var(--text-primary);
      }
      
      &.danger .stat-value {
         color: var(--color-danger);
      }
   }
   
   .outcome-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
      gap: var(--space-12);
   }
   
   .outcome-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-10);
      border-radius: var(--radius-sm);
      
      &.crit-success {
         background: hsla(120, 70%, 35%, 0.2);
         border-left: 3px solid hsl(120, 70%, 45%);
      }
      
      &.success {
         background: hsla(120, 50%, 25%, 0.2);
         border-left: 3px solid hsl(120, 50%, 35%);
      }
      
      &.failure {
         background: hsla(0, 0%, 40%, 0.2);
         border-left: 3px solid hsl(0, 0%, 50%);
      }
      
      &.crit-failure {
         background: hsla(0, 70%, 35%, 0.2);
         border-left: 3px solid hsl(0, 70%, 45%);
      }
      
      .outcome-label {
         font-size: var(--font-md);
      }
      
      .outcome-value {
         font-weight: var(--font-weight-bold);
         font-size: var(--font-lg);
      }
   }
   
   .action-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-8);
   }
   
   .action-item {
      display: flex;
      align-items: center;
      gap: var(--space-12);
      
      .action-name {
         width: 10rem;
         font-size: var(--font-md);
         color: var(--text-secondary);
      }
      
      .action-bar-container {
         flex: 1;
         height: 1rem;
         background: var(--surface);
         border-radius: var(--radius-sm);
         overflow: hidden;
      }
      
      .action-bar {
         height: 100%;
         background: var(--color-primary);
         border-radius: var(--radius-sm);
         transition: width 0.3s ease;
      }
      
      .action-percent {
         width: 3rem;
         text-align: right;
         font-size: var(--font-md);
         color: var(--text-muted);
      }
   }
   
   .config-summary {
      .config-details {
         display: flex;
         flex-wrap: wrap;
         gap: var(--space-16);
         
         span {
            color: var(--text-secondary);
            font-size: var(--font-md);
         }
      }
   }
   
   .no-results {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-12);
      padding: var(--space-32);
      color: var(--text-muted);
      text-align: center;
      
      i {
         font-size: 3rem;
         opacity: 0.5;
      }
      
      p {
         margin: 0;
         font-size: var(--font-md);
      }
      
      .hint {
         font-size: var(--font-sm);
         opacity: 0.7;
      }
   }
</style>

