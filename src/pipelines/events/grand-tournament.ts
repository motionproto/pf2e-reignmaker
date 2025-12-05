/**
 * Grand Tournament Event Pipeline
 *
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

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
      endsEvent: true,
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: -2, duration: 'immediate' },
        { type: 'static', resource: 'fame', value: 1, duration: 'immediate' }
      ]
    },
    success: {
      description: 'The tournament goes well.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'gold', value: 1, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' },
        { type: 'static', resource: 'fame', value: 1, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The turnout is disappointing.',
      endsEvent: false,
      modifiers: []
    },
    criticalFailure: {
      description: 'An accident mars the event.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
  },

  preview: {
  },

  traits: ["beneficial"],
};
