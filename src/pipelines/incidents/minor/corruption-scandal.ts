/**
 * Corruption Scandal Incident Pipeline
 *
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';

export const corruptionScandalPipeline: CheckPipeline = {
  id: 'corruption-scandal',
  name: 'Corruption Scandal',
  description: 'Corruption among your officials is exposed',
  checkType: 'incident',
  severity: 'minor',

  skills: [
      { skill: 'society', description: 'investigation' },
      { skill: 'deception', description: 'cover-up' },
      { skill: 'intimidation', description: 'purge corrupt officials' },
      { skill: 'diplomacy', description: 'manage public relations' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The scandal is contained and reforms are implemented.',
      modifiers: []
    },
    success: {
      description: 'The scandal is contained.',
      modifiers: []
    },
    failure: {
      description: 'Embezzlement and graft are discovered.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'Major corruption is exposed publicly.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d4', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'fame', value: -1, duration: 'immediate' },
      ]
    },
  },

  preview: undefined,

  traits: ["dangerous"],
};
