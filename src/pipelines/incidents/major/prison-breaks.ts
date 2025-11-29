/**
 * Prison Breaks Incident Pipeline
 *
 * Generated from data/incidents/major/prison-breaks.json
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const prisonBreaksPipeline: CheckPipeline = {
  id: 'prison-breaks',
  name: 'Prison Breaks',
  description: 'Mass prison breaks release dangerous criminals',
  checkType: 'incident',
  tier: 'major',

  skills: [
      { skill: 'intimidation', description: 'lockdown prisons' },
      { skill: 'athletics', description: 'pursuit' },
      { skill: 'society', description: 'negotiation' },
    ],

  outcomes: {
    success: {
      description: 'The break is prevented.',
      modifiers: []
    },
    failure: {
      description: 'A mass prison break releases many criminals.',
      modifiers: []
    },
    criticalFailure: {
      description: 'A complete prison break releases all criminals.',
      modifiers: []
    },
  },

  preview: {
    calculate: (ctx) => {
      const resources = [];
      const outcomeBadges = [];

      // Failure: many criminals released
      if (ctx.outcome === 'failure') {
        outcomeBadges.push({
          icon: 'fa-lock-open',
          prefix: '',
          value: { type: 'text', text: 'Many prisoners escape' },
          suffix: '',
          variant: 'negative'
        });
      }

      // Critical Failure: all criminals released
      if (ctx.outcome === 'criticalFailure') {
        outcomeBadges.push({
          icon: 'fa-lock-open',
          prefix: '',
          value: { type: 'text', text: 'All prisoners escape' },
          suffix: '',
          variant: 'negative'
        });
      }

      return {
        resources,
        outcomeBadges,
        warnings: ctx.outcome === 'criticalFailure'
          ? ['All imprisoned NPCs will be released']
          : ctx.outcome === 'failure'
            ? ['Half of imprisoned NPCs will be released']
            : []
      };
    }
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(prisonBreaksPipeline, ctx.outcome);

    const { createGameCommandsResolver } = await import('../../services/GameCommandsResolver');
    const resolver = await createGameCommandsResolver();

    // Failure: release half of imprisoned NPCs
    if (ctx.outcome === 'failure') {
      await resolver.releaseImprisoned(50);
    }

    // Critical Failure: release all imprisoned NPCs
    if (ctx.outcome === 'criticalFailure') {
      await resolver.releaseImprisoned('all');
    }

    return { success: true };
  }
};
