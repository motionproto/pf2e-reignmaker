/**
 * Army Movement Traits Detection
 * 
 * Detects movement capabilities from the army's linked NPC actor:
 * - canFly: Actor has fly speed
 * - canSwim: Actor has swim speed
 * - hasBoats: Army has boats flag (naval movement)
 */

import type { Army } from '../models/Army';
import { logger } from './Logger';

/**
 * Movement traits for an army
 */
export interface ArmyMovementTraits {
  canFly: boolean;      // Actor has fly speed (ignores all terrain)
  canSwim: boolean;     // Actor has swim speed (water costs 1)
  hasBoats: boolean;    // Army has boats (naval movement)
}

/**
 * Get movement traits for an army from its linked NPC actor
 * 
 * @param army - The army to check
 * @returns Movement traits detected from actor
 */
export function getArmyMovementTraits(army: Army): ArmyMovementTraits {
  const game = (globalThis as any).game;
  
  // Default traits (grounded, no special movement)
  const defaultTraits: ArmyMovementTraits = {
    canFly: false,
    canSwim: false,
    hasBoats: false
  };
  
  // Check if army has linked actor
  if (!army.actorId) {
    logger.warn('[ArmyMovementTraits] Army has no linked actor:', army.name);
    return defaultTraits;
  }
  
  // Get the linked NPC actor
  const actor = game.actors?.get(army.actorId);
  if (!actor) {
    logger.warn('[ArmyMovementTraits] Could not find actor for army:', army.name);
    return defaultTraits;
  }
  
  // Extract movement speeds from PF2e actor system data
  const systemData = actor.system;
  const otherSpeeds = systemData?.attributes?.speed?.otherSpeeds;
  
  // Check for fly speed
  const canFly = Array.isArray(otherSpeeds) && 
    otherSpeeds.some((speed: any) => speed.type === 'fly');
  
  // Check for swim speed
  const canSwim = Array.isArray(otherSpeeds) && 
    otherSpeeds.some((speed: any) => speed.type === 'swim');
  
  // Check for boats flag (set by GM for naval armies)
  const hasBoats = actor.getFlag('pf2e-reignmaker', 'has-boats') === true;
  
  const traits: ArmyMovementTraits = {
    canFly,
    canSwim,
    hasBoats
  };
  
  // Debug logging
  if (canFly || canSwim || hasBoats) {
    logger.debug(`[ArmyMovementTraits] ${army.name}:`, traits);
  }
  
  return traits;
}

/**
 * Check if army can move through water hexes
 */
export function canMoveOnWater(traits: ArmyMovementTraits): boolean {
  return traits.canFly || traits.canSwim || traits.hasBoats;
}

/**
 * Check if army is restricted to water only (naval units)
 * Note: This would need a separate flag in the future
 */
export function isWaterOnly(traits: ArmyMovementTraits): boolean {
  // For now, assume boats = can move on land OR water
  // In the future, we could add a 'waterOnly' flag for pure naval units
  return false;
}

/**
 * Get movement trait description for display
 */
export function getMovementTraitDescription(traits: ArmyMovementTraits): string {
  const capabilities: string[] = [];
  
  if (traits.canFly) {
    capabilities.push('Flying');
  }
  if (traits.canSwim) {
    capabilities.push('Swimming');
  }
  if (traits.hasBoats) {
    capabilities.push('Naval');
  }
  
  return capabilities.length > 0 
    ? capabilities.join(', ') 
    : 'Grounded';
}
