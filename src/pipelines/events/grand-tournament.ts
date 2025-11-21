/**
 * Grand Tournament Event Pipeline
 *
 * Generated from data/events/grand-tournament.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

export const grandTournamentPipeline: CheckPipeline = {
  id: 'grand-tournament',
  name: 'Grand Tournament',
  description: 'A martial competition draws competitors from across the realm.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'athletics', description: 'strength competitions' },
      { skill: 'acrobatics', description: 'agility contests' },
      { skill: 'performance', description: 'pageantry and ceremonies' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The tournament is a spectacular success.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' },
        { type: 'static', resource: 'fame', value: 1, duration: 'immediate' },
      ]
    },
    success: {
      description: 'The tournament goes well.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The turnout is disappointing.',
      modifiers: []
    },
    criticalFailure: {
      description: 'An accident mars the event.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
  },

  preview: {
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(grandTournamentPipeline, ctx.outcome);
    return { success: true };
  }
};
