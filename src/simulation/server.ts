#!/usr/bin/env npx tsx
/**
 * Simulation Web Server
 * 
 * Interactive browser-based simulation runner.
 * Run with: npm run simulate:server
 */

import { createServer } from 'http';
import { readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import type { KingdomData } from '../actors/KingdomActor';
import { HeadlessSimulator } from './HeadlessSimulator';
import { StatisticsCollector } from './StatisticsCollector';
import { ReportGenerator } from './ReportGenerator';
import type { SimulationConfig, SimulationRunResult, SimulationResults } from './SimulationConfig';
import { DEFAULT_CONFIG } from './SimulationConfig';
import { BalancedStrategy } from './strategies';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 3456;
const STARTING_HEX_ID = '6.19';

function loadStarterKingdom(): KingdomData {
  const worldPath = resolve(__dirname, 'base-world.json');
  const worldData = JSON.parse(readFileSync(worldPath, 'utf-8'));
  
  const kingdom: KingdomData = {
    name: worldData.kingdomData?.name || worldData.kingdom?.name || 'Stolen Lands Kingdom',
    hexes: worldData.kingdomData?.hexes || worldData.hexes || [],
    settlements: [],
    resources: { gold: 4, food: 2, lumber: 1, stone: 4, ore: 0 },
    unrest: 0,
    fame: 0,
    size: 0,
    armies: [],
    buildQueue: [],
  };

  const startingHex = kingdom.hexes?.find(h => h.id === STARTING_HEX_ID);
  if (startingHex) {
    startingHex.claimedBy = 'player';
    kingdom.size = 1;

    const [rowStr, colStr] = STARTING_HEX_ID.split('.');
    const row = parseInt(rowStr, 10);
    const col = parseInt(colStr, 10);
    const adjacentOffsets = col % 2 === 0
      ? [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]]
      : [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]];

    for (const [dr, dc] of adjacentOffsets) {
      const adjId = `${row + dr}.${col + dc}`;
      const adjHex = kingdom.hexes?.find(h => h.id === adjId);
      if (adjHex && !adjHex.claimedBy) {
        adjHex.claimedBy = 'player';
        kingdom.size++;
      }
    }

    const settlementName = 'First Settlement';
    kingdom.settlements = [{
      id: `settlement-${STARTING_HEX_ID}`,
      name: settlementName,
      tier: 'Village',
      level: 1,
      hexId: STARTING_HEX_ID,
      structures: [],
      lots: [{ id: 'lot-0', structures: [] }],
      wasFedLastTurn: true
    }];

    startingHex.features = startingHex.features || [];
    startingHex.features.push({ type: 'settlement', name: settlementName });
  }

  return kingdom;
}

function runSimulation(params: {
  runs: number;
  hexesPerUnrest: number;
  fameConversion: string;
  structureGold: number;
}): SimulationResults {
  const config: SimulationConfig = {
    ...DEFAULT_CONFIG,
    turns: 120,
    runs: params.runs,
    hexesPerUnrest: params.hexesPerUnrest,
    fameConvertsToUnrest: params.fameConversion === 'unrest',
    fameConvertsToGold: params.fameConversion === 'gold',
    structureGoldCostPerTier: params.structureGold,
  };

  const runs: SimulationRunResult[] = [];

  for (let i = 0; i < config.runs; i++) {
    // Deep copy the starter kingdom for each run to prevent mutation across runs
    const starterKingdom = loadStarterKingdom();
    const strategy = new BalancedStrategy(Math.random);
    // Use HeadlessSimulator which uses real domain layer and services
    const simulator = new HeadlessSimulator(config, strategy);
    const result = simulator.runSimulation(starterKingdom);
    result.runNumber = i + 1;
    runs.push(result);
  }

  const collector = new StatisticsCollector();
  const statistics = collector.computeStatistics(runs, config);

  return {
    runs,
    statistics,
    timestamp: new Date().toISOString()
  };
}

const server = createServer((req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (url.pathname === '/') {
    // Serve the interactive page
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(getInteractivePage());
    return;
  }

  if (url.pathname === '/run' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const params = JSON.parse(body);
        console.log(`Running simulation: runs=${params.runs}, hexes=${params.hexesPerUnrest}, fame=${params.fameConversion}, gold=${params.structureGold}`);
        
        const results = runSimulation(params);
        const generator = new ReportGenerator();
        const html = generator.generateHtmlReport(results);
        
        // Save to file for later reference
        const reportPath = resolve(__dirname, 'latest-report.html');
        writeFileSync(reportPath, html);
        console.log(`Report saved to: ${reportPath}`);
        
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
      } catch (error) {
        console.error('Simulation error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(error) }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

function getInteractivePage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kingdom Simulation</title>
  <style>
    :root {
      --bg: hsl(229, 34%, 3%);
      --surface: hsl(240, 20%, 14%);
      --surface-high: hsl(229, 20%, 16%);
      --text: hsl(0, 0%, 98%);
      --text-muted: hsl(240, 5%, 56%);
      --crimson: hsl(0, 58%, 50%);
      --crimson-light: hsl(0, 78%, 57%);
      --amber: hsl(38, 91%, 50%);
      --border: hsl(240, 5%, 32%);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 { color: var(--crimson-light); margin-bottom: 0.25rem; font-size: 1.5rem; }
    .config-bar {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      padding: 1rem;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      margin: -2rem -2rem 1rem -2rem;
      padding: 1rem 2rem;
    }
    .config-bar label {
      color: var(--text-muted);
      font-size: 0.75rem;
      display: block;
    }
    .config-bar input, .config-bar select {
      padding: 0.4rem 0.6rem;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 4px;
      color: var(--text);
      font-size: 0.9rem;
      width: 80px;
    }
    .config-bar select { width: 100px; }
    .config-bar input:focus, .config-bar select:focus {
      outline: none;
      border-color: var(--amber);
    }
    .config-bar button {
      background: var(--crimson);
      color: white;
      border: none;
      padding: 0.5rem 1.5rem;
      border-radius: 4px;
      font-size: 0.9rem;
      cursor: pointer;
      transition: background 0.2s;
    }
    .config-bar button:hover { background: var(--crimson-light); }
    .config-bar button:disabled { background: var(--text-muted); cursor: wait; }
    .status {
      color: var(--text-muted);
      font-size: 0.85rem;
      margin-left: auto;
    }
    #results {
      width: 100%;
    }
    #results iframe {
      width: 100%;
      min-height: 2000px;
      border: none;
      background: var(--surface);
    }
    @media (max-width: 700px) {
      .config-bar { flex-direction: column; align-items: stretch; }
      .config-bar h1 { text-align: center; }
    }
  </style>
</head>
<body>
  <div class="config-bar">
    <h1>🏰 Kingdom Simulation</h1>
    <span style="color: var(--text-muted); font-size: 0.8rem;">6 runs</span>
    <div>
      <label>Hexes/Unrest</label>
      <input type="number" id="hexesPerUnrest" value="8" min="1" max="1000">
    </div>
    <div>
      <label>Fame</label>
      <select id="fameConversion">
        <option value="none">None</option>
        <option value="unrest">→Unrest</option>
        <option value="gold">→Gold</option>
      </select>
    </div>
    <div>
      <label>Gold/Tier</label>
      <input type="number" id="structureGold" value="0" min="0" max="10">
    </div>
    <button id="runBtn" onclick="runSimulation()">▶ Run</button>
    <div>
      <label>View</label>
      <select id="viewSelector" onchange="switchReportView(this.value)" disabled>
        <option value="avg">Average (6 runs)</option>
        <option value="0">Run 1</option>
        <option value="1">Run 2</option>
        <option value="2">Run 3</option>
        <option value="3">Run 4</option>
        <option value="4">Run 5</option>
        <option value="5">Run 6</option>
      </select>
    </div>
    <span class="status" id="status"></span>
  </div>
  
  <div id="results"></div>
  
  <script>
    // Load saved settings on page load
    window.onload = function() {
      const saved = localStorage.getItem('simSettings');
      if (saved) {
        const settings = JSON.parse(saved);
        document.getElementById('hexesPerUnrest').value = settings.hexesPerUnrest || 8;
        document.getElementById('fameConversion').value = settings.fameConversion || 'none';
        document.getElementById('structureGold').value = settings.structureGold || 0;
      }
    };
    
    async function runSimulation() {
      const btn = document.getElementById('runBtn');
      const status = document.getElementById('status');
      const results = document.getElementById('results');
      
      btn.disabled = true;
      btn.textContent = '⏳ Running...';
      status.textContent = 'Simulating 6 runs...';
      
      const params = {
        runs: 6,
        hexesPerUnrest: parseInt(document.getElementById('hexesPerUnrest').value),
        fameConversion: document.getElementById('fameConversion').value,
        structureGold: parseInt(document.getElementById('structureGold').value)
      };
      
      // Save settings for next time
      localStorage.setItem('simSettings', JSON.stringify(params));
      
      try {
        const response = await fetch('/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params)
        });
        
        const html = await response.text();
        
        // Create iframe to display results
        results.innerHTML = '<iframe id="reportFrame"></iframe>';
        const iframe = document.getElementById('reportFrame');
        iframe.srcdoc = html;
        
        // Enable view selector
        document.getElementById('viewSelector').disabled = false;
        
        status.textContent = '✓ Complete!';
      } catch (error) {
        status.textContent = '❌ Error: ' + error.message;
      }
      
      btn.disabled = false;
      btn.textContent = '▶ Run Simulation';
    }
    
    function switchReportView(value) {
      const iframe = document.getElementById('reportFrame');
      if (iframe && iframe.contentWindow && iframe.contentWindow.switchView) {
        iframe.contentWindow.switchView(value);
      }
    }
  </script>
</body>
</html>`;
}

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║     Kingdom Simulation Server                     ║
╠══════════════════════════════════════════════════╣
║                                                   ║
║   Open in browser: http://localhost:${PORT}         ║
║                                                   ║
║   Press Ctrl+C to stop                            ║
╚══════════════════════════════════════════════════╝
`);
});

