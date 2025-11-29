/**
 * Diplomatic Incident Incident Pipeline
 *
 * Generated from data/incidents/minor/diplomatic-incident.json
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const diplomaticIncidentPipeline: CheckPipeline = {
  id: 'diplomatic-incident',
  name: 'Diplomatic Incident',
  description: 'A diplomatic misstep strains relations with neighbors',
  checkType: 'incident',
  tier: 'minor',

  skills: [
      { skill: 'diplomacy', description: 'smooth over' },
      { skill: 'society', description: 'formal apology' },
      { skill: 'deception', description: 'deny involvement' },
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
    await applyPipelineModifiers(diplomaticIncidentPipeline, ctx.outcome);

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
