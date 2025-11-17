/**
 * Protests Incident Pipeline
 *
 * Generated from data/incidents/minor/protests.json
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const protestsPipeline: CheckPipeline = {
  id: 'protests',
  name: 'Protests',
  description: 'Citizens take to the streets in organized protests',
  checkType: 'incident',
  tier: 'minor',

  skills: [
      { skill: 'diplomacy', description: 'address crowd' },
      { skill: 'intimidation', description: 'disperse crowds' },
      { skill: 'performance', description: 'distract crowds' },
      { skill: 'arcana', description: 'magical calming' },
    ],

  outcomes: {
    success: {
      description: 'The protests are resolved peacefully.',
      modifiers: []
    },
    failure: {
      description: 'Property damage occurs.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'Widespread damage and disorder erupt.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d4', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'fame', value: -1, duration: 'immediate' },
      ]
    },
  },

  preview: {
    providedByInteraction: false
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(protestsPipeline, ctx.outcome);
    return { success: true };
  }
};
