/**
 * Border Raid Incident Pipeline
 *
 * Generated from data/incidents/major/border-raid.json
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const borderRaidPipeline: CheckPipeline = {
  id: 'border-raid',
  name: 'Border Raid',
  description: 'Enemy forces and hostile creatures raid your border territories',
  checkType: 'incident',
  tier: 'major',

  skills: [
      { skill: 'athletics', description: 'rapid response' },
      { skill: 'intimidation', description: 'retaliation' },
      { skill: 'survival', description: 'tracking' },
      { skill: 'nature', description: 'use terrain' },
    ],

  outcomes: {
    success: {
      description: 'The raiders are repelled.',
      modifiers: []
    },
    failure: {
      description: 'Raiders pillage border territories.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'Raiders devastate border regions.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d4', negative: true, duration: 'immediate' }
      ]
    },
  },

  preview: {
    providedByInteraction: false
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(borderRaidPipeline, ctx.outcome);
    return { success: true };
  }
};
