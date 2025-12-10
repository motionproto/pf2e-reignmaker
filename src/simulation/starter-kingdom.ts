/**
 * Starter Kingdom Data for Simulation
 * 
 * Loads the full map from base-world.json and initializes with starting conditions.
 * Each call returns a fresh deep clone to prevent state leakage between runs.
 * 
 * Starting conditions per Reignmaker rules:
 * - First settlement is sponsored (free Village) at hex 6.19
 * - Claim settlement hex + all adjacent hexes (7 total)
 * - Start with seed resources (4 gold, 2 food, 1 lumber, 4 stone, 0 ore)
 */

import type { KingdomData } from '../actors/KingdomActor';
import { TurnPhase } from '../actors/KingdomActor';
import baseWorld from './base-world.json';

// Starting hex - matches original simulation (Oleg's Trading Post area)
const STARTING_HEX_ID = '6.19';

/**
 * Get adjacent hex IDs for a given hex position
 * Uses offset coordinate system (odd-q vertical layout)
 */
function getAdjacentHexIds(row: number, col: number): string[] {
  // For odd-q vertical layout (odd columns shifted down)
  const adjacentOffsets = col % 2 === 0
    ? [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]]   // Even column
    : [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]]; // Odd column
  
  return adjacentOffsets.map(([dr, dc]) => `${row + dr}.${col + dc}`);
}

/**
 * Create a fresh starter kingdom from the base-world.json template
 * 
 * IMPORTANT: Returns a deep clone each time to prevent state leakage between runs.
 */
export function createStarterKingdom(): KingdomData {
  // Deep clone the base world data
  const kingdom: KingdomData = JSON.parse(JSON.stringify(baseWorld.kingdomData));
  
  // Parse starting hex coordinates
  const [rowStr, colStr] = STARTING_HEX_ID.split('.');
  const row = parseInt(rowStr, 10);
  const col = parseInt(colStr, 10);
  
  // Find starting hex
  const startingHex = kingdom.hexes?.find((h: any) => h.id === STARTING_HEX_ID);
  
  if (!startingHex) {
    console.error(`[StarterKingdom] Starting hex ${STARTING_HEX_ID} not found in map!`);
    console.log(`[StarterKingdom] Available hex IDs (sample):`, kingdom.hexes?.slice(0, 10).map((h: any) => h.id));
    throw new Error(`Starting hex ${STARTING_HEX_ID} not found`);
  }
  
  console.log(`[StarterKingdom] Found starting hex ${STARTING_HEX_ID}, terrain: ${startingHex.terrain}`);
  
  // Claim starting hex
  startingHex.claimedBy = 'player';
  let hexesClaimed = 1;
  
  // Claim adjacent hexes
  const adjacentIds = getAdjacentHexIds(row, col);
  console.log(`[StarterKingdom] Adjacent hexes to claim: ${adjacentIds.join(', ')}`);
  
  for (const adjId of adjacentIds) {
    const adjHex = kingdom.hexes?.find((h: any) => h.id === adjId);
    if (adjHex && !adjHex.claimedBy) {
      adjHex.claimedBy = 'player';
      hexesClaimed++;
    }
  }
  
  console.log(`[StarterKingdom] Claimed ${hexesClaimed} hexes`);
  
  // Create settlement on starting hex
  const settlementName = 'Capital';
  const settlementId = `settlement-${STARTING_HEX_ID}`;
  
  // Add settlement feature to hex
  startingHex.features = startingHex.features || [];
  startingHex.features.push({
    type: 'settlement',
    settlementId: settlementId,
    tier: 'Village',
    name: settlementName
  });
  
  // Initialize settlements array - use format compatible with both old and new systems
  kingdom.settlements = [{
    id: settlementId,
    name: settlementName,
    // Location for new system
    location: { x: row, y: col },
    // HexId for legacy/simulation compatibility
    hexId: STARTING_HEX_ID,
    level: 1,
    tier: 'Village' as any,
    // Structure tracking - include counting-house for taxation tier
    structureIds: ['counting-house'],
    structures: [{ id: 'counting-house', name: 'Counting House' }],  // Legacy format some code expects
    lots: [{ id: 'lot-0', structures: [{ id: 'counting-house', name: 'Counting House' }] }],  // Legacy format
    // Required Settlement fields
    connectedByRoads: false,
    ownedBy: 'player',
    storedFood: 0,
    imprisonedUnrest: 0,
    supportedUnits: [],
    wasFedLastTurn: true,
    isCapital: true
  }] as any;  // Use any to allow both formats
  
  // Set starting resources (matches original simulation)
  kingdom.resources = {
    gold: 4,
    food: 2,
    lumber: 1,
    stone: 4,
    ore: 0,
    foodCapacity: 4,
    armyCapacity: 1,
    diplomaticCapacity: 1,
    imprisonedUnrestCapacity: 0
  };
  
  // Initialize kingdom state
  kingdom.name = 'Stolen Lands Kingdom';
  kingdom.currentTurn = 1;
  kingdom.currentPhase = TurnPhase.STATUS;
  kingdom.currentPhaseSteps = [];
  kingdom.currentPhaseStepIndex = 0;
  kingdom.phaseComplete = false;
  kingdom.setupComplete = true;
  kingdom.size = hexesClaimed;
  
  // Initialize other state
  kingdom.unrest = 0;
  kingdom.fame = 1;  // Start with 1 fame
  kingdom.partyLevel = 1;
  kingdom.eventDC = 15;
  
  // Initialize collections
  kingdom.armies = [];
  kingdom.buildQueue = [];
  kingdom.worksiteCount = {};
  kingdom.worksiteProduction = {};
  kingdom.ongoingEvents = [];
  kingdom.pendingOutcomes = [];
  kingdom.activeModifiers = [];
  kingdom.oncePerTurnActions = [];
  kingdom.factionsAidedThisTurn = [];
  
  // Log final state
  const claimedCount = kingdom.hexes?.filter((h: any) => h.claimedBy === 'player').length || 0;
  console.log(`[StarterKingdom] Final state: ${claimedCount} claimed hexes, ${kingdom.settlements?.length} settlements`);
  console.log(`[StarterKingdom] Resources:`, kingdom.resources);
  
  return kingdom;
}

/**
 * Get the number of hexes in the base world map
 */
export function getMapHexCount(): number {
  return baseWorld.kingdomData.hexes?.length || 0;
}

/**
 * Get the factions from the base world
 */
export function getBaseFactions(): any[] {
  return baseWorld.kingdomData.factions || [];
}
