/**
 * Criminal Activity Incident Pipeline
 *
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';

export const criminalActivityPipeline: CheckPipeline = {
  id: 'criminal-activity',
  name: 'Criminal Activity',
  description: 'Criminal activity surges throughout your settlements',
  checkType: 'incident',
  severity: 'minor',

  skills: [
      { skill: 'intimidation', description: 'crack down on criminals' },
      { skill: 'thievery', description: 'infiltrate gangs' },
      { skill: 'society', description: 'legal reform' },
      { skill: 'occultism', description: 'divine the source' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'Crime is suppressed.',
      modifiers: []
    },
    success: {
      description: 'Crime is suppressed.',
      modifiers: []
    },
    failure: {
      description: 'A crime wave hits.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'A major crime wave erupts.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d4', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
      ]
    },
  },

  preview: {
    calculate: async () => ({ resources: [], outcomeBadges: [] })
  },

  traits: ["dangerous"],
  // ✅ REMOVED: No longer needed - UnifiedCheckHandler handles modifiers automatically
};
