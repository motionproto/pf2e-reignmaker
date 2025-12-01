/**
 * Diplomatic Crisis Incident Pipeline
 *
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

  // Auto-convert JSON modifiers to badges (none for this incident, only game commands)
  preview: undefined,

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(diplomaticCrisisPipeline, ctx.outcome, ctx);

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
