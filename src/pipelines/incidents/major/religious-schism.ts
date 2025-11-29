/**
 * Religious Schism Incident Pipeline
 *
 * Generated from data/incidents/major/religious-schism.json
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const religiousSchismPipeline: CheckPipeline = {
  id: 'religious-schism',
  name: 'Religious Schism',
  description: 'Religious divisions tear your kingdom apart',
  checkType: 'incident',
  tier: 'major',

  skills: [
      { skill: 'religion', description: 'theological debate' },
      { skill: 'diplomacy', description: 'mediate factions' },
      { skill: 'occultism', description: 'divine intervention' },
      { skill: 'society', description: 'secular compromise' },
    ],

  outcomes: {
    success: {
      description: 'The schism is averted.',
      modifiers: []
    },
    failure: {
      description: 'Religious divisions weaken your kingdom.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d6', negative: true, duration: 'immediate' }
      ],
      manualEffects: ["Mark your highest tier religious structure as damaged"]
    },
    criticalFailure: {
      description: 'The church splits entirely.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '4d6', negative: true, duration: 'immediate' }
      ],
      manualEffects: ["Reduce your highest tier religious structure's tier by one and mark it as damaged. If the tier is reduced to zero, remove it entirely"]
    },
  },

  preview: {
    calculate: (ctx) => {
      const resources = [];
      const outcomeBadges = [];

      // Failure: 2d6 gold loss + damage highest religious structure
      if (ctx.outcome === 'failure') {
        outcomeBadges.push({
          icon: 'fa-coins',
          prefix: 'Lose',
          value: { type: 'dice', formula: '2d6' },
          suffix: 'Gold',
          variant: 'negative'
        });
        outcomeBadges.push({
          icon: 'fa-church',
          prefix: '',
          value: { type: 'text', text: 'Religious structure damaged' },
          suffix: '',
          variant: 'negative'
        });
      }

      // Critical Failure: 4d6 gold loss + destroy/downgrade religious structure
      if (ctx.outcome === 'criticalFailure') {
        outcomeBadges.push({
          icon: 'fa-coins',
          prefix: 'Lose',
          value: { type: 'dice', formula: '4d6' },
          suffix: 'Gold',
          variant: 'negative'
        });
        outcomeBadges.push({
          icon: 'fa-church',
          prefix: '',
          value: { type: 'text', text: 'Religious structure downgraded' },
          suffix: '',
          variant: 'negative'
        });
      }

      return {
        resources,
        outcomeBadges,
        warnings: []
      };
    }
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(religiousSchismPipeline, ctx.outcome);

    const { createGameCommandsResolver } = await import('../../services/GameCommandsResolver');
    const resolver = await createGameCommandsResolver();

    // Failure: damage highest tier religious structure
    if (ctx.outcome === 'failure') {
      await resolver.damageStructure(undefined, undefined, 1);
    }

    // Critical failure: destroy/downgrade highest tier religious structure
    if (ctx.outcome === 'criticalFailure') {
      await resolver.destroyStructure('religion', 'highest', 1);
    }

    return { success: true };
  }
};
