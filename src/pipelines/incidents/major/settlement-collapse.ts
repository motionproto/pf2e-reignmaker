/**
 * Settlement Collapse Incident Pipeline
 *
 * Generated from data/incidents/major/settlement-collapse.json
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const settlementCollapsePipeline: CheckPipeline = {
  id: 'settlement-collapse',
  name: 'Settlement Collapse',
  description: 'A major settlement faces total collapse',
  checkType: 'incident',
  tier: 'major',

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
      description: 'A major crisis threatens the settlement.',
      modifiers: [],
      manualEffects: ["Choose or roll for one random settlement. If you chose 'structures damaged', damage 2 random structures in that settlement"]
    },
    criticalFailure: {
      description: 'A settlement collapses.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ],
      manualEffects: ["Choose or roll for one random settlement. That settlement loses one level (minimum level 1)", "Reduce 1 random structure's tier in that settlement by one and mark it as damaged. If the tier is reduced to zero, remove it entirely"]
    },
  },

  preview: {
    calculate: (ctx) => {
      const resources = [];
      const outcomeBadges = [];

      // Failure: 2 structures damaged
      if (ctx.outcome === 'failure') {
        outcomeBadges.push({
          icon: 'fa-home',
          prefix: '',
          value: { type: 'text', text: '2 structures damaged' },
          suffix: '',
          variant: 'negative'
        });
      }

      // Critical Failure: 1 unrest + settlement downgrade + structure downgrade
      if (ctx.outcome === 'criticalFailure') {
        resources.push({ resource: 'unrest', value: 1 });
        outcomeBadges.push({
          icon: 'fa-city',
          prefix: '',
          value: { type: 'text', text: 'Settlement loses 1 level' },
          suffix: '',
          variant: 'negative'
        });
        outcomeBadges.push({
          icon: 'fa-home',
          prefix: '',
          value: { type: 'text', text: 'Structure downgraded' },
          suffix: '',
          variant: 'negative'
        });
      }

      return {
        resources,
        outcomeBadges,
        warnings: ctx.outcome === 'failure'
          ? ['2 random structures in one settlement will be damaged']
          : ctx.outcome === 'criticalFailure'
            ? ['One settlement loses a level (min 1)', 'One structure in that settlement is downgraded']
            : []
      };
    }
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(settlementCollapsePipeline, ctx.outcome);

    const { createGameCommandsResolver } = await import('../../services/GameCommandsResolver');
    const resolver = await createGameCommandsResolver();

    // Failure: damage 2 structures
    if (ctx.outcome === 'failure') {
      await resolver.damageStructure(undefined, undefined, 2);
    }

    // Critical Failure: downgrade 1 structure (settlement level handled as manual effect)
    if (ctx.outcome === 'criticalFailure') {
      await resolver.destroyStructure(undefined, undefined, 1);
    }

    return { success: true };
  }
};
