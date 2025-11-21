/**
 * recoverArmy Action Pipeline
 * Data from: data/player-actions/recover-army.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';

export const recoverArmyPipeline = createActionPipeline('recover-army', {
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
      label: 'Select wounded army to recover',
      entityType: 'army'
    }
  ],

  preview: {
    calculate: (ctx) => {
      const specialEffects = [];

      if (ctx.outcome === 'criticalSuccess') {
        specialEffects.push({
          type: 'status' as const,
          message: `${ctx.metadata.armyName || 'Army'} will be fully healed`,
          variant: 'positive' as const
        });
      } else if (ctx.outcome === 'success') {
        specialEffects.push({
          type: 'status' as const,
          message: `${ctx.metadata.armyName || 'Army'} will be partially healed`,
          variant: 'positive' as const
        });
      }

      return { resources: [], specialEffects, warnings: [] };
    }
  }
});
