/**
 * Event Pipeline Types and Auto-Resolvers
 * 
 * This file defines data requirements for all 37 event pipelines
 * and provides auto-resolve functions for simulation.
 * 
 * Most events work through modifiers only and don't need special data.
 * Events with execute functions or postApplyInteractions may need resolution data.
 * 
 * Categories:
 * - none: Pure modifier events (most common)
 * - metadata: Events that use metadata from preview.calculate
 * - compoundData: Events with postApplyInteractions for hex selection
 * - gameCommand: Events that use gameCommands for structure effects
 */

import type { KingdomData } from '../../actors/KingdomActor';
import type { OutcomeType } from '../../types/CheckPipeline';
import { PLAYER_KINGDOM } from '../../types/ownership';
import { 
  getClaimableHexes
} from '../../domain/territory/adjacencyLogic';

// =============================================================================
// TYPES
// =============================================================================

export type EventDataLocation = 'none' | 'metadata' | 'compoundData' | 'gameCommand';

export interface EventSimulationContext {
  kingdom: KingdomData;
  exploredHexIds: Set<string>;
  outcome: OutcomeType;
  turn: number;
}

export interface EventDataRequirement {
  eventId: string;
  dataLocation: EventDataLocation;
  description: string;
  resolve: (ctx: EventSimulationContext) => EventResolvedData | null;
}

export interface EventResolvedData {
  metadata?: Record<string, any>;
  compoundData?: Record<string, any>;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getRandomFaction(kingdom: KingdomData, excludeAttitude?: string): any | null {
  const factions = (kingdom.factions || []).filter(f => 
    excludeAttitude ? f.attitude !== excludeAttitude : true
  );
  if (factions.length === 0) return null;
  return factions[Math.floor(Math.random() * factions.length)];
}

function getFirstSettlement(kingdom: KingdomData): any | null {
  return (kingdom.settlements || [])[0] || null;
}

// =============================================================================
// EVENT DATA REQUIREMENTS
// =============================================================================

/**
 * Pure modifier events - no special data needed
 * These events just apply outcome modifiers automatically
 */
const PURE_MODIFIER_EVENTS = [
  'archaeological-find',
  'assassination-attempt', 
  'bandit-activity',
  'boomtown',
  'criminal-trial',
  'cult-activity',
  'drug-den',
  'economic-surge',
  'feud',
  'food-shortage',
  'food-surplus',
  'good-weather',
  'grand-tournament',
  'immigration',
  'inquisition',
  'local-disaster',
  'magical-discovery',
  'military-exercises',
  'natural-disaster',
  'natures-blessing',
  'notorious-heist',
  'pilgrimage',
  'plague',
  'public-scandal',
  'raiders',
  'remarkable-treasure',
  'scholarly-discovery',
  'sensational-crime',
  'trade-agreement',
  'undead-uprising',
  'visiting-celebrity'
];

export const EVENT_DATA_REQUIREMENTS: Record<string, EventDataRequirement> = {};

// Add pure modifier events (no data needed)
for (const eventId of PURE_MODIFIER_EVENTS) {
  EVENT_DATA_REQUIREMENTS[eventId] = {
    eventId,
    dataLocation: 'none',
    description: 'Pure modifier event - modifiers applied automatically',
    resolve: () => ({})
  };
}

// ---------------------------------------------------------------------------
// EVENTS WITH SPECIAL DATA REQUIREMENTS
// ---------------------------------------------------------------------------

// Diplomatic Overture - needs faction selection in metadata
EVENT_DATA_REQUIREMENTS['diplomatic-overture'] = {
  eventId: 'diplomatic-overture',
  dataLocation: 'metadata',
  description: 'Selects random faction for attitude adjustment',
  resolve: (ctx) => {
    if (ctx.outcome === 'failure') {
      return {}; // No faction change on failure
    }
    
    // Select faction based on outcome
    const steps = (ctx.outcome === 'criticalSuccess' || ctx.outcome === 'success') ? 1 : -1;
    const excludeAttitude = steps > 0 ? 'Helpful' : 'Hostile';
    
    const faction = getRandomFaction(ctx.kingdom, excludeAttitude);
    if (!faction) return {};
    
    return {
      metadata: {
        selectedFactionId: faction.id,
        attitudeSteps: steps
      }
    };
  }
};

// Festive Invitation - similar faction selection
EVENT_DATA_REQUIREMENTS['festive-invitation'] = {
  eventId: 'festive-invitation',
  dataLocation: 'metadata',
  description: 'Selects random faction for attitude improvement',
  resolve: (ctx) => {
    if (ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure') {
      return {};
    }
    
    const faction = getRandomFaction(ctx.kingdom, 'Helpful');
    if (!faction) return {};
    
    return {
      metadata: {
        selectedFactionId: faction.id
      }
    };
  }
};

// Land Rush - needs hex selection for claiming
EVENT_DATA_REQUIREMENTS['land-rush'] = {
  eventId: 'land-rush',
  dataLocation: 'compoundData',
  description: 'Selects hex(es) to claim on success',
  resolve: (ctx) => {
    if (ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure') {
      return {};
    }
    
    const claimable = getClaimableHexes(ctx.kingdom, ctx.exploredHexIds);
    if (claimable.length === 0) return null;
    
    const count = ctx.outcome === 'criticalSuccess' ? 2 : 1;
    const selected = claimable.slice(0, Math.min(count, claimable.length)).map(h => h.id);
    
    return {
      compoundData: { selectedHexes: selected }
    };
  }
};

// Demand Expansion - needs target hex selection for ongoing event
EVENT_DATA_REQUIREMENTS['demand-expansion'] = {
  eventId: 'demand-expansion',
  dataLocation: 'metadata',
  description: 'Target hex selected during preview.calculate',
  resolve: (ctx) => {
    // This event's metadata is populated during preview.calculate
    // For simulation, we just return empty - the execute function handles it
    return {};
  }
};

// Demand Structure - needs target structure selection for ongoing event  
EVENT_DATA_REQUIREMENTS['demand-structure'] = {
  eventId: 'demand-structure',
  dataLocation: 'metadata',
  description: 'Target structure selected during preview.calculate',
  resolve: (ctx) => {
    // This event's metadata is populated during preview.calculate
    return {};
  }
};

// Monster Attack - uses gameCommands for structure damage/destroy
EVENT_DATA_REQUIREMENTS['monster-attack'] = {
  eventId: 'monster-attack',
  dataLocation: 'gameCommand',
  description: 'Structure damage/destroy via gameCommands',
  resolve: (ctx) => {
    // gameCommands are prepared during preview.calculate
    // For simulation, the command handlers auto-select structures
    return {};
  }
};

// =============================================================================
// RESOLVER FUNCTION
// =============================================================================

/**
 * Auto-resolve data requirements for an event
 * 
 * @param eventId - The event pipeline ID
 * @param ctx - Simulation context with kingdom state
 * @returns Resolved data ready to inject into pipeline context, or null if cannot be resolved
 */
export function resolveEventData(
  eventId: string,
  ctx: EventSimulationContext
): EventResolvedData | null {
  const requirement = EVENT_DATA_REQUIREMENTS[eventId];
  
  if (!requirement) {
    // Unknown event - assume pure modifier
    console.warn(`[PipelineTypes] No data requirement defined for event: ${eventId}`);
    return {};
  }
  
  return requirement.resolve(ctx);
}

/**
 * Get list of all event IDs with their data requirements
 */
export function getEventDataSummary(): Array<{ eventId: string; location: EventDataLocation; description: string }> {
  return Object.values(EVENT_DATA_REQUIREMENTS).map(req => ({
    eventId: req.eventId,
    location: req.dataLocation,
    description: req.description
  }));
}

/**
 * Check if an event is a pure modifier event (no special handling needed)
 */
export function isPureModifierEvent(eventId: string): boolean {
  const requirement = EVENT_DATA_REQUIREMENTS[eventId];
  return requirement?.dataLocation === 'none';
}


