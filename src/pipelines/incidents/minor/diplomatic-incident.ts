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
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(diplomaticIncidentPipeline, ctx.outcome);
    return { success: true };
  }
};
