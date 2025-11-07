/**
 * Debug utilities for testing army movement pathfinding
 * 
 * Usage in browser console:
 * ```
 * // Test pathfinding for army at hex 50.18
 * game.reignmaker.testArmyMovement('army-id', '50.18');
 * 
 * // Deactivate movement mode
 * game.reignmaker.deactivateArmyMovement();
 * ```
 */

import { armyMovementMode } from '../services/army/movementMode';
import { pathfindingService } from '../services/pathfinding';
import { logger } from '../utils/Logger';

/**
 * Test army movement mode with a specific army
 * 
 * @param armyId - ID of army to move (or 'test' to use first available army)
 * @param hexId - Starting hex ID (dot notation, e.g., '50.18')
 */
export async function testArmyMovement(armyId: string, hexId: string): Promise<void> {
  try {
    logger.info(`[Debug] Testing army movement for ${armyId} at ${hexId}`);
    
    // If 'test' is passed, use first available army
    if (armyId === 'test') {
      const { getKingdomActor } = await import('../main.kingdom');
      const kingdomActor = await getKingdomActor();
      const kingdom = kingdomActor?.getKingdomData();
      
      if (!kingdom?.armies || kingdom.armies.length === 0) {
        logger.error('[Debug] No armies found in kingdom data');
        const ui = (globalThis as any).ui;
        ui?.notifications?.error('No armies found. Create an army first!');
        return;
      }
      
      armyId = kingdom.armies[0].id;
      logger.info(`[Debug] Using first army: ${armyId} (${kingdom.armies[0].name})`);
    }
    
    // Activate movement mode
    await armyMovementMode.activateForArmy(armyId, hexId);
    
    logger.info('[Debug] ✅ Army movement mode activated');
    logger.info('[Debug] Hover over hexes to see paths, click to move');
  } catch (error) {
    logger.error('[Debug] Failed to activate army movement:', error);
  }
}

/**
 * Test army movement using the currently selected token
 * Automatically detects army ID and location from the selected token
 */
export async function testArmyMovementFromSelection(): Promise<void> {
  try {
    const canvas = (globalThis as any).canvas;
    const game = (globalThis as any).game;
    const ui = (globalThis as any).ui;
    
    // Check if there are selected tokens
    const controlled = canvas?.tokens?.controlled;
    if (!controlled || controlled.length === 0) {
      logger.error('[Debug] No token selected. Please select an army token first.');
      ui?.notifications?.error('No token selected! Select an army token on the map first.');
      return;
    }
    
    if (controlled.length > 1) {
      logger.warn('[Debug] Multiple tokens selected. Using the first one.');
      ui?.notifications?.warn('Multiple tokens selected. Using the first one.');
    }
    
    const token = controlled[0];
    logger.info('[Debug] Selected token:', token.document.name);
    
    // Get hex position from token using correct Foundry API
    const [i, j] = canvas.grid.getGridPositionFromPixels(token.x, token.y);
    const hexId = `${i}.${j}`;
    
    logger.info(`[Debug] Token location: ${hexId}`);
    
    // Try to find the army ID from the token's actor flags
    const actor = token.document.actor;
    if (!actor) {
      logger.error('[Debug] Selected token has no associated actor');
      ui?.notifications?.error('Selected token has no actor!');
      return;
    }
    
    // Get the army metadata from the actor's flags
    // Armies are linked to NPC actors via 'army-metadata' flag
    const armyMetadata = actor.getFlag('pf2e-reignmaker', 'army-metadata');
    
    if (!armyMetadata || !armyMetadata.armyId) {
      logger.error('[Debug] Selected token is not linked to an army (no army-metadata flag found)');
      ui?.notifications?.error('Selected token is not linked to an army! Select an NPC token linked to an army.');
      return;
    }
    
    const armyId = armyMetadata.armyId;
    
    logger.info(`[Debug] Found army ID: ${armyId}`);
    ui?.notifications?.info(`Testing movement for ${token.document.name}`);
    
    // Activate movement mode
    await armyMovementMode.activateForArmy(armyId, hexId);
    
    logger.info('[Debug] ✅ Army movement mode activated');
    logger.info('[Debug] Hover over hexes to see paths, click to move');
  } catch (error) {
    logger.error('[Debug] Failed to activate army movement from selection:', error);
    const ui = (globalThis as any).ui;
    ui?.notifications?.error(`Failed to activate: ${error}`);
  }
}

/**
 * Deactivate army movement mode
 */
export function deactivateArmyMovement(): void {
  armyMovementMode.deactivate();
  logger.info('[Debug] ✅ Army movement mode deactivated');
}

/**
 * Test pathfinding calculations without activating movement mode
 * 
 * @param startHex - Starting hex ID
 * @param targetHex - Target hex ID
 * @param maxMovement - Maximum movement (default: 20)
 */
export function testPathfinding(startHex: string, targetHex: string, maxMovement: number = 20): void {
  try {
    logger.info(`[Debug] Testing pathfinding from ${startHex} to ${targetHex} (max: ${maxMovement})`);
    
    // Note: PathfindingService auto-updates via KingdomStore subscription
    // Manual refresh only needed if you suspect cache is stale
    pathfindingService.refresh();
    
    // Calculate reachable hexes
    const reachable = pathfindingService.getReachableHexes(startHex, maxMovement);
    logger.info(`[Debug] Reachable hexes: ${reachable.size}`);
    
    // Find path
    const path = pathfindingService.findPath(startHex, targetHex, maxMovement);
    
    if (path && path.isReachable) {
      logger.info(`[Debug] ✅ Path found! Cost: ${path.totalCost}`);
      logger.info(`[Debug] Path (${path.path.length} hexes):`, path.path.join(' → '));
      
      // Log costs for each hex
      path.path.forEach((hexId, i) => {
        const cost = pathfindingService.getMovementCost(hexId);
        logger.info(`  [${i}] ${hexId} (cost: ${cost})`);
      });
    } else {
      logger.warn(`[Debug] ❌ No path found or unreachable`);
      logger.info(`[Debug] Is ${targetHex} in reachable set? ${reachable.has(targetHex)}`);
    }
  } catch (error) {
    logger.error('[Debug] Pathfinding test failed:', error);
  }
}

/**
 * Get movement cost for a specific hex
 */
export function getHexMovementCost(hexId: string): number {
  // Note: PathfindingService auto-updates via KingdomStore subscription
  pathfindingService.refresh();
  const cost = pathfindingService.getMovementCost(hexId);
  logger.info(`[Debug] Movement cost for ${hexId}: ${cost}`);
  return cost;
}

/**
 * List all reachable hexes from a starting position
 */
export function listReachableHexes(startHex: string, maxMovement: number = 20): void {
  // Note: PathfindingService auto-updates via KingdomStore subscription
  pathfindingService.refresh();
  const reachable = pathfindingService.getReachableHexes(startHex, maxMovement);
  
  logger.info(`[Debug] Reachable hexes from ${startHex} (${reachable.size} total):`);
  
  // Sort by cost
  const sorted = Array.from(reachable.entries()).sort((a, b) => a[1] - b[1]);
  
  sorted.forEach(([hexId, cost]) => {
    logger.info(`  ${hexId}: ${cost} movement`);
  });
}

/**
 * Register debug utilities on globalThis for browser console access
 */
export function registerDebugUtils(): void {
  const game = (globalThis as any).game;
  
  if (!game) {
    logger.warn('[Debug] Game not ready, skipping debug registration');
    return;
  }
  
  // Create reignmaker namespace if it doesn't exist
  if (!game.reignmaker) {
    game.reignmaker = {};
  }
  
  // Register debug functions
  game.reignmaker.testArmyMovement = testArmyMovement;
  game.reignmaker.testArmyMovementFromSelection = testArmyMovementFromSelection;
  game.reignmaker.deactivateArmyMovement = deactivateArmyMovement;
  game.reignmaker.testPathfinding = testPathfinding;
  game.reignmaker.getHexMovementCost = getHexMovementCost;
  game.reignmaker.listReachableHexes = listReachableHexes;
  
  // Register hex data checker
  import('../debug/checkHexData').then(module => {
    module.registerHexDataCheck();
  });
  
  // Debug utilities registered - access via game.reignmaker.*
}
