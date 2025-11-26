import { getKingdomActor } from '../../stores/KingdomStore';

/**
 * Aid result stored in kingdom state
 */
export interface AidResult {
  playerId: string;
  playerName: string;
  characterName: string;
  targetActionId: string;
  skillUsed: string;
  outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
  bonus: number;
  grantKeepHigher: boolean;
  timestamp: number;
}

/**
 * Get aid result for a target check from kingdom state
 * @param targetId - The target action/event ID
 * @param checkType - The type of check ('action' or 'event')
 */
export function getAidResult(
  targetId: string, 
  checkType: 'action' | 'event'
): { outcome: string; bonus: number } | null {
  const actor = getKingdomActor();
  if (!actor) return null;

  const kingdom = actor.getKingdomData();
  if (!kingdom?.turnState) return null;

  // Determine which phase's activeAids array to check
  const phaseKey = checkType === 'action' ? 'actionsPhase' : 'eventsPhase';
  const activeAids = kingdom.turnState[phaseKey]?.activeAids;

  if (!activeAids || activeAids.length === 0) return null;

  // Find the most recent aid for this target
  const aidsForTarget = activeAids.filter((aid: any) => aid.targetActionId === targetId);
  if (aidsForTarget.length === 0) return null;

  // Return the most recent aid (highest timestamp)
  const mostRecentAid = aidsForTarget.reduce((latest: any, current: any) =>
    current.timestamp > latest.timestamp ? current : latest
  );

  return {
    outcome: mostRecentAid.outcome,
    bonus: mostRecentAid.bonus,
    characterName: mostRecentAid.characterName
  };
}
