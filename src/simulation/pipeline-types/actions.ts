/**
 * Action Pipeline Types and Auto-Resolvers
 * 
 * This file defines data requirements for all 27 action pipelines
 * and provides auto-resolve functions for simulation.
 * 
 * Categories:
 * - none: No data needed (pure modifier actions)
 * - metadata: Pre-roll data stored in ctx.metadata
 * - compoundData: Post-apply data stored in ctx.resolutionData.compoundData
 * - customComponentData: Custom component data in ctx.resolutionData.customComponentData
 * - callback: Data applied via postRollInteractions onComplete callback
 */

import type { KingdomData } from '../../actors/KingdomActor';
import type { OutcomeType } from '../../types/CheckPipeline';
import { PLAYER_KINGDOM } from '../../types/ownership';
import { 
  getClaimableHexes, 
  getUnexploredAdjacentHexes,
  isAdjacentToClaimed,
  getAdjacentHexIdsFromId
} from '../../domain/territory/adjacencyLogic';

// =============================================================================
// TYPES
// =============================================================================

export type DataLocation = 'none' | 'metadata' | 'compoundData' | 'customComponentData' | 'callback';

export interface SimulationContext {
  kingdom: KingdomData;
  exploredHexIds: Set<string>;
  outcome: OutcomeType;
  turn: number;
  proficiencyRank?: number;
}

export interface ActionDataRequirement {
  actionId: string;
  dataLocation: DataLocation;
  description: string;
  resolve: (ctx: SimulationContext) => ActionResolvedData | null;
}

export interface ActionResolvedData {
  metadata?: Record<string, any>;
  compoundData?: Record<string, any>;
  customComponentData?: Record<string, any>;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get hexes suitable for settlement founding
 * - Must be claimed, explored, no existing settlement
 * - Must not be adjacent to existing settlements (within 4 hex minimum distance)
 */
function getSettlementEligibleHexes(ctx: SimulationContext): any[] {
  const { kingdom, exploredHexIds } = ctx;
  const settlements = kingdom.settlements || [];
  
  // Get hex IDs that have settlements
  const settlementHexIds = new Set(
    settlements.map(s => s.location ? `${s.location.x}.${s.location.y}` : null).filter(Boolean)
  );
  
  // Get all hexes adjacent to existing settlements (forbidden zone)
  const forbiddenHexIds = new Set<string>();
  for (const settlement of settlements) {
    if (settlement.location) {
      const hexId = `${settlement.location.x}.${settlement.location.y}`;
      forbiddenHexIds.add(hexId);
      // Add all adjacent hexes
      const adjacent = getAdjacentHexIdsFromId(hexId);
      adjacent.forEach(id => forbiddenHexIds.add(id));
    }
  }
  
  return (kingdom.hexes || []).filter(hex => 
    hex.claimedBy === PLAYER_KINGDOM &&
    exploredHexIds.has(hex.id) &&
    !settlementHexIds.has(hex.id) &&
    !forbiddenHexIds.has(hex.id) &&
    !hex.worksite
  );
}

/**
 * Get hexes suitable for worksites
 * - Must be claimed, no settlement, no existing worksite
 */
function getWorksiteEligibleHexes(ctx: SimulationContext): any[] {
  const { kingdom } = ctx;
  const settlements = kingdom.settlements || [];
  
  const settlementHexIds = new Set(
    settlements.map(s => s.location ? `${s.location.x}.${s.location.y}` : null).filter(Boolean)
  );
  
  return (kingdom.hexes || []).filter(hex =>
    hex.claimedBy === PLAYER_KINGDOM &&
    !settlementHexIds.has(hex.id) &&
    !hex.worksite
  );
}

/**
 * Get hexes suitable for roads
 * - Must be claimed, no existing road
 * - Must be adjacent to a settlement or existing road
 */
function getRoadEligibleHexes(ctx: SimulationContext): any[] {
  const { kingdom } = ctx;
  const settlements = kingdom.settlements || [];
  
  const settlementHexIds = new Set(
    settlements.map(s => s.location ? `${s.location.x}.${s.location.y}` : null).filter(Boolean)
  );
  
  const roadHexIds = new Set(
    (kingdom.hexes || []).filter(h => h.hasRoad).map(h => h.id)
  );
  
  return (kingdom.hexes || []).filter(hex => {
    if (hex.claimedBy !== PLAYER_KINGDOM) return false;
    if (hex.hasRoad) return false;
    
    // Check if adjacent to settlement or road
    const adjacent = getAdjacentHexIdsFromId(hex.id);
    return adjacent.some(adjId => 
      settlementHexIds.has(adjId) || roadHexIds.has(adjId)
    );
  });
}

/**
 * Get hexes suitable for fortification
 * - Must be claimed, not a settlement, not at max fortification
 */
function getFortifyEligibleHexes(ctx: SimulationContext): any[] {
  const { kingdom } = ctx;
  const settlements = kingdom.settlements || [];
  
  const settlementHexIds = new Set(
    settlements.map(s => s.location ? `${s.location.x}.${s.location.y}` : null).filter(Boolean)
  );
  
  return (kingdom.hexes || []).filter(hex =>
    hex.claimedBy === PLAYER_KINGDOM &&
    !settlementHexIds.has(hex.id) &&
    (!hex.fortification || hex.fortification.tier < 4)
  );
}

/**
 * Pick best worksite type based on kingdom needs
 */
function selectWorksiteType(kingdom: KingdomData): string {
  const resources = kingdom.resources || {};
  
  // Analyze needs
  const needs = [
    { type: 'mine', resource: 'ore', current: resources.ore || 0 },
    { type: 'quarry', resource: 'stone', current: resources.stone || 0 },
    { type: 'lumber-camp', resource: 'lumber', current: resources.lumber || 0 },
    { type: 'farm', resource: 'food', current: resources.food || 0 }
  ];
  
  // Prefer the resource with lowest amount
  needs.sort((a, b) => a.current - b.current);
  return needs[0].type;
}

/**
 * Generate a settlement name based on terrain
 */
function generateSettlementName(terrain: string, existingCount: number): string {
  const prefixes: Record<string, string[]> = {
    plains: ['Green', 'Golden', 'Wide', 'Open'],
    grassland: ['Meadow', 'Prairie', 'Bloom', 'Field'],
    forest: ['Wood', 'Oak', 'Pine', 'Grove'],
    hills: ['High', 'Ridge', 'Knoll', 'Stone'],
    mountain: ['Peak', 'Crag', 'Summit', 'Granite'],
    swamp: ['Marsh', 'Mire', 'Fen', 'Moss'],
    desert: ['Sand', 'Dune', 'Sun', 'Dry'],
    default: ['New', 'Haven', 'Port', 'Cross']
  };
  
  const suffixes = ['haven', 'ford', 'stead', 'ton', 'bury', 'worth', 'dale', 'field'];
  
  const prefix = (prefixes[terrain] || prefixes.default)[existingCount % 4];
  const suffix = suffixes[existingCount % suffixes.length];
  
  return `${prefix}${suffix}`;
}

/**
 * Get a random friendly faction ID
 */
function getFriendlyFactionId(kingdom: KingdomData): string | null {
  const friendlyFactions = (kingdom.factions || []).filter(f =>
    f.attitude === 'Friendly' || f.attitude === 'Helpful'
  );
  
  if (friendlyFactions.length === 0) return null;
  return friendlyFactions[Math.floor(Math.random() * friendlyFactions.length)].id;
}

/**
 * Get any faction ID for infiltration
 */
function getAnyFactionId(kingdom: KingdomData): string | null {
  if (!kingdom.factions || kingdom.factions.length === 0) return null;
  return kingdom.factions[Math.floor(Math.random() * kingdom.factions.length)].id;
}

/**
 * Get a settlement with imprisoned unrest
 */
function getSettlementWithPrisoners(kingdom: KingdomData): any | null {
  const settlements = (kingdom.settlements || []).filter(s =>
    (s.imprisonedUnrest || 0) > 0
  );
  
  if (settlements.length === 0) return null;
  return settlements[Math.floor(Math.random() * settlements.length)];
}

/**
 * Get first settlement (usually capital)
 */
function getFirstSettlement(kingdom: KingdomData): any | null {
  const settlements = kingdom.settlements || [];
  return settlements[0] || null;
}

// Note: Army helper functions removed - army actions return null for simulation
// since they require real Foundry actors that don't exist in headless simulation

// =============================================================================
// ACTION DATA REQUIREMENTS
// =============================================================================

export const ACTION_DATA_REQUIREMENTS: Record<string, ActionDataRequirement> = {
  // ---------------------------------------------------------------------------
  // NO DATA NEEDED (Pure Modifier Actions)
  // ---------------------------------------------------------------------------
  
  'deal-with-unrest': {
    actionId: 'deal-with-unrest',
    dataLocation: 'none',
    description: 'Pure modifier action - reduces unrest based on outcome',
    resolve: () => ({})
  },
  
  'aid-another': {
    actionId: 'aid-another',
    dataLocation: 'none',
    description: 'Support action - not used in simulation',
    resolve: () => null // Not usable in simulation (requires other players)
  },
  
  // ---------------------------------------------------------------------------
  // HEX SELECTION (compoundData.selectedHexes)
  // ---------------------------------------------------------------------------
  
  'claim-hexes': {
    actionId: 'claim-hexes',
    dataLocation: 'compoundData',
    description: 'Select hex(es) to claim (adjacent to territory, explored)',
    resolve: (ctx) => {
      if (ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure') {
        return {}; // No selection on failure
      }
      
      const claimable = getClaimableHexes(ctx.kingdom, ctx.exploredHexIds);
      if (claimable.length === 0) return null;
      
      // On crit success, claim up to proficiency rank hexes
      const count = ctx.outcome === 'criticalSuccess' 
        ? Math.min(ctx.proficiencyRank || 2, claimable.length)
        : 1;
      
      const selected = claimable.slice(0, count).map(h => h.id);
      
      return {
        compoundData: { selectedHexes: selected }
      };
    }
  },
  
  'send-scouts': {
    actionId: 'send-scouts',
    dataLocation: 'compoundData',
    description: 'Select unexplored hex(es) to scout',
    resolve: (ctx) => {
      if (ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure') {
        return {};
      }
      
      const scoutable = getUnexploredAdjacentHexes(ctx.kingdom, ctx.exploredHexIds);
      if (scoutable.length === 0) return null;
      
      const count = ctx.outcome === 'criticalSuccess' ? 2 : 1;
      const selected = scoutable.slice(0, Math.min(count, scoutable.length)).map(h => h.id);
      
      return {
        compoundData: { selectedHexes: selected }
      };
    }
  },
  
  'build-roads': {
    actionId: 'build-roads',
    dataLocation: 'compoundData',
    description: 'Select hex(es) for road construction',
    resolve: (ctx) => {
      if (ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure') {
        return {};
      }
      
      const eligible = getRoadEligibleHexes(ctx);
      if (eligible.length === 0) return null;
      
      const count = ctx.outcome === 'criticalSuccess' ? 2 : 1;
      const selected = eligible.slice(0, Math.min(count, eligible.length)).map(h => h.id);
      
      return {
        compoundData: { selectedHexes: selected }
      };
    }
  },
  
  'fortify-hex': {
    actionId: 'fortify-hex',
    dataLocation: 'compoundData',
    description: 'Select hex to fortify',
    resolve: (ctx) => {
      if (ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure') {
        return {};
      }
      
      const eligible = getFortifyEligibleHexes(ctx);
      if (eligible.length === 0) return null;
      
      // Select hex with lowest fortification or frontier hex
      const sorted = eligible.sort((a, b) => {
        const aTier = a.fortification?.tier || 0;
        const bTier = b.fortification?.tier || 0;
        return aTier - bTier;
      });
      
      return {
        compoundData: { selectedHex: [sorted[0].id] }
      };
    }
  },
  
  // ---------------------------------------------------------------------------
  // HEX + METADATA (compoundData with extra data)
  // ---------------------------------------------------------------------------
  
  'create-worksite': {
    actionId: 'create-worksite',
    dataLocation: 'compoundData',
    description: 'Select hex and worksite type',
    resolve: (ctx) => {
      if (ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure') {
        return {};
      }
      
      const eligible = getWorksiteEligibleHexes(ctx);
      if (eligible.length === 0) return null;
      
      const selectedHex = eligible[0];
      const worksiteType = selectWorksiteType(ctx.kingdom);
      
      return {
        compoundData: {
          selectedHex: {
            hexIds: [selectedHex.id],
            metadata: { worksiteType }
          }
        }
      };
    }
  },
  
  'establish-settlement': {
    actionId: 'establish-settlement',
    dataLocation: 'compoundData',
    description: 'Select hex, name, and optional free structure',
    resolve: (ctx) => {
      if (ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure') {
        return {};
      }
      
      const eligible = getSettlementEligibleHexes(ctx);
      if (eligible.length === 0) return null;
      
      // Score hexes - prefer plains/grassland, avoid difficult terrain
      const scored = eligible.map(hex => {
        let score = 0;
        if (hex.terrain === 'plains' || hex.terrain === 'grassland') score += 3;
        if (hex.terrain === 'hills') score += 1;
        if (hex.terrain === 'forest') score += 0;
        if (hex.terrain === 'mountain' || hex.terrain === 'swamp') score -= 2;
        return { hex, score };
      });
      
      scored.sort((a, b) => b.score - a.score);
      const selectedHex = scored[0].hex;
      
      const settlementCount = (ctx.kingdom.settlements || []).length;
      const name = generateSettlementName(selectedHex.terrain || 'default', settlementCount);
      
      // On critical success, get a free tier 1 structure
      const structureId = ctx.outcome === 'criticalSuccess' ? 'counting-house' : undefined;
      
      return {
        compoundData: {
          location: {
            hexIds: [selectedHex.id],
            metadata: { 
              settlementName: name,
              structureId
            }
          }
        }
      };
    }
  },
  
  // ---------------------------------------------------------------------------
  // PRE-ROLL METADATA
  // ---------------------------------------------------------------------------
  
  'build-structure': {
    actionId: 'build-structure',
    dataLocation: 'metadata',
    description: 'Select settlement and structure to build',
    resolve: (ctx) => {
      const settlement = getFirstSettlement(ctx.kingdom);
      if (!settlement) return null;
      
      // Pick a structure based on kingdom needs
      // Priority: unrest reduction > economy > defense
      const priorityStructures = [
        'counting-house', 'marketplace', 'shrine', 'tavern', 'barracks', 'library'
      ];
      
      // Filter to structures not yet in settlement
      const existingStructures = new Set(settlement.structureIds || []);
      const available = priorityStructures.filter(id => !existingStructures.has(id));
      
      const structureId = available[0] || 'houses';
      
      return {
        metadata: {
          buildingDetails: {
            settlementId: settlement.id,
            settlementName: settlement.name,
            structureId,
            structureName: structureId // Will be resolved by actual structure data
          }
        }
      };
    }
  },
  
  'collect-stipend': {
    actionId: 'collect-stipend',
    dataLocation: 'none',
    description: 'No pre-selection needed',
    resolve: () => ({})
  },
  
  'repair-structure': {
    actionId: 'repair-structure',
    dataLocation: 'metadata',
    description: 'Select damaged structure to repair',
    resolve: (ctx) => {
      // Find a settlement with damaged structures
      for (const settlement of (ctx.kingdom.settlements || [])) {
        const conditions = settlement.structureConditions || {};
        for (const [structureId, condition] of Object.entries(conditions)) {
          if (condition === 'damaged') {
            return {
              metadata: {
                structureId,
                settlementId: settlement.id,
                structureName: structureId
              }
            };
          }
        }
      }
      return null; // No damaged structures
    }
  },
  
  'upgrade-settlement': {
    actionId: 'upgrade-settlement',
    dataLocation: 'metadata',
    description: 'Select settlement to upgrade',
    resolve: (ctx) => {
      const settlements = (ctx.kingdom.settlements || []).filter(s => s.level < 20);
      if (settlements.length === 0) return null;
      
      // Upgrade lowest level settlement first
      const sorted = settlements.sort((a, b) => a.level - b.level);
      const settlement = sorted[0];
      
      return {
        metadata: {
          settlementId: settlement.id
        }
      };
    }
  },
  
  // ---------------------------------------------------------------------------
  // FACTION INTERACTIONS (metadata with faction selection)
  // ---------------------------------------------------------------------------
  
  'diplomatic-mission': {
    actionId: 'diplomatic-mission',
    dataLocation: 'metadata',
    description: 'Select faction for diplomatic mission',
    resolve: (ctx) => {
      // Can improve any faction except Hostile or Helpful
      const improvable = (ctx.kingdom.factions || []).filter(f =>
        f.attitude !== 'Hostile' && f.attitude !== 'Helpful'
      );
      
      if (improvable.length === 0) return null;
      
      // Prefer improving unfriendly -> indifferent -> friendly
      const sorted = improvable.sort((a, b) => {
        const order = ['Unfriendly', 'Indifferent', 'Friendly'];
        return order.indexOf(a.attitude) - order.indexOf(b.attitude);
      });
      
      return {
        metadata: {
          faction: { id: sorted[0].id },
          factionId: sorted[0].id
        }
      };
    }
  },
  
  'infiltration': {
    actionId: 'infiltration',
    dataLocation: 'metadata',
    description: 'Select faction to infiltrate',
    resolve: (ctx) => {
      const factionId = getAnyFactionId(ctx.kingdom);
      if (!factionId) return null;
      
      return {
        metadata: {
          targetFactionId: factionId
        }
      };
    }
  },
  
  'request-economic-aid': {
    actionId: 'request-economic-aid',
    dataLocation: 'metadata',
    description: 'Select friendly faction for economic aid',
    resolve: (ctx) => {
      // Check which factions haven't aided this turn
      const aidedThisTurn = ctx.kingdom.turnState?.actionsPhase?.factionsAidedThisTurn || [];
      
      const available = (ctx.kingdom.factions || []).filter(f =>
        (f.attitude === 'Friendly' || f.attitude === 'Helpful') &&
        !aidedThisTurn.includes(f.id)
      );
      
      if (available.length === 0) return null;
      
      return {
        metadata: {
          faction: { id: available[0].id },
          factionId: available[0].id
        }
      };
    }
  },
  
  'request-military-aid': {
    actionId: 'request-military-aid',
    dataLocation: 'metadata',
    description: 'Select friendly faction for military aid',
    resolve: (ctx) => {
      const factionId = getFriendlyFactionId(ctx.kingdom);
      if (!factionId) return null;
      
      return {
        metadata: {
          faction: { id: factionId },
          factionId
        }
      };
    }
  },
  
  // ---------------------------------------------------------------------------
  // ARMY OPERATIONS
  // ---------------------------------------------------------------------------
  
  'recruit-unit': {
    actionId: 'recruit-unit',
    dataLocation: 'customComponentData',
    description: 'Configure new army recruitment',
    resolve: (ctx) => {
      // Army actions require real Foundry actors - return null to use fallback
      return null;
    }
  },
  
  'train-army': {
    actionId: 'train-army',
    dataLocation: 'customComponentData',
    description: 'Select army to train',
    resolve: (ctx) => {
      // Army actions require real Foundry actors - return null to use fallback
      // The fallback applies modifiers only, which is appropriate for simulation
      return null;
    }
  },
  
  'outfit-army': {
    actionId: 'outfit-army',
    dataLocation: 'customComponentData',
    description: 'Select army and equipment type',
    resolve: (ctx) => {
      // Army actions require real Foundry actors - return null to use fallback
      return null;
    }
  },
  
  'deploy-army': {
    actionId: 'deploy-army',
    dataLocation: 'metadata',
    description: 'Select army and movement path',
    resolve: (ctx) => {
      // Army actions require real Foundry actors - return null to use fallback
      return null;
    }
  },
  
  'disband-army': {
    actionId: 'disband-army',
    dataLocation: 'customComponentData',
    description: 'Select army to disband',
    resolve: (ctx) => {
      // Army actions require real Foundry actors - return null to use fallback
      return null;
    }
  },
  
  'tend-wounded': {
    actionId: 'tend-wounded',
    dataLocation: 'metadata',
    description: 'Select army for medical care',
    resolve: (ctx) => {
      // Army actions require real Foundry actors - return null to use fallback
      return null;
    }
  },
  
  // ---------------------------------------------------------------------------
  // STABILITY OPERATIONS
  // ---------------------------------------------------------------------------
  
  'arrest-dissidents': {
    actionId: 'arrest-dissidents',
    dataLocation: 'customComponentData',
    description: 'Allocate imprisoned unrest to settlements',
    resolve: (ctx) => {
      if (ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure') {
        return {};
      }
      
      const settlement = getFirstSettlement(ctx.kingdom);
      if (!settlement) return null;
      
      // Simple allocation - put 1 unrest in first settlement
      return {
        customComponentData: {
          allocations: {
            [settlement.id]: 1
          }
        }
      };
    }
  },
  
  'execute-or-pardon-prisoners': {
    actionId: 'execute-or-pardon-prisoners',
    dataLocation: 'metadata',
    description: 'Select settlement with imprisoned unrest',
    resolve: (ctx) => {
      const settlement = getSettlementWithPrisoners(ctx.kingdom);
      if (!settlement) return null;
      
      return {
        metadata: {
          settlement: {
            id: settlement.id,
            name: settlement.name
          }
        }
      };
    }
  },
  
  // ---------------------------------------------------------------------------
  // RESOURCE OPERATIONS (callback-based, no pre-resolve needed)
  // ---------------------------------------------------------------------------
  
  'harvest-resources': {
    actionId: 'harvest-resources',
    dataLocation: 'callback',
    description: 'Resource selection handled by callback',
    resolve: (ctx) => {
      // The callback will prompt for resource selection
      // For simulation, we can provide a default
      if (ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure') {
        return {};
      }
      
      // Pick resource with lowest amount
      const resources = ctx.kingdom.resources || {};
      const options = [
        { type: 'food', amount: resources.food || 0 },
        { type: 'lumber', amount: resources.lumber || 0 },
        { type: 'stone', amount: resources.stone || 0 },
        { type: 'ore', amount: resources.ore || 0 }
      ];
      
      options.sort((a, b) => a.amount - b.amount);
      const harvestAmount = ctx.outcome === 'criticalSuccess' ? 4 : 2;
      
      return {
        customComponentData: {
          resourceSelection: {
            selectedResource: options[0].type,
            amount: harvestAmount
          }
        }
      };
    }
  },
  
  'sell-surplus': {
    actionId: 'sell-surplus',
    dataLocation: 'callback',
    description: 'Resource selection handled by callback',
    resolve: (ctx) => {
      if (ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure') {
        return {};
      }
      
      // Pick resource with highest amount
      const resources = ctx.kingdom.resources || {};
      const options = [
        { type: 'food', amount: resources.food || 0 },
        { type: 'lumber', amount: resources.lumber || 0 },
        { type: 'stone', amount: resources.stone || 0 },
        { type: 'ore', amount: resources.ore || 0 }
      ];
      
      options.sort((a, b) => b.amount - a.amount);
      
      if (options[0].amount < 2) return null; // Not enough to sell
      
      return {
        customComponentData: {
          resourceSelection: {
            selectedResource: options[0].type,
            selectedAmount: 2,
            goldGained: 1
          }
        }
      };
    }
  },
  
  'purchase-resources': {
    actionId: 'purchase-resources',
    dataLocation: 'callback',
    description: 'Resource selection handled by callback',
    resolve: (ctx) => {
      if (ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure') {
        return {};
      }
      
      // Pick resource with lowest amount
      const resources = ctx.kingdom.resources || {};
      const options = [
        { type: 'food', amount: resources.food || 0 },
        { type: 'lumber', amount: resources.lumber || 0 },
        { type: 'stone', amount: resources.stone || 0 },
        { type: 'ore', amount: resources.ore || 0 }
      ];
      
      options.sort((a, b) => a.amount - b.amount);
      
      return {
        customComponentData: {
          resourceSelection: {
            selectedResource: options[0].type,
            selectedAmount: 1,
            goldCost: 2
          }
        }
      };
    }
  }
};

// =============================================================================
// RESOLVER FUNCTION
// =============================================================================

/**
 * Auto-resolve data requirements for an action
 * 
 * @param actionId - The action pipeline ID
 * @param ctx - Simulation context with kingdom state
 * @returns Resolved data ready to inject into pipeline context, or null if action cannot be performed
 */
export function resolveActionData(
  actionId: string,
  ctx: SimulationContext
): ActionResolvedData | null {
  const requirement = ACTION_DATA_REQUIREMENTS[actionId];
  
  if (!requirement) {
    console.warn(`[PipelineTypes] No data requirement defined for action: ${actionId}`);
    return {}; // Allow action to proceed without special data
  }
  
  return requirement.resolve(ctx);
}

/**
 * Get list of all action IDs with their data requirements
 */
export function getActionDataSummary(): Array<{ actionId: string; location: DataLocation; description: string }> {
  return Object.values(ACTION_DATA_REQUIREMENTS).map(req => ({
    actionId: req.actionId,
    location: req.dataLocation,
    description: req.description
  }));
}

