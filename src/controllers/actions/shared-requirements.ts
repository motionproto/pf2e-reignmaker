/**
 * Shared requirement checks used by multiple actions
 */

import { getKingdomActor } from '../../stores/KingdomStore';
import type { ActionRequirement } from './pipeline-resolver';

/**
 * Check if there are factions at least friendly or better
 * Used by: request-military-aid, request-economic-aid
 * 
 * Note: This only checks if ANY friendly factions exist, not if they're available.
 * The dialogs handle showing which ones are available vs already aided.
 * No Foundry notifications needed - the dialog UI shows the state clearly.
 */
export function checkFriendlyFactionRequirement(): ActionRequirement {
  const actor = getKingdomActor();
  if (!actor) return { met: false, reason: 'No kingdom actor available' };
  
  const kingdom = actor.getKingdomData();
  if (!kingdom) return { met: false, reason: 'No kingdom data available' };
  
  // Check if there are any factions
  const factions = kingdom.factions || [];
  if (factions.length === 0) {
    return { met: false, reason: 'No factions available. Create factions first.' };
  }
  
  // Check if there are any friendly/helpful factions at all
  // Attitude order: Hostile -> Unfriendly -> Indifferent -> Friendly -> Helpful
  const friendlyFactions = factions.filter((f: any) => 
    f.attitude === 'Friendly' || f.attitude === 'Helpful'
  );
  
  if (friendlyFactions.length === 0) {
    return { met: false, reason: 'No factions are Friendly or better' };
  }
  
  // If there are friendly factions, let the dialog handle showing which are available
  return { met: true };
}

/**
 * Check if there are any available factions that haven't provided aid this turn
 * Used by: request-military-aid, request-economic-aid
 * 
 * This is a more specific check than checkFriendlyFactionRequirement that also
 * verifies at least one faction is available to provide aid (not already aided).
 */
export function checkFactionAvailabilityRequirement(): ActionRequirement {
  // First check base requirement: must have friendly factions
  const baseFriendlyCheck = checkFriendlyFactionRequirement();
  if (!baseFriendlyCheck.met) {
    return baseFriendlyCheck;
  }
  
  const actor = getKingdomActor();
  if (!actor) return { met: false, reason: 'No kingdom actor available' };
  
  const kingdom = actor.getKingdomData();
  if (!kingdom) return { met: false, reason: 'No kingdom data available' };
  
  // Get all Friendly or Helpful factions
  const eligibleFactions = (kingdom.factions || [])
    .filter((f: any) => f.attitude === 'Friendly' || f.attitude === 'Helpful');
  
  // Check if all factions have already provided aid this turn
  const aidedThisTurn = kingdom.turnState?.actionsPhase?.factionsAidedThisTurn || [];
  const hasAvailableFaction = eligibleFactions.some((f: any) => !aidedThisTurn.includes(f.id));
  
  if (!hasAvailableFaction) {
    return {
      met: false,
      reason: 'All factions have already provided aid this turn'
    };
  }
  
  return { met: true };
}
