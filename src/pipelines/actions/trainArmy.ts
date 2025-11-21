/**
 * trainArmy Action Pipeline
 * Data from: data/player-actions/train-army.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';

import { textBadge } from '../../types/OutcomeBadge';
export const trainArmyPipeline = createActionPipeline('train-army', {
  requirements: (kingdom) => {
    if (kingdom.armies.length === 0) {
      return {
        met: false,
        reason: 'No armies available'
      };
    }
    return { met: true };
  },

  preRollInteractions: [
    {
      type: 'entity-selection',
      id: 'armyId',
      label: 'Select army to train',
      entityType: 'army'
    }
  ],

  preview: {
    calculate: (ctx) => {
      const partyLevel = getPartyLevel();
      const outcomeBadges = [];

      outcomeBadges.push(textBadge(`Will train ${ctx.metadata.armyName || 'army'} to level ${partyLevel}`, 'fa-shield-alt', 'positive'));

      if (ctx.outcome === 'criticalSuccess') {
        outcomeBadges.push(textBadge('Elite Training: +2 attack/AC for 1 month', 'fa-star', 'positive'));
      } else if (ctx.outcome === 'success') {
        outcomeBadges.push(textBadge('Standard Training: +1 attack for 1 month', 'fa-check', 'positive'));
      }

      return { resources: [], outcomeBadges, warnings: [] };
    }
  },

  execute: async (ctx) => {
    const partyLevel = getPartyLevel();
    await trainArmyExecution(ctx.metadata.armyId, partyLevel, ctx.outcome);
    return { success: true, message: 'Army training complete' };
  }
});
