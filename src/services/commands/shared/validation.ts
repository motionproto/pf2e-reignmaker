/**
 * Shared validation utilities for game commands
 */

import { getKingdomActor } from '../../../stores/KingdomStore';

/**
 * Get validated kingdom data
 * Throws if actor or kingdom data not available
 * 
 * @returns Actor and kingdom data
 */
export function getValidatedKingdom() {
  const actor = getKingdomActor();
  if (!actor) {
    throw new Error('No kingdom actor available');
  }
  
  const kingdom = actor.getKingdomData();
  if (!kingdom) {
    throw new Error('No kingdom data available');
  }
  
  return { actor, kingdom };
}

/**
 * Get validated kingdom data (ResolveResult pattern)
 * Returns error result instead of throwing
 * 
 * @returns Kingdom data or error result
 */
export function getValidatedKingdomSafe(): 
  | { success: true; actor: any; kingdom: any } 
  | { success: false; error: string } 
{
  const actor = getKingdomActor();
  if (!actor) {
    return { success: false, error: 'No kingdom actor available' };
  }
  
  const kingdom = actor.getKingdomData();
  if (!kingdom) {
    return { success: false, error: 'No kingdom data available' };
  }
  
  return { success: true, actor, kingdom };
}
