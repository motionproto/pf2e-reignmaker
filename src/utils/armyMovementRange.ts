/**
 * Army Movement Range Calculator
 * 
 * Calculates deployment movement range for armies based on their actor's speed:
 * - Always uses half of speed (rounded down), regardless of movement type
 * - Flying armies get the benefit of ignoring terrain difficulty (cost = 1 per hex)
 * - Swimming armies can move on water/river hexes at cost = 1
 * - Swim-only armies can ONLY move on water/river hexes
 * - Defaults to 20 if actor has no speed data
 */

import { logger } from './Logger';

/**
 * Result of army movement range calculation
 */
export interface ArmyMovementData {
  range: number;     // Movement range in hexes (half of speed)
  canFly: boolean;   // Whether army can fly (ignores terrain difficulty)
  canSwim: boolean;  // Whether army can swim (water/river hexes cost 1)
  hasOnlySwim: boolean; // Whether army can ONLY swim (restricted to water/river hexes)
}

/**
 * Get the deployment movement data for an army
 * @param actorId - The army's linked NPC actor ID
 * @returns Movement data (range, flying status, swimming status)
 */
export async function getArmyMovementRange(actorId: string | undefined): Promise<ArmyMovementData> {
  const DEFAULT_MOVEMENT = 20;
  const DEFAULT_RESULT: ArmyMovementData = { 
    range: DEFAULT_MOVEMENT, 
    canFly: false, 
    canSwim: false,
    hasOnlySwim: false
  };
  
  if (!actorId) {
    logger.warn('[getArmyMovementRange] No actor ID provided, using default movement');
    return DEFAULT_RESULT;
  }
  
  try {
    const game = (globalThis as any).game;
    const actor = game.actors.get(actorId);
    
    if (!actor) {
      logger.warn(`[getArmyMovementRange] Actor ${actorId} not found, using default movement`);
      return DEFAULT_RESULT;
    }
    
    // Get actor's speed data
    const actorSpeed = actor.system?.attributes?.speed;
    
    if (!actorSpeed) {
      logger.warn(`[getArmyMovementRange] Actor ${actor.name} has no speed data, using default movement`);
      return DEFAULT_RESULT;
    }
    
    // Check for special movement types
    const flySpeed = actorSpeed.otherSpeeds?.find((s: any) => s.type === 'fly')?.value || 0;
    const swimSpeed = actorSpeed.otherSpeeds?.find((s: any) => s.type === 'swim')?.value || 0;
    const landSpeed = actorSpeed.value || 0;
    
    // Determine movement capabilities
    const canFly = flySpeed > 0;
    const canSwim = swimSpeed > 0;
    const hasOnlySwim = swimSpeed > 0 && landSpeed === 0 && flySpeed === 0;
    
    // Use the highest speed available
    const maxSpeed = Math.max(flySpeed, swimSpeed, landSpeed);
    
    if (maxSpeed === 0) {
      logger.warn(`[getArmyMovementRange] Actor ${actor.name} has no valid speed, using default movement`);
      return DEFAULT_RESULT;
    }
    
    // Always use half of speed (rounded down)
    const range = Math.floor(maxSpeed / 2);
    
    logger.info(`[getArmyMovementRange] Actor ${actor.name}: speed=${maxSpeed}, range=${range}, canFly=${canFly}, canSwim=${canSwim}, hasOnlySwim=${hasOnlySwim}`);
    
    return { range, canFly, canSwim, hasOnlySwim };
    
  } catch (error) {
    logger.error('[getArmyMovementRange] Error reading actor speed:', error);
    return DEFAULT_RESULT;
  }
}
