/**
 * establishSettlement Action Pipeline
 * Data from: data/player-actions/establish-settlement.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';

export const establishSettlementPipeline = createActionPipeline('establish-settlement', {
  preRollInteractions: [
    {
      type: 'map-selection',
      id: 'location',
      mode: 'hex-selection',
      count: 1,
      colorType: 'settlement'
    },
    {
      type: 'text-input',
      id: 'settlementName',
      label: 'Settlement name'
    }
  ],

  preview: {
    providedByInteraction: true,
    calculate: (ctx) => {
      const resourceCost = ctx.outcome === 'failure' ? -1 : -2;

      const resources = [
        { resource: 'gold', value: resourceCost },
        { resource: 'food', value: resourceCost },
        { resource: 'lumber', value: resourceCost }
      ];

      if (ctx.outcome === 'criticalFailure') {
        resources.push({ resource: 'unrest', value: 1 });
      }

      const specialEffects = [];
      if (ctx.outcome !== 'failure' && ctx.outcome !== 'criticalFailure') {
        specialEffects.push({
          type: 'entity' as const,
          message: `Will found ${ctx.metadata.settlementName || 'new settlement'}`,
          variant: 'positive' as const
        });

        if (ctx.outcome === 'criticalSuccess') {
          specialEffects.push({
            type: 'status' as const,
            message: 'Grants free Tier 1 structure',
            variant: 'positive' as const
          });
        }
      }

      return { resources, specialEffects, warnings: [] };
    }
  },

  execute: async (ctx) => {
    if (ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure') {
      return; // No settlement founded
    }

    const grantFreeStructure = ctx.outcome === 'criticalSuccess';

    await foundSettlementExecution({
      name: ctx.metadata.settlementName || 'New Settlement',
      location: ctx.metadata.location || { x: 0, y: 0 },
      grantFreeStructure
    });
  }
});
