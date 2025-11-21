/**
 * repairStructure Action Pipeline
 * Data from: data/player-actions/repair-structure.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';

export const repairStructurePipeline = createActionPipeline('repair-structure', {
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

  preRollInteractions: [
    {
      type: 'compound',
      id: 'repairDetails',
      label: 'Select settlement and damaged structure'
    }
  ],

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
});
