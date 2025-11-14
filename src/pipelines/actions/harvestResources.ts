/**
 * Harvest Resources Action Pipeline
 *
 * Gather materials from kingdom lands with choice of resource type.
 * Converted from data/player-actions/harvest-resources.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const harvestResourcesPipeline: CheckPipeline = {
  id: 'harvest-resources',
  name: 'Harvest Resources',
  description: 'Organize gathering expeditions to collect raw materials from your kingdom\'s territories. Choose which resource to focus on after seeing how successful your efforts are.',
  checkType: 'action',
  category: 'economic-resources',

  skills: [
    { skill: 'nature', description: 'natural harvesting' },
    { skill: 'survival', description: 'efficient extraction' },
    { skill: 'crafting', description: 'process materials' }
  ],

  // Post-roll: Choose which resource to gain
  postRollInteractions: [
    {
      type: 'choice',
      id: 'resourceChoice',
      label: 'Choose resource to harvest',
      presentation: 'choice-buttons',
      options: ['food', 'lumber', 'stone', 'ore'],
      condition: (ctx) => ctx.outcome === 'criticalSuccess' || ctx.outcome === 'success'
    }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'The harvest is exceptional.',
      modifiers: [],
      gameCommands: [{
        type: 'chooseAndGainResource',
        resources: ['food', 'lumber', 'stone', 'ore'],
        amount: 2
      }]
    },
    success: {
      description: 'The harvest is good.',
      modifiers: [],
      gameCommands: [{
        type: 'chooseAndGainResource',
        resources: ['food', 'lumber', 'stone', 'ore'],
        amount: 1
      }]
    },
    failure: {
      description: 'The harvest yields nothing.',
      modifiers: []
    },
    criticalFailure: {
      description: 'Damaged equipment and wasted effort.',
      modifiers: [
        { type: 'static', resource: 'gold', value: -1, duration: 'immediate' }
      ]
    }
  },

  preview: {
    calculate: (ctx) => {
      if (ctx.outcome === 'criticalSuccess') {
        return {
          resources: [{ resource: ctx.resolutionData.choices.resourceChoice as any, value: 2 }],
          specialEffects: [],
          warnings: []
        };
      } else if (ctx.outcome === 'success') {
        return {
          resources: [{ resource: ctx.resolutionData.choices.resourceChoice as any, value: 1 }],
          specialEffects: [],
          warnings: []
        };
      } else if (ctx.outcome === 'criticalFailure') {
        return {
          resources: [{ resource: 'gold', value: -1 }],
          specialEffects: [],
          warnings: []
        };
      }
      return { resources: [], specialEffects: [], warnings: [] };
    }
  }
};
