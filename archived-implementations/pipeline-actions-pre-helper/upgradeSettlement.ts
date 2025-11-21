/**
 * upgradeSettlement Action Pipeline
 * Data from: data/player-actions/upgrade-settlement.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';

export const upgradeSettlementPipeline = createActionPipeline('upgrade-settlement', {
  requirements: (kingdom) => {
    if (kingdom.settlements.length === 0) {
      return {
        met: false,
        reason: 'No settlements to upgrade'
      };
    }
    return { met: true };
  },

  preRollInteractions: [
    {
      type: 'entity-selection',
      id: 'settlementId',
      label: 'Select settlement to upgrade',
      entityType: 'settlement'
    }
  ],

  preview: {
    calculate: (ctx) => {
      const settlement = ctx.kingdom.settlements?.find((s: any) => s.id === ctx.metadata.settlementId);
      if (!settlement) {
        return { resources: [], specialEffects: [], warnings: ['Settlement not found'] };
      }

      const currentLevel = settlement.level;
      const newLevel = currentLevel + 1;
      const fullCost = newLevel;
      const halfCost = Math.ceil(newLevel / 2);

      const goldCost = ctx.outcome === 'criticalSuccess' ? -halfCost :
                      ctx.outcome === 'success' ? -fullCost :
                      ctx.outcome === 'failure' ? -halfCost :
                      -fullCost;

      const specialEffects = [];
      if (ctx.outcome !== 'failure' && ctx.outcome !== 'criticalFailure') {
        specialEffects.push({
          type: 'entity' as const,
          message: `Will upgrade ${ctx.metadata.settlementName || settlement.name} to level ${newLevel}`,
          variant: 'positive' as const
        });
      }

      return {
        resources: [{ resource: 'gold', value: goldCost }],
        specialEffects,
        warnings: []
      };
    }
  }
});
