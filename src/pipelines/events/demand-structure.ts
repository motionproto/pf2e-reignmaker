/**
 * Demand Structure Event Pipeline
 *
 * Generated from data/events/demand-structure.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

export const demandStructurePipeline: CheckPipeline = {
  id: 'demand-structure',
  name: 'Demand Structure',
  description: 'Citizens demand that a specific structure be built.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'diplomacy', description: 'negotiate a compromise' },
      { skill: 'intimidation', description: 'enforce order' },
      { skill: 'society', description: 'understand their needs' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The citizens are convinced.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    success: {
      description: 'The demands are satisfied.',
      modifiers: []
    },
    failure: {
      description: 'The protests continue.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'Violence erupts.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ]
    },
  },

  preview: {
  }
};
