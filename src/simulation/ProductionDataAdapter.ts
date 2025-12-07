/**
 * ProductionDataAdapter - Bridges production data to simulation
 * 
 * Provides simulation with real game data:
 * - Structures loaded from StructuresService (browser) or embedded data (Node.js)
 * - Actions from pipeline definitions
 * 
 * This replaces the hardcoded GameDataLoader.
 * 
 * BROWSER MODE: Uses StructuresService which is already initialized by Foundry
 * NODE MODE: Uses embedded structure data to avoid .webp import issues
 */

import type { KingdomData, Settlement } from '../actors/KingdomActor';

// Import domain layer for helper functions
import { hasStructureCapacity, getTierNumber } from '../domain/settlements/tierLogic';
import { canAfford } from '../domain/resources/collectionLogic';
import { hasUnexploredAdjacentHexes } from '../domain/territory/exploreLogic';
import { getClaimableHexes } from '../domain/territory/adjacencyLogic';
import { getWorksiteEligibleHexes } from '../domain/territory/worksiteLogic';

// Detect if we're in browser or Node.js
const isBrowser = typeof window !== 'undefined';

/**
 * Simulation-friendly structure interface
 */
export interface SimulationStructure {
  id: string;
  name: string;
  tier: number;
  category: string;
  type: 'skill' | 'support';
  cost: Record<string, number>;
  effects: {
    goldPerTurn?: number;
    foodStorage?: number;
    unrestReduction?: number;
    famePerTurn?: number;
    skillBonus?: number;
    skills?: string[];
    armySupport?: number;
    diplomaticCapacity?: number;
    imprisonedCapacity?: number;
    special?: string[];
  };
  upgradeFrom?: string;
  minimumSettlementTier?: number;
}

// Cache for loaded structures
let cachedStructures: SimulationStructure[] | null = null;

/**
 * Convert a production structure to simulation format
 */
function convertStructure(s: any, tier: number, category: string, type: string, upgradeFrom?: string): SimulationStructure {
  // Extract modifier values
  const modifiers = s.modifiers || [];
  const getModValue = (resource: string): number | undefined => {
    const mod = modifiers.find((m: any) => m.resource === resource && m.type === 'static');
    return mod?.value;
  };
  
  // Extract game effects
  const gameEffects = s.gameEffects || [];
  const getEffectValue = (effectType: string): number | undefined => {
    const effect = gameEffects.find((e: any) => e.type === effectType);
    return effect?.value;
  };
  
  return {
    id: s.id,
    name: s.name,
    tier,
    category,
    type: type as 'skill' | 'support',
    cost: s.cost || s.constructionCost || {},
    effects: {
      foodStorage: getModValue('foodCapacity'),
      armySupport: getModValue('armyCapacity'),
      diplomaticCapacity: getModValue('diplomaticCapacity'),
      imprisonedCapacity: getModValue('imprisonedUnrestCapacity'),
      goldPerTurn: getModValue('gold') || s.effects?.goldPerTurn,
      unrestReduction: getModValue('unrest') ? -getModValue('unrest')! : s.effects?.unrestReductionPerTurn,
      famePerTurn: getModValue('fame') || s.effects?.famePerTurn,
      skillBonus: getEffectValue('settlementSkillBonus') || s.effects?.skillBonus
    },
    upgradeFrom,
    minimumSettlementTier: tier
  };
}

/**
 * Load structures from StructuresService (browser) 
 */
async function loadStructuresFromService(): Promise<SimulationStructure[]> {
  if (cachedStructures) return cachedStructures;
  
  try {
    // Dynamically import to avoid issues when not in browser
    const { structuresService } = await import('../services/structures');
    structuresService.initializeStructures();
    const productionStructures = structuresService.getAllStructures();
    
    cachedStructures = productionStructures.map(s => convertStructure(
      s, 
      s.tier, 
      s.category, 
      s.type,
      s.upgradeFrom
    ));
    
    return cachedStructures;
  } catch (e) {
    console.warn('Failed to load from StructuresService, using fallback:', e);
    return loadStructuresFallback();
  }
}

/**
 * Fallback structure data for Node.js/headless environment
 * This is a minimal set of core structures for simulation
 */
function loadStructuresFallback(): SimulationStructure[] {
  if (cachedStructures) return cachedStructures;
  
  // Core structures needed for simulation
  cachedStructures = [
    // Basic economic structures
    { id: 'houses', name: 'Houses', tier: 1, category: 'residential', type: 'support', cost: { lumber: 1 }, effects: {}, minimumSettlementTier: 1 },
    { id: 'tenement', name: 'Tenement', tier: 2, category: 'residential', type: 'support', cost: { lumber: 2, stone: 1 }, effects: {}, upgradeFrom: 'houses', minimumSettlementTier: 2 },
    { id: 'granary', name: 'Granary', tier: 1, category: 'storage', type: 'support', cost: { lumber: 1 }, effects: { foodStorage: 4 }, minimumSettlementTier: 1 },
    { id: 'storehouses', name: 'Storehouses', tier: 2, category: 'storage', type: 'support', cost: { lumber: 2, stone: 1 }, effects: { foodStorage: 8 }, upgradeFrom: 'granary', minimumSettlementTier: 2 },
    { id: 'tavern', name: 'Tavern', tier: 1, category: 'entertainment', type: 'skill', cost: { lumber: 1 }, effects: { unrestReduction: 1 }, minimumSettlementTier: 1 },
    { id: 'inn', name: 'Inn', tier: 2, category: 'entertainment', type: 'skill', cost: { lumber: 2, stone: 1 }, effects: { unrestReduction: 2, goldPerTurn: 1 }, upgradeFrom: 'tavern', minimumSettlementTier: 2 },
    { id: 'shrine', name: 'Shrine', tier: 1, category: 'religious', type: 'skill', cost: { lumber: 1, stone: 1 }, effects: { unrestReduction: 1 }, minimumSettlementTier: 1 },
    { id: 'temple', name: 'Temple', tier: 2, category: 'religious', type: 'skill', cost: { stone: 2, lumber: 1 }, effects: { unrestReduction: 2 }, upgradeFrom: 'shrine', minimumSettlementTier: 2 },
    { id: 'garrison', name: 'Garrison', tier: 1, category: 'military', type: 'support', cost: { stone: 2 }, effects: { armySupport: 1 }, minimumSettlementTier: 1 },
    { id: 'barracks', name: 'Barracks', tier: 2, category: 'military', type: 'support', cost: { stone: 2, lumber: 2 }, effects: { armySupport: 2 }, upgradeFrom: 'garrison', minimumSettlementTier: 2 },
    { id: 'marketplace', name: 'Marketplace', tier: 1, category: 'commercial', type: 'skill', cost: { lumber: 2 }, effects: { goldPerTurn: 1 }, minimumSettlementTier: 1 },
    { id: 'trade-shop', name: 'Trade Shop', tier: 2, category: 'commercial', type: 'skill', cost: { lumber: 2, stone: 1 }, effects: { goldPerTurn: 2 }, upgradeFrom: 'marketplace', minimumSettlementTier: 2 },
  ];
  
  return cachedStructures;
}

/**
 * Get all structures - works in browser or Node.js
 */
export function getAllStructures(): SimulationStructure[] {
  // In browser, we need to use the async version
  // But for synchronous compatibility, return cached or fallback
  if (cachedStructures) return cachedStructures;
  
  if (isBrowser) {
    // Trigger async load and return fallback for now
    loadStructuresFromService().catch(console.error);
    return loadStructuresFallback();
  }
  
  return loadStructuresFallback();
}

/**
 * Initialize structures (call this at app startup in browser)
 */
export async function initializeStructures(): Promise<void> {
  if (isBrowser) {
    await loadStructuresFromService();
  }
}

/**
 * Get affordable structures for a settlement
 * Uses real StructuresService data
 */
export function getAffordableStructures(
  kingdom: KingdomData,
  settlement: Settlement
): SimulationStructure[] {
  const settlementTier = getTierNumber(settlement.tier);
  const allStructures = getAllStructures();
  
  // Get existing structure IDs (built + queued)
  const existingIds = new Set<string>([
    ...(settlement.structures || []).map(s => s.id),
    ...(kingdom.buildQueue || [])
      .filter(p => p.settlementId === settlement.id)
      .map(p => p.structureId)
  ]);
  
  return allStructures.filter(structure => {
    // Check tier requirement
    if (structure.tier > settlementTier) return false;
    if (structure.minimumSettlementTier && structure.minimumSettlementTier > settlementTier) return false;
    
    // Check if already built or queued
    if (existingIds.has(structure.id)) return false;
    
    // Check upgrade path - can only build if we have the prerequisite
    if (structure.upgradeFrom) {
      if (!existingIds.has(structure.upgradeFrom)) return false;
    }
    
    // Check if we can afford at least partial payment (build queue system)
    // Just need any resource available
    const hasAnyResource = Object.keys(structure.cost).some(
      resource => (kingdom.resources[resource] || 0) > 0
    );
    if (!hasAnyResource && Object.keys(structure.cost).length > 0) return false;
    
    return true;
  });
}

/**
 * Get structure by ID from production data
 */
export function getStructure(id: string): SimulationStructure | undefined {
  const allStructures = getAllStructures();
  return allStructures.find(s => s.id === id);
}

// ============================================================
// ACTION DEFINITIONS
// Actions are defined here since they don't have a direct JSON source
// These match the pipeline definitions in src/pipelines/actions/
// ============================================================

export interface SimulationAction {
  id: string;
  name: string;
  category: string;
  cost?: Record<string, number>;
  requirements?: {
    minSettlements?: number;
    minHexes?: number;
    minGold?: number;
    minFood?: number;
    minLumber?: number;
    minStone?: number;
    minOre?: number;
    hasArmy?: boolean;
    hasSettlement?: boolean;
  };
  outcomes: {
    criticalSuccess?: { modifiers: any[]; effects?: string[] };
    success?: { modifiers: any[]; effects?: string[] };
    failure?: { modifiers: any[]; effects?: string[] };
    criticalFailure?: { modifiers: any[]; effects?: string[] };
  };
}

/**
 * All actions from production pipelines
 * These definitions match src/pipelines/actions/*.ts
 */
export const ALL_ACTIONS: SimulationAction[] = [
  // Economic Actions
  {
    id: 'collect-stipend',
    name: 'Collect Stipend',
    category: 'economic',
    outcomes: {
      criticalSuccess: { modifiers: [{ type: 'dice', resource: 'gold', formula: '2d6', duration: 'immediate' }] },
      success: { modifiers: [{ type: 'dice', resource: 'gold', formula: '1d6', duration: 'immediate' }] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'sell-surplus',
    name: 'Sell Surplus',
    category: 'economic',
    outcomes: {
      criticalSuccess: { modifiers: [{ type: 'dice', resource: 'gold', formula: '2d4', duration: 'immediate' }] },
      success: { modifiers: [{ type: 'dice', resource: 'gold', formula: '1d4', duration: 'immediate' }] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'purchase-resources',
    name: 'Purchase Resources',
    category: 'economic',
    requirements: { minGold: 2 },
    outcomes: {
      criticalSuccess: { modifiers: [], effects: ['Gain 4 commodities for 2 gold'] },
      success: { modifiers: [], effects: ['Gain 2 commodities for 2 gold'] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' }] }
    }
  },
  
  // Territory Actions
  {
    id: 'claim-hexes',
    name: 'Claim Hexes',
    category: 'territory',
    outcomes: {
      criticalSuccess: { modifiers: [], effects: ['Claim up to proficiency rank hexes (min 2)'] },
      success: { modifiers: [], effects: ['Claim 1 hex'] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'send-scouts',
    name: 'Send Scouts',
    category: 'territory',
    outcomes: {
      criticalSuccess: { modifiers: [], effects: ['Reveal 4 hexes'] },
      success: { modifiers: [], effects: ['Reveal 2 hexes'] },
      failure: { modifiers: [], effects: ['Reveal 1 hex'] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'create-worksite',
    name: 'Create Worksite',
    category: 'territory',
    outcomes: {
      criticalSuccess: { modifiers: [], effects: ['Create worksite with bonus'] },
      success: { modifiers: [], effects: ['Create worksite'] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  
  // Settlement Actions
  {
    id: 'establish-settlement',
    name: 'Establish Settlement',
    category: 'settlement',
    cost: { food: 2, lumber: 2 },
    outcomes: {
      criticalSuccess: { modifiers: [], effects: ['Found settlement with free structure'] },
      success: { modifiers: [], effects: ['Found settlement'] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'build-structure',
    name: 'Build Structure',
    category: 'settlement',
    requirements: { hasSettlement: true },
    outcomes: {
      criticalSuccess: { modifiers: [], effects: ['Build at reduced cost'] },
      success: { modifiers: [], effects: ['Queue structure'] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'upgrade-settlement',
    name: 'Upgrade Settlement',
    category: 'settlement',
    requirements: { hasSettlement: true },
    outcomes: {
      criticalSuccess: { modifiers: [], effects: ['Upgrade at reduced cost'] },
      success: { modifiers: [], effects: ['Upgrade settlement'] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  
  // Stability Actions
  {
    id: 'deal-with-unrest',
    name: 'Deal with Unrest',
    category: 'stability',
    outcomes: {
      criticalSuccess: { modifiers: [{ type: 'static', resource: 'unrest', value: -2, duration: 'immediate' }] },
      success: { modifiers: [{ type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  
  // Military Actions
  {
    id: 'recruit-unit',
    name: 'Recruit Unit',
    category: 'military',
    cost: { gold: 2, food: 1 },
    outcomes: {
      criticalSuccess: { modifiers: [], effects: ['Recruit army with bonus'] },
      success: { modifiers: [], effects: ['Recruit army'] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'train-army',
    name: 'Train Army',
    category: 'military',
    cost: { gold: 1 },
    requirements: { hasArmy: true },
    outcomes: {
      criticalSuccess: { modifiers: [], effects: ['Army gains 2 levels'] },
      success: { modifiers: [], effects: ['Army gains 1 level'] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  }
];

// Debug flag - set to true to see detailed canPerformAction logs
const DEBUG_ACTION_CHECKS = false;

/**
 * Check if an action can be performed given current kingdom state
 * Uses domain layer functions for validation
 */
export function canPerformAction(
  action: SimulationAction,
  kingdom: KingdomData,
  exploredHexIds: Set<string>
): boolean {
  const debug = (msg: string) => {
    if (DEBUG_ACTION_CHECKS) console.log(`  [canPerform ${action.id}] ${msg}`);
  };
  
  // Check resource requirements
  if (action.requirements) {
    const r = action.requirements;
    const res = kingdom.resources;
    
    if (r.minGold && (res.gold || 0) < r.minGold) {
      debug(`blocked: minGold ${r.minGold} > ${res.gold || 0}`);
      return false;
    }
    if (r.minFood && (res.food || 0) < r.minFood) {
      debug(`blocked: minFood ${r.minFood} > ${res.food || 0}`);
      return false;
    }
    if (r.minLumber && (res.lumber || 0) < r.minLumber) {
      debug(`blocked: minLumber ${r.minLumber} > ${res.lumber || 0}`);
      return false;
    }
    if (r.minStone && (res.stone || 0) < r.minStone) {
      debug(`blocked: minStone ${r.minStone} > ${res.stone || 0}`);
      return false;
    }
    if (r.minOre && (res.ore || 0) < r.minOre) {
      debug(`blocked: minOre ${r.minOre} > ${res.ore || 0}`);
      return false;
    }
    if (r.hasArmy && (kingdom.armies?.length || 0) === 0) {
      debug(`blocked: hasArmy required but none`);
      return false;
    }
    if (r.hasSettlement && (kingdom.settlements?.length || 0) === 0) {
      debug(`blocked: hasSettlement required but none`);
      return false;
    }
  }
  
  // Check action costs
  if (action.cost) {
    if (!canAfford(kingdom, action.cost)) {
      debug(`blocked: can't afford ${JSON.stringify(action.cost)}`);
      return false;
    }
  }
  
  // Action-specific checks using domain layer
  switch (action.id) {
    case 'claim-hexes': {
      const claimable = getClaimableHexes(kingdom, exploredHexIds);
      debug(`claimable hexes: ${claimable.length}`);
      return claimable.length > 0;
    }
    
    case 'send-scouts': {
      const hasUnexplored = hasUnexploredAdjacentHexes(kingdom, exploredHexIds);
      debug(`hasUnexploredAdjacent: ${hasUnexplored}`);
      return hasUnexplored;
    }
    
    case 'create-worksite': {
      const eligible = getWorksiteEligibleHexes(kingdom);
      debug(`eligible worksite hexes: ${eligible.length}`);
      return eligible.length > 0;
    }
    
    case 'build-structure': {
      const hasCapacity = kingdom.settlements?.some(s => {
        const queueCount = (kingdom.buildQueue || []).filter(p => p.settlementId === s.id).length;
        return hasStructureCapacity(s, queueCount);
      });
      if (!hasCapacity) {
        debug(`blocked: no settlement capacity`);
        return false;
      }
      
      // Check if any structures are affordable
      for (const settlement of kingdom.settlements || []) {
        const affordable = getAffordableStructures(kingdom, settlement);
        if (affordable.length > 0) {
          debug(`affordable structures in ${settlement.name}: ${affordable.length}`);
          return true;
        }
      }
      debug(`blocked: no affordable structures`);
      return false;
    }
    
    case 'deal-with-unrest': {
      const hasUnrest = (kingdom.unrest || 0) > 0;
      debug(`unrest: ${kingdom.unrest || 0}, canDeal: ${hasUnrest}`);
      return hasUnrest;
    }
    
    case 'sell-surplus': {
      // Can sell any non-gold resource
      const r = kingdom.resources;
      const canSell = (r.food || 0) >= 1 || (r.lumber || 0) >= 1 || 
             (r.stone || 0) >= 1 || (r.ore || 0) >= 1;
      debug(`canSell: ${canSell}`);
      return canSell;
    }
    
    case 'purchase-resources': {
      // Need gold and be low on some resource
      const r = kingdom.resources;
      if ((r.gold || 0) < 2) {
        debug(`blocked: gold ${r.gold || 0} < 2`);
        return false;
      }
      const needsResources = (r.food || 0) < 5 || (r.lumber || 0) < 5 || 
             (r.stone || 0) < 5 || (r.ore || 0) < 5;
      debug(`needsResources: ${needsResources}`);
      return needsResources;
    }
    
    default:
      debug(`allowed by default`);
      return true;
  }
}

