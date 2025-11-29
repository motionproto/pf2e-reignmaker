/**
 * Economic Crash Incident Pipeline
 *
 * Generated from data/incidents/major/economic-crash.json
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const economicCrashPipeline: CheckPipeline = {
  id: 'economic-crash',
  name: 'Economic Crash',
  description: 'A severe economic downturn threatens your kingdom\'s prosperity',
  checkType: 'incident',
  tier: 'major',

  skills: [
      { skill: 'diplomacy', description: 'stabilize markets' },
      { skill: 'society', description: 'public confidence' },
      { skill: 'intimidation', description: 'force compliance' },
      { skill: 'occultism', description: 'divine intervention' },
    ],

  outcomes: {
    success: {
      description: 'The economy is stabilized.',
      modifiers: []
    },
    failure: {
      description: 'An economic downturn causes significant losses.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d6', negative: true, duration: 'immediate' }
      ],
      manualEffects: ["Mark your highest tier commerce structure as damaged"]
    },
    criticalFailure: {
      description: 'Economic collapse devastates your kingdom.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '4d6', negative: true, duration: 'immediate' }
      ],
      manualEffects: ["Reduce your highest tier commerce structure's tier by one and mark it as damaged. If the tier is reduced to zero, remove it entirely"]
    },
  },

  preview: {
    calculate: (ctx) => {
      const resources = [];
      const outcomeBadges = [];

      // Failure: 2d6 gold loss + damage highest commerce structure
      if (ctx.outcome === 'failure') {
        outcomeBadges.push({
          icon: 'fa-coins',
          prefix: 'Lose',
          value: { type: 'dice', formula: '2d6' },
          suffix: 'Gold',
          variant: 'negative'
        });
        outcomeBadges.push({
          icon: 'fa-store',
          prefix: '',
          value: { type: 'text', text: 'Commerce structure damaged' },
          suffix: '',
          variant: 'negative'
        });
      }

      // Critical Failure: 4d6 gold loss + destroy/downgrade commerce structure
      if (ctx.outcome === 'criticalFailure') {
        outcomeBadges.push({
          icon: 'fa-coins',
          prefix: 'Lose',
          value: { type: 'dice', formula: '4d6' },
          suffix: 'Gold',
          variant: 'negative'
        });
        outcomeBadges.push({
          icon: 'fa-store',
          prefix: '',
          value: { type: 'text', text: 'Commerce structure downgraded' },
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
    await applyPipelineModifiers(economicCrashPipeline, ctx.outcome);

    const { createGameCommandsResolver } = await import('../../services/GameCommandsResolver');
    const resolver = await createGameCommandsResolver();

    // Failure: damage highest tier commerce structure
    if (ctx.outcome === 'failure') {
      await resolver.damageStructure(undefined, undefined, 1);
    }

    // Critical failure: destroy/downgrade highest tier commerce structure
    if (ctx.outcome === 'criticalFailure') {
      await resolver.destroyStructure('commerce', 'highest', 1);
    }

    return { success: true };
  }
};
