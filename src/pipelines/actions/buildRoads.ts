/**
 * Build Roads Action Pipeline
 *
 * Connect territory with infrastructure.
 * Converted from data/player-actions/build-roads.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const buildRoadsPipeline: CheckPipeline = {
  id: 'build-roads',
  name: 'Build Roads',
  description: 'Construct pathways between settlements to improve trade, travel, and military movement. Roads must be built in claimed territory.',
  checkType: 'action',
  category: 'expand-borders',

  skills: [
    { skill: 'crafting', description: 'engineering expertise' },
    { skill: 'survival', description: 'pathfinding routes' },
    { skill: 'athletics', description: 'manual labor' },
    { skill: 'nature', description: 'work with terrain' }
  ],

  // Pre-roll: Select hex path for roads
  preRollInteractions: [
    {
      type: 'map-selection',
      id: 'roadPath',
      mode: 'hex-path',
      colorType: 'road'
    }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Excellent roads are constructed.',
      modifiers: []
    },
    success: {
      description: 'A road is constructed.',
      modifiers: []
    },
    failure: {
      description: 'Construction fails.',
      modifiers: []
    },
    criticalFailure: {
      description: 'Work crews are lost.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    }
  },

  preview: {
    providedByInteraction: true,  // Path visualization shows roads
    calculate: (ctx) => {
      if (ctx.outcome === 'criticalFailure') {
        return {
          resources: [{ resource: 'unrest', value: 1 }],
          specialEffects: [],
          warnings: []
        };
      }
      return { resources: [], specialEffects: [], warnings: [] };
    }
  }
};
