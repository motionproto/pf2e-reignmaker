/**
 * Grand Tournament Event Pipeline
 *
 * A martial competition draws competitors from across the realm.
 * Uses ChoiceModifier for simple resource selection.
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
      description: 'The tournament is a spectacular success - choose the benefit.',
      endsEvent: true,
      modifiers: [
        { type: 'choice', resources: ['fame', 'gold'], value: 3, duration: 'immediate' }
      ]
    },
    success: {
      description: 'The tournament goes well - choose the benefit.',
      endsEvent: true,
      modifiers: [
        { type: 'choice', resources: ['fame', 'gold'], value: 2, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The turnout is disappointing.',
      endsEvent: false,
      modifiers: [
        { type: 'static', resource: 'fame', value: 1, duration: 'immediate' }
      ]
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
    calculate: async (ctx) => {
      // ChoiceModifier is handled automatically by the system
      return { resources: [], outcomeBadges: [] };
    }
  },

  traits: ['beneficial'],
};
