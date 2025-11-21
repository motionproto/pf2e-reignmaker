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
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(prisonBreaksPipeline, ctx.outcome);
    return { success: true };
  }
};
