/**
 * Naval Deployment - Check if settlements can deploy naval units
 * 
 * Requirements:
 * - Settlement hex OR any neighbor hex has water (river, lake, water terrain)
 * - No special structure needed (any settlement near water qualifies)
 */

import type { Settlement } from '../models/Settlement';
import { waterwayLookup } from '../services/pathfinding/WaterwayLookup';
import { logger } from './Logger';
import { getAdjacentHexes } from './hexUtils';


/**
 * Check if a hex has any water feature
 * @param hexI - Hex I coordinate
 * @param hexJ - Hex J coordinate
 * @param kingdom - Kingdom data (for terrain check)
 * @returns True if hex has water
 */
function hasWater(hexI: number, hexJ: number, kingdom: any): boolean {
  // Check waterways (rivers, lakes, swamps)
  if (waterwayLookup.hasAnyWater(hexI, hexJ)) {
    return true;
  }
  
  // Check if hex terrain is water
  const hexId = `${hexI}.${hexJ}`;
  const hex = kingdom.hexes?.find((h: any) => h.id === hexId);
  
  return hex?.terrain === 'water';
}

/**
 * Check if a settlement can deploy naval units (boats)
 * 
 * Requirements:
 * - Settlement hex OR any neighbor hex has water
 * - Water = river, lake, swamp, or water terrain
 * 
 * @param settlement - The settlement to check
 * @param kingdom - Kingdom data
 * @returns True if settlement can deploy boats
 */
export function canSettlementDeployBoats(settlement: Settlement, kingdom: any): boolean {
  // Settlement location is stored as { x, y } offset coordinates
  // Use the same coordinates as hexI, hexJ
  const hexI = settlement.location.x;
  const hexJ = settlement.location.y;
  
  // Check if settlement hex itself has water
  if (hasWater(hexI, hexJ, kingdom)) {
    logger.debug(`[NavalDeployment] ${settlement.name} can deploy boats (settlement hex has water)`);
    return true;
  }
  
  // Check all neighbor hexes using Foundry's API
  const canvas = (globalThis as any).canvas;
  if (!canvas?.grid) {
    logger.warn('[NavalDeployment] Canvas grid not available for neighbor check');
    return false;
  }
  
  const neighbors = getAdjacentHexes(hexI, hexJ);
  
  for (const neighbor of neighbors) {
    if (hasWater(neighbor.i, neighbor.j, kingdom)) {
      logger.debug(`[NavalDeployment] ${settlement.name} can deploy boats (neighbor ${neighbor.i}.${neighbor.j} has water)`);
      return true;
    }
  }
  
  logger.debug(`[NavalDeployment] ${settlement.name} cannot deploy boats (no adjacent water)`);
  return false;
}

/**
 * Get all settlements that can deploy boats
 * @param kingdom - Kingdom data
 * @returns Array of settlement names that can deploy boats
 */
export function getNavalCapableSettlements(kingdom: any): Settlement[] {
  if (!kingdom?.settlements) return [];
  
  return kingdom.settlements.filter((settlement: Settlement) => 
    canSettlementDeployBoats(settlement, kingdom)
  );
}

/**
 * Get description of why a settlement can/cannot deploy boats
 * @param settlement - The settlement to check
 * @param kingdom - Kingdom data
 * @returns Human-readable description
 */
export function getNavalDeploymentDescription(settlement: Settlement, kingdom: any): string {
  const canDeploy = canSettlementDeployBoats(settlement, kingdom);
  
  if (!canDeploy) {
    return 'No adjacent waterways - cannot deploy naval units';
  }
  
  // Check what type of water
  const hexI = settlement.location.x;
  const hexJ = settlement.location.y;
  
  const hasRiver = waterwayLookup.hasRiver(hexI, hexJ);
  const hasLake = waterwayLookup.hasLake(hexI, hexJ);
  
  const waterTypes: string[] = [];
  if (hasRiver) waterTypes.push('river');
  if (hasLake) waterTypes.push('lake');
  
  // Check neighbors too using Foundry's API
  const canvas = (globalThis as any).canvas;
  if (canvas?.grid) {
    const neighbors = getAdjacentHexes(hexI, hexJ);
    for (const neighbor of neighbors) {
      if (waterwayLookup.hasRiver(neighbor.i, neighbor.j) && !waterTypes.includes('river')) {
        waterTypes.push('river');
      }
      if (waterwayLookup.hasLake(neighbor.i, neighbor.j) && !waterTypes.includes('lake')) {
        waterTypes.push('lake');
      }
    }
  }
  
  if (waterTypes.length === 0) {
    return 'Adjacent to water terrain - can deploy naval units';
  }
  
  return `Adjacent to ${waterTypes.join(' and ')} - can deploy naval units`;
}
