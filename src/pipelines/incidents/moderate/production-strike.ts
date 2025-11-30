/**
 * Production Strike Incident Pipeline
 *
 * Generated from data/incidents/moderate/production-strike.json
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';

export const productionStrikePipeline: CheckPipeline = {
  id: 'production-strike',
  name: 'Production Strike',
  description: 'Workers strike, halting resource production',
  checkType: 'incident',
  tier: 'moderate',

  skills: [
      { skill: 'diplomacy', description: 'negotiate with workers' },
      { skill: 'society', description: 'arbitrate' },
      { skill: 'crafting', description: 'work alongside' },
      { skill: 'arcana', description: 'automate production' },
    ],

  outcomes: {
    success: {
      description: 'The strike ends.',
      modifiers: []
    },
    failure: {
      description: 'The strike causes resource losses.',
      modifiers: [
        { type: 'choice-buttons', resources: ["lumber", "ore", "stone"], value: '1d4-1', negative: true, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'A prolonged strike devastates production.',
      modifiers: [
        { type: 'choice-buttons', resources: ["lumber", "ore", "stone"], value: '2d4-1', negative: true, duration: 'immediate' }
      ]
    },
  },

  // Auto-convert JSON modifiers to badges
  preview: undefined
};
