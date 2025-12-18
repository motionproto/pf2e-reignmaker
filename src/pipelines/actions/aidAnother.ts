/**
 * Aid Another Action Pipeline
 * Allows players to aid another character's skill check
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { textBadge } from '../../types/OutcomeBadge';
import { getKingdomActor } from '../../stores/KingdomStore';
import type { KingdomData } from '../../actors/KingdomActor';
import { TurnPhase } from '../../actors/KingdomActor';

/**
 * Calculate aid bonus based on outcome and proficiency rank
 */
function calculateAidBonus(outcome: string, proficiencyRank: number): number {
  if (outcome === 'criticalSuccess') {
    return 4;
  } else if (outcome === 'success') {
    if (proficiencyRank === 0) return 1;
    else if (proficiencyRank <= 2) return 2;
    else if (proficiencyRank === 3) return 3;
    else return 4;
  } else if (outcome === 'criticalFailure') {
    return -1;
  }
  return 0;
}

export const aidAnotherPipeline: CheckPipeline = {
  // === BASE DATA ===
  id: 'aid-another',
  name: 'Aid Another',
  description: 'Use your skills to assist another character\'s kingdom check. If you succeed, you grant them a circumstance bonus based on your proficiency. A critical success grants +4 and allows them to keep the higher of two rolls.',
  category: 'support',
  checkType: 'action',

  skills: [
    { skill: 'acrobatics', description: 'agility and coordination' },
    { skill: 'arcana', description: 'arcane knowledge' },
    { skill: 'athletics', description: 'physical prowess' },
    { skill: 'crafting', description: 'construction and creation' },
    { skill: 'deception', description: 'subterfuge and misdirection' },
    { skill: 'diplomacy', description: 'negotiation and persuasion' },
    { skill: 'intimidation', description: 'threats and coercion' },
    { skill: 'medicine', description: 'healing and health' },
    { skill: 'nature', description: 'natural world knowledge' },
    { skill: 'occultism', description: 'esoteric mysteries' },
    { skill: 'performance', description: 'artistry and showmanship' },
    { skill: 'religion', description: 'divine knowledge' },
    { skill: 'society', description: 'culture and civilization' },
    { skill: 'stealth', description: 'concealment and infiltration' },
    { skill: 'survival', description: 'wilderness expertise' },
    { skill: 'thievery', description: 'sleight of hand and lockpicking' }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'You provide exceptional aid. The target gains a +4 circumstance bonus and can keep the higher of two d20 rolls.',
      modifiers: [],
      manualEffects: ['+4 circumstance bonus to target\'s check', 'Target keeps higher of two rolls']
    },
    success: {
      description: 'You provide helpful aid. The target gains a circumstance bonus based on your proficiency: +1 (untrained), +2 (trained/expert), +3 (master), or +4 (legendary).',
      modifiers: [],
      manualEffects: ['Circumstance bonus based on proficiency']
    },
    failure: {
      description: 'Your aid has no effect. You can try again using a different skill.',
      modifiers: []
    },
    criticalFailure: {
      description: 'Your attempt to aid actually hinders the target, imposing a -1 circumstance penalty to their check.',
      modifiers: [],
      manualEffects: ['-1 circumstance penalty to target\'s check']
    }
  },

  // === TYPESCRIPT LOGIC ===
  requirements: () => ({ met: true }),

  preview: {
    calculate: (ctx) => {
      const proficiencyRank = ctx.actor?.proficiencyRank || 0;
      const outcomeBadges = [];

      if (ctx.outcome === 'criticalSuccess') {
        outcomeBadges.push(textBadge('+4 circumstance bonus', 'fa-hands-helping', 'positive'));
        outcomeBadges.push(textBadge('Grant keep higher roll', 'fa-dice-d20', 'positive'));
      } else if (ctx.outcome === 'success') {
        const bonus = calculateAidBonus(ctx.outcome, proficiencyRank);
        outcomeBadges.push(textBadge(`+${bonus} circumstance bonus`, 'fa-hands-helping', 'positive'));
      } else if (ctx.outcome === 'failure') {
        outcomeBadges.push(textBadge('No effect - can try with different skill', 'fa-redo', 'info'));
      } else if (ctx.outcome === 'criticalFailure') {
        outcomeBadges.push(textBadge('-1 circumstance penalty', 'fa-exclamation-triangle', 'negative'));
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

    const targetActionId = ctx.metadata.targetActionId;
    const targetActionName = ctx.metadata.targetActionName;
    const skillUsed = ctx.actor?.selectedSkill || 'unknown';
    const proficiencyRank = ctx.actor?.proficiencyRank || 0;

    if (!targetActionId) {
      return { success: false, error: 'No target action specified' };
    }

    const bonus = calculateAidBonus(ctx.outcome, proficiencyRank);
    const grantKeepHigher = ctx.outcome === 'criticalSuccess';

    if (bonus !== 0) {
      await actor.updateKingdomData((kingdom: KingdomData) => {
        if (!kingdom.turnState) return;

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
      });

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
};
