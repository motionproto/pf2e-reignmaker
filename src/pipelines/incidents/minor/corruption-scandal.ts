/**
 * Corruption Scandal Incident Pipeline
 *
 * Generated from data/incidents/minor/corruption-scandal.json
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const corruptionScandalPipeline: CheckPipeline = {
  id: 'corruption-scandal',
  name: 'Corruption Scandal',
  description: 'Corruption among your officials is exposed',
  checkType: 'incident',
  tier: 'minor',

  skills: [
      { skill: 'society', description: 'investigation' },
      { skill: 'deception', description: 'cover-up' },
      { skill: 'intimidation', description: 'purge corrupt officials' },
      { skill: 'diplomacy', description: 'manage public relations' },
    ],

  outcomes: {
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

  // Auto-convert JSON modifiers to badges
  preview: undefined,

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(corruptionScandalPipeline, ctx.outcome, ctx);
    return { success: true };
  }
};
