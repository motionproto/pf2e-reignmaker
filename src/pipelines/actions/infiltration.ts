/**
 * infiltration Action Pipeline
 * Data from: data/player-actions/infiltration.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';

import { textBadge } from '../../types/OutcomeBadge';
export const infiltrationPipeline = createActionPipeline('infiltration', {
  // No cost - always available
  requirements: () => ({ met: true }),

  preRollInteractions: [
    {
      type: 'entity-selection',
      id: 'targetFactionId',
      label: 'Select faction to infiltrate',
      entityType: 'faction'
    }
  ],

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

      const outcomeBadges = [];
      if (ctx.outcome === 'criticalSuccess' || ctx.outcome === 'success') {
        outcomeBadges.push(textBadge('GM will disclose sensitive information', 'fa-user-secret', 'positive'));
      } else if (ctx.outcome === 'criticalFailure') {
        outcomeBadges.push(textBadge(`Relations worsen with ${ctx.metadata.targetFactionName || 'faction'}`, 'fa-frown', 'negative'));
      }

      return { resources, outcomeBadges, warnings: [] };
    }
  },

  execute: async (ctx) => {
    if (ctx.outcome === 'criticalFailure') {
      await adjustFactionAttitudeExecution(ctx.metadata.targetFactionId, -1);
    }
    // Gold is applied via modifiers/dice
  }
});
