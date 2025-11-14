/**
 * Infiltration Action Pipeline
 *
 * Gather intelligence through espionage.
 * Converted from data/player-actions/infiltration.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { adjustFactionAttitudeExecution } from '../../execution/factions/adjustFactionAttitude';

export const infiltrationPipeline: CheckPipeline = {
  id: 'infiltration',
  name: 'Infiltration',
  description: 'Deploy spies and agents to gather intelligence on rival kingdoms or potential threats',
  checkType: 'action',
  category: 'foreign-affairs',

  skills: [
    { skill: 'deception', description: 'false identities' },
    { skill: 'stealth', description: 'covert operations' },
    { skill: 'thievery', description: 'steal secrets' },
    { skill: 'society', description: 'social infiltration' },
    { skill: 'arcana', description: 'magical espionage' },
    { skill: 'acrobatics', description: 'daring infiltration' }
  ],

  // Pre-roll: Select target faction
  preRollInteractions: [
    {
      type: 'entity-selection',
      id: 'targetFactionId',
      label: 'Select faction to infiltrate',
      entityType: 'faction'
    }
  ],

  // Post-roll: Dice for gold effects
  postRollInteractions: [
    {
      type: 'dice',
      id: 'goldGained',
      formula: '1d4',
      storeAs: 'goldGained',
      condition: (ctx) => ctx.outcome === 'criticalSuccess'
    },
    {
      type: 'dice',
      id: 'goldLost',
      formula: '1d4',
      storeAs: 'goldLost',
      condition: (ctx) => ctx.outcome === 'criticalFailure'
    }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Valuable intel is gathered.',
      modifiers: [],
      manualEffects: ['The GM should disclose sensitive information']
    },
    success: {
      description: 'Intel is gathered.',
      modifiers: [],
      manualEffects: ['The GM should disclose sensitive information']
    },
    failure: {
      description: 'The mission fails.',
      modifiers: []
    },
    criticalFailure: {
      description: 'Your spies are captured.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    }
  },

  preview: {
    calculate: (ctx) => {
      const resources = [];

      if (ctx.outcome === 'criticalSuccess') {
        const goldGained = ctx.resolutionData.diceRolls.goldGained || 2;
        resources.push({ resource: 'gold', value: goldGained });
      } else if (ctx.outcome === 'criticalFailure') {
        const goldLost = ctx.resolutionData.diceRolls.goldLost || 2;
        resources.push({ resource: 'gold', value: -goldLost });
        resources.push({ resource: 'unrest', value: 1 });
      }

      const specialEffects = [];
      if (ctx.outcome === 'criticalSuccess' || ctx.outcome === 'success') {
        specialEffects.push({
          type: 'status' as const,
          message: 'GM will disclose sensitive information',
          variant: 'positive' as const
        });
      } else if (ctx.outcome === 'criticalFailure') {
        specialEffects.push({
          type: 'status' as const,
          message: `Relations worsen with ${ctx.metadata.targetFactionName || 'faction'}`,
          variant: 'negative' as const
        });
      }

      return { resources, specialEffects, warnings: [] };
    }
  },

  execute: async (ctx) => {
    if (ctx.outcome === 'criticalFailure') {
      await adjustFactionAttitudeExecution(ctx.metadata.targetFactionId, -1);
    }
    // Gold is applied via modifiers/dice
  }
};
