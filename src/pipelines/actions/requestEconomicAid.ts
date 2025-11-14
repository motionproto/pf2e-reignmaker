/**
 * Request Economic Aid Action Pipeline
 *
 * Ask allies for resources or gold.
 * Converted from data/player-actions/request-economic-aid.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { adjustFactionAttitudeExecution } from '../../execution/factions/adjustFactionAttitude';

export const requestEconomicAidPipeline: CheckPipeline = {
  id: 'request-economic-aid',
  name: 'Request Economic Aid',
  description: 'Appeal to allied nations for material support in times of need',
  checkType: 'action',
  category: 'foreign-affairs',

  skills: [
    { skill: 'diplomacy', description: 'formal request' },
    { skill: 'society', description: 'leverage connections' },
    { skill: 'performance', description: 'emotional appeal' },
    { skill: 'deception', description: 'exaggerate need' },
    { skill: 'medicine', description: 'humanitarian aid' }
  ],

  // Pre-roll: Select friendly faction
  preRollInteractions: [
    {
      type: 'entity-selection',
      id: 'factionId',
      label: 'Select friendly faction for economic aid',
      entityType: 'faction'
    }
  ],

  // Post-roll: Dice for gold amount
  postRollInteractions: [
    {
      type: 'dice',
      id: 'goldAmount',
      formula: (ctx) => ctx.outcome === 'criticalSuccess' ? '2d6' : '1d4+1',
      storeAs: 'goldAmount',
      condition: (ctx) => ctx.outcome === 'criticalSuccess' || ctx.outcome === 'success'
    }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your ally provides generous support.',
      modifiers: []
    },
    success: {
      description: 'Your ally provides support.',
      modifiers: []
    },
    failure: {
      description: 'Your ally cannot help.',
      modifiers: []
    },
    criticalFailure: {
      description: 'Your ally is offended.',
      modifiers: []
    }
  },

  preview: {
    calculate: (ctx) => {
      const resources = [];
      const specialEffects = [];

      if (ctx.outcome === 'criticalSuccess') {
        const gold = ctx.resolutionData.diceRolls.goldAmount || 7; // avg of 2d6
        resources.push({ resource: 'gold', value: gold });
      } else if (ctx.outcome === 'success') {
        const gold = ctx.resolutionData.diceRolls.goldAmount || 3; // avg of 1d4+1
        resources.push({ resource: 'gold', value: gold });
      } else if (ctx.outcome === 'criticalFailure') {
        specialEffects.push({
          type: 'status' as const,
          message: `Relations worsen with ${ctx.metadata.factionName || 'faction'}`,
          variant: 'negative' as const
        });
      }

      return { resources, specialEffects, warnings: [] };
    }
  },

  execute: async (ctx) => {
    if (ctx.outcome === 'criticalFailure') {
      await adjustFactionAttitudeExecution(ctx.metadata.factionId, -1);
    }
    // Gold is applied via modifiers
  }
};
