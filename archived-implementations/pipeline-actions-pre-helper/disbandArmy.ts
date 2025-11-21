/**
 * disbandArmy Action Pipeline
 * Data from: data/player-actions/disband-army.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';

export const disbandArmyPipeline = createActionPipeline('disband-army', {
  requirements: (kingdom) => {
    if (kingdom.armies.length === 0) {
      return {
        met: false,
        reason: 'No armies to disband'
      };
    }
    return { met: true };
  },

  preRollInteractions: [
    {
      type: 'entity-selection',
      id: 'armyId',
      label: 'Select army to disband',
      entityType: 'army'
    }
  ],

  preview: {
    calculate: (ctx) => {
      const unrestChange = ctx.outcome === 'criticalSuccess' ? -2 :
                          ctx.outcome === 'success' ? -1 :
                          ctx.outcome === 'criticalFailure' ? 1 : 0;

      return {
        resources: unrestChange !== 0 ? [{ resource: 'unrest', value: unrestChange }] : [],
        specialEffects: [{
          type: 'entity' as const,
          message: `Will disband ${ctx.metadata.armyName || 'army'}`,
          variant: 'negative' as const
        }],
        warnings: []
      };
    }
  },

  execute: async (ctx) => {
    await disbandArmyExecution(ctx.metadata.armyId, true);
    return { success: true, message: 'Army disbanded' };
  }
});
