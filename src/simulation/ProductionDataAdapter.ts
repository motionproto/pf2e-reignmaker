/**
 * ProductionDataAdapter - Bridges production data to simulation
 * 
 * Provides simulation with real game data:
 * - Structures loaded from StructuresService (browser) or embedded data (Node.js)
 * - Actions from PipelineRegistry (single source of truth)
 * 
 * This replaces the hardcoded GameDataLoader.
 * 
 * BROWSER MODE: Uses StructuresService which is already initialized by Foundry
 * NODE MODE: Uses embedded structure data to avoid .webp import issues
 */

import type { KingdomData, Settlement } from '../actors/KingdomActor';
import type { CheckPipeline } from '../types/CheckPipeline';

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
// ACTION DEFINITIONS - Now sourced directly from PipelineRegistry
// Single source of truth - no more duplication!
// ============================================================

// Cache for pipeline registry (lazy loaded)
let cachedPipelineRegistry: any = null;

/**
 * Get pipeline registry (lazy loaded to avoid circular imports)
 */
async function getPipelineRegistry(): Promise<any> {
  if (cachedPipelineRegistry) return cachedPipelineRegistry;
  
  try {
    const { pipelineRegistry } = await import('../pipelines/PipelineRegistry');
    // Ensure registry is initialized
    if (!pipelineRegistry.isInitialized()) {
      pipelineRegistry.initialize();
    }
    cachedPipelineRegistry = pipelineRegistry;
    return pipelineRegistry;
  } catch (e) {
    console.warn('[ProductionDataAdapter] Failed to load PipelineRegistry:', e);
    return null;
  }
}

/**
 * Get all action pipelines from the registry
 * Returns all 27 actions defined in the game
 */
export async function getAllActions(): Promise<CheckPipeline[]> {
  const registry = await getPipelineRegistry();
  if (!registry) return [];
  
  return registry.getPipelinesByType('action');
}

/**
 * Get a specific action pipeline by ID
 */
export async function getActionPipeline(actionId: string): Promise<CheckPipeline | null> {
  const registry = await getPipelineRegistry();
  if (!registry) return null;
  
  return registry.getPipeline(actionId) || null;
}

// Debug flag - set to true to see detailed canPerformAction logs
const DEBUG_ACTION_CHECKS = false;

/**
 * Check if an action can be performed given current kingdom state
 * Uses pipeline's own requirements (single source of truth)
 * Only adds simulation-specific checks for territory actions
 */
export function canPerformAction(
  pipeline: CheckPipeline,
  kingdom: KingdomData,
  exploredHexIds: Set<string>
): boolean {
  const debug = (msg: string) => {
    if (DEBUG_ACTION_CHECKS) console.log(`  [canPerform ${pipeline.id}] ${msg}`);
  };
  
  // Use pipeline's own requirements check (single source of truth)
  if (pipeline.requirements) {
    try {
      const result = pipeline.requirements(kingdom);
      if (!result.met) {
        debug(`blocked by pipeline requirements: ${result.reason || 'unknown'}`);
        return false;
      }
    } catch (e) {
      // Some requirements may fail in simulation mode (e.g., worldExplorerService)
      debug(`requirements check threw: ${e}`);
    }
  }
  
  // Use pipeline's cost definition
  if (pipeline.cost) {
    if (!canAfford(kingdom, pipeline.cost)) {
      debug(`blocked: can't afford ${JSON.stringify(pipeline.cost)}`);
      return false;
    }
  }
  
  // Simulation-specific territory checks (not in pipeline requirements)
  switch (pipeline.id) {
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
      // Need gold - relax the "needs resources" check to allow more flexibility
      const r = kingdom.resources;
      if ((r.gold || 0) < 2) {
        debug(`blocked: gold ${r.gold || 0} < 2`);
        return false;
      }
      debug(`purchase allowed with gold: ${r.gold}`);
      return true;
    }
    
    case 'harvest-resources': {
      // Can always harvest if we have claimed hexes
      const claimedHexes = kingdom.hexes?.filter(h => h.claimedBy === 'player').length || 0;
      debug(`harvest: ${claimedHexes} claimed hexes`);
      return claimedHexes > 0;
    }
    
    case 'build-roads':
    case 'fortify-hex': {
      // Need multiple claimed hexes
      const claimedHexes = kingdom.hexes?.filter(h => h.claimedBy === 'player').length || 0;
      debug(`roads/fortify: ${claimedHexes} claimed hexes`);
      return claimedHexes >= 2;
    }
    
    case 'train-army':
    case 'outfit-army':
    case 'deploy-army':
    case 'disband-army': {
      // Need at least one army
      const hasArmy = (kingdom.armies?.length || 0) > 0;
      debug(`army action: hasArmy=${hasArmy}`);
      return hasArmy;
    }
    
    case 'repair-structure': {
      // Need damaged structures
      for (const settlement of kingdom.settlements || []) {
        if (settlement.structures?.some(s => s.damaged)) {
          debug(`repair: found damaged structure`);
          return true;
        }
      }
      debug(`repair: no damaged structures`);
      return false;
    }
    
    case 'arrest-dissidents': {
      // Need some unrest to arrest
      const hasUnrest = (kingdom.unrest || 0) >= 2;
      debug(`arrest: unrest=${kingdom.unrest}, can=${hasUnrest}`);
      return hasUnrest;
    }
    
    case 'execute-or-pardon-prisoners': {
      // Need imprisoned unrest
      const hasImprisoned = (kingdom.imprisonedUnrest || 0) > 0;
      debug(`execute/pardon: imprisoned=${kingdom.imprisonedUnrest}`);
      return hasImprisoned;
    }
    
    default:
      debug(`allowed by default`);
      return true;
  }
}

