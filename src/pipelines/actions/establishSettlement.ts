/**
 * Establish Settlement Action Pipeline
 *
 * Found a new village.
 * Converted from data/player-actions/establish-settlement.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { foundSettlementExecution } from '../../execution/settlements/foundSettlement';

export const establishSettlementPipeline: CheckPipeline = {
  id: 'establish-settlement',
  name: 'Establish Settlement',
  description: 'Found a new community where settlers can establish homes and begin building infrastructure',
  checkType: 'action',
  category: 'urban-planning',

  skills: [
    { skill: 'society', description: 'organized settlement' },
    { skill: 'survival', description: 'frontier establishment' },
    { skill: 'diplomacy', description: 'attract settlers' },
    { skill: 'religion', description: 'blessed founding' },
    { skill: 'medicine', description: 'healthy community planning' }
  ],

  // Pre-roll: Select hex location and provide settlement name
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

  outcomes: {
    criticalSuccess: {
      description: 'The village is established quickly.',
      modifiers: [
        { type: 'static', resource: 'gold', value: -2, duration: 'immediate' },
        { type: 'static', resource: 'food', value: -2, duration: 'immediate' },
        { type: 'static', resource: 'lumber', value: -2, duration: 'immediate' }
      ],
      manualEffects: [
        'Place the new village on the hex map',
        'Choose and add any Tier 1 structure to the new settlement'
      ]
    },
    success: {
      description: 'The village is established.',
      modifiers: [
        { type: 'static', resource: 'gold', value: -2, duration: 'immediate' },
        { type: 'static', resource: 'food', value: -2, duration: 'immediate' },
        { type: 'static', resource: 'lumber', value: -2, duration: 'immediate' }
      ],
      manualEffects: ['Place the new village on the hex map']
    },
    failure: {
      description: 'Resources are wasted.',
      modifiers: [
        { type: 'static', resource: 'gold', value: -1, duration: 'immediate' },
        { type: 'static', resource: 'food', value: -1, duration: 'immediate' },
        { type: 'static', resource: 'lumber', value: -1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'The settlement attempt is a complete disaster.',
      modifiers: [
        { type: 'static', resource: 'gold', value: -2, duration: 'immediate' },
        { type: 'static', resource: 'food', value: -2, duration: 'immediate' },
        { type: 'static', resource: 'lumber', value: -2, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    }
  },

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
};
