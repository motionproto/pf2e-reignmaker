/**
 * Work Stoppage Incident Pipeline
 *
 * Generated from data/incidents/minor/work-stoppage.json
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const workStoppagePipeline: CheckPipeline = {
  id: 'work-stoppage',
  name: 'Work Stoppage',
  description: 'Workers in your kingdom refuse to continue their labor',
  checkType: 'incident',
  tier: 'minor',

  skills: [
      { skill: 'diplomacy', description: 'negotiate with workers' },
      { skill: 'intimidation', description: 'force work' },
      { skill: 'performance', description: 'inspire workers' },
      { skill: 'medicine', description: 'address health concerns' },
    ],

  outcomes: {
    success: {
      description: 'The workers return.',
      modifiers: []
    },
    failure: {
      description: 'Work stoppage halts production.',
      modifiers: [
        { type: 'choice', resources: ["lumber", "ore", "stone"], value: 1, negative: true, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'Widespread work stoppage causes chaos.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
        { type: 'choice', resources: ["lumber", "ore", "stone"], value: 2, negative: true, duration: 'immediate' },
      ]
    },
  },

  preview: {
    providedByInteraction: false
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(workStoppagePipeline, ctx.outcome);
    return { success: true };
  }
};
