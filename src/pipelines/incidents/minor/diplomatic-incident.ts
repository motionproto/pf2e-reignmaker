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

  // Auto-convert JSON modifiers to badges (none for this incident, only game commands)
  preview: undefined,

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(diplomaticIncidentPipeline, ctx.outcome, ctx);

    const { createGameCommandsResolver } = await import('../../../services/GameCommandsResolver');
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
