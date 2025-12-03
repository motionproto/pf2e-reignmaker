/**
 * Protests Incident Pipeline
 *
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';

export const protestsPipeline: CheckPipeline = {
  id: 'protests',
  name: 'Protests',
  description: 'Citizens take to the streets in organized protests',
  checkType: 'incident',
  severity: 'minor',

  skills: [
      { skill: 'diplomacy', description: 'address crowd' },
      { skill: 'intimidation', description: 'disperse crowds' },
      { skill: 'performance', description: 'distract crowds' },
      { skill: 'arcana', description: 'magical calming' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'Grievances are fully addressed.',
      modifiers: []
    },
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

  // Auto-convert JSON modifiers to badges
  preview: undefined,

  traits: ["dangerous"],
  // ✅ REMOVED: No longer needed - UnifiedCheckHandler handles modifiers automatically
};
