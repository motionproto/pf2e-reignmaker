/**
 * Create Worksite Action Pipeline
 *
 * Establish farms, mines, quarries, or lumber camps.
 * Converted from data/player-actions/create-worksite.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const createWorksitePipeline: CheckPipeline = {
  id: 'create-worksite',
  name: 'Create Worksite',
  description: 'Establish resource extraction operations to harness the natural wealth of your territories',
  checkType: 'action',
  category: 'borders',

  skills: [
    { skill: 'crafting', description: 'build infrastructure' },
    { skill: 'nature', description: 'identify resources' },
    { skill: 'survival', description: 'frontier operations' },
    { skill: 'athletics', description: 'manual labor' },
    { skill: 'arcana', description: 'magical extraction' },
    { skill: 'religion', description: 'blessed endeavors' }
  ],

  // Pre-roll: Select hex and worksite type
  preRollInteractions: [
    {
      type: 'map-selection',
      id: 'worksiteHex',
      mode: 'hex-selection',
      count: 1,
      colorType: 'worksite'
    },
    {
      type: 'configuration',
      id: 'worksiteType',
      label: 'Select worksite type (Farm, Quarry, Mine, Lumbermill)'
    }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'The worksite is established quickly.',
      modifiers: []
    },
    success: {
      description: 'The worksite is established.',
      modifiers: []
    },
    failure: {
      description: 'The workers make no progress.',
      modifiers: []
    },
    criticalFailure: {
      description: 'The work is abandoned.',
      modifiers: []
    }
  },

  preview: {
    providedByInteraction: true
  }
};
