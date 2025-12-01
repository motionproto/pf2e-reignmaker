/**
 * International Scandal Incident Pipeline
 *
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';

export const internationalScandalPipeline: CheckPipeline = {
  id: 'international-scandal',
  name: 'International Scandal',
  description: 'A massive scandal ruins your kingdom\'s reputation',
  checkType: 'incident',
  tier: 'major',

  skills: [
      { skill: 'performance', description: 'grand gesture' },
      { skill: 'diplomacy', description: 'public relations' },
      { skill: 'deception', description: 'propaganda' },
    ],

  outcomes: {
    success: {
      description: 'Your reputation is maintained.',
      modifiers: []
    },
    failure: {
      description: 'Your kingdom\'s reputation suffers.',
      modifiers: [
        { type: 'static', resource: 'fame', value: -1, duration: 'immediate' },
        { type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' },
      ]
    },
    criticalFailure: {
      description: 'A devastating scandal destroys your kingdom\'s standing.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d4', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
      ],
      manualEffects: ["Your kingdom's fame is reduced to 0 for the remainder of this turn (regardless of current value)", "Your kingdom cannot gain fame for the remainder of this turn"]
    },
  },

  // Auto-convert JSON modifiers to badges
  preview: undefined,

  traits: ["dangerous"],
};
