/**
 * KingdomActor - Foundry Actor class for kingdom management
 * Following the _pf2e-kingmaker-tools pattern for direct Foundry integration
 */

import type { Settlement } from '../models/Settlement';
import type { Army } from '../models/Army';
import type { BuildProject } from '../services/buildQueue/BuildProject';
import type { ActiveModifier, ActiveEventInstance } from '../models/Modifiers';
import type { OutcomePreview } from '../models/OutcomePreview';
import type { TurnState } from '../models/TurnState';
import type { Faction } from '../models/Faction';
import type { DoctrineMilestone } from '../types/Doctrine';
import { loadDefaultFactions } from '../models/DefaultFactions';
import { getHighestPartyLevel } from '../hooks/partyLevelHooks';
import { logger } from '../utils/Logger';

// Turn phases based on Reignmaker Lite rules - using semantic names
export enum TurnPhase {
  STATUS = 'Kingdom Status',
  RESOURCES = 'Resources', 
  UNREST = 'Unrest',
  EVENTS = 'Events',
  ACTIONS = 'Actions',
  UPKEEP = 'Upkeep'
}

// Phase order - controlled by TurnManager for maintainability
export const PHASE_ORDER: TurnPhase[] = [
  TurnPhase.STATUS,
  TurnPhase.RESOURCES,
  TurnPhase.UNREST,
  TurnPhase.EVENTS,
  TurnPhase.ACTIONS,
  TurnPhase.UPKEEP
];

// Turn phase configuration with descriptions
export const TurnPhaseConfig = {
  [TurnPhase.STATUS]: { displayName: 'Kingdom Status', description: 'Gain Fame and apply ongoing modifiers' },
  [TurnPhase.RESOURCES]: { displayName: 'Resources', description: 'Collect resources and revenue' },
  [TurnPhase.UNREST]: { displayName: 'Unrest', description: 'Check unrest status and manually roll for incidents if needed' },
  [TurnPhase.EVENTS]: { displayName: 'Events', description: 'Resolve kingdom events' },
  [TurnPhase.ACTIONS]: { displayName: 'Actions', description: 'Perform kingdom actions' },
  [TurnPhase.UPKEEP]: { displayName: 'Upkeep', description: 'Pay consumption, support costs, and end turn' }
};

// Phase step counts - static lengths for predictable completion
export const PHASE_STEP_COUNTS = {
  [TurnPhase.STATUS]: 2,      // Auto-complete on init
  [TurnPhase.RESOURCES]: 1,   // Always manual
  [TurnPhase.UNREST]: 3,      // Auto calc + manual check + conditional resolve
  [TurnPhase.EVENTS]: 2,      // Manual check + conditional resolve
  [TurnPhase.ACTIONS]: 1,     // Auto-complete on init (actions optional)
  [TurnPhase.UPKEEP]: 3       // Manual feed + conditional military + conditional build
};

// Export types for use throughout the application
export type { Settlement, Army, BuildProject };

// Phase step definition - New simplified structure
export interface PhaseStep {
  name: string;
  completed: 0 | 1;  // 0 = incomplete, 1 = complete
}

// Province - logical grouping of contiguous hexes within claimed territory
export interface Province {
  id: string;
  name: string;
  hexIds: string[];  // Hex IDs that belong to this province (must be contiguous)
}

// Simplified, serializable kingdom data structure
export interface KingdomData {
  // Core identity
  name?: string;  // Kingdom name
  
  // Core progression
  currentTurn: number;
  currentPhase: TurnPhase;
  currentPhaseStepIndex: number;  // Current step being worked on
  currentStepName?: string;       // Name of the current step
  setupComplete?: boolean;        // True after Turn 0 setup is complete (one-time flag)
  
  // Resources - simple object instead of Map
  resources: Record<string, number>;
  
  // Territory
  hexes: Array<{
    id: string;
    row: number;
    col: number;
    terrain: string;
    worksite?: { type: string } | null;
    commodities?: Record<string, number>;  // Bounty resources on this hex (stored as object for JSON serialization)
    hasCommodityBonus?: boolean;  // Legacy field - deprecated in favor of commodities
    hasRoad?: boolean;
    fortified?: number;  // Legacy field - may be deprecated in favor of fortification
    fortification?: {
      tier: 1 | 2 | 3 | 4;
      maintenancePaid: boolean;
      turnBuilt: number;  // Turn number when built/upgraded (no maintenance required on this turn)
    };
    name?: string;
    features?: Array<{ type: string; [key: string]: any }>;  // Our features only (settlements, landmarks, rivers, etc.)
    claimedBy?: string | null;  // "player" for player kingdom, faction name for other factions, null for wilderness
  }>;
  settlements: Settlement[];
  size: number;
  worksiteCount: Record<string, number>;
  // Worksite production: resources produced by worksites on claimed hexes
  // This is derived from hexes but stored in the model for efficiency
  // Must be recalculated whenever hexes or worksites change
  worksiteProduction: Record<string, number>;
  worksiteProductionByHex?: Array<[any, Map<string, number>]>;
  
  // Military & Construction
  armies: Army[];
  buildQueue: BuildProject[];
  
  // Diplomacy
  factions: Faction[];

  // Territory organization
  provinces?: Province[];  // Logical groupings of contiguous hexes within claimed territory

  // Map colors
  playerKingdomColor?: string;  // Player kingdom territory color (default: '#5b9bd5')
  
  // Kingdom stats
  unrest: number;
  imprisonedUnrest: number;
  fame: number;
  isAtWar: boolean;
  partyLevel: number;  // Highest level among player characters
  leadershipPenalty?: number;  // Turn-scoped penalty to all skill checks (e.g., -1 from scandals)

  // Doctrine tracking - accumulated points from event vote choices
  // Each winning vote adds 5 points to the corresponding category
  doctrine?: {
    idealist: number;   // Chose idealist/compassionate approaches
    practical: number;  // Chose practical/balanced approaches
    ruthless: number;   // Chose ruthless/expedient approaches
  };

  // Doctrine milestones - records of when each tier was achieved
  doctrineMilestones?: DoctrineMilestone[];

  // Events & Modifiers (persistent across turns)
  ongoingEvents: string[];  // Event IDs that persist across turns (legacy - may be deprecated)
  pendingOutcomes: OutcomePreview[];  // Unified outcome preview tracking (incidents, events, actions)
  activeModifiers: ActiveModifier[];  // Active modifiers from structures/diplomatic/custom (NOT events)
  eventDC: number;  // Event DC that persists across turns (15 default, -5 when no event, min 6)
  
  // Simplified phase management with step arrays - single source of truth
  currentPhaseSteps: PhaseStep[];
  phaseComplete: boolean;
  oncePerTurnActions: string[];
  
  // Faction aid tracking - reset at start of each turn
  // Tracks which factions have provided aid (military or economic) this turn
  // Each faction may only be called upon once per turn
  factionsAidedThisTurn?: string[];  // Array of faction IDs
  
  // Player actions REMOVED - now using turnState.actionLog instead
  
  // Legacy event/incident fields removed - now in turnState (Phase 7 cleanup)
  // All event/incident state is now in:
  // - turnState.eventsPhase (events)
  // - turnState.unrestPhase (incidents)
  
  // NEW: Comprehensive turn state - single source of truth for UI behavior
  // Optional during migration from scattered fields to consolidated turnState
  turnState?: TurnState;
  
  // NEW: Sequential river path system (replaced canonical edge system)
  // Rivers are stored as ordered sequences of points (connect-the-dots)
  // Order increments of 10 allow insertions without renumbering entire path
  // Crossings and waterfalls are segment-based: attached to specific path segments
  rivers?: {
    paths: RiverPath[];
    crossings?: RiverCrossing[];  // Bridges and fords (segment-based)
    waterfalls?: RiverWaterfall[];  // Waterfalls that block boats (segment-based)
    barrierSegments?: BarrierSegment[];  // Pre-computed barrier lines for pathfinding
  };
  
  // NEW: Road editing system
  // Primary storage: hex.hasRoad flags (auto-connects adjacent hexes)
  // Blocked connections: Allow scissor tool to cut specific segments
  roads?: {
    blockedConnections?: RoadBlockedConnection[];  // Segments that should not render
  };
  
  // NEW: Water features (lakes and swamps only - waterfalls moved to rivers)
  // Lakes = open water (boats/swimming work, placed on any terrain)
  // Swamps = difficult water (boats: difficult, auto-granted when terrain='swamp')
  // Note: hex can have lake OR swamp (mutually exclusive)
  waterFeatures?: {
    lakes: WaterFeature[];      // Open water features
    swamps: WaterFeature[];     // Difficult water features (auto-populated from terrain='swamp')
  };
}

/**
 * River path - ordered sequence of points that form a continuous river
 * Multiple paths can share points to form junctions
 */
export interface RiverPath {
  id: string;  // Unique path identifier (uuid)
  points: RiverPathPoint[];
  navigable?: boolean;
  color?: string;  // Optional debug color
}

/**
 * Single point in a river path
 * A river path is a polyline that connects hex connection points.
 *
 * Hex connection points:
 * - Center  : hex center (isCenter === true)
 * - Edge    : hex edge midpoint (edge set to 'e' | 'se' | 'sw' | 'w' | 'nw' | 'ne')
 * - Corner  : hex vertex (cornerIndex 0–5, based on Foundry's getVertices order)
 *
 * Only one of (isCenter, edge, cornerIndex) should be set for a given point.
 */
export interface RiverPathPoint {
  hexI: number;
  hexJ: number;

  // Center connector
  isCenter?: boolean;

  // Edge connector
  edge?: string;  // Edge direction ('e', 'se', 'sw', 'w', 'nw', 'ne') if point is on edge

  // Corner connector (0–5 index into canvas.grid.getVertices({i,j}))
  cornerIndex?: number;

  // Sequence order (increments of 10: 10, 20, 30, ...)
  order: number;
}

/**
 * Water feature - represents lakes, swamps, or waterfalls on hexes
 * Lakes = open water terrain (boats/swimming work normally)
 * Swamps = difficult water terrain (boats: difficult, swimming: open, land: greater difficult)
 * Waterfalls = block naval travel (boats cannot pass, but swimmers can)
 */
export interface WaterFeature {
  id: string;  // Unique identifier (uuid)
  hexI: number;
  hexJ: number;
  edge?: string;  // For waterfalls: which edge ('e', 'se', 'sw', 'w', 'nw', 'ne')
}

/**
 * River crossing - allows grounded armies to cross water
 * Can be a bridge (built structure) or ford (natural crossing)
 * 
 * Connection-point-based storage: Crossings are placed on hex connection points
 * (center, edge, or corner) matching the same system used by river paths.
 * Crossings are independent features that persist regardless of river state.
 */
export interface RiverCrossing {
  id: string;  // Unique identifier (uuid)
  hexI: number;  // Hex row coordinate
  hexJ: number;  // Hex column coordinate
  
  // Connection point (one of these should be set)
  isCenter?: boolean;  // Center connector
  edge?: string;  // Edge connector ('e', 'se', 'sw', 'w', 'nw', 'ne')
  cornerIndex?: number;  // Corner connector (0-5)
  
  type: 'bridge' | 'ford';
  name?: string;  // Optional label (e.g., "Stone Bridge", "Miller's Ford")
}

/**
 * Waterfall feature - blocks naval travel on rivers
 * Connection-point-based storage: Waterfalls are placed on hex connection points
 * matching the same system used by river paths and crossings.
 */
export interface RiverWaterfall {
  id: string;  // Unique identifier (uuid)
  hexI: number;  // Hex row coordinate
  hexJ: number;  // Hex column coordinate
  
  // Connection point (one of these should be set)
  isCenter?: boolean;  // Center connector
  edge?: string;  // Edge connector ('e', 'se', 'sw', 'w', 'nw', 'ne')
  cornerIndex?: number;  // Corner connector (0-5)
}

/**
 * Barrier segment - pre-computed line segment for pathfinding intersection checks
 * Stored in kingdom data when rivers are edited, used by pathfinding to block movement
 */
export interface BarrierSegment {
  start: { x: number; y: number };  // Start point in pixel coordinates
  end: { x: number; y: number };    // End point in pixel coordinates
  hasCrossing: boolean;             // If true, segment allows passage (bridge/ford exists)
}

/**
 * Road blocked connection - prevents rendering between two adjacent hexes
 * Used by scissor tool to cut road segments without removing entire hex roads
 */
export interface RoadBlockedConnection {
  id: string;  // Unique identifier (uuid)
  hex1: string;  // First hex ID (e.g., "5.8")
  hex2: string;  // Second hex ID (e.g., "5.9")
}

export class KingdomActor extends Actor {
  private static readonly MODULE_ID = 'pf2e-reignmaker';
  private static readonly KINGDOM_DATA_KEY = 'kingdom-data';
  
  /**
   * Get kingdom data from actor flags
   * Note: When used on party actors, this method is added by wrapKingdomActor()
   */
  getKingdomData(): KingdomData | null {
    const data = this.getFlag(KingdomActor.MODULE_ID, KingdomActor.KINGDOM_DATA_KEY) as KingdomData;
    return data || null;
  }
  
  /**
   * Set kingdom data to actor flags - triggers automatic synchronization
   * Note: When used on party actors, this method is added by wrapKingdomActor()
   */
  async setKingdomData(kingdom: KingdomData): Promise<void> {
    await this.setFlag(KingdomActor.MODULE_ID, KingdomActor.KINGDOM_DATA_KEY, kingdom);
  }
  
  /**
   * Update kingdom data with a function - similar to Svelte store pattern
   * Automatically routes through GM via ActionDispatcher if player lacks permission
   * Note: When used on party actors, this method is added by wrapKingdomActor()
   */
  async updateKingdomData(updater: (kingdom: KingdomData) => void): Promise<void> {
    const kingdom = this.getKingdomData();
    if (!kingdom) {
      logger.warn('[KingdomActor] No kingdom data found, cannot update');
      return;
    }
    
    // Check if the current user has permission to update this actor
    if (!this.canUserModify(game.user, 'update')) {
      // Route through ActionDispatcher to execute on GM's client
      try {
        const { actionDispatcher } = await import('../services/ActionDispatcher');
        
        if (!actionDispatcher.isAvailable()) {
          const errorMsg = 'Action dispatcher not initialized. Please reload the game.';
          logger.error('[KingdomActor]', errorMsg);
          ui.notifications?.error(errorMsg);
          throw new Error(errorMsg);
        }
        
        // Apply updater locally to get the updated state
        const updatedKingdom = JSON.parse(JSON.stringify(kingdom));
        updater(updatedKingdom);
        
        // Send to GM for execution
        await actionDispatcher.dispatch('updateKingdom', {
          actorId: this.id,
          updatedKingdom
        });
        
        return;
      } catch (error) {
        logger.error('[KingdomActor] Failed to update kingdom via dispatcher:', error);
        ui.notifications?.error('Failed to update kingdom. Please contact your GM.');
        throw error;
      }
    }
    
    // User has permission - execute directly
    // Apply the update
    updater(kingdom);
    
    // Save back to flags - triggers automatic sync
    await this.setKingdomData(kingdom);
  }
  
  /**
   * Check if the current user can modify this kingdom
   */
  canCurrentUserModify(): boolean {
    return this.canUserModify(game.user, 'update');
  }
  
  /**
   * Ensure all players have OWNER permission on this kingdom actor
   * This should be called by a GM when setting up a kingdom for collaborative play
   */
  async ensurePlayerOwnership(): Promise<void> {
    if (!game.user?.isGM) {
      ui.notifications?.error('Only a GM can modify actor permissions.');
      return;
    }
    
    const ownership: Record<string, number> = {};
    
    // Set all players to OWNER (level 3)
    for (const user of game.users!) {
      if (!user.isGM) {
        ownership[user.id] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
      }
    }
    
    // Keep default for everyone else
    ownership.default = CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE;
    
    await this.update({ ownership });
    
    ui.notifications?.info(`Kingdom actor permissions updated. All players now have OWNER access.`);
    logger.info('[KingdomActor] Updated ownership:', ownership);
  }
  
  /**
   * Initialize kingdom with default data
   */
  async initializeKingdom(name: string = 'New Kingdom'): Promise<void> {
    // Load default factions from data file
    const defaultFactions = await loadDefaultFactions();
    
    // Get current party level from player characters
    const partyLevel = getHighestPartyLevel();
    console.log(`🎯 [KingdomActor] Initializing kingdom with party level: ${partyLevel}`);
    
    const defaultKingdom: KingdomData = {
      name,
      currentTurn: 0,
      currentPhase: TurnPhase.STATUS,
      currentPhaseStepIndex: 0,
      setupComplete: false,
      resources: {
        gold: 0,
        food: 0,
        lumber: 0,
        stone: 0,
        ore: 0,
        // Capacity resources
        foodCapacity: 0,
        armyCapacity: 0,
        diplomaticCapacity: 1,
        imprisonedUnrestCapacity: 0
      },
      hexes: [],
      settlements: [],
      size: 0,
      worksiteCount: {},
      worksiteProduction: {},
      armies: [],
      buildQueue: [],
      factions: defaultFactions,  // Loaded from data/factions/default-factions.json
      playerKingdomColor: '#5b9bd5',  // Default blue (current territory color)
      unrest: 0,
      imprisonedUnrest: 0,
      fame: 0,
      isAtWar: false,
      partyLevel: partyLevel,  // Synced from party actors during initialization
      doctrine: {
        idealist: 0,
        practical: 0,
        ruthless: 0
      },
      ongoingEvents: [],
      pendingOutcomes: [],
      activeModifiers: [],
      eventDC: 15,  // Default event DC per rules
      currentPhaseSteps: [],
      phaseComplete: false,
      oncePerTurnActions: []
    };

    await this.setKingdomData(defaultKingdom);
  }
  
  /**
   * Set phase steps - simple data setter
   */
  async setPhaseSteps(steps: Array<{ name: string; completed: 0 | 1 }>): Promise<void> {
    await this.updateKingdomData((kingdom) => {
      kingdom.currentPhaseSteps = steps;
    });
  }

  /**
   * Set current step index - simple data setter
   */
  async setCurrentStepIndex(stepIndex: number): Promise<void> {
    await this.updateKingdomData((kingdom) => {
      kingdom.currentPhaseStepIndex = stepIndex;
    });
  }

  /**
   * Complete a step by index - simple data setter
   */
  async completeStepByIndex(stepIndex: number): Promise<void> {
    await this.updateKingdomData((kingdom) => {
      if (stepIndex >= 0 && stepIndex < kingdom.currentPhaseSteps.length) {
        kingdom.currentPhaseSteps[stepIndex].completed = 1;
      }
    });
  }

  
  /**
   * Modify resource amounts
   */
  async modifyResource(resource: string, amount: number): Promise<void> {
    await this.updateKingdomData((kingdom) => {
      const current = kingdom.resources[resource] || 0;
      kingdom.resources[resource] = Math.max(0, current + amount);
    });
  }
  
  /**
   * Set resource to specific amount
   */
  async setResource(resource: string, amount: number): Promise<void> {
    await this.updateKingdomData((kingdom) => {
      kingdom.resources[resource] = Math.max(0, amount);
    });
  }
  
  /**
   * Add settlement
   */
  async addSettlement(settlement: Settlement): Promise<void> {
    await this.updateKingdomData((kingdom) => {
      kingdom.settlements.push(settlement);
    });
  }
  
  /**
   * Remove settlement
   */
  async removeSettlement(settlementId: string): Promise<void> {
    await this.updateKingdomData((kingdom) => {
      kingdom.settlements = kingdom.settlements.filter(s => s.id !== settlementId);
    });
  }
  
  /**
   * Update settlement
   */
  async updateSettlement(settlementId: string, updates: Partial<Settlement>): Promise<void> {
    await this.updateKingdomData((kingdom) => {
      const index = kingdom.settlements.findIndex(s => s.id === settlementId);
      if (index >= 0) {
        kingdom.settlements[index] = { ...kingdom.settlements[index], ...updates };
      }
    });
  }
  
  /**
   * Add army
   */
  async addArmy(army: Army): Promise<void> {
    await this.updateKingdomData((kingdom) => {
      kingdom.armies.push(army);
    });
  }
  
  /**
   * Remove army
   */
  async removeArmy(armyId: string): Promise<void> {
    await this.updateKingdomData((kingdom) => {
      kingdom.armies = kingdom.armies.filter(a => a.id !== armyId);
    });
  }
  
  /**
   * Add active modifier
   */
  async addActiveModifier(modifier: ActiveModifier): Promise<void> {
    await this.updateKingdomData((kingdom) => {
      kingdom.activeModifiers.push(modifier);
    });
  }
  
  /**
   * Remove active modifier
   */
  async removeActiveModifier(modifierId: string): Promise<void> {
    await this.updateKingdomData((kingdom) => {
      kingdom.activeModifiers = kingdom.activeModifiers.filter(m => m.id !== modifierId);
    });
  }
  
}

/**
 * Create default kingdom data
 * Note: This is a synchronous utility function. 
 * Factions will be empty - use initializeKingdom() for full initialization with default factions.
 */
export function createDefaultKingdom(name: string = 'New Kingdom'): KingdomData {
    // Get current party level from player characters
    const partyLevel = getHighestPartyLevel();
    
    return {
      name,
      currentTurn: 0,
      currentPhase: TurnPhase.STATUS,
      currentPhaseStepIndex: 0,
      setupComplete: false,
      resources: {
        gold: 0,
        food: 0,
        lumber: 0,
        stone: 0,
        ore: 0,
        // Capacity resources
        foodCapacity: 0,
        armyCapacity: 0,
        diplomaticCapacity: 1,
        imprisonedUnrestCapacity: 0
      },
    hexes: [],
    settlements: [],
    size: 0,
    worksiteCount: {},
    worksiteProduction: {},
      armies: [],
      buildQueue: [],
      factions: [],  // Empty - populated by initializeKingdom() or caller
      playerKingdomColor: '#5b9bd5',  // Default blue (current territory color)
      unrest: 0,
      imprisonedUnrest: 0,
      fame: 0,
      isAtWar: false,
      partyLevel: partyLevel,  // Synced from party actors during initialization
      doctrine: {
        idealist: 0,
        practical: 0,
        ruthless: 0
      },
      ongoingEvents: [],
      pendingOutcomes: [],
      activeModifiers: [],
      eventDC: 15,  // Default event DC per rules
      currentPhaseSteps: [],
      phaseComplete: false,
      oncePerTurnActions: []
    };
}
