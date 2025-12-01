/**
 * Natural Disaster Event Pipeline
 *
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const naturalDisasterPipeline: CheckPipeline = {
  id: 'natural-disaster',
  name: 'Natural Disaster',
  description: 'Earthquake, tornado, wildfire, or severe flooding strikes the kingdom.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'survival', description: 'evacuation and rescue' },
      { skill: 'crafting', description: 'emergency shelters' },
      { skill: 'society', description: 'coordinate relief' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'Damage is minimal.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    success: {
      description: 'Some damage occurs.',
      endsEvent: true,
      modifiers: [
        { type: 'choice', resources: ["lumber", "ore", "food", "stone"], value: 1, negative: true, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'Major damage occurs.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'The disaster is devastating.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ]
    },
  },

  preview: {
  },

  traits: ["dangerous"],
};
