/**
 * Settlement Crisis Incident Pipeline
 *
 * Generated from data/incidents/moderate/settlement-crisis.json
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const settlementCrisisPipeline: CheckPipeline = {
  id: 'settlement-crisis',
  name: 'Settlement Crisis',
  description: 'One of your settlements faces a major crisis',
  checkType: 'incident',
  tier: 'moderate',

  skills: [
      { skill: 'diplomacy', description: 'address concerns' },
      { skill: 'society', description: 'emergency aid' },
      { skill: 'religion', description: 'provide hope' },
    ],

  outcomes: {
    success: {
      description: 'The settlement is stabilized.',
      modifiers: []
    },
    failure: {
      description: 'The crisis threatens the settlement.',
      modifiers: [],
      manualEffects: ["Choose or roll for one random settlement. If you chose 'structure damaged', damage 1 random structure in that settlement"]
    },
    criticalFailure: {
      description: 'A settlement collapses.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ],
      manualEffects: ["Choose or roll for one random settlement. That settlement loses one level (minimum level 1)"]
    },
  },

  preview: {
    calculate: (ctx) => {
      const resources = [];
      const outcomeBadges = [];

      // Failure: damage 1 random structure
      if (ctx.outcome === 'failure') {
        outcomeBadges.push({
          icon: 'fa-home',
          prefix: '',
          value: { type: 'text', text: '1 structure may be damaged' },
          suffix: '',
          variant: 'negative'
        });
      }

      // Critical Failure: 1 unrest + settlement loses a level
      if (ctx.outcome === 'criticalFailure') {
        resources.push({ resource: 'unrest', value: 1 });
        outcomeBadges.push({
          icon: 'fa-city',
          prefix: '',
          value: { type: 'text', text: 'Settlement loses 1 level' },
          suffix: '',
          variant: 'negative'
        });
      }

      return {
        resources,
        outcomeBadges,
        warnings: ctx.outcome === 'criticalFailure'
          ? ['A random settlement will lose one level (minimum level 1)']
          : []
      };
    }
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(settlementCrisisPipeline, ctx.outcome);

    const { createGameCommandsResolver } = await import('../../services/GameCommandsResolver');
    const resolver = await createGameCommandsResolver();

    // Failure: damage 1 structure in a random settlement
    if (ctx.outcome === 'failure') {
      await resolver.damageStructure(undefined, undefined, 1);
    }

    // Critical failure: settlement loses a level (handled as manual effect for now)
    // Note: downgradeSettlement command not yet implemented

    return { success: true };
  }
};
