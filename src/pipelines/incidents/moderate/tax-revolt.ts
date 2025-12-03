/**
 * Tax Revolt Incident Pipeline
 *
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';

export const taxRevoltPipeline: CheckPipeline = {
  id: 'tax-revolt',
  name: 'Tax Revolt',
  description: 'Citizens revolt against tax collection',
  checkType: 'incident',
  severity: 'moderate',

  skills: [
      { skill: 'intimidation', description: 'enforce collection' },
      { skill: 'diplomacy', description: 'negotiate rates' },
      { skill: 'society', description: 'tax reform' },
      { skill: 'deception', description: 'creative accounting' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'Your kingdom handles the tax revolt exceptionally well. Citizens accept fair taxation.',
      modifiers: []  // No modifiers needed (+1 Fame auto-applied by UnifiedCheckHandler)
    },
    success: {
      description: 'Taxes are collected normally.',
      modifiers: []
    },
    failure: {
      description: 'Tax collection is disrupted.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'A widespread tax revolt erupts.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d4', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
      ]
    },
  },

  // Auto-convert JSON modifiers to badges
  preview: undefined,

  traits: ["dangerous"],
};
