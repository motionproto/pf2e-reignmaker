/**
 * Repair Structure Action Pipeline
 *
 * Fix damaged buildings to restore functionality.
 * Converted from data/player-actions/repair-structure.json
 *
 * NOTE: Uses custom implementation for structure repair logic
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const repairStructurePipeline: CheckPipeline = {
  id: 'repair-structure',
  name: 'Repair Structure',
  description: 'Repair damaged structures within a settlement to restore its capabilities. Only the lowest tier damaged structure per category can be repaired.',
  checkType: 'action',
  category: 'urban-planning',

  // Requirements: Must have at least one damaged structure
  requirements: (kingdom) => {
    // Check if any settlement has damaged structures
    const hasDamagedStructures = kingdom.settlements?.some(s => 
      s.structureConditions && Object.values(s.structureConditions).some(condition => condition === 'damaged')
    );
    
    if (!hasDamagedStructures) {
      return {
        met: false,
        reason: 'No damaged structures to repair'
      };
    }
    
    return { met: true };
  },

  skills: [
    { skill: 'crafting', description: 'construction expertise' },
    { skill: 'society', description: 'organize workforce' },
    { skill: 'athletics', description: 'physical labor' }
  ],

  // Pre-roll: Select settlement and damaged structure
  preRollInteractions: [
    {
      type: 'compound',
      id: 'repairDetails',
      label: 'Select settlement and damaged structure'
    }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Citizens volunteer their time and materials. The structure is repaired for free!',
      modifiers: []
    },
    success: {
      description: 'The structure is repaired.',
      modifiers: []
    },
    failure: {
      description: 'Despite your efforts, the structure remains damaged.',
      modifiers: []
    },
    criticalFailure: {
      description: 'Time and money are wasted. The structure remains damaged.',
      modifiers: [
        { type: 'static', resource: 'gold', value: -1, duration: 'immediate' }
      ]
    }
  },

  preview: {
    calculate: (ctx) => {
      const resources = [];

      if (ctx.outcome === 'criticalFailure') {
        resources.push({ resource: 'gold', value: -1 });
      } else if (ctx.outcome === 'success') {
        // Cost depends on user choice (resources or gold)
        if (ctx.resolutionData.choices.repairCost === 'gold') {
          resources.push({ resource: 'gold', value: -1 });
        } else {
          // Resource cost shown elsewhere
        }
      }
      // Critical success = free

      const specialEffects = [];
      if (ctx.outcome !== 'failure' && ctx.outcome !== 'criticalFailure') {
        specialEffects.push({
          type: 'entity' as const,
          message: `Will repair ${ctx.metadata.structureName || 'structure'}`,
          variant: 'positive' as const
        });
      }

      return { resources, specialEffects, warnings: [] };
    }
  }

  // NOTE: Execution handled by custom implementation
};
