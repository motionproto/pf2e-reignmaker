/**
 * Kingdom Simulator - Comprehensive Edition
 * 
 * Uses actual game data for realistic simulation:
 * - All 28 actions with proper costs and outcomes
 * - Full structure catalog with effects
 * - Proper phase execution per game rules
 */

import type { KingdomData, Settlement } from '../actors/KingdomActor';
import type { EventModifier } from '../types/modifiers';
import type {
  SimulationConfig,
  TurnResult,
  CheckResult,
  SimulationRunResult
} from './SimulationConfig';
import type { Strategy } from './strategies';
import {
  ALL_ACTIONS,
  ALL_STRUCTURES,
  canPerformAction,
  getAffordableStructures,
  type SimulationAction,
  type SimulationStructure
} from './GameDataLoader';
import { SIM_EVENTS, SIM_INCIDENTS, type SimCheck } from './SimulationData';

type OutcomeType = 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';

// Level-based DC table from PF2e rules
const DC_BY_LEVEL: Record<number, number> = {
  1: 15, 2: 16, 3: 18, 4: 19, 5: 20,
  6: 22, 7: 23, 8: 24, 9: 26, 10: 27,
  11: 28, 12: 30, 13: 31, 14: 32, 15: 34,
  16: 35, 17: 36, 18: 38, 19: 39, 20: 40
};

// Average skill bonus by party level (from user-provided table)
const SKILL_BONUS_BY_LEVEL: Record<number, number> = {
  1: 7, 2: 8, 3: 11, 4: 12, 5: 14,
  6: 15, 7: 18, 8: 19, 9: 20, 10: 21,
  11: 22, 12: 23, 13: 24, 14: 25, 15: 28,
  16: 29, 17: 30, 18: 31, 19: 32, 20: 33
};

/**
 * Calculate party level based on turn number
 * Progresses from level 1 to targetLevel over totalTurns
 * Smooth linear progression with level-ups every ~4 turns
 */
function calculateLevelForTurn(turn: number, totalTurns: number, targetLevel: number = 16): number {
  // Linear interpolation: turn 1 = level 1, turn 120 = level 16
  // Formula: level = 1 + (turn - 1) * (targetLevel - 1) / (totalTurns - 1)
  const level = 1 + Math.round((turn - 1) * (targetLevel - 1) / (totalTurns - 1));
  return Math.min(Math.max(1, level), targetLevel);
}

/**
 * Get skill bonus for a given level
 */
function getSkillBonusForLevel(level: number): number {
  return SKILL_BONUS_BY_LEVEL[level] || SKILL_BONUS_BY_LEVEL[20];
}

// Settlement tier info
const SETTLEMENT_TIERS = {
  Village: { consumption: 1, gold: 1, tier: 1, maxStructures: 4, upgradeSize: 10, upgradeCost: 4 },
  Town: { consumption: 4, gold: 2, tier: 2, maxStructures: 16, upgradeSize: 25, upgradeCost: 8 },
  City: { consumption: 8, gold: 3, tier: 3, maxStructures: 36, upgradeSize: 50, upgradeCost: 16 },
  Metropolis: { consumption: 12, gold: 4, tier: 4, maxStructures: 64, upgradeSize: 999, upgradeCost: 0 }
};

// Unrest tier thresholds
function getUnrestTier(unrest: number): number {
  if (unrest < 5) return 0;
  if (unrest < 8) return 1;
  if (unrest < 10) return 2;
  return 3;
}

function getIncidentChance(unrest: number): number {
  const tier = getUnrestTier(unrest);
  return [0, 0.25, 0.50, 0.75][tier];
}

function getIncidentSeverity(unrest: number): 'minor' | 'moderate' | 'major' {
  return ['minor', 'minor', 'moderate', 'major'][getUnrestTier(unrest)] as any;
}

function getLevelBasedDC(level: number): number {
  return DC_BY_LEVEL[level] || 15;
}

function calculateSuccessDegree(total: number, dc: number, naturalRoll: number): OutcomeType {
  const difference = total - dc;
  
  if (naturalRoll === 20) {
    if (difference >= 0) return 'criticalSuccess';
    if (difference >= -9) return 'success';
    return 'failure';
  }
  
  if (naturalRoll === 1) {
    if (difference >= 10) return 'success';
    if (difference >= 0) return 'failure';
    return 'criticalFailure';
  }
  
  if (difference >= 10) return 'criticalSuccess';
  if (difference >= 0) return 'success';
  if (difference > -10) return 'failure';
  return 'criticalFailure';
}

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
 * Main simulation engine - Comprehensive Edition
 */
export class KingdomSimulator {
  private config: SimulationConfig;
  private strategy: Strategy;
  private rng: () => number;
  private exploredHexIds: Set<string> = new Set();
  private eventDC: number = 15;
  private currentTurn: number = 1;
  
  constructor(config: SimulationConfig, strategy: Strategy) {
    this.config = config;
    this.strategy = strategy;
    
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
  
  private initializeExploredHexes(kingdom: KingdomData): void {
    this.exploredHexIds.clear();
    const claimedHexes = kingdom.hexes?.filter(h => h.claimedBy === 'player') || [];
    
    for (const hex of claimedHexes) {
      const neighbors = getAdjacentHexIds(hex.row, hex.col);
      for (const neighborId of neighbors) {
        const neighborHex = kingdom.hexes?.find(h => h.id === neighborId);
        if (neighborHex && !neighborHex.claimedBy) {
          this.exploredHexIds.add(neighborId);
        }
      }
    }
  }
  
  private hasUnexploredAdjacentHexes(kingdom: KingdomData): boolean {
    const claimedHexes = kingdom.hexes?.filter(h => h.claimedBy === 'player') || [];
    
    for (const hex of claimedHexes) {
      const neighbors = getAdjacentHexIds(hex.row, hex.col);
      for (const neighborId of neighbors) {
        const neighborHex = kingdom.hexes?.find(h => h.id === neighborId);
        if (neighborHex && !neighborHex.claimedBy && !this.exploredHexIds.has(neighborId)) {
          return true; // Found at least one unexplored adjacent hex
        }
      }
    }
    return false;
  }
  
  private getClaimableHexes(kingdom: KingdomData): any[] {
    const claimable = kingdom.hexes?.filter(h => 
      !h.claimedBy && this.exploredHexIds.has(h.id)
    ) || [];
    
    // Prioritize hexes by resource value for worksite development
    // Check what resources we're lacking and prioritize accordingly
    const resources = kingdom.resources || {};
    const lumber = resources.lumber || 0;
    const stone = resources.stone || 0;
    const ore = resources.ore || 0;
    const food = resources.food || 0;
    
    return claimable.sort((a, b) => {
      const scoreA = this.getTerrainResourceScore(a.terrain, { lumber, stone, ore, food });
      const scoreB = this.getTerrainResourceScore(b.terrain, { lumber, stone, ore, food });
      return scoreB - scoreA; // Higher score = higher priority
    });
  }
  
  /**
   * Score terrain by its worksite potential, weighted by what resources we need
   */
  private getTerrainResourceScore(
    terrain: string | undefined, 
    current: { lumber: number; stone: number; ore: number; food: number }
  ): number {
    const t = (terrain || 'plains').toLowerCase();
    
    // Base scores by what resources each terrain provides
    // Higher score for resources we're lacking
    const needLumber = current.lumber < 20 ? 3 : 1;
    const needStone = current.stone < 20 ? 3 : 1;
    const needOre = current.ore < 10 ? 4 : 1; // Ore is rarer
    const needFood = current.food < 30 ? 2 : 1;
    
    switch (t) {
      case 'forest':
        return 2 * needLumber + 2 * needFood; // Lumber (2) or Food (2)
      case 'hills':
        return 1 * needStone + 1 * needFood; // Stone (1) or Food (1)
      case 'mountains':
        return 1 * needStone + 1 * needOre; // Stone (1) or Ore (1)
      case 'plains':
        return 2 * needFood; // Food (2)
      case 'swamp':
        return 1 * needFood + 1 * needOre; // Food (1) or Ore (1)
      default:
        return 1; // Unknown terrain, low priority
    }
  }
  
  private getSettlementTierNumber(tier: string): number {
    return SETTLEMENT_TIERS[tier as keyof typeof SETTLEMENT_TIERS]?.tier || 1;
  }
  
  /**
   * Get unrest penalty for skill checks
   * Per production rules: unrest 3-5 = -1, 6-8 = -2, 9+ = -3
   */
  private getUnrestPenalty(unrest: number): number {
    if (unrest < 3) return 0;
    if (unrest <= 5) return -1;
    if (unrest <= 8) return -2;
    return -3; // Capped at -3
  }
  
  /**
   * Simulate a skill check using level-appropriate DC and bonus
   * @param turn - Current turn number (for level progression)
   * @param unrest - Current unrest level (for penalty calculation)
   */
  simulateCheck(turn: number, unrest: number = 0): { roll: number; total: number; dc: number; outcome: OutcomeType; level: number; unrestPenalty: number } {
    // Calculate current level based on turn progression
    const level = calculateLevelForTurn(turn, this.config.turns, 16);
    const dc = getLevelBasedDC(level);
    const skillBonus = getSkillBonusForLevel(level);
    
    // Apply unrest penalty to checks
    const unrestPenalty = this.getUnrestPenalty(unrest);
    
    const roll = this.rollD20();
    const total = roll + skillBonus + unrestPenalty;
    const outcome = calculateSuccessDegree(total, dc, roll);
    return { roll, total, dc, outcome, level, unrestPenalty };
  }
  
  applyModifiers(kingdom: KingdomData, modifiers: EventModifier[]): Record<string, number> {
    const changes: Record<string, number> = {};
    
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
          resource = mod.resources[0];
          if (typeof mod.value === 'number') {
            value = mod.negative ? -mod.value : mod.value;
          } else {
            value = this.rollDiceNotation(mod.value.formula);
            if (mod.value.negative || mod.negative) value = -value;
          }
          break;
        default:
          continue;
      }
      
      changes[resource] = (changes[resource] || 0) + value;
      
      if (resource === 'unrest') {
        kingdom.unrest = Math.max(0, (kingdom.unrest || 0) + value);
      } else if (resource === 'fame') {
        kingdom.fame = Math.max(0, (kingdom.fame || 0) + value);
      } else if (resource === 'imprisonedUnrest') {
        kingdom.imprisonedUnrest = Math.max(0, (kingdom.imprisonedUnrest || 0) + value);
      } else {
        kingdom.resources[resource] = Math.max(0, (kingdom.resources[resource] || 0) + value);
      }
    }
    
    return changes;
  }
  
  /**
   * Execute an action with full game logic
   */
  executeAction(
    action: SimulationAction,
    kingdom: KingdomData,
    resourceChanges: Record<string, number>
  ): CheckResult {
    const { roll, total, dc, outcome, level } = this.simulateCheck(this.currentTurn, kingdom.unrest || 0);
    
    // Pay action cost (always paid on attempt)
    if (action.cost) {
      for (const [resource, amount] of Object.entries(action.cost)) {
        kingdom.resources[resource] = Math.max(0, (kingdom.resources[resource] || 0) - amount);
        resourceChanges[resource] = (resourceChanges[resource] || 0) - amount;
      }
    }
    
    // Critical success grants +1 Fame
    // This Fame can be used to reroll failures, or converts to unrest reduction in upkeep
    if (outcome === 'criticalSuccess') {
      kingdom.fame = (kingdom.fame || 0) + 1;
      resourceChanges.fame = (resourceChanges.fame || 0) + 1;
    }
    
    // Apply outcome modifiers
    const outcomeData = action.outcomes[outcome];
    if (outcomeData?.modifiers) {
      const modChanges = this.applyModifiers(kingdom, outcomeData.modifiers);
      for (const [resource, change] of Object.entries(modChanges)) {
        resourceChanges[resource] = (resourceChanges[resource] || 0) + change;
      }
    }
    
    // Execute action-specific effects and get details
    const details = this.executeActionEffects(action, outcome, kingdom, resourceChanges);
    
    return {
      checkId: action.id,
      checkName: action.name,
      checkType: 'action',
      outcome,
      roll,
      total,
      dc,
      resourceChanges: { ...resourceChanges },
      details
    };
  }
  
  /**
   * Execute action-specific game state changes
   * @returns Details string describing what was built/created
   */
  private executeActionEffects(
    action: SimulationAction,
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
        const claimable = this.getClaimableHexes(kingdom);
        const claimed: string[] = [];
        
        for (let i = 0; i < hexCount && i < claimable.length; i++) {
          const hex = claimable[i];
          hex.claimedBy = 'player';
          kingdom.size = (kingdom.size || 0) + 1;
          claimed.push(`${hex.terrain || 'hex'} (${hex.id})`);
          
          // Reveal neighbors
          const neighbors = getAdjacentHexIds(hex.row, hex.col);
          for (const neighborId of neighbors) {
            const neighborHex = kingdom.hexes?.find(h => h.id === neighborId);
            if (neighborHex && !neighborHex.claimedBy) {
              this.exploredHexIds.add(neighborId);
            }
          }
        }
        return claimed.length > 0 ? `Claimed: ${claimed.join(', ')}` : undefined;
      }
      
      case 'send-scouts': {
        const revealCount = outcome === 'criticalSuccess' ? 4 : outcome === 'success' ? 2 : 1;
        const claimedHexes = kingdom.hexes?.filter(h => h.claimedBy === 'player') || [];
        const newExplored: string[] = [];
        
        for (const hex of claimedHexes) {
          const neighbors = getAdjacentHexIds(hex.row, hex.col);
          for (const neighborId of neighbors) {
            const neighborHex = kingdom.hexes?.find(h => h.id === neighborId);
            if (neighborHex && !neighborHex.claimedBy && !this.exploredHexIds.has(neighborId)) {
              newExplored.push(neighborId);
            }
          }
        }
        
        let explored = 0;
        for (let i = 0; i < revealCount && i < newExplored.length; i++) {
          this.exploredHexIds.add(newExplored[i]);
          explored++;
        }
        return explored > 0 ? `Explored ${explored} hex${explored > 1 ? 'es' : ''}` : 'No new hexes';
      }
      
      case 'establish-settlement': {
        if (outcome === 'failure') return undefined;
        
        const eligibleHexes = kingdom.hexes?.filter(h => 
          h.claimedBy === 'player' && !h.features?.some(f => f.type === 'settlement')
        ) || [];
        
        if (eligibleHexes.length > 0) {
          const hex = eligibleHexes[0];
          hex.features = hex.features || [];
          hex.features.push({ type: 'settlement', settlementId: `settlement-${kingdom.settlements?.length || 0}` });
          
          const settlementName = `Settlement ${(kingdom.settlements?.length || 0) + 1}`;
          const newSettlement: Settlement = {
            id: `settlement-${kingdom.settlements?.length || 0}`,
            name: settlementName,
            tier: 'Village',
            level: 1,
            hexId: hex.id,
            structures: [],
            lots: [{ id: 'lot-0', structures: [] }],
            wasFedLastTurn: true
          };
          
          kingdom.settlements = kingdom.settlements || [];
          kingdom.settlements.push(newSettlement);
          
          // Critical success: add free tier 1 structure
          let bonusStructure = '';
          if (outcome === 'criticalSuccess') {
            const tier1Structures = ALL_STRUCTURES.filter(s => s.tier === 1);
            if (tier1Structures.length > 0) {
              const freeStructure = tier1Structures[Math.floor(this.rng() * tier1Structures.length)];
              newSettlement.structures!.push({ id: freeStructure.id, name: freeStructure.name, level: 1 });
              this.applyStructureEffects(freeStructure, kingdom);
              bonusStructure = ` + free ${freeStructure.name}`;
            }
          }
          return `Founded ${settlementName} (Village)${bonusStructure}`;
        }
        return 'No eligible hex';
      }
      
      case 'build-structure': {
        if (outcome === 'failure') return undefined;
        
        const settlement = kingdom.settlements?.find(s => {
          const tierInfo = SETTLEMENT_TIERS[s.tier as keyof typeof SETTLEMENT_TIERS];
          // Count both built structures AND queued structures
          const queuedCount = (kingdom.buildQueue || []).filter(p => p.settlementId === s.id).length;
          return tierInfo && (s.structures?.length || 0) + queuedCount < tierInfo.maxStructures;
        });
        
        if (settlement) {
          const settlementTier = this.getSettlementTierNumber(settlement.tier);
          // For build queue, we don't need to afford the whole thing now
          // Just need to be able to start (have at least 1 resource)
          const affordable = ALL_STRUCTURES.filter(s => 
            s.tier <= settlementTier && 
            s.minimumSettlementTier <= settlementTier
          );
          
          // Filter out structures already built OR already in queue
          const existingIds = settlement.structures?.map(s => s.id) || [];
          const queuedIds = (kingdom.buildQueue || [])
            .filter(p => p.settlementId === settlement.id)
            .map(p => p.structureId);
          const available = affordable.filter(s => 
            !existingIds.includes(s.id) && !queuedIds.includes(s.id)
          );
          
          if (available.length > 0) {
            // Prioritize structures with passive benefits
            // Calculate if we need more army support
            const armyCount = kingdom.armies?.length || 0;
            let currentArmySupport = 0;
            for (const s of kingdom.settlements || []) {
              currentArmySupport += 1; // Base from settlement
              for (const str of s.structures || []) {
                if (str.id === 'garrison' || str.name === 'Garrison') currentArmySupport += 1;
                if (str.id === 'fortress' || str.name === 'Fortress') currentArmySupport += 2;
                if (str.id === 'citadel' || str.name === 'Citadel') currentArmySupport += 4;
              }
            }
            const needArmySupport = armyCount > currentArmySupport;
            
            const prioritized = available.sort((a, b) => {
              // Army support is critical if we have unsupported armies
              const armySupportBonus = needArmySupport ? 60 : 15;
              
              const scoreA = (a.effects.unrestReduction || 0) * 50 +  // Passive unrest reduction
                            (a.effects.famePerTurn || 0) * 30 +       // Fame generation
                            (a.effects.armySupport || 0) * armySupportBonus + // Army support
                            (a.effects.goldPerTurn || 0) * 10 +       // Gold generation
                            (a.effects.foodStorage || 0) * 5;
              const scoreB = (b.effects.unrestReduction || 0) * 50 + 
                            (b.effects.famePerTurn || 0) * 30 +
                            (b.effects.armySupport || 0) * armySupportBonus +
                            (b.effects.goldPerTurn || 0) * 10 + 
                            (b.effects.foodStorage || 0) * 5;
              return scoreB - scoreA;
            });
            
            const structure = prioritized[0];
            const costMultiplier = outcome === 'criticalSuccess' ? 0.5 : 1;
            
            // Calculate required cost (with critical success discount)
            const requiredCost: Record<string, number> = {};
            for (const [resource, amount] of Object.entries(structure.cost)) {
              requiredCost[resource] = Math.ceil(amount * costMultiplier);
            }
            
            // Add to build queue instead of instant completion
            kingdom.buildQueue = kingdom.buildQueue || [];
            kingdom.buildQueue.push({
              id: `build-${settlement.id}-${structure.id}-${Date.now()}`,
              structureId: structure.id,
              structureName: structure.name,
              settlementId: settlement.id,
              settlementName: settlement.name,
              requiredCost,
              paidCost: {},
              startTurn: kingdom.currentTurn || 0
            });
            
            return `Queued ${structure.name} in ${settlement.name}`;
          }
          return 'No affordable structures';
        }
        return 'No settlement available';
      }
      
      case 'upgrade-settlement': {
        if (outcome === 'failure') return undefined;
        
        const settlement = (kingdom.settlements || []).find(s => {
          const tierInfo = SETTLEMENT_TIERS[s.tier as keyof typeof SETTLEMENT_TIERS];
          return tierInfo && (kingdom.size || 0) >= tierInfo.upgradeSize;
        });
        
        if (settlement) {
          const tierInfo = SETTLEMENT_TIERS[settlement.tier as keyof typeof SETTLEMENT_TIERS];
          const cost = outcome === 'criticalSuccess' ? Math.ceil(tierInfo.upgradeCost * 0.5) : tierInfo.upgradeCost;
          
          if ((kingdom.resources.gold || 0) >= cost) {
            kingdom.resources.gold = (kingdom.resources.gold || 0) - cost;
            resourceChanges.gold = (resourceChanges.gold || 0) - cost;
            
            const oldTier = settlement.tier;
            const nextTier: Record<string, string> = { Village: 'Town', Town: 'City', City: 'Metropolis' };
            settlement.tier = nextTier[settlement.tier] || settlement.tier;
            kingdom.fame = (kingdom.fame || 0) + 1;
            
            return `Upgraded ${settlement.name}: ${oldTier} → ${settlement.tier}`;
          }
          return 'Not enough gold';
        }
        return 'No settlement eligible';
      }
      
      case 'create-worksite': {
        if (outcome === 'failure') return undefined;
        
        // Find eligible hexes and prioritize by resource needs
        const eligibleHexes = kingdom.hexes?.filter(h => 
          h.claimedBy === 'player' && !h.worksite && !h.features?.some(f => f.type === 'settlement')
        ) || [];
        
        // Sort by terrain resource score (prioritize what we need)
        const resources = kingdom.resources || {};
        eligibleHexes.sort((a, b) => {
          const scoreA = this.getTerrainResourceScore(a.terrain, {
            lumber: resources.lumber || 0,
            stone: resources.stone || 0,
            ore: resources.ore || 0,
            food: resources.food || 0
          });
          const scoreB = this.getTerrainResourceScore(b.terrain, {
            lumber: resources.lumber || 0,
            stone: resources.stone || 0,
            ore: resources.ore || 0,
            food: resources.food || 0
          });
          return scoreB - scoreA;
        });
        
        const eligibleHex = eligibleHexes[0];
        
        if (eligibleHex) {
          // Use proper terrain-based worksite production (per game rules)
          // Choose worksite type based on what resources we need most
          const terrain = eligibleHex.terrain?.toLowerCase() || 'plains';
          const res = kingdom.resources || {};
          let worksiteType: string;
          let production: Record<string, number>;
          
          // Helper to decide between options based on need
          const needMore = (resource: string, threshold: number) => 
            (res[resource] || 0) < threshold;
          
          switch (terrain) {
            case 'plains':
              worksiteType = 'Farmstead';
              production = { food: 2 }; // Plains farmstead = 2 food
              break;
            case 'forest':
              // Forest can be farmstead (2 food) or logging camp (2 lumber)
              // Prioritize lumber if we have enough food
              if (needMore('lumber', res.food || 0)) {
                worksiteType = 'Logging Camp';
                production = { lumber: 2 };
              } else {
                worksiteType = 'Farmstead';
                production = { food: 2 };
              }
              break;
            case 'hills':
              // Hills: farmstead (1 food) or quarry (1 stone)
              // Prioritize stone for building
              if (needMore('stone', 30)) {
                worksiteType = 'Quarry';
                production = { stone: 1 };
              } else {
                worksiteType = 'Farmstead';
                production = { food: 1 };
              }
              break;
            case 'mountains':
              // Mountains: quarry (1 stone) or mine (1 ore)
              // Prioritize ore (it's rarer and needed for advanced structures)
              if (needMore('ore', 20)) {
                worksiteType = 'Mine';
                production = { ore: 1 };
              } else {
                worksiteType = 'Quarry';
                production = { stone: 1 };
              }
              break;
            case 'swamp':
              // Swamp: hunting camp (1 food) or bog mine (1 ore)
              // Prioritize ore if food is okay
              if (needMore('ore', 15) && !needMore('food', 20)) {
                worksiteType = 'Bog Mine';
                production = { ore: 1 };
              } else {
                worksiteType = 'Hunting/Fishing Camp';
                production = { food: 1 };
              }
              break;
            case 'desert':
              worksiteType = 'Oasis Farm';
              production = { food: 1 };
              break;
            default:
              worksiteType = 'Farmstead';
              production = { food: 1 };
          }
          
          eligibleHex.worksite = { type: worksiteType };
          kingdom.worksiteProduction = kingdom.worksiteProduction || {};
          
          const prodStr = Object.entries(production).map(([r, a]) => `+${a} ${r}/turn`).join(', ');
          for (const [resource, amount] of Object.entries(production)) {
            kingdom.worksiteProduction[resource] = (kingdom.worksiteProduction[resource] || 0) + amount;
          }
          
          return `${worksiteType} on ${terrain} (${prodStr})`;
        }
        return 'No eligible hex';
      }
      
      case 'build-roads': {
        if (outcome === 'failure') return undefined;
        const count = outcome === 'criticalSuccess' ? 2 : 1;
        let built = 0;
        
        for (const hex of kingdom.hexes || []) {
          if (built >= count) break;
          if (hex.claimedBy === 'player' && !hex.hasRoad) {
            hex.hasRoad = true;
            built++;
          }
        }
        return built > 0 ? `Built ${built} road${built > 1 ? 's' : ''}` : 'No hexes available';
      }
      
      case 'harvest-resources': {
        if (outcome === 'criticalFailure') return undefined;
        const amount = outcome === 'criticalSuccess' ? 3 : outcome === 'success' ? 2 : 1;
        
        const claimedHexes = kingdom.hexes?.filter(h => h.claimedBy === 'player') || [];
        const terrainCounts: Record<string, number> = {};
        
        for (const hex of claimedHexes) {
          terrainCounts[hex.terrain] = (terrainCounts[hex.terrain] || 0) + 1;
        }
        
        const resourceOptions: string[] = [];
        if (terrainCounts.plains) resourceOptions.push(...Array(terrainCounts.plains).fill('food'));
        if (terrainCounts.forest) resourceOptions.push(...Array(terrainCounts.forest).fill('lumber'));
        if (terrainCounts.hills) resourceOptions.push(...Array(terrainCounts.hills).fill('stone'));
        if (terrainCounts.mountains) resourceOptions.push(...Array(terrainCounts.mountains).fill('ore'));
        
        if (resourceOptions.length === 0) resourceOptions.push('food');
        
        const resource = resourceOptions[Math.floor(this.rng() * resourceOptions.length)];
        kingdom.resources[resource] = (kingdom.resources[resource] || 0) + amount;
        resourceChanges[resource] = (resourceChanges[resource] || 0) + amount;
        return `+${amount} ${resource}`;
      }
      
      case 'deal-with-unrest': {
        // Production values: criticalSuccess = -3, success = -2, failure = -1, criticalFailure = 0
        const reduction = outcome === 'criticalSuccess' ? 3 : 
                         outcome === 'success' ? 2 : 
                         outcome === 'failure' ? 1 : 0;
        if (reduction > 0) {
          kingdom.unrest = Math.max(0, (kingdom.unrest || 0) - reduction);
          resourceChanges.unrest = (resourceChanges.unrest || 0) - reduction;
          return `-${reduction} unrest`;
        }
        return 'No effect';
      }
      
      case 'arrest-dissidents': {
        if (outcome === 'failure') return undefined;
        const convert = outcome === 'criticalSuccess' ? 2 : 1;
        const actual = Math.min(convert, kingdom.unrest || 0);
        const capacity = kingdom.resources.imprisonedUnrestCapacity || 0;
        const current = kingdom.imprisonedUnrest || 0;
        const canStore = Math.min(actual, capacity - current);
        
        if (canStore > 0) {
          kingdom.unrest = (kingdom.unrest || 0) - canStore;
          kingdom.imprisonedUnrest = current + canStore;
          resourceChanges.unrest = (resourceChanges.unrest || 0) - canStore;
          return `Imprisoned ${canStore} unrest`;
        }
        return 'No capacity';
      }
      
      case 'purchase-resources': {
        if (outcome === 'failure' || outcome === 'criticalFailure') return undefined;
        const commodities = outcome === 'criticalSuccess' ? 4 : 2;
        const goldCost = 2;
        
        if ((kingdom.resources.gold || 0) >= goldCost) {
          kingdom.resources.gold = (kingdom.resources.gold || 0) - goldCost;
          resourceChanges.gold = (resourceChanges.gold || 0) - goldCost;
          
          // Distribute among needed resources
          const needs = ['food', 'lumber', 'stone', 'ore'].filter(r => (kingdom.resources[r] || 0) < 3);
          if (needs.length === 0) needs.push('food');
          
          const bought: Record<string, number> = {};
          for (let i = 0; i < commodities; i++) {
            const resource = needs[i % needs.length];
            kingdom.resources[resource] = (kingdom.resources[resource] || 0) + 1;
            resourceChanges[resource] = (resourceChanges[resource] || 0) + 1;
            bought[resource] = (bought[resource] || 0) + 1;
          }
          return `Bought: ${Object.entries(bought).map(([r, a]) => `+${a} ${r}`).join(', ')}`;
        }
        return 'Not enough gold';
      }
      
      case 'recruit-unit': {
        if (outcome === 'failure') return undefined;
        
        kingdom.armies = kingdom.armies || [];
        const armyName = `Army ${kingdom.armies.length + 1}`;
        const newArmy = {
          id: `army-${kingdom.armies.length}`,
          name: armyName,
          level: 1,
          size: 'small',
          morale: 'normal',
          equipped: false
        };
        kingdom.armies.push(newArmy as any);
        return `Recruited ${armyName}`;
      }
      
      case 'train-army': {
        if (outcome === 'failure') return 'Training failed';
        
        const armies = kingdom.armies || [];
        if (armies.length === 0) return 'No army to train';
        
        // Find lowest level army to train
        const sortedArmies = [...armies].sort((a: any, b: any) => (a.level || 1) - (b.level || 1));
        const armyToTrain = sortedArmies[0] as any;
        
        // Level increase: 2 on crit, 1 on success
        const levelGain = outcome === 'criticalSuccess' ? 2 : 1;
        armyToTrain.level = (armyToTrain.level || 1) + levelGain;
        
        return `Trained ${armyToTrain.name} to level ${armyToTrain.level}`;
      }
      
      case 'outfit-army': {
        if (outcome === 'failure') return 'Outfitting failed';
        
        const armies = kingdom.armies || [];
        const unequippedArmy = armies.find((a: any) => !a.equipped) as any;
        
        if (!unequippedArmy) return 'All armies equipped';
        
        unequippedArmy.equipped = true;
        return `Equipped ${unequippedArmy.name}`;
      }
      
      case 'fortify-hex': {
        if (outcome === 'failure') return undefined;
        
        const eligibleHex = kingdom.hexes?.find(h => 
          h.claimedBy === 'player' && (!h.fortification || h.fortification.tier < 4)
        );
        
        if (eligibleHex) {
          eligibleHex.fortification = eligibleHex.fortification || { tier: 0, maintenancePaid: true, turnBuilt: kingdom.currentTurn };
          const oldTier = eligibleHex.fortification.tier || 0;
          eligibleHex.fortification.tier = Math.min(4, oldTier + 1);
          return `Fortified ${eligibleHex.id}: tier ${oldTier} → ${eligibleHex.fortification.tier}`;
        }
        return 'No hex available';
      }
      
      default:
        return undefined;
    }
  }
  
  /**
   * Apply structure effects to kingdom
   */
  private applyStructureEffects(structure: SimulationStructure, kingdom: KingdomData): void {
    const effects = structure.effects;
    
    if (effects.goldPerTurn) {
      kingdom.worksiteProduction = kingdom.worksiteProduction || {};
      kingdom.worksiteProduction.gold = (kingdom.worksiteProduction.gold || 0) + effects.goldPerTurn;
    }
    
    if (effects.foodStorage) {
      kingdom.resources.foodCapacity = (kingdom.resources.foodCapacity || 0) + effects.foodStorage;
    }
    
    if (effects.unrestReduction) {
      kingdom.unrest = Math.max(0, (kingdom.unrest || 0) - effects.unrestReduction);
    }
    
    if (effects.famePerTurn) {
      // Track fame bonus structures (applied in status phase)
    }
    
    if (effects.imprisonedCapacity) {
      kingdom.resources.imprisonedUnrestCapacity = (kingdom.resources.imprisonedUnrestCapacity || 0) + effects.imprisonedCapacity;
    }
    
    if (effects.armySupport) {
      kingdom.resources.armyCapacity = (kingdom.resources.armyCapacity || 0) + effects.armySupport;
    }
    
    if (effects.diplomaticCapacity) {
      kingdom.resources.diplomaticCapacity = (kingdom.resources.diplomaticCapacity || 0) + effects.diplomaticCapacity;
    }
  }
  
  // ============================================================
  // PHASE SIMULATION
  // ============================================================
  
  private simulateStatusPhase(kingdom: KingdomData, resourceChanges: Record<string, number>): { baseUnrest: number; fameReset: boolean; structureEffects: { fame: number; unrestReduction: number }; resourceDecay: { lumber: number; stone: number; ore: number }; demandedHexUnrest: number } {
    // Resource decay: lumber, stone, ore reset to 0 at start of each turn
    // These resources must be used the same turn they're collected or they're lost
    // EXCEPTION: Turn 1 - don't decay starting resources (first turn setup)
    let decayedLumber = 0;
    let decayedStone = 0;
    let decayedOre = 0;
    
    if (this.currentTurn > 1) {
      decayedLumber = kingdom.resources.lumber || 0;
      decayedStone = kingdom.resources.stone || 0;
      decayedOre = kingdom.resources.ore || 0;
      
      kingdom.resources.lumber = 0;
      kingdom.resources.stone = 0;
      kingdom.resources.ore = 0;
    }
    
    // Calculate structure passive effects first
    const structureEffects = this.calculateStructurePassiveEffects(kingdom);
    
    // Fame: Base 1 + structure bonuses (critical successes add more during action phase)
    // Fame is NOT reset - it accumulates from critical successes and structures
    // Only ensure minimum of 1 at start of turn
    const baseFame = 1 + structureEffects.fame;
    kingdom.fame = Math.max(kingdom.fame || 0, baseFame);
    resourceChanges.fame = baseFame;
    
    // Base unrest from size: +1 per 8 hexes (per game rules)
    const HEXES_PER_UNREST = 8;
    const sizeUnrest = Math.floor((kingdom.size || 0) / HEXES_PER_UNREST);
    if (sizeUnrest > 0) {
      kingdom.unrest = (kingdom.unrest || 0) + sizeUnrest;
      resourceChanges.unrest = (resourceChanges.unrest || 0) + sizeUnrest;
    }
    
    // Metropolis unrest: +1 per Metropolis
    const metropolisCount = (kingdom.settlements || []).filter(s => s.tier === 'Metropolis').length;
    if (metropolisCount > 0) {
      kingdom.unrest = (kingdom.unrest || 0) + metropolisCount;
      resourceChanges.unrest = (resourceChanges.unrest || 0) + metropolisCount;
    }
    
    // Demanded hexes: +1 unrest per unclaimed demanded hex
    // Citizens Demand Expansion events create demanded hexes that must be claimed
    const PLAYER_KINGDOM = 'player';
    const demandedHexCount = (kingdom.hexes || []).filter((h: any) => {
      const features = h.features || [];
      const hasDemanded = features.some((f: any) => f.type === 'demanded');
      const notPlayerClaimed = !h.claimedBy || h.claimedBy !== PLAYER_KINGDOM;
      return hasDemanded && notPlayerClaimed;
    }).length;
    
    if (demandedHexCount > 0) {
      kingdom.unrest = (kingdom.unrest || 0) + demandedHexCount;
      resourceChanges.unrest = (resourceChanges.unrest || 0) + demandedHexCount;
    }
    
    // Apply passive unrest reduction from structures (after unrest generation)
    if (structureEffects.unrestReduction > 0 && kingdom.unrest > 0) {
      const reduction = Math.min(structureEffects.unrestReduction, kingdom.unrest);
      kingdom.unrest = kingdom.unrest - reduction;
      resourceChanges.unrest = (resourceChanges.unrest || 0) - reduction;
    }
    
    return { 
      baseUnrest: sizeUnrest + metropolisCount + demandedHexCount, 
      fameReset: true, 
      structureEffects,
      resourceDecay: { lumber: decayedLumber, stone: decayedStone, ore: decayedOre },
      demandedHexUnrest: demandedHexCount
    };
  }
  
  /**
   * Calculate passive effects from all structures in all settlements
   */
  private calculateStructurePassiveEffects(kingdom: KingdomData): { fame: number; unrestReduction: number; goldPerTurn: number; unrestReductionBonus: number } {
    let fame = 0;
    let unrestReduction = 0;
    let goldPerTurn = 0;
    let unrestReductionBonus = 0;
    
    for (const settlement of (kingdom.settlements || [])) {
      for (const structure of (settlement.structures || [])) {
        // Look up structure in ALL_STRUCTURES to get its effects
        const structureData = ALL_STRUCTURES.find(s => s.id === structure.id || s.name === structure.name);
        if (structureData?.effects) {
          fame += structureData.effects.famePerTurn || 0;
          unrestReduction += structureData.effects.unrestReduction || 0;
          goldPerTurn += structureData.effects.goldPerTurn || 0;
        }
        
        // Also check the structure's own effects field if it has one
        if ((structure as any).effects) {
          fame += (structure as any).effects.famePerTurn || 0;
          unrestReduction += (structure as any).effects.unrestReduction || 0;
          goldPerTurn += (structure as any).effects.goldPerTurn || 0;
          unrestReductionBonus += (structure as any).effects.unrestReductionBonus || 0;
        }
      }
    }
    
    return { fame, unrestReduction, goldPerTurn, unrestReductionBonus };
  }
  
  private simulateResourcesPhase(kingdom: KingdomData, resourceChanges: Record<string, number>): { worksiteProduction: Record<string, number>; settlementGold: number; economicModifiers: { isAtWar: boolean; productionMultiplier: number; leadershipBonus: number } } {
    // Calculate economic modifiers
    const isAtWar = kingdom.isAtWar || false;
    
    // War reduces production by 25%
    const warPenalty = isAtWar ? 0.75 : 1.0;
    
    // Calculate leadership/structure bonuses to production
    let leadershipBonus = 0;
    for (const settlement of kingdom.settlements || []) {
      for (const structure of settlement.structures || []) {
        const structureData = ALL_STRUCTURES.find(s => s.id === structure.id || s.name === structure.name);
        if (structureData?.effects?.productionBonus) {
          leadershipBonus += structureData.effects.productionBonus;
        }
      }
    }
    
    // Total production multiplier
    const productionMultiplier = warPenalty + (leadershipBonus / 100);
    
    // Worksite production (with modifiers)
    const production = kingdom.worksiteProduction || {};
    const worksiteProduction: Record<string, number> = {};
    for (const [resource, baseAmount] of Object.entries(production)) {
      if (typeof baseAmount === 'number' && baseAmount > 0) {
        // Apply production multiplier
        const amount = Math.floor(baseAmount * productionMultiplier);
        kingdom.resources[resource] = (kingdom.resources[resource] || 0) + amount;
        resourceChanges[resource] = (resourceChanges[resource] || 0) + amount;
        worksiteProduction[resource] = amount;
      }
    }
    
    // Settlement gold (also affected by war)
    let settlementGold = 0;
    for (const settlement of kingdom.settlements || []) {
      if (settlement.wasFedLastTurn !== false) {
        const tierInfo = SETTLEMENT_TIERS[settlement.tier as keyof typeof SETTLEMENT_TIERS];
        if (tierInfo) {
          const goldAmount = Math.floor(tierInfo.gold * warPenalty);
          kingdom.resources.gold = (kingdom.resources.gold || 0) + goldAmount;
          resourceChanges.gold = (resourceChanges.gold || 0) + goldAmount;
          settlementGold += goldAmount;
        }
      }
    }
    
    return { 
      worksiteProduction, 
      settlementGold,
      economicModifiers: { isAtWar, productionMultiplier, leadershipBonus }
    };
  }
  
  private simulateUnrestPhase(kingdom: KingdomData, resourceChanges: Record<string, number>): { incidents: CheckResult[]; details: { incidentTriggered: boolean; incidentName?: string } } {
    const incidents: CheckResult[] = [];
    const tier = getUnrestTier(kingdom.unrest || 0);
    
    if (tier === 0) return { incidents, details: { incidentTriggered: false } };
    if (this.rng() >= getIncidentChance(kingdom.unrest || 0)) return { incidents, details: { incidentTriggered: false } };
    
    const severity = getIncidentSeverity(kingdom.unrest || 0);
    const pool = SIM_INCIDENTS.filter(i => i.severity === severity);
    if (pool.length === 0) return { incidents, details: { incidentTriggered: false } };
    
    const incident = pool[Math.floor(this.rng() * pool.length)];
    const { roll, total, dc, outcome } = this.simulateCheck(this.currentTurn, kingdom.unrest || 0);
    
    const outcomeData = incident.outcomes[outcome];
    if (outcomeData?.modifiers) {
      const modChanges = this.applyModifiers(kingdom, outcomeData.modifiers);
      for (const [resource, change] of Object.entries(modChanges)) {
        resourceChanges[resource] = (resourceChanges[resource] || 0) + change;
      }
    }
    
    incidents.push({
      checkId: incident.id,
      checkName: incident.name,
      checkType: 'incident',
      outcome,
      roll,
      total,
      dc,
      resourceChanges: {}
    });
    
    return { incidents, details: { incidentTriggered: true, incidentName: incident.name } };
  }
  
  private simulateEventsPhase(kingdom: KingdomData, resourceChanges: Record<string, number>): { events: CheckResult[]; details: { eventTriggered: boolean; eventName?: string; eventDC: number } } {
    const events: CheckResult[] = [];
    const roll = this.rollD20();
    const currentDC = this.eventDC;
    const triggered = roll >= this.eventDC;
    
    if (triggered) {
      this.eventDC = 15;
      if (SIM_EVENTS.length === 0) return { events, details: { eventTriggered: false, eventDC: currentDC } };
      
      const event = SIM_EVENTS[Math.floor(this.rng() * SIM_EVENTS.length)];
      const { roll: checkRoll, total, dc, outcome } = this.simulateCheck(this.currentTurn, kingdom.unrest || 0);
      
      const outcomeData = event.outcomes[outcome];
      if (outcomeData?.modifiers) {
        const modChanges = this.applyModifiers(kingdom, outcomeData.modifiers);
        for (const [resource, change] of Object.entries(modChanges)) {
          resourceChanges[resource] = (resourceChanges[resource] || 0) + change;
        }
      }
      
      events.push({
        checkId: event.id,
        checkName: event.name,
        checkType: 'event',
        outcome,
        roll: checkRoll,
        total,
        dc,
        resourceChanges: {}
      });
      
      return { events, details: { eventTriggered: true, eventName: event.name, eventDC: currentDC } };
    } else {
      this.eventDC = Math.max(6, this.eventDC - 5);
      return { events, details: { eventTriggered: false, eventDC: currentDC } };
    }
  }
  
  private simulateActionsPhase(kingdom: KingdomData, resourceChanges: Record<string, number>): CheckResult[] {
    const actions: CheckResult[] = [];
    
    // Track one-time actions this turn to prevent wasteful duplication
    let harvestActionsThisTurn = 0;
    
    // Each player acts sequentially, seeing the results of previous actions
    // This mirrors real gameplay where players see what happened before deciding
    for (let player = 0; player < this.config.playerCount; player++) {
      // Re-evaluate available actions based on CURRENT kingdom state (after previous players' actions)
      const hasUnexploredAdjacent = this.hasUnexploredAdjacentHexes(kingdom);
      const hasClaimableHexes = this.getClaimableHexes(kingdom).length > 0;
      
      // Check if worksites can be created (if so, harvest-resources is wasteful)
      const canCreateWorksite = (kingdom.hexes?.filter(h => 
        h.claimedBy === 'player' && !h.worksite && !h.features?.some((f: any) => f.type === 'settlement')
      ) || []).length > 0;
      
      // Convert to format strategy expects
      const simActions: SimCheck[] = ALL_ACTIONS.map(a => ({
        id: a.id,
        name: a.name,
        checkType: 'action' as const,
        category: a.category,
        cost: a.cost,
        outcomes: {
          criticalSuccess: { modifiers: a.outcomes.criticalSuccess?.modifiers || [] },
          success: { modifiers: a.outcomes.success?.modifiers || [] },
          failure: { modifiers: a.outcomes.failure?.modifiers || [] },
          criticalFailure: { modifiers: a.outcomes.criticalFailure?.modifiers || [] }
        }
      }));
      
      const selectedSimAction = this.strategy.selectAction(
        kingdom,
        simActions,
        (check) => {
          const action = ALL_ACTIONS.find(a => a.id === check.id);
          if (!action) return false;
          
          // Special checks for actions that depend on exploration state
          if (check.id === 'send-scouts' && !hasUnexploredAdjacent) return false;
          if (check.id === 'claim-hexes' && !hasClaimableHexes) return false;
          
          // harvest-resources is situational:
          // - Good in early game (turns 1-5) before worksite infrastructure
          // - Good in emergencies (critically low on resources)
          // - Otherwise, prefer worksites for long-term efficiency
          if (check.id === 'harvest-resources') {
            const isEarlyGame = kingdom.currentTurn <= 5;
            const worksiteCount = kingdom.hexes?.filter(h => h.worksite).length || 0;
            const hasWorksiteInfrastructure = worksiteCount >= 3;
            const isCriticallyLow = (kingdom.resources.food || 0) < 5 || 
                                    (kingdom.resources.gold || 0) < 3;
            
            // Allow harvest in early game, emergencies, or if no worksite infrastructure yet
            const shouldAllowHarvest = isEarlyGame || isCriticallyLow || !hasWorksiteInfrastructure;
            
            if (!shouldAllowHarvest && canCreateWorksite) return false;
            if (harvestActionsThisTurn >= 1) return false; // Max 1 per turn regardless
          }
          
          return canPerformAction(action, kingdom as any);
        }
      );
      
      if (selectedSimAction) {
        const action = ALL_ACTIONS.find(a => a.id === selectedSimAction.id);
        if (action) {
          // Track one-time actions
          if (selectedSimAction.id === 'harvest-resources') {
            harvestActionsThisTurn++;
          }
          
          // Execute action IMMEDIATELY - updates kingdom state before next player decides
          const result = this.executeAction(action, kingdom, resourceChanges);
          actions.push(result);
        }
      }
    }
    
    return actions;
  }
  
  private simulateUpkeepPhase(kingdom: KingdomData, resourceChanges: Record<string, number>): { foodConsumed: number; fameConverted: number; unrestReduced: number; armyFoodConsumed: number; armyGoldConsumed: number; fortificationGoldConsumed: number; unsupportedArmies: number; foodLostToCapacity: number; unfedSettlements: string[]; buildQueueCompleted: string[]; buildQueuePartial: string[] } {
    // Settlement tier to number for sorting and unrest calculation
    const tierToNumber = (tier: string): number => {
      switch (tier) {
        case 'Village': return 1;
        case 'Town': return 2;
        case 'City': return 3;
        case 'Metropolis': return 4;
        default: return 1;
      }
    };
    
    // Sort settlements: capital first, then by tier (descending: Metropolis -> Village)
    const sortedSettlements = [...(kingdom.settlements || [])].sort((a, b) => {
      // Capital always comes first
      if (a.isCapital && !b.isCapital) return -1;
      if (!a.isCapital && b.isCapital) return 1;
      // Otherwise sort by tier (highest first)
      return tierToNumber(b.tier) - tierToNumber(a.tier);
    });
    
    // Feed settlements in priority order
    let foodAvailable = kingdom.resources.food || 0;
    let totalFoodConsumed = 0;
    let settlementUnrest = 0;
    const unfedSettlements: string[] = [];
    
    for (const settlement of sortedSettlements) {
      const tierInfo = SETTLEMENT_TIERS[settlement.tier as keyof typeof SETTLEMENT_TIERS];
      const required = tierInfo?.consumption || 0;
      const tierNum = tierToNumber(settlement.tier);
      
      if (foodAvailable >= required) {
        // Fully fed
        foodAvailable -= required;
        totalFoodConsumed += required;
        settlement.wasFedLastTurn = true;
      } else {
        // Not enough food - consume what's available and mark as unfed
        totalFoodConsumed += foodAvailable;
        foodAvailable = 0;
        settlement.wasFedLastTurn = false;
        settlementUnrest += tierNum; // Unrest equals tier number
        unfedSettlements.push(`${settlement.name} (${settlement.tier})`);
      }
    }
    
    kingdom.resources.food = foodAvailable;
    resourceChanges.food = (resourceChanges.food || 0) - totalFoodConsumed;
    
    if (settlementUnrest > 0) {
      kingdom.unrest = (kingdom.unrest || 0) + settlementUnrest;
      resourceChanges.unrest = (resourceChanges.unrest || 0) + settlementUnrest;
    }
    
    // Army food consumption: 1 food per army
    const armyCount = kingdom.armies?.length || 0;
    let armyFoodConsumed = 0;
    let armyGoldConsumed = 0;
    let armyUnrest = 0;
    
    if (armyCount > 0) {
      // Food consumption
      const armyFoodNeeded = armyCount;
      const armyFoodPaid = Math.min(armyFoodNeeded, foodAvailable);
      armyFoodConsumed = armyFoodPaid;
      
      kingdom.resources.food = foodAvailable - armyFoodPaid;
      resourceChanges.food = (resourceChanges.food || 0) - armyFoodPaid;
      
      const unfedArmies = armyFoodNeeded - armyFoodPaid;
      
      // Gold support: 1 gold per army
      const armyGoldNeeded = armyCount;
      const goldAvailable = kingdom.resources.gold || 0;
      const armyGoldPaid = Math.min(armyGoldNeeded, goldAvailable);
      armyGoldConsumed = armyGoldPaid;
      
      kingdom.resources.gold = goldAvailable - armyGoldPaid;
      resourceChanges.gold = (resourceChanges.gold || 0) - armyGoldPaid;
      
      const unpaidArmies = armyGoldNeeded - armyGoldPaid;
      
      // Each army generates MAX 1 unrest (even if both unfed AND unpaid)
      // Use Math.max to prevent stacking penalties
      armyUnrest = Math.max(unfedArmies, unpaidArmies);
      if (armyUnrest > 0) {
        kingdom.unrest = (kingdom.unrest || 0) + armyUnrest;
        resourceChanges.unrest = (resourceChanges.unrest || 0) + armyUnrest;
      }
    }
    
    // Check for unsupported armies (armies exceeding support capacity)
    // Support capacity comes from settlements and structures (Garrison +1, Fortress +2)
    let armySupportCapacity = 0;
    for (const settlement of kingdom.settlements || []) {
      const tierInfo = SETTLEMENT_TIERS[settlement.tier as keyof typeof SETTLEMENT_TIERS];
      // Base support from settlement tier
      armySupportCapacity += tierInfo?.tier || 0;
      
      // Additional support from structures
      for (const structure of settlement.structures || []) {
        const structureData = ALL_STRUCTURES.find(s => s.id === structure.id || s.name === structure.name);
        if (structureData?.effects?.armySupport) {
          armySupportCapacity += structureData.effects.armySupport;
        }
      }
    }
    
    const unsupportedArmies = Math.max(0, armyCount - armySupportCapacity);
    if (unsupportedArmies > 0) {
      // Unsupported armies generate 1 unrest each
      kingdom.unrest = (kingdom.unrest || 0) + unsupportedArmies;
      resourceChanges.unrest = (resourceChanges.unrest || 0) + unsupportedArmies;
    }
    
    // Fortification maintenance: gold cost based on tier
    // Tier 1 (Earthworks): 0, Tier 2 (Wooden Tower): 1, Tier 3 (Stone Tower): 1, Tier 4 (Fortress): 2
    const PLAYER_KINGDOM = 'player';
    let fortificationMaintenanceCost = 0;
    const fortificationDetails: Array<{hexId: string, tier: number, cost: number}> = [];
    
    for (const hex of (kingdom.hexes || [])) {
      if (hex.claimedBy !== PLAYER_KINGDOM) continue;
      
      if (hex.fortification && hex.fortification.tier > 0) {
        // Skip maintenance if built this turn
        if (hex.fortification.turnBuilt === kingdom.currentTurn) continue;
        
        // Maintenance cost by tier: 0, 1, 1, 2
        const tierCosts = [0, 0, 1, 1, 2];
        const cost = tierCosts[hex.fortification.tier] || 0;
        
        if (cost > 0) {
          fortificationMaintenanceCost += cost;
          fortificationDetails.push({ hexId: hex.id, tier: hex.fortification.tier, cost });
        }
      }
    }
    
    // Pay fortification maintenance (after army gold)
    let fortificationGoldPaid = 0;
    let fortificationUnrest = 0;
    
    if (fortificationMaintenanceCost > 0) {
      const goldAvailable = kingdom.resources.gold || 0;
      fortificationGoldPaid = Math.min(fortificationMaintenanceCost, goldAvailable);
      
      kingdom.resources.gold = goldAvailable - fortificationGoldPaid;
      resourceChanges.gold = (resourceChanges.gold || 0) - fortificationGoldPaid;
      
      // Unpaid maintenance doesn't directly generate unrest in production code
      // but fortifications operate at reduced effectiveness (skip for simulation)
    }
    
    // Process build queue - pay resources toward queued structures
    const buildQueueResults = this.processBuildQueue(kingdom, resourceChanges);
    
    // Food storage capacity enforcement
    // Excess food beyond capacity is lost
    const foodCapacity = kingdom.resources.foodCapacity || 100; // Default 100 if no structures
    const currentFood = kingdom.resources.food || 0;
    let foodLostToCapacity = 0;
    
    if (currentFood > foodCapacity) {
      foodLostToCapacity = currentFood - foodCapacity;
      kingdom.resources.food = foodCapacity;
    }
    
    // Fame NO LONGER converts to unrest reduction
    // Fame is only used for rerolls (player choice, not simulated)
    const currentFame = kingdom.fame || 0;
    kingdom.fame = 0; // Fame resets but doesn't reduce unrest
    
    return { 
      foodConsumed: totalFoodConsumed + armyFoodConsumed, 
      fameConverted: 0, 
      unrestReduced: 0,
      armyFoodConsumed,
      armyGoldConsumed,
      fortificationGoldConsumed: fortificationGoldPaid,
      unsupportedArmies,
      foodLostToCapacity,
      unfedSettlements,
      buildQueueCompleted: buildQueueResults.completed,
      buildQueuePartial: buildQueueResults.partial
    };
  }
  
  /**
   * Process build queue - pay available resources toward queued structures
   * When fully paid, move structure to settlement
   */
  private processBuildQueue(kingdom: KingdomData, resourceChanges: Record<string, number>): { completed: string[]; partial: string[] } {
    const completed: string[] = [];
    const partial: string[] = [];
    
    const buildQueue = kingdom.buildQueue || [];
    if (buildQueue.length === 0) {
      return { completed, partial };
    }
    
    // Track available resources as we process projects
    const availableResources = { ...kingdom.resources };
    const projectsToRemove: string[] = [];
    
    for (const project of buildQueue) {
      let madePayment = false;
      
      // Pay what we can toward each required resource
      for (const [resource, required] of Object.entries(project.requiredCost)) {
        const paid = project.paidCost[resource] || 0;
        const remaining = required - paid;
        
        if (remaining > 0) {
          const available = availableResources[resource] || 0;
          const payment = Math.min(remaining, available);
          
          if (payment > 0) {
            project.paidCost[resource] = paid + payment;
            availableResources[resource] = available - payment;
            kingdom.resources[resource] = (kingdom.resources[resource] || 0) - payment;
            resourceChanges[resource] = (resourceChanges[resource] || 0) - payment;
            madePayment = true;
          }
        }
      }
      
      // Check if fully paid
      const isComplete = Object.entries(project.requiredCost).every(([resource, required]) => {
        const paid = project.paidCost[resource] || 0;
        return paid >= required;
      });
      
      if (isComplete) {
        // Move structure to settlement
        const settlement = kingdom.settlements?.find(s => s.id === project.settlementId);
        if (settlement) {
          settlement.structures = settlement.structures || [];
          settlement.structures.push({ id: project.structureId, name: project.structureName, level: 1 });
          
          // Apply structure effects
          const structure = ALL_STRUCTURES.find(s => s.id === project.structureId);
          if (structure) {
            this.applyStructureEffects(structure, kingdom);
          }
          
          completed.push(`${project.structureName} in ${project.settlementName}`);
        }
        projectsToRemove.push(project.id);
      } else if (madePayment) {
        const paidSummary = Object.entries(project.paidCost)
          .filter(([_, a]) => a > 0)
          .map(([r, a]) => `${a} ${r}`)
          .join(', ');
        partial.push(`${project.structureName}: ${paidSummary}`);
      }
    }
    
    // Remove completed projects from queue
    kingdom.buildQueue = buildQueue.filter(p => !projectsToRemove.includes(p.id));
    
    return { completed, partial };
  }
  
  simulateTurn(kingdom: KingdomData, turnNumber: number): TurnResult {
    this.currentTurn = turnNumber;
    const totalResourceChanges: Record<string, number> = {};
    
    // Update kingdom's party level based on turn progression
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
  
  runSimulation(startingKingdom: KingdomData): SimulationRunResult {
    const kingdom: KingdomData = JSON.parse(JSON.stringify(startingKingdom));
    this.eventDC = kingdom.eventDC || 15;
    this.initializeExploredHexes(kingdom);
    
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
