/**
 * Simplified Kingdom Store using Foundry-first architecture
 * Replaces the complex kingdomState and gameState stores
 */

import { writable, derived, get } from 'svelte/store';
import type { KingdomActor, KingdomData, Province } from '../actors/KingdomActor';
import { createDefaultKingdom } from '../actors/KingdomActor';
import { TurnPhase } from '../actors/KingdomActor';
import { TurnManager } from '../models/turn-manager';
import { calculateProduction } from '../services/economics/production';
import { PLAYER_KINGDOM } from '../types/ownership';
import { filterVisibleHexes, filterVisibleHexIds } from '../utils/visibility-filter';
import { logger } from '../utils/Logger';
import { wrapKingdomActor } from '../utils/kingdom-actor-wrapper';
import { createDefaultTurnState } from '../models/TurnState';
import { findOrphanedHexes } from '../utils/hex-contiguity';
import type { DoctrineType, DoctrineTier, DoctrineState, DoctrineTierConfig } from '../types/Doctrine';
import { DOCTRINE_THRESHOLDS, DOCTRINE_TIER_EFFECTS, DOCTRINE_COLORS, DEFAULT_DOCTRINE_VALUES } from '../constants/doctrine';

// Core actor store - this is the single source of truth
export const kingdomActor = writable<KingdomActor | null>(null);

// Derived kingdom data - automatically updates when actor updates
export const kingdomData = derived(
  kingdomActor,
  ($actor): KingdomData => {
    if (!$actor) return createDefaultKingdom();
    // Actor is wrapped with getKingdomData() method by wrapKingdomActor()
    const data = $actor.getKingdomData?.() || $actor.getFlag?.('pf2e-reignmaker', 'kingdom-data') as KingdomData;
    return data || createDefaultKingdom();
  }
);

// Convenience derived stores for common UI needs
export const currentTurn = derived(kingdomData, $data => $data.currentTurn);
export const currentPhase = derived(kingdomData, $data => $data.currentPhase);
export const resources = derived(kingdomData, $data => $data.resources);
export const settlements = derived(kingdomData, $data => $data.settlements);
export const armies = derived(kingdomData, $data => $data.armies);
export const unrest = derived(kingdomData, $data => $data.unrest);
// Imprisoned unrest is derived from settlements (sum of all settlement imprisoned unrest)
export const imprisonedUnrest = derived(settlements, $settlements => {
  return $settlements.reduce((sum, s) => sum + (s.imprisonedUnrest || 0), 0);
});
export const fame = derived(kingdomData, $data => $data.fame);

// Doctrine tracking - accumulated points from event vote choices
// Handles migration from old 'virtuous' field to 'idealist'
export const doctrine = derived(kingdomData, $data => {
  const raw = $data.doctrine as Record<string, number> | undefined;
  if (!raw) return { idealist: 0, practical: 0, ruthless: 0 };
  return {
    idealist: raw.idealist ?? raw.virtuous ?? 0,
    practical: raw.practical ?? 0,
    ruthless: raw.ruthless ?? 0
  };
});

// Helper functions for computing doctrine state inline (to avoid circular dependency with DoctrineService)
function getTierForValue(value: number): DoctrineTier {
  if (value >= DOCTRINE_THRESHOLDS.absolute) return 'absolute';
  if (value >= DOCTRINE_THRESHOLDS.major) return 'major';
  if (value >= DOCTRINE_THRESHOLDS.moderate) return 'moderate';
  if (value >= DOCTRINE_THRESHOLDS.minor) return 'minor';
  return 'none';
}

function getTierConfig(doctrine: DoctrineType, value: number): DoctrineTierConfig {
  const tier = getTierForValue(value);
  const effects = DOCTRINE_TIER_EFFECTS[tier];
  const tierCapitalized = tier === 'none' ? '' : tier.charAt(0).toUpperCase() + tier.slice(1);
  const doctrineCapitalized = doctrine.charAt(0).toUpperCase() + doctrine.slice(1);

  return {
    tier,
    threshold: DOCTRINE_THRESHOLDS[tier],
    label: tier === 'none' ? 'No Doctrine' : `${tierCapitalized} ${doctrineCapitalized}`,
    color: tier === 'none' ? 'var(--text-muted)' : DOCTRINE_COLORS[doctrine],
    skillBonus: effects.skillBonus
  };
}

function calculateDominant(values: Record<DoctrineType, number>): DoctrineType | null {
  const i = values.idealist || 0;
  const p = values.practical || 0;
  const r = values.ruthless || 0;
  const max = Math.max(i, p, r);
  if (max === 0) return null;
  const dominants: DoctrineType[] = [];
  if (i === max) dominants.push('idealist');
  if (p === max) dominants.push('practical');
  if (r === max) dominants.push('ruthless');
  return dominants.length === 1 ? dominants[0] : null;
}

// Doctrine state - comprehensive state including dominant, tiers, and effects
export const doctrineState = derived(kingdomData, ($data): DoctrineState => {
  const values = $data?.doctrine || { ...DEFAULT_DOCTRINE_VALUES };

  const tierInfo: Record<DoctrineType, DoctrineTierConfig> = {
    idealist: getTierConfig('idealist', values.idealist || 0),
    practical: getTierConfig('practical', values.practical || 0),
    ruthless: getTierConfig('ruthless', values.ruthless || 0)
  };

  const dominant = calculateDominant(values);
  const dominantTier = dominant ? tierInfo[dominant].tier : 'none';

  return {
    dominant,
    dominantTier,
    values,
    tierInfo
  };
});

// Event votes - reactive store for voting system
export const eventVotes = derived(kingdomActor, $actor => {
  if (!$actor) return [];
  const votes = $actor.getFlag?.('pf2e-reignmaker', 'eventVotes');
  return (votes || []) as any[];
});

// Current faction view (GM-only feature)
// Allows GMs to switch between viewing different factions' territories
// Must be declared before derived stores that use it
export const currentFaction = writable<string>(PLAYER_KINGDOM);

// ===== CLAIMED TERRITORY DERIVED STORES =====
// Single source of truth for territory filtering logic
// These automatically update when kingdom data changes

/**
 * Hexes claimed by the current faction (claimedBy === currentFaction)
 * Filtered by World Explorer visibility (GMs see all, players see revealed only)
 * Reactive to faction changes when GMs switch factions
 */
export const claimedHexes = derived(
  [kingdomData, currentFaction],
  ([$data, $faction]) => {
    const claimed = $data.hexes.filter(h => h.claimedBy === $faction);
    return filterVisibleHexes(claimed);
  }
);

/**
 * All claimed hexes grouped by faction (for multi-faction territory display)
 * Returns a Map where key = faction ID (or 'player'), value = array of hexes
 * Filtered by World Explorer visibility (GMs see all, players see revealed only)
 */
export const allClaimedHexesByFaction = derived(
  kingdomData,
  ($data) => {
    const grouped = new Map<string | null, any[]>();
    
    // Group hexes by claimedBy value
    $data.hexes.forEach(h => {
      if (h.claimedBy !== null && h.claimedBy !== undefined) {
        const existing = grouped.get(h.claimedBy) || [];
        existing.push(h);
        grouped.set(h.claimedBy, existing);
      }
    });
    
    // Apply visibility filter to each group
    const filtered = new Map<string | null, any[]>();
    grouped.forEach((hexes, faction) => {
      filtered.set(faction, filterVisibleHexes(hexes));
    });
    
    return filtered;
  }
);

/**
 * Which factions should be visible on the territories overlay
 * Stores faction IDs that are currently visible
 * Defaults to showing all factions (empty set = all visible)
 * When a faction is added to this set, it becomes HIDDEN
 */
export const hiddenFactions = writable<Set<string>>(new Set());

/**
 * All hexes grouped by faction (including unclaimed as 'unclaimed')
 * Used for multi-faction territory display with visibility filtering.
 * Filtered by World Explorer visibility (GMs see all, players see revealed only)
 */
export const allHexesByFaction = derived(
  kingdomData,
  ($data) => {
    const grouped = new Map<string, any[]>();
    
    // Group ALL hexes by claimedBy value
    $data.hexes.forEach(h => {
      // Use 'unclaimed' as key for null/undefined claimedBy
      const factionKey = h.claimedBy ?? 'unclaimed';
      const existing = grouped.get(factionKey) || [];
      existing.push(h);
      grouped.set(factionKey, existing);
    });
    
    // Apply visibility filter to each group
    const filtered = new Map<string, any[]>();
    grouped.forEach((hexes, faction) => {
      filtered.set(faction, filterVisibleHexes(hexes));
    });
    
    return filtered;
  }
);

/**
 * All settlements with valid map locations
 * Filters out only unmapped settlements (location 0,0)
 * Uses location as the source of truth (kingmakerLocation is discarded after import)
 */
export const allSettlements = derived(kingdomData, $data => {
  return $data.settlements.filter(s => {
    // Only exclude unmapped settlements (location is the source of truth)
    return s.location.x > 0 || s.location.y > 0;
  });
});

/**
 * Owned settlements - settlements belonging to the current faction
 * Derives ownership from hex.claimedBy (single source of truth)
 * Filters for settlements where the hex is owned by the current faction
 * Reactive to faction changes when GMs switch factions
 */
export const ownedSettlements = derived(
  [kingdomData, currentFaction],
  ([$data, $faction]) => {
    return $data.settlements.filter(s => {
      // Derive ownership from the hex the settlement occupies
      const hex = $data.hexes.find(h => 
        h.row === s.location.x && h.col === s.location.y
      );
      return hex?.claimedBy === $faction;
    });
  }
);

/**
 * Legacy alias for backward compatibility
 * @deprecated Use ownedSettlements instead
 */
export const claimedSettlements = ownedSettlements;

/**
 * Led armies - armies commanded by the current faction
 * Uses the explicit `ledBy` property
 * Filters for armies led by the current faction (ledBy === currentFaction)
 * Reactive to faction changes when GMs switch factions
 */
export const ledArmies = derived(
  [kingdomData, currentFaction],
  ([$data, $faction]) => {
    return $data.armies.filter(a => a.ledBy === $faction);
  }
);

/**
 * Worksite counts from claimed hexes only
 * Calculates by checking hex.worksite.type in claimed hexes
 */
export const claimedWorksites = derived(claimedHexes, $hexes => {
  return $hexes.reduce((counts, hex) => {
    if (hex.worksite?.type) {
      const type = hex.worksite.type;
      // Map worksite types to our count keys
      if (type === 'Farmstead' || type === 'Hunting/Fishing Camp' || type === 'Oasis Farm') {
        counts.farmlands = (counts.farmlands || 0) + 1;
      } else if (type === 'Logging Camp') {
        counts.lumberCamps = (counts.lumberCamps || 0) + 1;
      } else if (type === 'Quarry') {
        counts.quarries = (counts.quarries || 0) + 1;
      } else if (type === 'Mine' || type === 'Bog Mine') {
        counts.mines = (counts.mines || 0) + 1;
      }
    }
    return counts;
  }, {} as Record<string, number>);
});

/**
 * Hexes with worksites (for worksite overlay)
 * Returns full hex objects that have worksite data
 */
export const claimedHexesWithWorksites = derived(claimedHexes, $hexes => 
  $hexes.filter(h => h.worksite?.type)
);

/**
 * Hexes with bounties/commodities (for resources overlay)
 * Returns full hex objects that have commodity data
 * Includes the commodities record for rendering
 */
export const hexesWithBounties = derived(claimedHexes, $hexes => 
  $hexes.filter(h => h.commodities && Object.keys(h.commodities).length > 0)
);

/**
 * Hexes with terrain data (for terrain overlay)
 * Returns all hexes that have terrain information
 * Filtered by World Explorer visibility (GMs see all, players see revealed only)
 */
export const hexesWithTerrain = derived(kingdomData, $data => {
  const withTerrain = $data.hexes.filter(h => h.terrain);
  return filterVisibleHexes(withTerrain);
});

/**
 * Roads from kingdom data (for roads overlay)
 * Returns array of road hex IDs
 * Filtered by World Explorer visibility (GMs see all, players see revealed only)
 */
export const kingdomRoads = derived(kingdomData, $data => {
  // Derive from hexes with hasRoad flag (source of truth)
  const roads = ($data.hexes || [])
    .filter((h: any) => h.hasRoad === true)
    .map((h: any) => h.id);
  return filterVisibleHexIds(roads);
});

/**
 * Hexes with settlement features (for settlement overlay)
 * Returns all hexes that have settlement features
 * Filtered by World Explorer visibility (GMs see all, players see revealed only)
 */
export const hexesWithSettlementFeatures = derived(kingdomData, $data => {
  const withSettlements = $data.hexes
    .filter((h: any) => {
      const features = h.features || [];
      return features.some((f: any) => f.type === 'settlement');
    })
    .map((h: any) => {
      const settlementFeature = (h.features || []).find((f: any) => f.type === 'settlement');
      return {
        id: h.id,
        feature: settlementFeature
      };
    });
  
  return filterVisibleHexes(withSettlements);
});

/**
 * Current production from all hexes
 * Calculated directly from hex data - no cache required.
 * This ensures production is always in sync with actual hex state.
 */
export const currentProduction = derived(kingdomData, $data => {
  // Calculate production directly from hexes
  const result = calculateProduction($data.hexes as any[], []);

  // Convert Map to plain object for UI consumption
  const production: Record<string, number> = { food: 0, lumber: 0, stone: 0, ore: 0 };
  result.totalProduction.forEach((value, key) => {
    production[key] = value;
  });

  return production;
});

// UI-only state (no persistence needed)
export const viewingPhase = writable<TurnPhase>(TurnPhase.STATUS);
export const phaseViewLocked = writable<boolean>(true); // Lock viewing phase to current phase
export const selectedSettlement = writable<string | null>(null);
export const expandedSections = writable<Set<string>>(new Set());

// Available factions (derived from kingdom.factions array + hexes + settlements)
// Grouped by whether they have claimed territories
export const availableFactions = derived(kingdomData, $data => {
  const allFactions = new Set<string>();
  const factionsWithTerritories = new Set<string>();
  
  // Always include player kingdom
  allFactions.add(PLAYER_KINGDOM);
  
  // Extract from diplomatic factions list (primary source)
  ($data.factions || []).forEach(f => {
    if (f.name && f.name.trim()) {
      allFactions.add(f.name);
    }
  });
  
  // Track which factions have territories (hexes)
  $data.hexes.forEach(h => {
    if (h.claimedBy && typeof h.claimedBy === 'string') {
      allFactions.add(h.claimedBy);
      factionsWithTerritories.add(h.claimedBy);
    }
  });
  
  // Track which factions have settlements (derive from hex ownership)
  $data.settlements.forEach(s => {
    const hex = $data.hexes.find(h => 
      h.row === s.location.x && h.col === s.location.y
    );
    if (hex?.claimedBy && typeof hex.claimedBy === 'string') {
      allFactions.add(hex.claimedBy);
      factionsWithTerritories.add(hex.claimedBy);
    }
  });
  
  // Split into two groups with Player Kingdom always first
  const withTerritories = Array.from(allFactions)
    .filter(f => factionsWithTerritories.has(f))
    .sort((a, b) => {
      // Player Kingdom always first
      if (a === PLAYER_KINGDOM) return -1;
      if (b === PLAYER_KINGDOM) return 1;
      // Then alphabetical
      return a.localeCompare(b);
    });
  
  const withoutTerritories = Array.from(allFactions)
    .filter(f => !factionsWithTerritories.has(f))
    .sort((a, b) => {
      // Player Kingdom always first (in case it has no territories)
      if (a === PLAYER_KINGDOM) return -1;
      if (b === PLAYER_KINGDOM) return 1;
      // Then alphabetical
      return a.localeCompare(b);
    });
  
  return {
    withTerritories,
    withoutTerritories,
    all: Array.from(allFactions).sort() // For backwards compatibility
  };
});

// Online players store - reactive to Foundry user connections
export interface OnlinePlayer {
  playerId: string;
  playerName: string;
  displayName: string;
  playerColor: string;
  characterName: string;
}

export const onlinePlayers = writable<OnlinePlayer[]>([]);

// Initialization state - components can wait for this to be true
export const isInitialized = writable<boolean>(false);

/**
 * Get the TurnManager singleton instance
 */
export function getTurnManager(): TurnManager {
  return TurnManager.getInstance();
}

/**
 * Initialize the kingdom actor store
 */
export function initializeKingdomActor(actor: any): void {
  kingdomActor.set(actor);
  
  // Initialize viewing phase to match current phase
  // Actor is wrapped with getKingdomData() method by wrapKingdomActor()
  const kingdom = actor.getKingdomData?.() || actor.getFlag?.('pf2e-reignmaker', 'kingdom-data') as KingdomData;
  if (kingdom) {
    viewingPhase.set(kingdom.currentPhase);
    
    // Ensure turnState is valid for current turn (handles page refresh, reconnect, etc.)
    ensureTurnStateValid(actor, kingdom);
  }

  // Initialize TurnManager for phase progression
  initializeTurnManager();
}

/**
 * Ensure turnState is valid for the current turn.
 * This handles cases where the page is refreshed or user reconnects mid-turn.
 * If turnState is missing or from a different turn, reset it.
 */
async function ensureTurnStateValid(actor: any, kingdom: KingdomData): Promise<void> {
  const currentTurn = kingdom.currentTurn || 1;
  
  // Case 1: No turnState exists
  if (!kingdom.turnState) {
    logger.info(`[KingdomStore] No turnState found, creating fresh state for turn ${currentTurn}`);
    await actor.updateKingdomData((k: KingdomData) => {
      k.turnState = createDefaultTurnState(currentTurn);
    });
    return;
  }
  
  // Case 2: turnState exists but from a different turn (stale data)
  if (kingdom.turnState.turnNumber !== currentTurn) {
    logger.info(`[KingdomStore] Stale turnState (turn ${kingdom.turnState.turnNumber}) doesn't match current turn ${currentTurn}, resetting`);
    await actor.updateKingdomData((k: KingdomData) => {
      k.turnState = createDefaultTurnState(currentTurn);
    });
    return;
  }
  
  // Case 3: turnState exists and matches current turn - all good
}

/**
 * Initialize TurnManager - simplified for new phase architecture
 */
function initializeTurnManager(): void {
  // Get singleton instance - will create if doesn't exist
  const turnManager = TurnManager.getInstance();

}

/**
 * Get the current kingdom actor
 */
export function getKingdomActor(): any | null {
  return get(kingdomActor);
}

/**
 * Get the current kingdom data
 */
export function getKingdomData(): KingdomData {
  return get(kingdomData);
}

/**
 * Update kingdom data - uses wrapped actor's updateKingdomData method
 */
export async function updateKingdom(updater: (kingdom: KingdomData) => void): Promise<void> {
  const actor = get(kingdomActor);
  if (!actor) {
    logger.warn('[KingdomActor Store] No actor available for update - likely during initialization, queuing update');
    // Don't fail silently - instead, wait for actor to be available
    return new Promise<void>((resolve) => {
      const unsubscribe = kingdomActor.subscribe((newActor) => {
        if (newActor) {
          unsubscribe();
          // Use wrapped actor's updateKingdomData method
          if (newActor.updateKingdomData) {
            newActor.updateKingdomData(updater)
              .then(() => resolve())
              .catch(error => {
                logger.error('[KingdomActor Store] Failed to update kingdom:', error);
                resolve();
              });
          } else {
            resolve();
          }
        }
      });
    });
  }
  
  try {
    // Use wrapped actor's updateKingdomData method if available
    if (actor.updateKingdomData) {
      await actor.updateKingdomData(updater);
    } else {
      logger.warn('[KingdomActor Store] Actor not wrapped - using fallback');
      // Fallback to direct flag manipulation
      const kingdom = actor.getFlag('pf2e-reignmaker', 'kingdom-data') as KingdomData;
      if (!kingdom) {
        logger.warn('[KingdomActor Store] No kingdom data found on actor');
        return;
      }
      updater(kingdom);
      await actor.setFlag('pf2e-reignmaker', 'kingdom-data', kingdom);
    }
  } catch (error) {
    logger.error('[KingdomActor Store] Failed to update kingdom:', error);
  }
}

/**
 * Convenience functions for common operations
 */

export async function advancePhase(): Promise<void> {
  // Use TurnManager singleton for phase advancement
  try {
    const turnManager = getTurnManager();
    await turnManager.nextPhase();

    // Update viewing phase to match new current phase
    const actor = get(kingdomActor);
    if (actor) {
      const updatedKingdom = actor.getKingdomData?.() || actor.getFlag?.('pf2e-reignmaker', 'kingdom-data') as KingdomData;
      if (updatedKingdom) {
        viewingPhase.set(updatedKingdom.currentPhase);
      }
    }
  } catch (error) {
    logger.error('[KingdomActor Store] Error advancing phase:', error);
  }
}


export function isPhaseStepCompleted(stepIndex: number): boolean {
  const data = get(kingdomData);
  // Check in currentPhaseSteps array by index
  const step = data.currentPhaseSteps?.[stepIndex];
  return step?.completed === 1;
}

export function isCurrentPhaseComplete(): boolean {
  const data = get(kingdomData);
  if (!data.currentPhaseSteps) return false;
  
  // Check if all steps are completed
  return data.currentPhaseSteps.every(step => step.completed === 1);
}

// Convenience methods removed - use getKingdomActor() and actor.updateKingdomData() directly
// This enforces the Single Source of Truth architecture pattern

/**
 * Player action management - REMOVED (now uses turnState.actionLog)
 */

/**
 * Update online players list from Foundry
 */
export function updateOnlinePlayers(): void {
  if (typeof game === 'undefined' || !game.users) {
    logger.warn('[KingdomStore] Game users not available');
    return;
  }

  const players: OnlinePlayer[] = game.users
    .filter((u: any) => u.active)
    .map((user: any) => {
      const characterName = user.character?.name;
      const displayName = characterName || user.name || 'Unknown Player';
      
      return {
        playerId: user.id,
        playerName: user.name || 'Unknown Player',
        displayName: displayName,
        playerColor: user.color || '#cccccc',
        characterName: characterName || user.name || 'Unknown'
      };
    });

  onlinePlayers.set(players);

}

/**
 * Initialize all current players
 */
export function initializeAllPlayers(): void {
  // Player tracking is now handled via actionLog in turnState
  // Initialize online players list
  updateOnlinePlayers();
  
  // Mark as fully initialized
  isInitialized.set(true);

}

/**
 * UI state management functions
 */

export function setViewingPhase(phase: TurnPhase): void {
  viewingPhase.set(phase);
}

export function togglePhaseViewLock(): void {
  phaseViewLocked.update(locked => {
    const newLockState = !locked;
    
    // If we're locking (newLockState = true), sync viewing phase to current phase
    if (newLockState) {
      const data = get(kingdomData);
      if (data.currentPhase) {

        viewingPhase.set(data.currentPhase);
      }
    } else {

    }
    
    return newLockState;
  });
}

/**
 * Turn management functions - delegated to TurnManager
 */

export async function setCurrentPhase(phase: TurnPhase): Promise<void> {
  const manager = getTurnManager();
  if (manager) {
    await manager.setCurrentPhase(phase);
    // Update viewing phase to match
    viewingPhase.set(phase);
  } else {
    logger.warn('[KingdomStore] No TurnManager available for setCurrentPhase');
  }
}

export async function resetPhaseSteps(): Promise<void> {
  const manager = getTurnManager();
  if (manager) {
    await manager.resetPhaseSteps();
  } else {
    logger.warn('[KingdomStore] No TurnManager available for resetPhaseSteps');
  }
}

export async function incrementTurn(): Promise<void> {
  const manager = getTurnManager();
  if (manager) {
    await manager.incrementTurn();
  } else {
    logger.warn('[KingdomStore] No TurnManager available for incrementTurn');
  }
}

/**
 * Start the kingdom - advance from Turn 0 to Turn 1
 * Simplified version: All data initialization happens in Stage 1 (WelcomeDialog)
 * This only advances the turn number and phase
 */
export async function startKingdom(): Promise<void> {
  // GM check - only GM can start the kingdom
  if (!(game as any)?.user?.isGM) {
    logger.error('[KingdomStore] Only GM can start the kingdom');
    (ui as any).notifications?.error('Only the GM can start Turn 1');
    return;
  }
  
  const actor = get(kingdomActor);
  if (!actor) {
    logger.error('[KingdomStore] No kingdom actor available for startKingdom');
    return;
  }

  // Simple turn advancement - all data exists from Stage 1
  await updateKingdom((kingdom) => {
    kingdom.currentTurn = 1;
    kingdom.setupComplete = true;
    kingdom.currentPhase = TurnPhase.STATUS;
    kingdom.currentPhaseStepIndex = 0;
    kingdom.currentPhaseSteps = [];
    kingdom.phaseComplete = false;
    kingdom.oncePerTurnActions = [];
  });
  
  // Initialize turn manager
  const manager = getTurnManager();
  if (manager) {
    await manager.resetPhaseSteps();
  }

}

/**
 * Simple UI state functions
 */

export function selectSettlement(settlementId: string | null): void {
  selectedSettlement.set(settlementId);
}

// ===== PROVINCE MANAGEMENT =====

/**
 * Derived store for provinces
 */
export const provinces = derived(kingdomData, $data => $data.provinces || []);

/**
 * Add a new province with the given name (starts with no hexes)
 */
export async function addProvince(name: string): Promise<Province> {
  const newProvince: Province = {
    id: `province-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: name.trim(),
    hexIds: []
  };

  await updateKingdom(k => {
    if (!k.provinces) {
      k.provinces = [];
    }
    k.provinces.push(newProvince);
  });

  return newProvince;
}

/**
 * Remove a province by ID (hexes become unassigned)
 */
export async function removeProvince(provinceId: string): Promise<void> {
  await updateKingdom(k => {
    if (!k.provinces) return;
    k.provinces = k.provinces.filter(p => p.id !== provinceId);
  });
}

/**
 * Update a province's name
 */
export async function updateProvinceName(provinceId: string, name: string): Promise<void> {
  await updateKingdom(k => {
    const province = k.provinces?.find(p => p.id === provinceId);
    if (province) {
      province.name = name.trim();
    }
  });
}

/**
 * Assign a hex to a province (removing it from any previous province)
 * @param hexId - The hex to assign
 * @param provinceId - The province to assign to, or null to unassign
 */
export async function assignHexToProvince(
  hexId: string,
  provinceId: string | null
): Promise<void> {
  await updateKingdom(k => {
    if (!k.provinces) {
      k.provinces = [];
    }

    // Remove from all provinces first
    for (const province of k.provinces) {
      province.hexIds = province.hexIds.filter(id => id !== hexId);
    }

    // Add to target province if specified
    if (provinceId) {
      const targetProvince = k.provinces.find(p => p.id === provinceId);
      if (targetProvince) {
        targetProvince.hexIds.push(hexId);
      }
    }
  });
}

/**
 * Remove a hex from its province (with orphan cleanup)
 * @param hexId - The hex to remove
 * @returns Array of additional hexes that were removed as orphans
 */
export async function removeHexFromProvince(hexId: string): Promise<string[]> {
  let orphanedHexes: string[] = [];

  await updateKingdom(k => {
    if (!k.provinces) return;

    for (const province of k.provinces) {
      if (province.hexIds.includes(hexId)) {
        // Find orphans before removing
        orphanedHexes = findOrphanedHexes(province.hexIds, hexId);

        // Remove the hex and all orphans
        const toRemove = new Set([hexId, ...orphanedHexes]);
        province.hexIds = province.hexIds.filter(id => !toRemove.has(id));
        break;
      }
    }
  });

  return orphanedHexes;
}

/**
 * Get the province that contains a hex
 */
export function getProvinceForHex(hexId: string): Province | null {
  const data = get(kingdomData);
  if (!data.provinces) return null;

  for (const province of data.provinces) {
    if (province.hexIds.includes(hexId)) {
      return province;
    }
  }
  return null;
}

/**
 * Setup Foundry hooks for automatic synchronization
 */
export function setupFoundrySync(): void {
  // Only setup if Foundry is available
  if (typeof Hooks === 'undefined') {
    logger.warn('[KingdomActor Store] Foundry hooks not available');
    return;
  }
  
  // Listen for actor updates to trigger store updates
  Hooks.on('updateActor', (actor: any, changes: any, options: any, userId: string) => {
    const currentActor = get(kingdomActor);

    // Check if this is our kingdom actor
    if (currentActor && actor.id === currentActor.id) {
      // Check if any pf2e-reignmaker flags were updated
      // Foundry structures changes differently depending on the update method
      const hasReignmakerChanges =
        changes.flags?.['pf2e-reignmaker'] ||                    // Direct flag object
        changes['flags.pf2e-reignmaker'] ||                      // Dot notation
        Object.keys(changes).some(k => k.includes('pf2e-reignmaker')); // Any key containing module name

      if (hasReignmakerChanges) {
        logger.debug('[KingdomStore] Actor flags updated, refreshing store');

        // CRITICAL: Re-wrap the actor to maintain kingdom methods
        // The actor from Foundry's updateActor hook is unwrapped
        const wrappedActor = wrapKingdomActor(actor);

        // Refresh the actor reference in the store
        kingdomActor.set(wrappedActor);

        // Get the new kingdom data from the updated actor
        const kingdom = actor.getFlag('pf2e-reignmaker', 'kingdom-data');
        const newPhase = kingdom?.currentPhase;

        if (kingdom && newPhase) {
          const isLocked = get(phaseViewLocked);
          const currentViewingPhase = get(viewingPhase);

          // If locked and viewing phase doesn't match current phase, sync them
          if (isLocked && currentViewingPhase !== newPhase) {
            viewingPhase.set(newPhase);
          }
        }
      }
    }
  });

}

// Hot Module Replacement support - re-initialize store with current actor
if (import.meta.hot) {
  import.meta.hot.accept(async () => {
    logger.info('🔥 [KingdomStore] Module hot reloaded, re-initializing...');
    
    // Re-find and re-wrap the kingdom actor
    try {
      // Check if game is available (we're in Foundry context)
      if (typeof game === 'undefined' || !game.actors) {
        logger.warn('[KingdomStore] Game not available during HMR, skipping re-initialization');
        return;
      }
      
      const actors = game.actors?.contents || [];
      
      // Find party actor with kingdom data
      let foundActor = null;
      for (const actor of actors) {
        if ((actor as any).type === 'party' && (actor as any).getFlag('pf2e-reignmaker', 'kingdom-data')) {
          foundActor = actor;
          break;
        }
      }
      
      // Fallback: any party actor
      if (!foundActor) {
        for (const actor of actors) {
          if ((actor as any).type === 'party') {
            foundActor = actor;
            break;
          }
        }
      }
      
      if (foundActor) {
        const wrappedActor = wrapKingdomActor(foundActor);
        kingdomActor.set(wrappedActor);
        
        // Re-setup the Foundry sync hooks
        setupFoundrySync();
        
        // Also update the viewing phase to match current phase
        const kingdom = wrappedActor.getKingdomData?.();
        if (kingdom?.currentPhase) {
          viewingPhase.set(kingdom.currentPhase);
        }
        
        logger.info('🔥 [KingdomStore] Store re-initialized after HMR');
      } else {
        logger.warn('[KingdomStore] No kingdom actor found during HMR re-initialization');
      }
    } catch (error) {
      logger.error('[KingdomStore] Failed to re-initialize after HMR:', error);
    }
  });
}
