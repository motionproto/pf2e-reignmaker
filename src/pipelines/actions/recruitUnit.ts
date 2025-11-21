/**
 * recruitUnit Action Pipeline
 * Data from: data/player-actions/recruit-unit.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';

import { textBadge } from '../../types/OutcomeBadge';
export const recruitUnitPipeline = createActionPipeline('recruit-unit', {
  // No cost - always available
  requirements: () => ({ met: true }),

  preRollInteractions: [
    {
      type: 'compound',
      id: 'armyDetails',
      label: 'Configure army recruitment'
    }
  ],

  preview: {
    calculate: (ctx) => {
      const unrestChange = ctx.outcome === 'criticalSuccess' ? -1 :
                          ctx.outcome === 'criticalFailure' ? 1 : 0;

      const outcomeBadges = [];
      if (ctx.outcome !== 'failure' && ctx.outcome !== 'criticalFailure') {
        const level = getPartyLevel();
        specialEffects.push({
          type: 'entity' as const,
          message: `Will recruit ${ctx.metadata.armyName || 'new army'} (Level ${level})`,
          variant: 'positive' as const
        });
      }

      return {
        resources: unrestChange !== 0 ? [{ resource: 'unrest', value: unrestChange }] : [],
        specialEffects,
        warnings: []
      };
    }
  },

  execute: async (ctx) => {
    if (ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure') {
      return; // No army recruited
    }

    const { ARMY_TYPES } = await import('../../utils/armyHelpers');
    const level = getPartyLevel();

    await recruitArmyExecution({
      name: ctx.metadata.armyName || 'New Army',
      level,
      type: ctx.metadata.armyType || 'infantry',
      image: ARMY_TYPES[ctx.metadata.armyType as keyof typeof ARMY_TYPES]?.image || ARMY_TYPES.infantry.image,
      settlementId: ctx.metadata.settlementId
    });
  }
});
