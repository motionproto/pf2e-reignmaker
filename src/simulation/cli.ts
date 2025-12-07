#!/usr/bin/env npx tsx
/**
 * Kingdom Simulation CLI
 * 
 * Run headless simulations to test game balance.
 * 
 * Usage:
 *   npm run simulate -- --turns 50 --runs 10 --level 5 --strategy balanced
 *   npx tsx src/simulation/cli.ts --help
 */

import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import type { KingdomData, Settlement } from '../actors/KingdomActor';
import { HeadlessSimulator } from './HeadlessSimulator';
import { StatisticsCollector } from './StatisticsCollector';
import { ReportGenerator } from './ReportGenerator';
import type { SimulationConfig, StrategyType, SimulationRunResult, SimulationResults } from './SimulationConfig';
import { DEFAULT_CONFIG } from './SimulationConfig';
import { listPresets, getConfigPreset, applyPreset, CONFIG_PRESETS } from './configs';
import {
  BalancedStrategy,
  EconomicStrategy,
  MilitaryStrategy,
  ExpansionStrategy,
  type Strategy
} from './strategies';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Starting hex configuration
 */
const STARTING_HEX_ID = '6.19';

/**
 * Get adjacent hex IDs for a given hex (pointy-top hex grid)
 */
function getAdjacentHexIds(row: number, col: number): string[] {
  const neighbors: string[] = [];
  const isEvenRow = row % 2 === 0;
  
  if (isEvenRow) {
    neighbors.push(`${row - 1}.${col - 1}`, `${row - 1}.${col}`);
    neighbors.push(`${row}.${col - 1}`, `${row}.${col + 1}`);
    neighbors.push(`${row + 1}.${col - 1}`, `${row + 1}.${col}`);
  } else {
    neighbors.push(`${row - 1}.${col}`, `${row - 1}.${col + 1}`);
    neighbors.push(`${row}.${col - 1}`, `${row}.${col + 1}`);
    neighbors.push(`${row + 1}.${col}`, `${row + 1}.${col + 1}`);
  }
  
  return neighbors.filter(id => {
    const [r, c] = id.split('.').map(Number);
    return r >= 0 && c >= 0;
  });
}

/**
 * Terrain commodity mappings
 */
function getTerrainCommodities(terrain: string): Record<string, number> {
  switch (terrain) {
    case 'plains': return { food: 1 };
    case 'forest': return { lumber: 1 };
    case 'hills': return { stone: 1 };
    case 'mountains': return { ore: 1 };
    case 'swamp': return { food: 1 }; // Swamps can provide food
    default: return {};
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): Partial<SimulationConfig> {
  const args = process.argv.slice(2);
  const config: Partial<SimulationConfig> = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];
    
    switch (arg) {
      case '--turns':
      case '-t':
        config.turns = parseInt(nextArg, 10);
        i++;
        break;
        
      case '--runs':
      case '-r':
        config.runs = parseInt(nextArg, 10);
        i++;
        break;
        
      case '--level':
      case '-l':
        config.partyLevel = parseInt(nextArg, 10);
        i++;
        break;
        
      case '--skill':
      case '-s':
        config.skillBonus = parseInt(nextArg, 10);
        i++;
        break;
        
      case '--strategy':
        config.strategy = nextArg as StrategyType;
        i++;
        break;
        
      case '--event-chance':
        config.eventChance = parseInt(nextArg, 10);
        i++;
        break;
        
      case '--players':
        config.playerCount = parseInt(nextArg, 10);
        i++;
        break;
        
      case '--actions':
        config.actionsPerPlayer = parseInt(nextArg, 10);
        i++;
        break;
        
      case '--seed':
        config.seed = parseInt(nextArg, 10);
        i++;
        break;
        
      case '--output':
      case '-o':
        config.outputFormat = nextArg as 'console' | 'json' | 'html';
        i++;
        break;
        
      case '--hexes-per-unrest':
        config.hexesPerUnrest = parseInt(nextArg, 10);
        i++;
        break;
        
      case '--fame-converts':
        // Legacy: --fame-converts true means unrest reduction
        config.fameConvertsToUnrest = nextArg === 'true' || nextArg === '1';
        i++;
        break;
        
      case '--fame':
        // New: --fame none|unrest|gold
        if (nextArg === 'unrest') {
          config.fameConvertsToUnrest = true;
          config.fameConvertsToGold = false;
        } else if (nextArg === 'gold') {
          config.fameConvertsToUnrest = false;
          config.fameConvertsToGold = true;
        } else {
          config.fameConvertsToUnrest = false;
          config.fameConvertsToGold = false;
        }
        i++;
        break;
        
      case '--structure-gold':
        config.structureGoldCostPerTier = parseInt(nextArg, 10);
        i++;
        break;
        
      case '--config':
      case '-c':
        (config as any)._presetName = nextArg;
        i++;
        break;
        
      case '--list-configs':
        (config as any)._listConfigs = true;
        break;
        
      case '--verbose':
      case '-v':
        config.verbose = true;
        break;
        
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
    }
  }
  
  return config;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
Kingdom Simulation CLI
======================

Run headless simulations to test game balance and identify issues
like unrest death spirals.

USAGE:
  npm run simulate -- [options]
  npx tsx src/simulation/cli.ts [options]

OPTIONS:
  --turns, -t <N>       Turns to simulate per run (default: 50)
  --runs, -r <N>        Number of simulation runs (default: 10)
  --level, -l <N>       Party level for DC calculation (default: 5)
  --skill, -s <N>       Average skill bonus (default: 10)
  --strategy <type>     Player strategy: balanced, economic, military, expansion
  --event-chance <N>    Percent chance of event per turn (default: 50)
  --players <N>         Number of simulated players (default: 4)
  --actions <N>         Actions per player per turn (default: 2)
  --seed <N>            Random seed for reproducibility
  --output, -o <type>   Output format: console, json, html (default: console)
  --verbose, -v         Show detailed output
  --help, -h            Show this help message

CONFIGURATION PRESETS:
  --config, -c <name>   Use a named configuration preset
  --list-configs        List all available presets

BALANCE TESTING (override preset settings):
  --hexes-per-unrest <N>  Hexes per +1 unrest (default: 8, use 1000 to disable)
  --fame-converts <bool>  Fame auto-converts to unrest reduction (default: false)

EXAMPLES:
  # Run 10 simulations of 50 turns each at party level 5
  npm run simulate -- --turns 50 --runs 10 --level 5

  # Test economic strategy with reproducible seed
  npm run simulate -- --strategy economic --seed 12345

  # Quick balance check
  npm run simulate -- --turns 100 --runs 5 --verbose

  # Generate HTML report
  npm run simulate -- --output html > report.html
`);
}

/**
 * Create strategy instance
 */
function createStrategy(type: StrategyType, seed?: number): Strategy {
  const rng = seed !== undefined 
    ? createSeededRandom(seed) 
    : Math.random;
  
  switch (type) {
    case 'economic':
      return new EconomicStrategy(rng);
    case 'military':
      return new MilitaryStrategy(rng);
    case 'expansion':
      return new ExpansionStrategy(rng);
    case 'balanced':
    default:
      return new BalancedStrategy(rng);
  }
}

/**
 * Create seeded random number generator
 */
function createSeededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/**
 * Load base world data and set up starting conditions
 */
function loadStarterKingdom(): KingdomData {
  const dataPath = resolve(__dirname, 'base-world.json');
  const data = readFileSync(dataPath, 'utf-8');
  const worldData = JSON.parse(data);
  
  // Extract kingdom data from the save format
  const kingdom: KingdomData = worldData.kingdomData;
  
  // Set up starting conditions per Reignmaker rules
  // 1. Find the starting hex (6.19)
  const startingHex = kingdom.hexes?.find(h => h.id === STARTING_HEX_ID);
  if (!startingHex) {
    throw new Error(`Starting hex ${STARTING_HEX_ID} not found in world data`);
  }
  
  // 2. Claim the starting hex
  startingHex.claimedBy = 'player';
  kingdom.size = 1;
  
  // 3. Claim 6 adjacent hexes
  const adjacentIds = getAdjacentHexIds(startingHex.row, startingHex.col);
  let claimedAdjacent = 0;
  const commoditiesCollected: Record<string, number> = {};
  
  for (const adjId of adjacentIds) {
    const adjHex = kingdom.hexes?.find(h => h.id === adjId);
    if (adjHex && claimedAdjacent < 6) {
      adjHex.claimedBy = 'player';
      kingdom.size++;
      claimedAdjacent++;
      
      // Collect commodities from terrain
      const commodities = getTerrainCommodities(adjHex.terrain);
      for (const [resource, amount] of Object.entries(commodities)) {
        commoditiesCollected[resource] = (commoditiesCollected[resource] || 0) + amount;
      }
    }
  }
  
  // 4. Set starting resources
  kingdom.resources = {
    gold: 4, // 4 gold seed capital
    food: 2, // Food from plains/swamps
    lumber: commoditiesCollected.lumber || 0,
    stone: commoditiesCollected.stone || 0,
    ore: commoditiesCollected.ore || 0,
    foodCapacity: 4,
    armyCapacity: 0,
    diplomaticCapacity: 1,
    imprisonedUnrestCapacity: 0
  };
  
  // Apply collected commodities (may overlap with defaults)
  for (const [resource, amount] of Object.entries(commoditiesCollected)) {
    if (resource !== 'food') { // Food already set
      kingdom.resources[resource] = amount;
    }
  }
  
  // 5. Create starting settlement (Village)
  const settlement: Settlement = {
    id: 'settlement-capital',
    name: 'Capital',
    tier: 'Village',
    level: 1,
    hexId: STARTING_HEX_ID,
    structures: [],
    lots: [{ id: 'lot-0', structures: [] }],
    wasFedLastTurn: true
  };
  kingdom.settlements = [settlement];
  
  // Mark hex as having settlement
  startingHex.features = startingHex.features || [];
  if (!startingHex.features.some(f => f.type === 'settlement')) {
    startingHex.features.push({
      type: 'settlement',
      settlementId: settlement.id,
      tier: 'Village',
      name: settlement.name
    });
  }
  
  // 6. Set other initial values
  kingdom.name = 'Stolen Lands Kingdom';
  kingdom.currentTurn = 1;
  kingdom.unrest = 0;
  kingdom.fame = 0;
  kingdom.partyLevel = 1;  // Start at level 1, progresses to 16 over turns
  kingdom.worksiteProduction = {};
  kingdom.armies = [];
  
  return kingdom;
}

/**
 * Main entry point
 */
// Skip progress output entirely for HTML (only output pure HTML to stdout)
function log(message: string, config?: { outputFormat?: string }): void {
  if (config?.outputFormat === 'html') {
    // Don't output anything - HTML should be the only stdout output
    return;
  }
  console.log(message);
}

async function main(): Promise<void> {
  // Parse command line arguments first to know output format
  const cliConfig = parseArgs() as any;
  
  // Handle --list-configs
  if (cliConfig._listConfigs) {
    listPresets();
    return;
  }
  
  // Apply preset if specified, then override with CLI args
  let config: SimulationConfig;
  const presetName = cliConfig._presetName;
  
  if (presetName) {
    const preset = getConfigPreset(presetName);
    if (!preset) {
      console.error(`Unknown preset: ${presetName}`);
      console.error('Use --list-configs to see available presets');
      process.exit(1);
    }
    // Remove internal flags before merging
    delete cliConfig._presetName;
    delete cliConfig._listConfigs;
    config = applyPreset(presetName, cliConfig);
  } else {
    delete cliConfig._presetName;
    delete cliConfig._listConfigs;
    config = { ...DEFAULT_CONFIG, ...cliConfig };
  }
  
  log('========================================', config);
  log('  PF2E Reignmaker Kingdom Simulator', config);
  log('========================================\n', config);
  
  // Show preset name if used
  if (presetName) {
    const preset = getConfigPreset(presetName)!;
    log(`Preset: ${preset.name}`, config);
    log(`  ${preset.description}`, config);
    log('', config);
  }
  
  log('Configuration:', config);
  log(`  Turns per run: ${config.turns}`, config);
  log(`  Number of runs: ${config.runs}`, config);
  log(`  Level progression: 1 → 16 over ${config.turns} turns`, config);
  log(`  Skill bonus progression: +7 (L1) → +29 (L16)`, config);
  log(`  DC progression: 15 (L1) → 35 (L16)`, config);
  log(`  Strategy: ${config.strategy}`, config);
  log(`  Players: ${config.playerCount}`, config);
  log(`  Actions/player: ${config.actionsPerPlayer}`, config);
  log(`  Event system: DC-based (starts at 15, decreases by 5 per turn without event)`, config);
  if (config.seed !== undefined) {
    log(`  Random seed: ${config.seed}`, config);
  }
  // Balance settings
  log('Balance Settings:', config);
  log(`  Hexes per unrest: ${config.hexesPerUnrest}${config.hexesPerUnrest === 8 ? ' (production)' : ' ⚙️'}`, config);
  const fameMode = config.fameConvertsToUnrest ? 'unrest reduction' : 
                   config.fameConvertsToGold ? 'gold' : 'none (production)';
  log(`  Fame conversion: ${fameMode}${fameMode !== 'none (production)' ? ' ⚙️' : ''}`, config);
  log(`  Structure gold cost: ${config.structureGoldCostPerTier}g per tier${config.structureGoldCostPerTier === 0 ? ' (production)' : ' ⚙️'}`, config);
  log('', config);
  
  // Log starter kingdom info (load once just for logging)
  try {
    const sampleKingdom = loadStarterKingdom();
    const claimedHexes = sampleKingdom.hexes?.filter(h => h.claimedBy === 'player') || [];
    log(`Loaded world from base-world.json`, config);
    log(`  Starting hex: ${STARTING_HEX_ID}`, config);
    log(`  Kingdom name: "${sampleKingdom.name}"`, config);
    log(`  Starting hexes claimed: ${claimedHexes.length}`, config);
    log(`  Starting settlements: ${sampleKingdom.settlements?.length || 0}`, config);
    log(`  Starting resources: gold=${sampleKingdom.resources.gold}, food=${sampleKingdom.resources.food}, lumber=${sampleKingdom.resources.lumber}, stone=${sampleKingdom.resources.stone}, ore=${sampleKingdom.resources.ore}`, config);
    log(`  Total hexes in map: ${sampleKingdom.hexes?.length || 0}`, config);
    log('', config);
  } catch (error) {
    console.error('Failed to load world data:', error);
    process.exit(1);
  }
  
  // Create strategy
  const strategy = createStrategy(config.strategy, config.seed);
  log(`Using ${strategy.name} strategy\n`, config);
  
  // Run simulations
  const runs: SimulationRunResult[] = [];
  const startTime = Date.now();
  
  log('Running simulations...', config);
  for (let i = 0; i < config.runs; i++) {
    // Use different seed for each run if seed was provided
    const runSeed = config.seed !== undefined ? config.seed + i : undefined;
    const runConfig = { ...config, seed: runSeed };
    const runStrategy = createStrategy(config.strategy, runSeed);
    
    // Load fresh kingdom for each run to prevent mutation across runs
    const starterKingdom = loadStarterKingdom();
    // Use HeadlessSimulator which uses real domain layer and services
    const simulator = new HeadlessSimulator(runConfig, runStrategy);
    const result = simulator.runSimulation(starterKingdom);
    result.runNumber = i + 1;
    runs.push(result);
    
    if (config.verbose && config.outputFormat !== 'html') {
      const finalHexes = result.finalState.hexes?.filter(h => h.claimedBy === 'player').length || 0;
      const finalSettlements = result.finalState.settlements?.length || 0;
      log(`  Run ${i + 1}: Hexes=${finalHexes}, Settlements=${finalSettlements}, Unrest=${result.finalState.unrest}, Gold=${result.finalState.resources?.gold || 0}`, config);
    } else if (config.outputFormat !== 'html') {
      process.stdout.write('.');
    }
  }
  
  if (!config.verbose) {
    log(' done!', config);
  }
  
  const endTime = Date.now();
  log(`\nCompleted ${config.runs} runs in ${(endTime - startTime) / 1000}s\n`, config);
  
  // Compute statistics
  const collector = new StatisticsCollector();
  const statistics = collector.computeStatistics(runs, config);
  
  // Generate report
  const reportGenerator = new ReportGenerator();
  const results: SimulationResults = {
    runs,
    statistics,
    timestamp: new Date().toISOString()
  };
  
  switch (config.outputFormat) {
    case 'json':
      console.log(JSON.stringify(results, null, 2));
      break;
      
    case 'html':
      console.log(reportGenerator.generateHtmlReport(results));
      break;
      
    case 'console':
    default:
      reportGenerator.printConsoleReport(results);
      break;
  }
}

// Run main
main().catch(error => {
  console.error('Simulation failed:', error);
  process.exit(1);
});
