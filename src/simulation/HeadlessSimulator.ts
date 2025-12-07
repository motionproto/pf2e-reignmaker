/**
 * HeadlessSimulator - Production-based Simulation Engine
 * 
 * Uses actual domain layer pure functions and real services
 * instead of reimplementing game logic with hardcoded values.
 * 
 * Key differences from KingdomSimulator:
 * - Uses domain layer functions (src/domain/)
 * - Uses StructuresService for real structure data
 * - Uses EconomicsService for real production calculations
 * - No fallback values - uses actual game rules
 */

import type { KingdomData, Settlement } from '../actors/KingdomActor';
import type { SimulationConfig, TurnResult, CheckResult, SimulationRunResult } from './SimulationConfig';
import type { Strategy } from './strategies';

// Domain layer imports - pure game logic
import {
  applyClaimHexes,
  validateClaimHexes
} from '../domain/territory/claimHexesLogic';
import {
  getAdjacentHexIds,
  getClaimableHexes,
  isAdjacentToClaimed
} from '../domain/territory/adjacencyLogic';
import {
  initializeExploredHexes,
  getExplorableHexes,
  applyExploreHexes,
  hasUnexploredAdjacentHexes
} from '../domain/territory/exploreLogic';
import {
  applyCreateWorksite,
  getWorksiteEligibleHexes,
  calculateTotalWorksiteProduction,
  scoreTerrainByProductionNeed
} from '../domain/territory/worksiteLogic';
import {
  calculateDegreeOfSuccess,
  simulateCheck,
  isSuccess,
  isCritical
} from '../domain/checks/outcomeLogic';
import {
  getLevelBasedDC,
  getSkillBonusForLevel,
  calculateLevelForTurn,
  getUnrestPenalty
} from '../domain/checks/dcLogic';
import {
  applyResourceDecay
} from '../domain/resources/decayLogic';
import {
  applyResourceCollection,
  applyResourceCosts,
  canAfford,
  calculateSettlementGoldIncome
} from '../domain/resources/collectionLogic';
import {
  getUnrestTier,
  calculateSizeBasedUnrest,
  applyUnrestChange,
  isKingdomCollapsed,
  calculatePassiveUnrestReduction,
  applyPassiveUnrestReduction
} from '../domain/unrest/unrestLogic';
import {
  checkForIncident,
  getIncidentChanceFromUnrest,
  getIncidentSeverityFromUnrest
} from '../domain/unrest/incidentLogic';
import {
  performFeeding,
  sortByFeedingPriority,
  canFeedAllSettlements,
  calculateFoodDeficit
} from '../domain/settlements/feedingLogic';
import {
  getTierNumber,
  getMaxStructures,
  hasStructureCapacity,
  canUpgradeSettlement
} from '../domain/settlements/tierLogic';
import {
  calculateTotalFoodStorage,
  calculateTotalArmySupport,
  applyFoodCapacityLimit,
  calculateUnsupportedArmies
} from '../domain/structures/capacityLogic';
import {
  calculateTotalStructureEffects,
  applyPassiveStructureEffects
} from '../domain/structures/effectsLogic';

// Simulation data (events, incidents)
import { SIM_EVENTS, SIM_INCIDENTS, type SimCheck } from './SimulationData';

// Production data adapter - uses real StructuresService
import { 
  ALL_ACTIONS, 
  getAllStructures, 
  getAffordableStructures,
  canPerformAction 
} from './ProductionDataAdapter';

type OutcomeType = 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';

/**
 * HeadlessSimulator - Uses real game logic via domain layer
 */
export class HeadlessSimulator {
  private config: SimulationConfig;
  private strategy: Strategy;
  private rng: () => number;
  private exploredHexIds: Set<string> = new Set();
  private eventDC: number = 15;
  private currentTurn: number = 1;
  
  constructor(config: SimulationConfig, strategy: Strategy) {
    this.config = config;
    this.strategy = strategy;
    
    // Structures are loaded on-demand from ProductionDataAdapter
    // which reads directly from structures.json (headless-compatible)
    
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
  
  private rollDiceNotation(notation: string): number {
    const regex = /^(\d+)d(\d+)([+-]?\d+)?$/;
    const match = notation.match(regex);
    if (!match) return 0;
    
    const count = parseInt(match[1], 10);
    const sides = parseInt(match[2], 10);
    const modifier = match[3] ? parseInt(match[3], 10) : 0;
    
    let total = 0;
    for (let i = 0; i < count; i++) {
      total += Math.floor(this.rng() * sides) + 1;
    }
    return total + modifier;
  }
  
  /**
   * Perform a skill check using domain layer functions
   */
  private performCheck(kingdom: KingdomData): {
    roll: number;
    total: number;
    dc: number;
    outcome: OutcomeType;
    level: number;
    unrestPenalty: number;
  } {
    const level = calculateLevelForTurn(this.currentTurn, this.config.turns, 16);
    const dc = getLevelBasedDC(level);
    const skillBonus = getSkillBonusForLevel(level);
    const unrestPenalty = getUnrestPenalty(kingdom.unrest || 0);
    
    const roll = this.rollD20();
    const total = roll + skillBonus + unrestPenalty;
    const outcome = calculateDegreeOfSuccess(total, dc, roll);
    
    return { roll, total, dc, outcome, level, unrestPenalty };
  }
  
  /**
   * Status Phase - Using domain layer
   */
  private simulateStatusPhase(kingdom: KingdomData, resourceChanges: Record<string, number>): any {
    // Resource decay using domain layer
    const decayResult = applyResourceDecay(kingdom);
    
    resourceChanges.lumber = (resourceChanges.lumber || 0) - decayResult.decayed.lumber;
    resourceChanges.stone = (resourceChanges.stone || 0) - decayResult.decayed.stone;
    resourceChanges.ore = (resourceChanges.ore || 0) - decayResult.decayed.ore;
    
    // Size-based unrest using domain layer
    const claimedHexCount = kingdom.hexes?.filter(h => h.claimedBy === 'player').length || 0;
    const sizeUnrest = calculateSizeBasedUnrest(claimedHexCount, this.config.hexesPerUnrest);
    
    if (sizeUnrest > 0) {
      applyUnrestChange(kingdom, sizeUnrest);
      resourceChanges.unrest = (resourceChanges.unrest || 0) + sizeUnrest;
    }
    
    return {
      resourcesDecayed: decayResult.decayed,
      sizeUnrest,
      currentSize: claimedHexCount
    };
  }
  
  /**
   * Resources Phase - Using domain layer and real services
   */
  private simulateResourcesPhase(kingdom: KingdomData, resourceChanges: Record<string, number>): any {
    // Calculate worksite production using domain layer
    const worksiteProduction = calculateTotalWorksiteProduction(kingdom);
    
    // Apply production
    applyResourceCollection(kingdom, worksiteProduction);
    
    for (const [resource, amount] of Object.entries(worksiteProduction)) {
      if (amount) {
        resourceChanges[resource] = (resourceChanges[resource] || 0) + amount;
      }
    }
    
    // Gold from fed settlements using domain layer
    const settlementGold = calculateSettlementGoldIncome(kingdom);
    if (settlementGold > 0) {
      kingdom.resources.gold = (kingdom.resources.gold || 0) + settlementGold;
      resourceChanges.gold = (resourceChanges.gold || 0) + settlementGold;
    }
    
    return {
      worksiteProduction,
      settlementGold
    };
  }
  
  /**
   * Unrest Phase - Using domain layer
   */
  private simulateUnrestPhase(kingdom: KingdomData, resourceChanges: Record<string, number>): {
    incidents: CheckResult[];
    details: any;
  } {
    const incidents: CheckResult[] = [];
    
    // Check for incident using domain layer
    const incidentCheck = checkForIncident(kingdom.unrest || 0, this.rng());
    
    if (incidentCheck.triggered && incidentCheck.severity) {
      // Get incidents of appropriate severity
      const severityIncidents = SIM_INCIDENTS.filter(i => 
        i.severity === incidentCheck.severity
      );
      
      if (severityIncidents.length > 0) {
        const incident = severityIncidents[Math.floor(this.rng() * severityIncidents.length)];
        const checkResult = this.performCheck(kingdom);
        
        const outcomeData = incident.outcomes[checkResult.outcome];
        if (outcomeData?.modifiers) {
          this.applyModifiers(kingdom, outcomeData.modifiers, resourceChanges);
        }
        
        if (checkResult.outcome === 'criticalSuccess') {
          kingdom.fame = (kingdom.fame || 0) + 1;
          resourceChanges.fame = (resourceChanges.fame || 0) + 1;
        }
        
        incidents.push({
          checkId: incident.id,
          checkName: incident.name,
          checkType: 'incident',
          outcome: checkResult.outcome,
          roll: checkResult.roll,
          total: checkResult.total,
          dc: checkResult.dc,
          resourceChanges: {}
        });
      }
    }
    
    return {
      incidents,
      details: {
        incidentChance: incidentCheck.chance,
        triggered: incidentCheck.triggered,
        severity: incidentCheck.severity
      }
    };
  }
  
  /**
   * Events Phase
   */
  private simulateEventsPhase(kingdom: KingdomData, resourceChanges: Record<string, number>): {
    events: CheckResult[];
    details: any;
  } {
    const events: CheckResult[] = [];
    
    // Roll for event
    const eventRoll = this.rollD20();
    const eventOccurs = eventRoll >= this.eventDC;
    
    if (eventOccurs && SIM_EVENTS.length > 0) {
      const event = SIM_EVENTS[Math.floor(this.rng() * SIM_EVENTS.length)];
      const checkResult = this.performCheck(kingdom);
      
      const outcomeData = event.outcomes[checkResult.outcome];
      if (outcomeData?.modifiers) {
        this.applyModifiers(kingdom, outcomeData.modifiers, resourceChanges);
      }
      
      if (checkResult.outcome === 'criticalSuccess') {
        kingdom.fame = (kingdom.fame || 0) + 1;
        resourceChanges.fame = (resourceChanges.fame || 0) + 1;
      }
      
      events.push({
        checkId: event.id,
        checkName: event.name,
        checkType: 'event',
        outcome: checkResult.outcome,
        roll: checkResult.roll,
        total: checkResult.total,
        dc: checkResult.dc,
        resourceChanges: {}
      });
      
      // Adjust event DC
      if (isSuccess(checkResult.outcome)) {
        this.eventDC = Math.min(20, this.eventDC + 1);
      }
    } else if (!eventOccurs) {
      this.eventDC = Math.max(1, this.eventDC - 1);
    }
    
    return {
      events,
      details: { eventRoll, eventDC: this.eventDC, eventOccurred: eventOccurs }
    };
  }
  
  /**
   * Actions Phase - Using domain layer for action execution
   */
  private simulateActionsPhase(kingdom: KingdomData, resourceChanges: Record<string, number>): CheckResult[] {
    const results: CheckResult[] = [];
    const actionsPerTurn = this.config.playersCount;
    
    for (let i = 0; i < actionsPerTurn; i++) {
      // Check for collapse
      if (isKingdomCollapsed(kingdom)) {
        break;
      }
      
      // Convert actions to SimCheck format for strategy compatibility
      const simActions: SimCheck[] = ALL_ACTIONS.map(a => ({
        id: a.id,
        name: a.name,
        checkType: 'action' as const,
        category: a.category,
        cost: a.cost,
        outcomes: a.outcomes
      }));
      
      // Create canPerform function that checks action availability
      const canPerform = (check: SimCheck): boolean => {
        const action = ALL_ACTIONS.find(a => a.id === check.id);
        if (!action) return false;
        return canPerformAction(action, kingdom, this.exploredHexIds);
      };
      
      // Strategy selects action using correct interface
      const selectedSimAction = this.strategy.selectAction(
        kingdom,
        simActions,
        canPerform
      );
      
      if (!selectedSimAction) {
        // Debug: log what actions were available
        const availableActions = simActions.filter(a => canPerform(a));
        if (this.currentTurn === 1 && i === 0) {
          console.log(`[HeadlessSimulator] Turn ${this.currentTurn}, Player ${i+1}: No action selected. Available: ${availableActions.length}/${simActions.length}`);
          console.log(`  Available actions: ${availableActions.map(a => a.id).join(', ') || 'NONE'}`);
          console.log(`  Kingdom state: gold=${kingdom.resources.gold}, food=${kingdom.resources.food}, lumber=${kingdom.resources.lumber}, settlements=${kingdom.settlements?.length}, hexes=${kingdom.hexes?.filter(h => h.claimedBy === 'player').length}, unrest=${kingdom.unrest}`);
          
          // Show why each action is unavailable
          for (const action of simActions) {
            if (!canPerform(action)) {
              console.log(`  BLOCKED: ${action.id}`);
            }
          }
        }
        continue;
      }
      
      // Find the full action definition
      const action = ALL_ACTIONS.find(a => a.id === selectedSimAction.id);
      if (!action) continue;
      
      // Execute action
      const result = this.executeAction(action, kingdom, resourceChanges);
      results.push(result);
    }
    
    return results;
  }
  
  /**
   * Execute a single action - using domain layer for effects
   */
  private executeAction(action: any, kingdom: KingdomData, resourceChanges: Record<string, number>): CheckResult {
    const checkResult = this.performCheck(kingdom);
    const { outcome, roll, total, dc } = checkResult;
    
    // Pay costs
    if (action.cost) {
      applyResourceCosts(kingdom, action.cost);
      for (const [resource, amount] of Object.entries(action.cost)) {
        resourceChanges[resource] = (resourceChanges[resource] || 0) - (amount as number);
      }
    }
    
    // Critical success grants fame
    if (outcome === 'criticalSuccess') {
      kingdom.fame = (kingdom.fame || 0) + 1;
      resourceChanges.fame = (resourceChanges.fame || 0) + 1;
    }
    
    // Apply outcome modifiers
    const outcomeData = action.outcomes[outcome];
    if (outcomeData?.modifiers) {
      this.applyModifiers(kingdom, outcomeData.modifiers, resourceChanges);
    }
    
    // Execute action-specific effects using domain layer
    const details = this.executeActionEffects(action, outcome, kingdom, resourceChanges);
    
    return {
      checkId: action.id,
      checkName: action.name,
      checkType: 'action',
      outcome,
      roll,
      total,
      dc,
      resourceChanges: {},
      details
    };
  }
  
  /**
   * Execute action-specific effects using domain layer functions
   */
  private executeActionEffects(
    action: any,
    outcome: OutcomeType,
    kingdom: KingdomData,
    resourceChanges: Record<string, number>
  ): string | undefined {
    if (outcome === 'criticalFailure') return undefined;
    if (outcome === 'failure' && !['send-scouts', 'harvest-resources'].includes(action.id)) return undefined;
    
    switch (action.id) {
      case 'claim-hexes': {
        if (outcome === 'failure') return undefined;
        
        const hexCount = outcome === 'criticalSuccess' ? 2 : 1;
        const claimable = getClaimableHexes(kingdom, this.exploredHexIds);
        
        // Sort by production value using domain layer
        const currentProduction = calculateTotalWorksiteProduction(kingdom);
        claimable.sort((a, b) => {
          const scoreA = scoreTerrainByProductionNeed(a.terrain, currentProduction);
          const scoreB = scoreTerrainByProductionNeed(b.terrain, currentProduction);
          return scoreB - scoreA;
        });
        
        const hexesToClaim = claimable.slice(0, hexCount).map(h => h.id);
        
        if (hexesToClaim.length > 0) {
          // Use domain layer for claiming
          const claimResult = applyClaimHexes(kingdom, hexesToClaim);
          
          // Add newly revealed hexes to explored set
          for (const hexId of claimResult.newlyExploredHexIds) {
            this.exploredHexIds.add(hexId);
          }
          
          const claimedInfo = hexesToClaim.map(id => {
            const hex = kingdom.hexes?.find(h => h.id === id);
            return hex ? `${hex.terrain || 'hex'} (${id})` : id;
          });
          
          return `Claimed: ${claimedInfo.join(', ')}`;
        }
        return undefined;
      }
      
      case 'send-scouts': {
        const revealCount = outcome === 'criticalSuccess' ? 4 : outcome === 'success' ? 2 : 1;
        const explorable = getExplorableHexes(kingdom, this.exploredHexIds);
        
        const hexesToExplore = explorable.slice(0, revealCount).map(h => h.id);
        const explored = applyExploreHexes(this.exploredHexIds, hexesToExplore);
        
        return explored > 0 ? `Explored ${explored} hex${explored > 1 ? 'es' : ''}` : 'No new hexes';
      }
      
      case 'create-worksite': {
        if (outcome === 'failure') return undefined;
        
        const eligible = getWorksiteEligibleHexes(kingdom);
        
        if (eligible.length > 0) {
          // Sort by production need
          const currentProduction = calculateTotalWorksiteProduction(kingdom);
          eligible.sort((a, b) => {
            const scoreA = scoreTerrainByProductionNeed(a.hex.terrain, currentProduction);
            const scoreB = scoreTerrainByProductionNeed(b.hex.terrain, currentProduction);
            return scoreB - scoreA;
          });
          
          const { hex, validTypes } = eligible[0];
          const worksiteType = validTypes[0];
          
          // Use domain layer for worksite creation
          applyCreateWorksite(kingdom, hex.id, worksiteType);
          
          return `${worksiteType} on ${hex.terrain || 'hex'}`;
        }
        return 'No eligible hex';
      }
      
      case 'build-structure': {
        if (outcome === 'failure') return undefined;
        
        const settlement = kingdom.settlements?.find(s => {
          const queueCount = (kingdom.buildQueue || []).filter(p => p.settlementId === s.id).length;
          return hasStructureCapacity(s, queueCount);
        });
        
        if (settlement) {
          const affordable = getAffordableStructures(kingdom, settlement);
          
          if (affordable.length > 0) {
            // Prioritize structures with unrest reduction
            affordable.sort((a, b) => {
              const aReduction = a.effects.unrestReduction || 0;
              const bReduction = b.effects.unrestReduction || 0;
              return bReduction - aReduction;
            });
            
            const structure = affordable[0];
            
            // Add to build queue
            kingdom.buildQueue = kingdom.buildQueue || [];
            kingdom.buildQueue.push({
              id: `build-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              structureId: structure.id,
              structureName: structure.name,
              settlementId: settlement.id,
              settlementName: settlement.name,
              requiredCost: { ...structure.cost },
              paidCost: {}
            });
            
            return `Queued ${structure.name}`;
          }
        }
        return 'No settlement available';
      }
      
      case 'deal-with-unrest': {
        if (outcome === 'failure') return undefined;
        
        const reduction = outcome === 'criticalSuccess' ? 2 : 1;
        const oldUnrest = kingdom.unrest || 0;
        applyUnrestChange(kingdom, -reduction);
        const actualReduction = oldUnrest - (kingdom.unrest || 0);
        resourceChanges.unrest = (resourceChanges.unrest || 0) - actualReduction;
        
        return `Reduced unrest by ${actualReduction}`;
      }
      
      default:
        return undefined;
    }
  }
  
  /**
   * Upkeep Phase - Using domain layer functions
   */
  private simulateUpkeepPhase(kingdom: KingdomData, resourceChanges: Record<string, number>): any {
    // Feed settlements using domain layer
    const feedingResult = performFeeding(kingdom);
    
    resourceChanges.food = (resourceChanges.food || 0) - feedingResult.foodConsumed;
    if (feedingResult.unrestGenerated > 0) {
      resourceChanges.unrest = (resourceChanges.unrest || 0) + feedingResult.unrestGenerated;
    }
    
    // Army upkeep
    let armyFoodConsumed = 0;
    let armyGoldConsumed = 0;
    const armyCount = kingdom.armies?.length || 0;
    
    if (armyCount > 0) {
      armyFoodConsumed = armyCount;
      armyGoldConsumed = armyCount;
      
      kingdom.resources.food = Math.max(0, (kingdom.resources.food || 0) - armyFoodConsumed);
      kingdom.resources.gold = Math.max(0, (kingdom.resources.gold || 0) - armyGoldConsumed);
      
      resourceChanges.food = (resourceChanges.food || 0) - armyFoodConsumed;
      resourceChanges.gold = (resourceChanges.gold || 0) - armyGoldConsumed;
    }
    
    // Unsupported armies generate unrest - using domain layer
    const unsupportedArmies = calculateUnsupportedArmies(kingdom);
    if (unsupportedArmies > 0) {
      applyUnrestChange(kingdom, unsupportedArmies);
      resourceChanges.unrest = (resourceChanges.unrest || 0) + unsupportedArmies;
    }
    
    // Apply food capacity limit using domain layer
    const foodLostToCapacity = applyFoodCapacityLimit(kingdom);
    if (foodLostToCapacity > 0) {
      resourceChanges.food = (resourceChanges.food || 0) - foodLostToCapacity;
    }
    
    // Apply passive structure effects using domain layer
    const structureEffects = applyPassiveStructureEffects(kingdom);
    if (structureEffects.goldGenerated > 0) {
      resourceChanges.gold = (resourceChanges.gold || 0) + structureEffects.goldGenerated;
    }
    if (structureEffects.unrestReduced > 0) {
      resourceChanges.unrest = (resourceChanges.unrest || 0) - structureEffects.unrestReduced;
    }
    
    // Process build queue
    const buildQueueResults = this.processBuildQueue(kingdom, resourceChanges);
    
    // Fame conversion (configurable)
    const currentFame = kingdom.fame || 0;
    let fameConverted = 0;
    
    if (this.config.fameConvertsToUnrest && currentFame > 0 && kingdom.unrest > 0) {
      fameConverted = Math.min(currentFame, kingdom.unrest);
      kingdom.unrest -= fameConverted;
      resourceChanges.unrest = (resourceChanges.unrest || 0) - fameConverted;
    } else if (this.config.fameConvertsToGold && currentFame > 0) {
      fameConverted = currentFame;
      kingdom.resources.gold = (kingdom.resources.gold || 0) + currentFame;
      resourceChanges.gold = (resourceChanges.gold || 0) + currentFame;
    }
    
    kingdom.fame = 0;
    
    return {
      foodConsumed: feedingResult.foodConsumed + armyFoodConsumed,
      fameConverted,
      armyFoodConsumed,
      armyGoldConsumed,
      unsupportedArmies,
      foodLostToCapacity,
      unfedSettlements: feedingResult.unfed.length,
      structureEffects,
      buildQueueCompleted: buildQueueResults.completed,
      buildQueuePartial: buildQueueResults.partial
    };
  }
  
  /**
   * Process build queue
   */
  private processBuildQueue(kingdom: KingdomData, resourceChanges: Record<string, number>): {
    completed: string[];
    partial: string[];
  } {
    const completed: string[] = [];
    const partial: string[] = [];
    
    const buildQueue = kingdom.buildQueue || [];
    if (buildQueue.length === 0) {
      return { completed, partial };
    }
    
    const projectsToRemove: string[] = [];
    
    for (const project of buildQueue) {
      let madePayment = false;
      
      for (const [resource, required] of Object.entries(project.requiredCost)) {
        const paid = project.paidCost[resource] || 0;
        const remaining = required - paid;
        
        if (remaining > 0) {
          const available = kingdom.resources[resource] || 0;
          const payment = Math.min(remaining, available);
          
          if (payment > 0) {
            project.paidCost[resource] = paid + payment;
            kingdom.resources[resource] = available - payment;
            resourceChanges[resource] = (resourceChanges[resource] || 0) - payment;
            madePayment = true;
          }
        }
      }
      
      const isComplete = Object.entries(project.requiredCost).every(([resource, required]) => {
        const paid = project.paidCost[resource] || 0;
        return paid >= required;
      });
      
      if (isComplete) {
        const settlement = kingdom.settlements?.find(s => s.id === project.settlementId);
        if (settlement) {
          settlement.structures = settlement.structures || [];
          settlement.structures.push({ id: project.structureId, name: project.structureName, level: 1 });
          completed.push(`${project.structureName} in ${project.settlementName}`);
        }
        projectsToRemove.push(project.id);
      } else if (madePayment) {
        partial.push(project.structureName);
      }
    }
    
    kingdom.buildQueue = buildQueue.filter(p => !projectsToRemove.includes(p.id));
    
    return { completed, partial };
  }
  
  /**
   * Apply modifiers to kingdom
   */
  private applyModifiers(kingdom: KingdomData, modifiers: any[], resourceChanges: Record<string, number>): void {
    for (const mod of modifiers) {
      let value: number;
      let resource: string;
      
      switch (mod.type) {
        case 'static':
          resource = mod.resource;
          value = mod.value;
          break;
        case 'dice':
          resource = mod.resource;
          value = this.rollDiceNotation(mod.formula);
          if (mod.negative || mod.operation === 'subtract') value = -value;
          break;
        case 'choice':
          resource = mod.resources?.[0] || mod.resource;
          if (typeof mod.value === 'number') {
            value = mod.negative ? -mod.value : mod.value;
          } else {
            value = this.rollDiceNotation(mod.value?.formula || '1d4');
            if (mod.value?.negative || mod.negative) value = -value;
          }
          break;
        default:
          continue;
      }
      
      resourceChanges[resource] = (resourceChanges[resource] || 0) + value;
      
      if (resource === 'unrest') {
        applyUnrestChange(kingdom, value);
      } else if (resource === 'fame') {
        kingdom.fame = Math.max(0, (kingdom.fame || 0) + value);
      } else {
        kingdom.resources[resource] = Math.max(0, (kingdom.resources[resource] || 0) + value);
      }
    }
  }
  
  /**
   * Simulate a single turn
   */
  simulateTurn(kingdom: KingdomData, turnNumber: number): TurnResult {
    this.currentTurn = turnNumber;
    const totalResourceChanges: Record<string, number> = {};
    
    kingdom.partyLevel = calculateLevelForTurn(turnNumber, this.config.turns, 16);
    
    const statusDetails = this.simulateStatusPhase(kingdom, totalResourceChanges);
    const resourcesDetails = this.simulateResourcesPhase(kingdom, totalResourceChanges);
    const { incidents, details: unrestDetails } = this.simulateUnrestPhase(kingdom, totalResourceChanges);
    const { events, details: eventsDetails } = this.simulateEventsPhase(kingdom, totalResourceChanges);
    const actions = this.simulateActionsPhase(kingdom, totalResourceChanges);
    const upkeepDetails = this.simulateUpkeepPhase(kingdom, totalResourceChanges);
    
    kingdom.currentTurn = turnNumber;
    const claimedHexCount = kingdom.hexes?.filter(h => h.claimedBy === 'player').length || 0;
    
    return {
      turn: turnNumber,
      actions,
      events,
      incidents,
      totalResourceChanges,
      phaseDetails: {
        status: statusDetails,
        resources: resourcesDetails,
        unrest: unrestDetails,
        events: eventsDetails,
        actions: { actionsTaken: actions.map(a => a.checkId) },
        upkeep: upkeepDetails
      },
      kingdomSnapshot: {
        resources: { ...kingdom.resources },
        unrest: kingdom.unrest,
        fame: kingdom.fame,
        hexCount: claimedHexCount,
        settlementCount: kingdom.settlements?.length || 0,
        armyCount: kingdom.armies?.length || 0
      }
    };
  }
  
  /**
   * Run complete simulation
   */
  runSimulation(startingKingdom: KingdomData): SimulationRunResult {
    const kingdom: KingdomData = JSON.parse(JSON.stringify(startingKingdom));
    this.eventDC = kingdom.eventDC || 15;
    
    // Initialize explored hexes using domain layer
    this.exploredHexIds = initializeExploredHexes(kingdom);
    
    const turns: TurnResult[] = [];
    const outcomeDistribution: Record<string, number> = {
      criticalSuccess: 0, success: 0, failure: 0, criticalFailure: 0
    };
    
    let peakUnrest = kingdom.unrest || 0;
    let collapseOccurred = false;
    let bankruptcyTurns = 0;
    
    for (let turn = 1; turn <= this.config.turns; turn++) {
      const turnResult = this.simulateTurn(kingdom, turn);
      turns.push(turnResult);
      
      for (const check of [...turnResult.actions, ...turnResult.events, ...turnResult.incidents]) {
        outcomeDistribution[check.outcome]++;
      }
      
      if (kingdom.unrest > peakUnrest) peakUnrest = kingdom.unrest;
      if (kingdom.unrest >= 10) collapseOccurred = true;
      if ((kingdom.resources.gold || 0) <= 0) bankruptcyTurns++;
    }
    
    return {
      runNumber: 0,
      turns,
      finalState: kingdom,
      outcomeDistribution,
      peakUnrest,
      collapseOccurred,
      bankruptcyTurns
    };
  }
}

