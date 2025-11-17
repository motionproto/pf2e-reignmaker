/**
 * Tax Revolt Incident Pipeline
 *
 * Generated from data/incidents/moderate/tax-revolt.json
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const taxRevoltPipeline: CheckPipeline = {
  id: 'tax-revolt',
  name: 'Tax Revolt',
  description: 'Citizens revolt against tax collection',
  checkType: 'incident',
  tier: 'moderate',

  skills: [
      { skill: 'intimidation', description: 'enforce collection' },
      { skill: 'diplomacy', description: 'negotiate rates' },
      { skill: 'society', description: 'tax reform' },
      { skill: 'deception', description: 'creative accounting' },
    ],

  outcomes: {
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

  preview: {
    providedByInteraction: false
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(taxRevoltPipeline, ctx.outcome);
    return { success: true };
  }
};
