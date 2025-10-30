import { get } from 'svelte/store';
import { getKingdomActor } from '../../stores/KingdomStore';
import { TurnPhase, type KingdomData } from '../../actors/KingdomActor';
import {
  getCurrentUserCharacter,
  showCharacterSelectionDialog,
  performKingdomActionRoll
} from '../../services/pf2e';
import { logger } from '../../utils/Logger';

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
 * Configuration for aid system behavior
 */
export interface AidSystemConfig {
  checkType: 'action' | 'event';
  getDC: (characterLevel: number) => number;
  gameCommandsService: any;
}

/**
 * Aid manager for handling aid checks across different phases
 */
export interface AidManager {
  /**
   * Execute an aid roll for a target check
   */
  executeAidRoll(
    skill: string,
    targetId: string,
    targetName: string
  ): Promise<void>;

  /**
   * Get the most recent aid result for a target check
   */
  getAidResult(targetId: string): { outcome: string; bonus: number } | null;

  /**
   * Clean up event listeners
   */
  cleanup(): void;
}

/**
 * Create an aid manager for a specific phase
 */
export function createAidManager(config: AidSystemConfig): AidManager {
  const { checkType, getDC, gameCommandsService } = config;
  const activeListeners = new Set<(e: any) => Promise<void>>();

  /**
   * Execute aid roll for a target check
   */
  async function executeAidRoll(
    skill: string,
    targetId: string,
    targetName: string
  ): Promise<void> {
    const game = (window as any).game;

    // Get character for roll
    let actingCharacter = getCurrentUserCharacter();

    if (!actingCharacter) {
      actingCharacter = await showCharacterSelectionDialog();
      if (!actingCharacter) {
        return; // User cancelled
      }
    }

    // Declare listener outside try block so it can be referenced in catch
    let aidRollListener: ((e: any) => Promise<void>) | null = null;

    try {
      const characterLevel = actingCharacter.level || 1;
      const dc = getDC(characterLevel);
      const skillSlug = skill.toLowerCase();
      const skillData = actingCharacter.skills?.[skillSlug];
      const proficiencyRank = skillData?.rank || 0;

      // Listen for the roll completion BEFORE starting the roll
      aidRollListener = async (e: any) => {
        const { checkId, outcome, actorName } = e.detail;

        if (checkId === `aid-${targetId}`) {
          window.removeEventListener('kingdomRollComplete', aidRollListener as any);
          activeListeners.delete(aidRollListener!);

          // Calculate bonus based on outcome and proficiency (including penalty for critical failure)
          let bonus = 0;
          let grantKeepHigher = false;

          if (outcome === 'criticalSuccess') {
            bonus = 4;
            grantKeepHigher = true;
          } else if (outcome === 'success') {
            // Calculate based on proficiency
            if (proficiencyRank === 0) bonus = 1; // Untrained
            else if (proficiencyRank <= 2) bonus = 2; // Trained/Expert
            else if (proficiencyRank === 3) bonus = 3; // Master
            else bonus = 4; // Legendary
          } else if (outcome === 'criticalFailure') {
            bonus = -1; // PF2e rules: critical failure imposes a -1 penalty
          }
          // outcome === 'failure' stays at 0 (no effect)

          // Store aids that have any effect (bonus or penalty)
          if (bonus !== 0) {
            const actor = getKingdomActor();
            if (actor) {
              await actor.updateKingdomData((kingdom: KingdomData) => {
                if (!kingdom.turnState) return;

                // Determine which phase's activeAids array to use
                const phaseKey = checkType === 'action' ? 'actionsPhase' : 'eventsPhase';
                if (!kingdom.turnState[phaseKey]) return;
                if (!kingdom.turnState[phaseKey].activeAids) {
                  kingdom.turnState[phaseKey].activeAids = [];
                }

                kingdom.turnState[phaseKey].activeAids.push({
                  playerId: game.user.id,
                  playerName: game.user.name,
                  characterName: actorName,
                  targetActionId: targetId,
                  skillUsed: skill,
                  outcome: outcome as any,
                  bonus,
                  grantKeepHigher,
                  timestamp: Date.now()
                });
              });

              // Track the aid check in the action log
              if (gameCommandsService) {
                await gameCommandsService.trackPlayerAction(
                  game.user.id,
                  game.user.name,
                  actorName,
                  `aid-${targetId}-${outcome}`,
                  checkType === 'action' ? TurnPhase.ACTIONS : TurnPhase.EVENTS
                );
              }

              const bonusText = bonus > 0 ? `+${bonus}` : `${bonus}`;
              ui.notifications?.info(
                `You are now aiding ${targetName} with a ${bonusText} ${
                  bonus > 0 ? 'bonus' : 'penalty'
                }${grantKeepHigher ? ' and keep higher roll' : ''}!`
              );
            }
          } else {
            // Failed aid (no bonus/penalty) - track action but don't store (allows retry)
            if (gameCommandsService) {
              await gameCommandsService.trackPlayerAction(
                game.user.id,
                game.user.name,
                actorName,
                `aid-${targetId}-${outcome}`,
                checkType === 'action' ? TurnPhase.ACTIONS : TurnPhase.EVENTS
              );
            }

            ui.notifications?.warn(
              `Your aid attempt for ${targetName} failed. You can try again with a different skill.`
            );
          }
        }
      };

      window.addEventListener('kingdomRollComplete', aidRollListener as any);
      activeListeners.add(aidRollListener);

      // Perform the roll - pass targetId so modifiers can be applied
      await performKingdomActionRoll(
        actingCharacter,
        skill,
        dc,
        `Aid Another: ${targetName}`,
        `aid-${targetId}`,
        {
          criticalSuccess: { description: 'You provide exceptional aid (+4 bonus and keep higher roll)' },
          success: { description: 'You provide helpful aid (bonus based on proficiency)' },
          failure: { description: 'Your aid has no effect' },
          criticalFailure: { description: 'Your aid has no effect' }
        },
        targetId // Pass the target ID so aid modifiers are applied to the correct check
      );
    } catch (error) {
      // Clean up listener on error
      if (aidRollListener) {
        window.removeEventListener('kingdomRollComplete', aidRollListener as any);
        activeListeners.delete(aidRollListener);
      }
      logger.error('Error performing aid roll:', error);
      ui.notifications?.error(`Failed to perform aid: ${error}`);
    }
  }

  /**
   * Get aid result for a target check from shared kingdom state
   */
  function getAidResult(targetId: string): { outcome: string; bonus: number } | null {
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
      bonus: mostRecentAid.bonus
    };
  }

  /**
   * Clean up all event listeners
   */
  function cleanup(): void {
    activeListeners.forEach(listener => {
      window.removeEventListener('kingdomRollComplete', listener as any);
    });
    activeListeners.clear();
  }

  return {
    executeAidRoll,
    getAidResult,
    cleanup
  };
}
