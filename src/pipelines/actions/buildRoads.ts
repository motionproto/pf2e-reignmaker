/**
 * Build Roads Action Pipeline
 *
 * Connect territory with infrastructure.
 * Converted from data/player-actions/build-roads.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { buildRoadsExecution } from '../../execution/territory/buildRoads';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';
import { applyActionCost } from '../shared/applyActionCost';

export const buildRoadsPipeline: CheckPipeline = {
  id: 'build-roads',
  name: 'Build Roads',
  description: 'Construct pathways between settlements to improve trade, travel, and military movement. Roads must be built in claimed territory.',
  checkType: 'action',
  category: 'expand-borders',

  cost: {
    lumber: 1,  // JSON says "wood" but resource system uses "lumber"
    stone: 1
  },

  skills: [
    { skill: 'crafting', description: 'engineering expertise' },
    { skill: 'survival', description: 'pathfinding routes' },
    { skill: 'athletics', description: 'manual labor' },
    { skill: 'nature', description: 'work with terrain' }
  ],

  // Post-apply: Select hexes for roads based on outcome (AFTER Apply button clicked)
  postApplyInteractions: [
    {
      type: 'map-selection',
      id: 'selectedHexes',
      mode: 'hex-selection',
      colorType: 'road',
      validation: async (hexId: string, pendingHexes: string[]) => {
        // Import validator at runtime to avoid circular dependencies
        const { validateRoadHex } = await import('../shared/roadValidator');
        return validateRoadHex(hexId, pendingHexes);
      },
      // ✅ Execute road building when user completes hex selection
      onComplete: async (selectedHexIds: string[]) => {
        console.log(`🛣️ [buildRoads] Building roads on ${selectedHexIds.length} hex(es)`);
        await buildRoadsExecution(selectedHexIds);
      },
      // Outcome-based adjustments
      outcomeAdjustment: {
        criticalSuccess: {
          // ✅ DYNAMIC COUNT: Based on actor's proficiency rank
          count: (ctx) => {
            const proficiency = ctx.actor?.proficiencyRank || 0;
            // Convert proficiency rank to number of road segments
            // Critical success always gives at least 2 segments
            // 0 = untrained (2 segments - minimum)
            // 1 = trained (2 segments - minimum)
            // 2 = expert (2 segments)
            // 3 = master (3 segments)
            // 4 = legendary (4 segments)
            return Math.max(2, proficiency);
          },
          title: 'Select road segments to build (count based on proficiency)'
        },
        success: {
          count: 1,
          title: 'Select 1 hex for road segment'
        },
        failure: {
          count: 0  // No interaction on failure
        },
        criticalFailure: {
          count: 0  // No interaction on critical failure
        }
      },
      // Condition: only show for success/criticalSuccess
      condition: (ctx: any) => {
        return ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess';
      }
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
    providedByInteraction: true,  // Map selection shows roads in real-time
    calculate: (ctx) => {
      const resources = [];
      
      // Show resource costs for all outcomes
      resources.push({ resource: 'lumber', value: -1 });
      resources.push({ resource: 'stone', value: -1 });
      
      // Show unrest on critical failure
      if (ctx.outcome === 'criticalFailure') {
        resources.push({ resource: 'unrest', value: 1 });
      }
      
      return {
        resources,
        specialEffects: [],
        warnings: []
      };
    }
  },

  // Execute function - explicitly handles ALL outcomes
  execute: async (ctx) => {
    switch (ctx.outcome) {
      case 'criticalSuccess':
      case 'success':
        // Check if user actually selected hexes (didn't cancel)
        const selectedHexes = ctx.resolutionData?.compoundData?.selectedHexes;
        if (!selectedHexes || selectedHexes.length === 0) {
          console.log('⏭️ [buildRoads] User cancelled hex selection, skipping execution gracefully');
          return { success: true };  // ✅ Graceful cancellation - no error thrown
        }
        
        // User completed hex selection - deduct costs
        await applyActionCost(buildRoadsPipeline);
        
        // Road building handled by postApplyInteractions onComplete handler
        return { success: true };
        
      case 'failure':
        // Deduct costs even on failure (action was attempted)
        await applyActionCost(buildRoadsPipeline);
        return { success: true };
        
      case 'criticalFailure':
        // Deduct costs and apply +1 unrest modifier
        await applyActionCost(buildRoadsPipeline);
        await applyPipelineModifiers(buildRoadsPipeline, ctx.outcome);
        return { success: true };
        
      default:
        return { success: false, error: `Unexpected outcome: ${ctx.outcome}` };
    }
  }
};
