/**
 * Build Structure Action Pipeline
 *
 * Add markets, temples, barracks, and other structures.
 * Converted from data/player-actions/build-structure.json
 *
 * NOTE: Uses custom implementation for structure building logic
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const buildStructurePipeline: CheckPipeline = {
  id: 'build-structure',
  name: 'Build Structure',
  description: 'Construct new buildings and infrastructure within a settlement to enhance its capabilities',
  checkType: 'action',
  category: 'urban-planning',

  skills: [
    { skill: 'crafting', description: 'construction expertise' },
    { skill: 'society', description: 'organize workforce' },
    { skill: 'athletics', description: 'physical labor' },
    { skill: 'arcana', description: 'magically assisted construction' }
  ],

  // Pre-roll: Select settlement and structure
  preRollInteractions: [
    {
      type: 'compound',
      id: 'buildingDetails',
      label: 'Select settlement and structure'
    }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'The structure is constructed efficiently.',
      modifiers: []
    },
    success: {
      description: 'Construction begins on a structure.',
      modifiers: []
    },
    failure: {
      description: 'Construction of the structure fails.',
      modifiers: []
    },
    criticalFailure: {
      description: 'Accidents and disputes plague the project.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    }
  },

  preview: {
    calculate: (ctx) => {
      const resources = ctx.outcome === 'criticalFailure' ?
        [{ resource: 'unrest', value: 1 }] : [];

      const specialEffects = [];
      if (ctx.outcome !== 'failure' && ctx.outcome !== 'criticalFailure') {
        specialEffects.push({
          type: 'entity' as const,
          message: `Will build ${ctx.metadata.structureName || 'structure'} in ${ctx.metadata.settlementName || 'settlement'}`,
          variant: 'positive' as const
        });
      }

      return { resources, specialEffects, warnings: [] };
    }
  }

  // NOTE: Execution handled by custom implementation
};
