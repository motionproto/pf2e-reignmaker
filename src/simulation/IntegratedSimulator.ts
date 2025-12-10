/**
 * IntegratedSimulator - Tests actual game systems using real pipeline execution
 * 
 * Runs all 6 phases in order:
 * 1. STATUS - Turn initialization, fame reset, base unrest, decay
 * 2. RESOURCES - Collect from worksites and settlements
 * 3. UNREST - Roll for incidents based on unrest level
 * 4. EVENTS - Roll d20 vs eventDC for random events
 * 5. ACTIONS - Player actions via strategy
 * 6. UPKEEP - Feed settlements, support military, process builds
 * 
 * Uses:
 * - Domain layer for roll simulation (level-based DC/skill bonus tables)
 * - PipelineIntegrationAdapter for actual action execution
 * - Real pipelines from pipelineRegistry for events/incidents
 * - EconomicsService for resource collection
 * - Strategy system for action selection
 * - Fresh deep clone of base-world.json for each run
 */

import type { KingdomData } from '../actors/KingdomActor';
import { TurnPhase } from '../actors/KingdomActor';
import { logger } from '../utils/Logger';
import type { Strategy } from './strategies';
import { ExpansionStrategy } from './strategies/ExpansionStrategy';
import type { SimulationConfig, TurnResult, CheckResult, SimulationRunResult } from './SimulationConfig';
import { DEFAULT_CONFIG } from './SimulationConfig';

// Domain layer imports for roll simulation
import {
  simulateCheck,
  type OutcomeType
} from '../domain/checks/outcomeLogic';
import {
  getLevelBasedDC,
  getSkillBonusForLevel,
  calculateLevelForTurn,
  getUnrestPenalty
} from '../domain/checks/dcLogic';
import {
  isKingdomCollapsed,
} from '../domain/unrest/unrestLogic';
import {
  initializeExploredHexes,
} from '../domain/territory/exploreLogic';

// Unrest service for incident logic
import {
  getIncidentChance,
  getUnrestTier
} from '../services/domain/unrest/UnrestService';

// Economics service for resource collection
import { economicsService } from '../services/economics';

// Simulation data - now using PipelineRegistry
import type { CheckPipeline } from '../types/CheckPipeline';
import { 
  getAllActions,
  canPerformAction 
} from './ProductionDataAdapter';
import { createStarterKingdom } from './starter-kingdom';

// Auto-resolvers for pipeline data
import { prepareContextWithResolvedData, type UnifiedSimulationContext } from './pipeline-types';

// Settlement tier for gold income
const SETTLEMENT_GOLD_BY_TIER: Record<string, number> = {
  'Village': 1,
  'Town': 2,
  'City': 3,
  'Metropolis': 4
};

/**
 * IntegratedSimulator - Uses real pipeline execution with simulated rolls
 */
export class IntegratedSimulator {
  private config: SimulationConfig;
  private strategy: Strategy;
  private rng: () => number;
  private exploredHexIds: Set<string> = new Set();
  private currentTurn: number = 1;
  
  constructor(config: SimulationConfig, strategy?: Strategy) {
    this.config = config;
    this.strategy = strategy || new ExpansionStrategy(Math.random);
    
    if (config.seed !== undefined) {
      this.rng = this.seededRandom(config.seed);
    } else {
      this.rng = Math.random;
    }
  }
  
  private seededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }
  
  private rollD20(): number {
    return Math.floor(this.rng() * 20) + 1;
  }
  
  /**
   * Perform a skill check using domain layer
   */
  private performCheck(kingdom: KingdomData): {
    roll: number;
    total: number;
    dc: number;
    outcome: OutcomeType;
  } {
    const level = calculateLevelForTurn(this.currentTurn, this.config.turns, 16);
    const dc = getLevelBasedDC(level);
    const skillBonus = getSkillBonusForLevel(level);
    const unrestPenalty = getUnrestPenalty(kingdom.unrest || 0);
    
    const result = simulateCheck(
      () => this.rollD20(),
      skillBonus,
      dc,
      unrestPenalty
    );
    
    return {
      roll: result.roll,
      total: result.total,
      dc: result.dc,
      outcome: result.outcome
    };
  }
  
  /**
   * Initialize kingdom for simulation (fresh clone from base-world)
   * Uses simulation mode to operate without a real Foundry actor
   */
  async initialize(startingKingdom: KingdomData): Promise<void> {
    logger.info('[IntegratedSimulator] Initializing simulation');
    
    // Initialize pipeline registry (must be done before any actions/events/incidents)
    const { pipelineRegistry } = await import('../pipelines/PipelineRegistry');
    pipelineRegistry.initialize();
    
    const { enterSimulationMode, kingdomData } = await import('../stores/KingdomStore');
    const { get } = await import('svelte/store');
    
    // Log incoming kingdom state
    const incomingHexCount = startingKingdom.hexes?.filter(h => h.claimedBy === 'player').length || 0;
    logger.info(`[IntegratedSimulator] Incoming kingdom: ${incomingHexCount} claimed hexes, ${startingKingdom.settlements?.length || 0} settlements`);
    
    // Enter simulation mode with our kingdom data
    // This sets up in-memory data that doesn't require a Foundry actor
    enterSimulationMode(startingKingdom);
    
    // Verify the store was updated correctly
    const storedKingdom = get(kingdomData);
    const storedHexCount = storedKingdom.hexes?.filter(h => h.claimedBy === 'player').length || 0;
    logger.info(`[IntegratedSimulator] After store update: ${storedHexCount} claimed hexes in store`);
    
    if (storedHexCount === 0 && incomingHexCount > 0) {
      logger.error('[IntegratedSimulator] WARNING: Hexes were lost during store update!');
      // Log a sample of hexes to debug
      const sampleHexes = startingKingdom.hexes?.slice(0, 5).map(h => ({ id: h.id, claimedBy: h.claimedBy }));
      logger.info('[IntegratedSimulator] Sample incoming hexes:', sampleHexes);
      const storedSampleHexes = storedKingdom.hexes?.slice(0, 5).map(h => ({ id: h.id, claimedBy: h.claimedBy }));
      logger.info('[IntegratedSimulator] Sample stored hexes:', storedSampleHexes);
    }
    
    // Initialize explored hexes (claimed hexes + adjacent)
    this.exploredHexIds = initializeExploredHexes(startingKingdom);
    
    logger.info('[IntegratedSimulator] Kingdom initialized with', 
      storedHexCount, 'claimed hexes,',
      this.exploredHexIds.size, 'explored hexes');
  }
  
  /**
   * Run a single turn with ALL 6 phases
   */
  async runTurn(turnNumber: number): Promise<TurnResult> {
    this.currentTurn = turnNumber;
    const resourceChanges: Record<string, number> = {};
    const actions: CheckResult[] = [];
    const events: CheckResult[] = [];
    const incidents: CheckResult[] = [];
    
    const { kingdomData, updateKingdom } = await import('../stores/KingdomStore');
    const { get } = await import('svelte/store');
    
    // Update party level based on turn progression
    const partyLevel = calculateLevelForTurn(turnNumber, this.config.turns, 16);
    await updateKingdom(k => { k.partyLevel = partyLevel; });
    
    // === PHASE 1: STATUS ===
    const statusDetails = await this.runStatusPhase(resourceChanges);
    
    // === PHASE 2: RESOURCES ===
    const resourcesDetails = await this.runResourcesPhase(resourceChanges);
    
    // === PHASE 3: UNREST (incidents) ===
    const incidentResults = await this.runUnrestPhase(resourceChanges);
    incidents.push(...incidentResults);
    
    // === PHASE 4: EVENTS ===
    const eventResults = await this.runEventsPhase(resourceChanges);
    events.push(...eventResults);
    
    // === PHASE 5: ACTIONS ===
    const actionResults = await this.runActionPhase(resourceChanges);
    actions.push(...actionResults);
    
    // === PHASE 6: UPKEEP ===
    const upkeepDetails = await this.runUpkeepPhase(resourceChanges);
    
    // Get final kingdom state for this turn
    const kingdom = get(kingdomData);
    
    // Advance turn counter
    await updateKingdom(k => {
      k.currentTurn = turnNumber + 1;
    });
    
    return this.createTurnResult(
      turnNumber, 
      actions, 
      events, 
      incidents, 
      resourceChanges, 
      kingdom,
      statusDetails,
      resourcesDetails,
      upkeepDetails
    );
  }
  
  /**
   * PHASE 1: STATUS - Turn initialization
   * - Auto-explore 2 adjacent hexes (simulation only - speeds up testing)
   * - Process resource decay (lumber, stone, ore → 0)
   * - Reset fame to 1
   * - Apply base unrest from kingdom size
   * - Clean up expired modifiers
   */
  private async runStatusPhase(resourceChanges: Record<string, number>): Promise<{
    baseUnrest: number;
    fameReset: boolean;
    decayedResources: Record<string, number>;
    autoExploredHexes: number;
  }> {
    const { kingdomData, updateKingdom } = await import('../stores/KingdomStore');
    const { get } = await import('svelte/store');
    
    const kingdom = get(kingdomData);
    const decayedResources: Record<string, number> = {};
    
    // Auto-explore 2 adjacent hexes (simulation only)
    const { getExplorableHexes } = await import('../domain/territory/exploreLogic');
    const explorable = getExplorableHexes(kingdom, this.exploredHexIds);
    let autoExploredCount = 0;
    
    for (let i = 0; i < Math.min(2, explorable.length); i++) {
      this.exploredHexIds.add(explorable[i].id);
      autoExploredCount++;
    }
    
    // Process resource decay (non-storable resources reset to 0)
    const nonStorable = ['lumber', 'stone', 'ore'];
    
    await updateKingdom(k => {
      for (const resource of nonStorable) {
        const current = k.resources[resource] || 0;
        if (current > 0) {
          decayedResources[resource] = current;
          k.resources[resource] = 0;
          resourceChanges[resource] = (resourceChanges[resource] || 0) - current;
        }
      }
      
      // Reset fame to 1 at start of turn
      k.fame = 1;
      
      // Calculate base unrest from kingdom size
      // Rule: +1 unrest per 8 hexes (configurable)
      const claimedHexes = k.hexes?.filter(h => h.claimedBy === 'player').length || 0;
      const hexesPerUnrest = this.config.hexesPerUnrest || 8;
      const baseUnrest = Math.floor(claimedHexes / hexesPerUnrest);
      
      if (baseUnrest > 0) {
        k.unrest = Math.min(10, (k.unrest || 0) + baseUnrest);
        resourceChanges['unrest'] = (resourceChanges['unrest'] || 0) + baseUnrest;
      }
      
      // Clean up expired modifiers (those with duration that has passed)
      if (k.activeModifiers) {
        k.activeModifiers = k.activeModifiers.filter((mod: any) => {
          if (typeof mod.duration === 'number') {
            return mod.duration > 0;
          }
          return mod.duration !== 'immediate';
        });
      }
    });
    
    const updatedKingdom = get(kingdomData);
    const claimedHexes = updatedKingdom.hexes?.filter(h => h.claimedBy === 'player').length || 0;
    const hexesPerUnrest = this.config.hexesPerUnrest || 8;
    const baseUnrest = Math.floor(claimedHexes / hexesPerUnrest);
    
    logger.info(`[IntegratedSimulator] Turn ${this.currentTurn} STATUS: fame=1, baseUnrest=${baseUnrest}, decayed=${Object.keys(decayedResources).length} resources, auto-explored=${autoExploredCount} hexes`);
    
    return {
      baseUnrest,
      fameReset: true,
      decayedResources,
      autoExploredHexes: autoExploredCount
    };
  }
  
  /**
   * PHASE 2: RESOURCES - Collect from worksites and settlements
   * - Worksite production (food, lumber, stone, ore)
   * - Settlement gold income (if fed last turn)
   */
  private async runResourcesPhase(resourceChanges: Record<string, number>): Promise<{
    worksiteProduction: Record<string, number>;
    settlementGold: number;
  }> {
    const { kingdomData, updateKingdom } = await import('../stores/KingdomStore');
    const { get } = await import('svelte/store');
    
    const kingdom = get(kingdomData);
    const worksiteProduction: Record<string, number> = {};
    let settlementGold = 0;
    
    // Calculate worksite production from hexes using domain layer
    const { calculateTotalWorksiteProduction } = await import('../domain/territory/worksiteLogic');
    const worksiteProd = calculateTotalWorksiteProduction(kingdom);
    
    // Collect worksite resources
    await updateKingdom(k => {
      // Apply worksite production
      for (const [resource, amount] of Object.entries(worksiteProd)) {
        if (amount && amount > 0) {
          k.resources[resource] = (k.resources[resource] || 0) + amount;
          worksiteProduction[resource] = amount;
          resourceChanges[resource] = (resourceChanges[resource] || 0) + amount;
        }
      }
      
      // Calculate settlement gold income (settlements that were fed last turn)
      const fedSettlements = (k.settlements || []).filter(s => s.wasFedLastTurn);
      let goldIncome = 0;
      
      for (const settlement of fedSettlements) {
        const tierGold = SETTLEMENT_GOLD_BY_TIER[settlement.tier] || 0;
        goldIncome += tierGold;
      }
      
      if (goldIncome > 0) {
        k.resources.gold = (k.resources.gold || 0) + goldIncome;
        settlementGold = goldIncome;
        resourceChanges['gold'] = (resourceChanges['gold'] || 0) + goldIncome;
      }
    });
    
    const totalProduced = Object.values(worksiteProduction).reduce((a, b) => a + b, 0) + settlementGold;
    logger.info(`[IntegratedSimulator] Turn ${this.currentTurn} RESOURCES: produced ${totalProduced} total (${settlementGold} gold from settlements)`);
    
    return {
      worksiteProduction,
      settlementGold
    };
  }
  
  /**
   * PHASE 3: UNREST - Roll for incidents based on unrest level
   */
  private async runUnrestPhase(resourceChanges: Record<string, number>): Promise<CheckResult[]> {
    const results: CheckResult[] = [];
    const { kingdomData } = await import('../stores/KingdomStore');
    const { get } = await import('svelte/store');
    const kingdom = get(kingdomData);
    
    const unrest = kingdom.unrest || 0;
    const tier = getUnrestTier(unrest);
    
    // No incidents at tier 0
    if (tier === 0) {
      return results;
    }
    
    // Roll for incident occurrence
    const incidentChance = getIncidentChance(unrest);
    const roll = this.rng();
    const incidentTriggered = roll < incidentChance;
    
    if (!incidentTriggered) {
      logger.info(`[IntegratedSimulator] Turn ${this.currentTurn} UNREST: no incident (${Math.round(roll * 100)}% vs ${Math.round(incidentChance * 100)}%)`);
      return results;
    }
    
    // Select incident from pipeline registry
    try {
      const { pipelineRegistry } = await import('../pipelines/PipelineRegistry');
      
      // Convert tier to severity
      const severity = tier === 1 ? 'minor' : tier === 2 ? 'moderate' : 'major';
      
      // Get incidents matching severity
      const allIncidents = pipelineRegistry.getPipelinesByType('incident');
      const incidentsForSeverity = allIncidents.filter((p: any) => p.severity === severity);
      
      if (incidentsForSeverity.length === 0) {
        logger.warn(`[IntegratedSimulator] No incidents found for severity: ${severity}`);
        return results;
      }
      
      // Pick random incident
      const incident = incidentsForSeverity[Math.floor(this.rng() * incidentsForSeverity.length)];
      
      // Simulate skill check for resolution
      const checkResult = this.performCheck(kingdom);
      const { outcome, roll: checkRoll, total, dc } = checkResult;
      
      logger.info(`[IntegratedSimulator] Turn ${this.currentTurn} UNREST: ${incident.name} (${severity}), outcome: ${outcome}`);
      
      // Execute via pipeline
      const { PipelineIntegrationAdapter } = await import('../services/PipelineIntegrationAdapter');
      const resolutionData = PipelineIntegrationAdapter.createEmptyResolutionData();
      
      const currentKingdom = get(kingdomData);
      const pipelineResult = await PipelineIntegrationAdapter.executePipelineAction(
        incident.id,
        outcome,
        currentKingdom,
        undefined,
        resolutionData
      );
      
      if (!pipelineResult.success) {
        logger.warn(`[IntegratedSimulator] Incident pipeline failed: ${pipelineResult.error}`);
      }
      
      results.push({
        checkId: incident.id,
        checkName: incident.name,
        checkType: 'incident',
        outcome,
        roll: checkRoll,
        total,
        dc,
        resourceChanges: {},
        details: `${severity} incident`
      });
      
    } catch (error) {
      logger.error('[IntegratedSimulator] Error executing incident:', error);
    }
    
    return results;
  }
  
  /**
   * PHASE 4: EVENTS - Roll for random events
   */
  private async runEventsPhase(resourceChanges: Record<string, number>): Promise<CheckResult[]> {
    const results: CheckResult[] = [];
    const { kingdomData, updateKingdom } = await import('../stores/KingdomStore');
    const { get } = await import('svelte/store');
    const kingdom = get(kingdomData);
    
    // Get current event DC (defaults to 15)
    const eventDC = kingdom.eventDC || 15;
    
    // Roll d20 for event check
    const eventRoll = this.rollD20();
    const eventTriggered = eventRoll >= eventDC;
    
    // Update event DC for next turn
    let newDC: number;
    if (eventTriggered) {
      newDC = 15; // Reset to 15 on trigger
    } else {
      newDC = Math.max(6, eventDC - 5); // Reduce by 5, minimum 6
    }
    
    await updateKingdom(k => {
      k.eventDC = newDC;
    });
    
    if (!eventTriggered) {
      logger.info(`[IntegratedSimulator] Turn ${this.currentTurn} EVENTS: no event (rolled ${eventRoll} vs DC ${eventDC}), new DC: ${newDC}`);
      return results;
    }
    
    // Select event from pipeline registry
    try {
      const { pipelineRegistry } = await import('../pipelines/PipelineRegistry');
      
      // Get all events
      const allEvents = pipelineRegistry.getPipelinesByType('event');
      
      if (allEvents.length === 0) {
        logger.warn('[IntegratedSimulator] No events found in pipeline registry');
        return results;
      }
      
      // Pick random event
      const event = allEvents[Math.floor(this.rng() * allEvents.length)];
      
      // Simulate skill check for resolution
      const checkResult = this.performCheck(kingdom);
      const { outcome, roll: checkRoll, total, dc } = checkResult;
      
      logger.info(`[IntegratedSimulator] Turn ${this.currentTurn} EVENTS: ${event.name} (rolled ${eventRoll} vs DC ${eventDC}), outcome: ${outcome}`);
      
      // Execute via pipeline
      const { PipelineIntegrationAdapter } = await import('../services/PipelineIntegrationAdapter');
      const resolutionData = PipelineIntegrationAdapter.createEmptyResolutionData();
      
      const currentKingdom = get(kingdomData);
      const pipelineResult = await PipelineIntegrationAdapter.executePipelineAction(
        event.id,
        outcome,
        currentKingdom,
        undefined,
        resolutionData
      );
      
      if (!pipelineResult.success) {
        logger.warn(`[IntegratedSimulator] Event pipeline failed: ${pipelineResult.error}`);
      }
      
      results.push({
        checkId: event.id,
        checkName: event.name,
        checkType: 'event',
        outcome,
        roll: checkRoll,
        total,
        dc,
        resourceChanges: {},
        details: `Event DC was ${eventDC}`
      });
      
    } catch (error) {
      logger.error('[IntegratedSimulator] Error executing event:', error);
    }
    
    return results;
  }
  
  /**
   * PHASE 5: ACTIONS - Execute player actions using strategy and real pipelines
   * Now uses PipelineRegistry directly (all 27 actions available)
   */
  private async runActionPhase(resourceChanges: Record<string, number>): Promise<CheckResult[]> {
    const results: CheckResult[] = [];
    const { kingdomData } = await import('../stores/KingdomStore');
    const { get } = await import('svelte/store');
    
    // Get all action pipelines from registry (27 actions)
    const allActions = await getAllActions();
    
    for (let i = 0; i < this.config.playerCount; i++) {
      let kingdom = get(kingdomData);
      
      // Check for collapse
      if (isKingdomCollapsed(kingdom)) break;
      
      // Check which actions can be performed (uses pipeline requirements)
      const canPerform = (pipeline: CheckPipeline): boolean => {
        return canPerformAction(pipeline, kingdom, this.exploredHexIds);
      };
      
      // Strategy selects action from pipelines
      const selectedAction = this.strategy.selectAction(kingdom, allActions, canPerform);
      
      if (!selectedAction) {
        if (this.currentTurn === 1 && i === 0) {
          const available = allActions.filter(canPerform);
          logger.warn(`[IntegratedSimulator] Turn 1, Player 1: No action selected. Available: ${available.length}/${allActions.length}`);
          logger.warn(`  Available: ${available.map(a => a.id).join(', ') || 'NONE'}`);
        }
        continue;
      }
      
      // Execute action - try pipeline first, fall back to direct simulation
      let result: CheckResult | null = null;
      
      if (this.config.usePipelines !== false) {
        // Use pipeline with auto-resolved data (new approach)
        result = await this.executeActionViaPipeline(selectedAction, kingdom, resourceChanges);
      }
      
      // Fall back to direct simulation if pipeline failed or disabled
      if (!result) {
        result = await this.simulateActionDirectly(selectedAction, kingdom, resourceChanges);
      }
      
      if (result) {
        results.push(result);
        logger.info(`[IntegratedSimulator] Turn ${this.currentTurn} ACTIONS: Player ${i+1}: ${selectedAction.name} -> ${result.outcome}${result.details ? ` (${result.details})` : ''}`);
      }
    }
    
    return results;
  }
  
  /**
   * PHASE 6: UPKEEP - Feed settlements, support military, process builds
   */
  private async runUpkeepPhase(resourceChanges: Record<string, number>): Promise<{
    foodConsumed: number;
    settlementsUnfed: number;
    buildsCompleted: number;
  }> {
    const { kingdomData, updateKingdom } = await import('../stores/KingdomStore');
    const { get } = await import('svelte/store');
    
    let foodConsumed = 0;
    let settlementsUnfed = 0;
    let buildsCompleted = 0;
    
    // Feed settlements (1 food per settlement)
    await updateKingdom(k => {
      const settlements = k.settlements || [];
      const availableFood = k.resources.food || 0;
      
      // Calculate food needed
      const foodNeeded = settlements.length;
      const actualFoodUsed = Math.min(availableFood, foodNeeded);
      
      // Consume food
      k.resources.food = Math.max(0, availableFood - actualFoodUsed);
      foodConsumed = actualFoodUsed;
      resourceChanges['food'] = (resourceChanges['food'] || 0) - actualFoodUsed;
      
      // Mark settlements as fed/unfed
      const fedCount = actualFoodUsed;
      settlementsUnfed = settlements.length - fedCount;
      
      // Update wasFedLastTurn for each settlement
      settlements.forEach((settlement, index) => {
        settlement.wasFedLastTurn = index < fedCount;
      });
      
      // Unfed settlements cause unrest
      if (settlementsUnfed > 0) {
        k.unrest = Math.min(10, (k.unrest || 0) + settlementsUnfed);
        resourceChanges['unrest'] = (resourceChanges['unrest'] || 0) + settlementsUnfed;
      }
    });
    
    // Process build queue (complete any projects at 100%)
    await updateKingdom(k => {
      const buildQueue = k.buildQueue || [];
      const completedProjects: any[] = [];
      
      for (const project of buildQueue) {
        // Check if project is complete (all resources invested)
        if (project.progress >= 100 || project.isCompleted) {
          completedProjects.push(project);
          buildsCompleted++;
          
          // Add structure to settlement
          const settlement = k.settlements?.find(s => s.name === project.settlementName);
          if (settlement) {
            settlement.structureIds = settlement.structureIds || [];
            settlement.structureIds.push(project.structureId);
          }
        }
      }
      
      // Remove completed projects from queue
      k.buildQueue = buildQueue.filter(p => !completedProjects.includes(p));
    });
    
    logger.info(`[IntegratedSimulator] Turn ${this.currentTurn} UPKEEP: fed ${foodConsumed} settlements, ${settlementsUnfed} unfed, ${buildsCompleted} builds completed`);
    
    return {
      foodConsumed,
      settlementsUnfed,
      buildsCompleted
    };
  }
  
  /**
   * Execute action via pipeline with auto-resolved data
   * Uses the new pipeline-types system to provide proper context data
   */
  private async executeActionViaPipeline(
    action: CheckPipeline,
    kingdom: KingdomData,
    resourceChanges: Record<string, number>
  ): Promise<CheckResult | null> {
    const { PipelineIntegrationAdapter } = await import('../services/PipelineIntegrationAdapter');
    
    // Simulate skill check
    const checkResult = this.performCheck(kingdom);
    const { outcome, roll, total, dc } = checkResult;
    
    // Create simulation context for auto-resolver
    const simCtx: UnifiedSimulationContext = {
      kingdom,
      exploredHexIds: this.exploredHexIds,
      outcome,
      turn: this.currentTurn,
      proficiencyRank: 2  // Assume trained for most actions
    };
    
    // Get auto-resolved data for this action
    const resolvedData = prepareContextWithResolvedData(action.id, 'action', simCtx);
    
    if (resolvedData === null) {
      // Auto-resolver returned null - action cannot be performed with current state
      logger.debug(`[IntegratedSimulator] Action ${action.id} cannot be resolved with current state`);
      return null;
    }
    
    // Create resolution data structure expected by pipeline
    const resolutionData = PipelineIntegrationAdapter.createEmptyResolutionData();
    
    // Merge auto-resolved data into resolution data
    if (resolvedData.resolutionData?.compoundData) {
      Object.assign(resolutionData.compoundData, resolvedData.resolutionData.compoundData);
    }
    if (resolvedData.resolutionData?.customComponentData) {
      // customComponentData starts as null, so we need to initialize it
      if (!resolutionData.customComponentData) {
        resolutionData.customComponentData = {};
      }
      Object.assign(resolutionData.customComponentData, resolvedData.resolutionData.customComponentData);
    }
    
    // Execute pipeline with resolved data
    try {
      const pipelineResult = await PipelineIntegrationAdapter.executePipelineAction(
        action.id,
        outcome,
        kingdom,
        resolvedData.metadata,  // Pass metadata
        resolutionData
      );
      
      if (!pipelineResult.success) {
        logger.warn(`[IntegratedSimulator] Pipeline ${action.id} failed: ${pipelineResult.error}`);
        // Fall back to direct simulation
        return this.simulateActionDirectly(action, kingdom, resourceChanges);
      }
      
      return {
        checkId: action.id,
        checkName: action.name,
        checkType: 'action',
        outcome,
        roll,
        total,
        dc,
        resourceChanges: {},
        details: `via pipeline`
      };
      
    } catch (error) {
      logger.error(`[IntegratedSimulator] Error executing pipeline ${action.id}:`, error);
      // Fall back to direct simulation
      return this.simulateActionDirectly(action, kingdom, resourceChanges);
    }
  }
  
  /**
   * Fallback action execution - applies pipeline modifiers only
   * Used when pipeline execution fails
   */
  private async simulateActionDirectly(
    action: CheckPipeline, 
    kingdom: KingdomData,
    resourceChanges: Record<string, number>
  ): Promise<CheckResult | null> {
    // Simulate skill check
    const checkResult = this.performCheck(kingdom);
    const { outcome, roll, total, dc } = checkResult;
    
    // Use the simple fallback that just applies modifiers
    return this.executeFallback(action, outcome, roll, total, dc, kingdom, resourceChanges);
  }
  
  /**
   * Fallback execution using domain layer (when pipeline unavailable)
   */
  private async executeFallback(
    action: any,
    outcome: OutcomeType,
    roll: number,
    total: number,
    dc: number,
    kingdom: KingdomData,
    resourceChanges: Record<string, number>
  ): Promise<CheckResult> {
    const { updateKingdom } = await import('../stores/KingdomStore');
    
    // Apply outcome modifiers
    const outcomeData = action.outcomes[outcome];
    if (outcomeData?.modifiers) {
      await updateKingdom(k => {
        for (const mod of outcomeData.modifiers) {
          if (mod.type === 'static' && mod.resource) {
            const value = mod.negative ? -(mod.value || 0) : (mod.value || 0);
            if (mod.resource === 'unrest') {
              k.unrest = Math.max(0, (k.unrest || 0) + value);
            } else if (mod.resource === 'fame') {
              k.fame = Math.max(0, (k.fame || 0) + value);
            } else if (k.resources[mod.resource] !== undefined) {
              k.resources[mod.resource] = Math.max(0, k.resources[mod.resource] + value);
            }
            resourceChanges[mod.resource] = (resourceChanges[mod.resource] || 0) + value;
          }
        }
        
        // Critical success grants fame
        if (outcome === 'criticalSuccess') {
          k.fame = (k.fame || 0) + 1;
          resourceChanges.fame = (resourceChanges.fame || 0) + 1;
        }
      });
    }
    
    return {
      checkId: action.id,
      checkName: action.name,
      checkType: 'action',
      outcome,
      roll,
      total,
      dc,
      resourceChanges: {},
      details: '(fallback)'
    };
  }
  
  /**
   * Create turn result summary
   */
  private createTurnResult(
    turn: number,
    actions: CheckResult[],
    events: CheckResult[],
    incidents: CheckResult[],
    resourceChanges: Record<string, number>,
    kingdom: KingdomData,
    statusDetails: { baseUnrest: number; fameReset: boolean; decayedResources: Record<string, number>; autoExploredHexes: number },
    resourcesDetails: { worksiteProduction: Record<string, number>; settlementGold: number },
    upkeepDetails: { foodConsumed: number; settlementsUnfed: number; buildsCompleted: number }
  ): TurnResult {
    return {
      turn,
      actions,
      events,
      incidents,
      totalResourceChanges: resourceChanges,
      phaseDetails: {
        status: {
          baseUnrest: statusDetails.baseUnrest,
          fameReset: statusDetails.fameReset
        },
        resources: {
          worksiteProduction: resourcesDetails.worksiteProduction,
          settlementGold: resourcesDetails.settlementGold
        },
        unrest: { 
          incidentTriggered: incidents.length > 0,
          incidentName: incidents[0]?.checkName
        },
        events: { 
          eventTriggered: events.length > 0, 
          eventName: events[0]?.checkName,
          eventDC: kingdom.eventDC || 15
        },
        actions: { actionsTaken: actions.map(a => a.checkId) },
        upkeep: {
          foodConsumed: upkeepDetails.foodConsumed,
          fameConverted: 0,
          unrestReduced: 0
        }
      },
      kingdomSnapshot: {
        resources: { ...kingdom.resources },
        unrest: kingdom.unrest || 0,
        fame: kingdom.fame || 0,
        hexCount: kingdom.hexes?.filter(h => h.claimedBy === 'player').length || 0,
        settlementCount: kingdom.settlements?.length || 0,
        armyCount: kingdom.armies?.length || 0
      }
    };
  }
  
  /**
   * Run complete simulation
   * Each run starts with a fresh deep clone of base-world.json
   */
  async runSimulation(startingKingdom?: KingdomData): Promise<SimulationRunResult> {
    // Use provided kingdom or create fresh from base-world.json
    const kingdom = startingKingdom || createStarterKingdom();
    
    await this.initialize(kingdom);
    
    const turns: TurnResult[] = [];
    const outcomeDistribution: Record<string, number> = {
      criticalSuccess: 0, success: 0, failure: 0, criticalFailure: 0
    };
    let peakUnrest = 0;
    let collapseOccurred = false;
    let bankruptcyTurns = 0;
    
    for (let turn = 1; turn <= this.config.turns; turn++) {
      const turnResult = await this.runTurn(turn);
      turns.push(turnResult);
      
      // Track outcomes from all check types
      for (const check of [...turnResult.actions, ...turnResult.events, ...turnResult.incidents]) {
        outcomeDistribution[check.outcome]++;
      }
      
      // Track metrics
      if (turnResult.kingdomSnapshot.unrest > peakUnrest) {
        peakUnrest = turnResult.kingdomSnapshot.unrest;
      }
      if (turnResult.kingdomSnapshot.unrest >= 10) {
        collapseOccurred = true;
        logger.warn(`[IntegratedSimulator] Kingdom collapsed at turn ${turn}!`);
        break;
      }
      if (turnResult.kingdomSnapshot.resources.gold <= 0) {
        bankruptcyTurns++;
      }
      
      // Progress log every 10 turns
      if (turn % 10 === 0) {
        const pd = turnResult.phaseDetails;
        const snap = turnResult.kingdomSnapshot;
        logger.info(`[IntegratedSimulator] Turn ${turn}: hexes=${snap.hexCount}, unrest=${snap.unrest}, gold=${snap.resources.gold}, food=${snap.resources.food}, events=${turnResult.events.length}, incidents=${turnResult.incidents.length}`);
      }
    }
    
    // Get final state before exiting simulation mode
    const { kingdomData, exitSimulationMode } = await import('../stores/KingdomStore');
    const { get } = await import('svelte/store');
    const finalState = get(kingdomData);
    
    // Exit simulation mode to restore normal Foundry operation
    exitSimulationMode();
    
    logger.info(`[IntegratedSimulator] Simulation complete: ${turns.length} turns, collapse=${collapseOccurred}`);
    
    return {
      runNumber: 0,
      turns,
      finalState,
      outcomeDistribution,
      peakUnrest,
      collapseOccurred,
      bankruptcyTurns
    };
  }
}

/**
 * Quick test function - run a short simulation
 */
export async function testIntegratedSimulation(): Promise<SimulationRunResult> {
  logger.info('=== INTEGRATED SIMULATION TEST (ALL 6 PHASES) ===');
  
  const config = { ...DEFAULT_CONFIG, turns: 10, playerCount: 4 };
  const simulator = new IntegratedSimulator(config);
  
  // Create fresh kingdom and verify it
  const starterKingdom = createStarterKingdom();
  const initialHexCount = starterKingdom.hexes?.filter(h => h.claimedBy === 'player').length || 0;
  logger.info(`[TEST] Starter kingdom has ${initialHexCount} claimed hexes`);
  logger.info(`[TEST] Starter kingdom settlements: ${starterKingdom.settlements?.length}`);
  logger.info(`[TEST] Starter kingdom resources: gold=${starterKingdom.resources?.gold}, food=${starterKingdom.resources?.food}`);
  
  // Run simulation
  const result = await simulator.runSimulation(starterKingdom);
  
  logger.info('=== TEST COMPLETE ===');
  logger.info(`Turns completed: ${result.turns.length}`);
  logger.info(`Final hexes: ${result.finalState.hexes?.filter(h => h.claimedBy === 'player').length}`);
  logger.info(`Final unrest: ${result.finalState.unrest}`);
  logger.info(`Final gold: ${result.finalState.resources?.gold}`);
  logger.info(`Final food: ${result.finalState.resources?.food}`);
  logger.info(`Collapse: ${result.collapseOccurred}`);
  logger.info('Outcome distribution:', result.outcomeDistribution);
  
  // Count events and incidents
  const totalEvents = result.turns.reduce((sum, t) => sum + t.events.length, 0);
  const totalIncidents = result.turns.reduce((sum, t) => sum + t.incidents.length, 0);
  logger.info(`Total events: ${totalEvents}, Total incidents: ${totalIncidents}`);
  
  // Output debug info
  await writeDebugOutput(result);
  
  return result;
}

/**
 * Write simulation results to a debug file for analysis
 */
async function writeDebugOutput(result: SimulationRunResult): Promise<void> {
  const debugData = {
    timestamp: new Date().toISOString(),
    summary: {
      turnsCompleted: result.turns.length,
      collapsed: result.collapseOccurred,
      peakUnrest: result.peakUnrest,
      bankruptcyTurns: result.bankruptcyTurns,
      finalHexCount: result.finalState.hexes?.filter(h => h.claimedBy === 'player').length || 0,
      finalSettlements: result.finalState.settlements?.length || 0,
      finalResources: result.finalState.resources,
      finalUnrest: result.finalState.unrest,
      outcomeDistribution: result.outcomeDistribution
    },
    turnSummaries: result.turns.map(t => ({
      turn: t.turn,
      hexCount: t.kingdomSnapshot.hexCount,
      unrest: t.kingdomSnapshot.unrest,
      gold: t.kingdomSnapshot.resources.gold,
      food: t.kingdomSnapshot.resources.food,
      actionsCount: t.actions.length,
      eventsCount: t.events.length,
      incidentsCount: t.incidents.length,
      actions: t.actions.map(a => `${a.checkId}: ${a.outcome}`),
      phaseDetails: t.phaseDetails
    }))
  };
  
  const jsonOutput = JSON.stringify(debugData, null, 2);
  
  // Log to console
  console.log('=== SIMULATION DEBUG OUTPUT ===');
  console.log(jsonOutput);
  
  // Save to localStorage
  try {
    localStorage.setItem('simulation-debug-output', jsonOutput);
    console.log('📁 Debug output saved to localStorage key: "simulation-debug-output"');
  } catch (e) {
    console.warn('Could not save to localStorage:', e);
  }
  
  // Use FileSaver-style download that works in Foundry
  try {
    const blob = new Blob([jsonOutput], { type: 'application/json;charset=utf-8' });
    
    // Try native saveAs if available (Foundry might have it)
    if (typeof (window as any).saveAs === 'function') {
      (window as any).saveAs(blob, 'simulation-debug-latest.json');
      console.log('📥 Downloaded via saveAs');
      return;
    }
    
    // Fallback: Create object URL and trigger download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = url;
    link.download = 'simulation-debug-latest.json';
    link.setAttribute('download', 'simulation-debug-latest.json');
    
    // Append to body, click, then cleanup
    document.body.appendChild(link);
    
    // Use setTimeout to ensure the element is in the DOM
    setTimeout(() => {
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log('📥 Debug output download triggered: simulation-debug-latest.json');
      }, 100);
    }, 0);
    
  } catch (e) {
    console.error('❌ Could not trigger download:', e);
    console.log('📋 Copy the JSON from console above or use: copy(localStorage.getItem("simulation-debug-output"))');
  }
}

/**
 * Run full simulation (120 turns)
 */
export async function runFullIntegratedSimulation(): Promise<SimulationRunResult> {
  logger.info('=== FULL INTEGRATED SIMULATION (ALL 6 PHASES) ===');
  
  const config = { ...DEFAULT_CONFIG, turns: 120, playerCount: 4 };
  const simulator = new IntegratedSimulator(config);
  
  // Create fresh kingdom from base-world.json
  return simulator.runSimulation(createStarterKingdom());
}
