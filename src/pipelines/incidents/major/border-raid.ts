/**
 * Border Raid Incident Pipeline
 *
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';

export const borderRaidPipeline: CheckPipeline = {
  id: 'border-raid',
  name: 'Border Raid',
  description: 'Enemy forces and hostile creatures raid your border territories',
  checkType: 'incident',
  tier: 'major',

  skills: [
      { skill: 'athletics', description: 'rapid response' },
      { skill: 'intimidation', description: 'retaliation' },
      { skill: 'survival', description: 'tracking' },
      { skill: 'nature', description: 'use terrain' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'Your kingdom defends its borders and captures valuable enemy supplies.',
      modifiers: []  // No modifiers needed (+1 Fame auto-applied by UnifiedCheckHandler)
    },
    success: {
      description: 'The raiders are repelled.',
      modifiers: []
    },
    failure: {
      description: 'Raiders pillage border territories.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'Raiders devastate border regions.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d4', negative: true, duration: 'immediate' }
      ]
    },
  },

  // Auto-convert JSON modifiers to badges
  preview: undefined,

  traits: ["dangerous"],
};
