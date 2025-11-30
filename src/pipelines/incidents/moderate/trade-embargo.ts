/**
 * Trade Embargo Incident Pipeline
 *
 * Generated from data/incidents/moderate/trade-embargo.json
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';

export const tradeEmbargoPipeline: CheckPipeline = {
  id: 'trade-embargo',
  name: 'Trade Embargo',
  description: 'Neighboring kingdoms impose trade restrictions',
  checkType: 'incident',
  tier: 'moderate',

  skills: [
      { skill: 'diplomacy', description: 'negotiate' },
      { skill: 'society', description: 'find loopholes' },
      { skill: 'deception', description: 'smuggling routes' },
      { skill: 'occultism', description: 'divine trade routes' },
    ],

  outcomes: {
    success: {
      description: 'Trade continues.',
      modifiers: []
    },
    failure: {
      description: 'A trade embargo disrupts your economy.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' },
        { type: 'choice-buttons', resources: ["lumber", "ore", "food", "stone"], value: '1d4+1', negative: true, duration: 'immediate' },
      ]
    },
    criticalFailure: {
      description: 'A complete trade embargo cripples your economy.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d4', negative: true, duration: 'immediate' },
        { type: 'choice-buttons', resources: ["lumber", "ore", "food", "stone"], value: '1d4+1', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
      ]
    },
  },

  // Auto-convert JSON modifiers to badges
  preview: undefined
};
