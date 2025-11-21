/**
 * trainArmy Action Pipeline
 * Data from: data/player-actions/train-army.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';

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
      const specialEffects = [];

      specialEffects.push({
        type: 'entity' as const,
        message: `Will train ${ctx.metadata.armyName || 'army'} to level ${partyLevel}`,
        variant: 'positive' as const
      });

      if (ctx.outcome === 'criticalSuccess') {
        specialEffects.push({
          type: 'status' as const,
          message: 'Elite Training: +2 attack/AC for 1 month',
          variant: 'positive' as const
        });
      } else if (ctx.outcome === 'success') {
        specialEffects.push({
          type: 'status' as const,
          message: 'Standard Training: +1 attack for 1 month',
          variant: 'positive' as const
        });
      }

      return { resources: [], specialEffects, warnings: [] };
    }
  },

  execute: async (ctx) => {
    const partyLevel = getPartyLevel();
    await trainArmyExecution(ctx.metadata.armyId, partyLevel, ctx.outcome);
    return { success: true, message: 'Army training complete' };
  }
});
