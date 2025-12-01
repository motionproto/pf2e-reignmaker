/**
 * Criminal Trial Event Pipeline
 *
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const criminalTrialPipeline: CheckPipeline = {
  id: 'criminal-trial',
  name: 'Criminal Trial',
  description: 'Authorities catch a notorious criminal or resolve a major injustice.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'intimidation', description: 'show of force' },
      { skill: 'diplomacy', description: 'public ceremony' },
      { skill: 'society', description: 'legal proceedings' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'Justice triumphs.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: -2, duration: 'immediate' }
      ]
    },
    success: {
      description: 'Justice is served.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'Complications arise from the trial.',
      endsEvent: true,
      modifiers: []
    },
    criticalFailure: {
      description: 'Justice is miscarried.',
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
