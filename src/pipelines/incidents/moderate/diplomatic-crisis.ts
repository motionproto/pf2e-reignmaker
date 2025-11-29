/**
 * Diplomatic Crisis Incident Pipeline
 *
 * Generated from data/incidents/moderate/diplomatic-crisis.json
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const diplomaticCrisisPipeline: CheckPipeline = {
  id: 'diplomatic-crisis',
  name: 'Diplomatic Crisis',
  description: 'A serious diplomatic crisis threatens relations',
  checkType: 'incident',
  tier: 'moderate',

  skills: [
      { skill: 'diplomacy', description: 'smooth over' },
      { skill: 'deception', description: 'deny responsibility' },
      { skill: 'society', description: 'formal apology' },
    ],

  outcomes: {
    success: {
      description: 'Relations are maintained.',
      modifiers: []
    },
    failure: {
      description: 'A neighboring kingdom\'s attitude worsens.',
      modifiers: []
    },
    criticalFailure: {
      description: 'Multiple kingdoms turn against you.',
      modifiers: []
    },
  },

  preview: {
    calculate: (ctx) => {
      const resources = [];
      const outcomeBadges = [];

      // Failure: one faction's attitude worsens
      if (ctx.outcome === 'failure') {
        outcomeBadges.push({
          icon: 'fa-flag',
          prefix: '',
          value: { type: 'text', text: "One faction's attitude worsens" },
          suffix: '',
          variant: 'negative'
        });
      }

      // Critical Failure: multiple factions' attitudes worsen
      if (ctx.outcome === 'criticalFailure') {
        outcomeBadges.push({
          icon: 'fa-flag',
          prefix: '',
          value: { type: 'text', text: "Multiple factions' attitudes worsen" },
          suffix: '',
          variant: 'negative'
        });
      }

      return {
        resources,
        outcomeBadges,
        warnings: ctx.outcome === 'failure'
          ? ['One random faction will become less friendly']
          : ctx.outcome === 'criticalFailure'
            ? ['Multiple factions will become less friendly']
            : []
      };
    }
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(diplomaticCrisisPipeline, ctx.outcome);

    const { createGameCommandsResolver } = await import('../../services/GameCommandsResolver');
    const resolver = await createGameCommandsResolver();

    // Failure: worsen one random faction's attitude
    if (ctx.outcome === 'failure') {
      await resolver.adjustFactionAttitude(null, -1, { count: 1 });
    }

    // Critical Failure: worsen multiple factions' attitudes
    if (ctx.outcome === 'criticalFailure') {
      await resolver.adjustFactionAttitude(null, -1, { count: 2 });
    }

    return { success: true };
  }
};
