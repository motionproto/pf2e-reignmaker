/**
 * Assassination Attempt Incident Pipeline
 *
 * Generated from data/incidents/moderate/assassination-attempt.json
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';

export const assassinAttackPipeline: CheckPipeline = {
  id: 'assassin-attack',
  name: 'Assassin Attack',
  description: 'An assassin targets one of your kingdom\'s leaders',
  checkType: 'incident',
  tier: 2,

  skills: [
      { skill: 'athletics', description: 'protect target' },
      { skill: 'medicine', description: 'treat wounds' },
      { skill: 'stealth', description: 'avoid the assassin' },
    ],

  preRollInteractions: [
    {
      type: 'entity-selection',
      id: 'target',
      entityType: 'army',  // Leaders would need custom component
      label: 'Select Army Under Attack',
      required: true
    }
  ],

  outcomes: {
    success: {
      description: 'The assassination is prevented.',
      modifiers: []
    },
    failure: {
      description: 'The leader escapes.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'The leader is wounded.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ],
      manualEffects: ["Choose or roll for one random PC leader. That PC cannot take a Kingdom Action this turn (they are recovering from wounds)"]
    },
  },

  // Auto-convert JSON modifiers to badges
  preview: undefined
};
