/**
 * Aid Another Action Pipeline
 * Allows players to aid another character's skill check
 */

import { createActionPipeline } from '../shared/createActionPipeline';
import { textBadge } from '../../types/OutcomeBadge';
import { getKingdomActor } from '../../stores/KingdomStore';
import type { KingdomData } from '../../actors/KingdomActor';
import { TurnPhase } from '../../actors/KingdomActor';
import { logger } from '../../utils/Logger';

/**
 * Calculate aid bonus based on outcome and proficiency rank
 */
function calculateAidBonus(outcome: string, proficiencyRank: number): number {
  if (outcome === 'criticalSuccess') {
    return 4;
  } else if (outcome === 'success') {
    // Calculate based on proficiency
    if (proficiencyRank === 0) return 1; // Untrained
    else if (proficiencyRank <= 2) return 2; // Trained/Expert
    else if (proficiencyRank === 3) return 3; // Master
    else return 4; // Legendary
  } else if (outcome === 'criticalFailure') {
    return -1; // PF2e rules: critical failure imposes a -1 penalty
  }
  // outcome === 'failure' stays at 0 (no effect)
  return 0;
}

/**
 * Get aid bonus description for preview
 */
function getAidBonusDescription(outcome: string, proficiencyRank: number): string {
  if (outcome === 'criticalSuccess') {
    return '+4 circumstance bonus and grant keep higher roll';
  } else if (outcome === 'success') {
    const bonus = calculateAidBonus(outcome, proficiencyRank);
    return `+${bonus} circumstance bonus`;
  } else if (outcome === 'criticalFailure') {
    return '-1 circumstance penalty to the target';
  } else {
    return 'No effect - you can try again with a different skill';
  }
}

export const aidAnotherPipeline = createActionPipeline('aid-another', {
  // No cost, always available
  requirements: () => ({ met: true }),

  // DC is always 15 for Aid Another (standard PF2e rule)
  getDC: () => 15,

  preview: {
    calculate: (ctx) => {
      const proficiencyRank = ctx.actor?.proficiencyRank || 0;
      const outcomeBadges = [];

      if (ctx.outcome === 'criticalSuccess') {
        outcomeBadges.push(
          textBadge('+4 circumstance bonus', 'fa-hands-helping', 'positive')
        );
        outcomeBadges.push(
          textBadge('Grant keep higher roll', 'fa-dice-d20', 'positive')
        );
      } else if (ctx.outcome === 'success') {
        const bonus = calculateAidBonus(ctx.outcome, proficiencyRank);
        outcomeBadges.push(
          textBadge(`+${bonus} circumstance bonus`, 'fa-hands-helping', 'positive')
        );
      } else if (ctx.outcome === 'failure') {
        // No badge - no effect but can retry
        outcomeBadges.push(
          textBadge('No effect - can try with different skill', 'fa-redo', 'neutral')
        );
      } else if (ctx.outcome === 'criticalFailure') {
        outcomeBadges.push(
          textBadge('-1 circumstance penalty', 'fa-exclamation-triangle', 'negative')
        );
      }

      return { resources: [], outcomeBadges, warnings: [] };
    }
  },

  execute: async (ctx: any) => {
    const game = (window as any).game;
    const actor = getKingdomActor();
    
    if (!actor) {
      return { success: false, error: 'No kingdom actor available' };
    }

    // Get target information from metadata
    const targetActionId = ctx.metadata.targetActionId;
    const targetActionName = ctx.metadata.targetActionName;
    const skillUsed = ctx.actor?.selectedSkill || 'unknown';
    const proficiencyRank = ctx.actor?.proficiencyRank || 0;

    if (!targetActionId) {
      return { success: false, error: 'No target action specified' };
    }

    // Calculate bonus
    const bonus = calculateAidBonus(ctx.outcome, proficiencyRank);
    const grantKeepHigher = ctx.outcome === 'criticalSuccess';

    // Store aid result in turnState.actionsPhase.activeAids (or eventsPhase if applicable)
    // This ensures the existing PF2eSkillService.getKingdomModifiers continues to work
    if (bonus !== 0) {
      await actor.updateKingdomData((kingdom: KingdomData) => {
        if (!kingdom.turnState) return;

        // Determine which phase based on metadata (default to actionsPhase)
        const checkType = ctx.metadata.checkType || 'action';
        const phaseKey = checkType === 'action' ? 'actionsPhase' : 'eventsPhase';
        
        if (!kingdom.turnState[phaseKey]) return;
        if (!kingdom.turnState[phaseKey].activeAids) {
          kingdom.turnState[phaseKey].activeAids = [];
        }

        kingdom.turnState[phaseKey].activeAids.push({
          playerId: game.user.id,
          playerName: game.user.name,
          characterName: ctx.actor?.actorName || 'Unknown',
          targetActionId,
          skillUsed,
          outcome: ctx.outcome as any,
          bonus,
          grantKeepHigher,
          timestamp: Date.now()
        });
        
        console.log('[Aid Debug] Stored aid result:', {
          targetActionId,
          bonus,
          allActiveAids: kingdom.turnState[phaseKey].activeAids
        });
      });

      // Track the aid check in the action log
      const { createGameCommandsService } = await import('../../services/GameCommandsService');
      const gameCommandsService = await createGameCommandsService();
      
      const checkType = ctx.metadata.checkType || 'action';
      await gameCommandsService.trackPlayerAction(
        game.user.id,
        game.user.name,
        ctx.actor?.actorName || 'Unknown',
        `aid-${targetActionId}-${ctx.outcome}`,
        checkType === 'action' ? TurnPhase.ACTIONS : TurnPhase.EVENTS
      );

      const bonusText = bonus > 0 ? `+${bonus}` : `${bonus}`;
      const message = `You are now aiding ${targetActionName} with a ${bonusText} ${
        bonus > 0 ? 'bonus' : 'penalty'
      }${grantKeepHigher ? ' and keep higher roll' : ''}!`;
      
      return { success: true, message };
    } else {
      // Failed aid (no bonus/penalty) - track action but don't store (allows retry)
      const { createGameCommandsService } = await import('../../services/GameCommandsService');
      const gameCommandsService = await createGameCommandsService();
      
      const checkType = ctx.metadata.checkType || 'action';
      await gameCommandsService.trackPlayerAction(
        game.user.id,
        game.user.name,
        ctx.actor?.actorName || 'Unknown',
        `aid-${targetActionId}-${ctx.outcome}`,
        checkType === 'action' ? TurnPhase.ACTIONS : TurnPhase.EVENTS
      );

      return { 
        success: true, 
        message: `Your aid attempt for ${targetActionName} failed. You can try again with a different skill.` 
      };
    }
  }
});

