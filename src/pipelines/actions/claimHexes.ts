/**
 * Claim Hexes Action Pipeline
 *
 * Expand kingdom borders by claiming adjacent wilderness hexes.
 * Converted from data/player-actions/claim-hexes.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { claimHexesExecution } from '../../execution/territory/claimHexes';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

export const claimHexesPipeline: CheckPipeline = {
  id: 'claim-hexes',
  name: 'Claim Hexes',
  description: 'Expand your kingdom\'s borders by claiming adjacent wilderness hexes through surveying, settlement, and administrative control. Hexes must be adjacent to controlled territory.',
  checkType: 'action',
  category: 'expand-borders',

  skills: [
    { skill: 'survival', description: 'wilderness expertise' },
    { skill: 'society', description: 'administrative control' }
  ],

  // Post-apply: Select hexes based on outcome (AFTER Apply button clicked)
  postApplyInteractions: [
    {
      type: 'map-selection',
      id: 'selectedHexes',
      mode: 'hex-selection',
      colorType: 'claimed',
      validation: (hex: any) => {
        // Must be adjacent to existing kingdom territory
        return true;  // Validation logic in hex selector
      },
      // Outcome-based adjustments
      outcomeAdjustment: {
        criticalSuccess: {
          // ✅ DYNAMIC COUNT: Based on actor's proficiency rank
          count: (ctx) => {
            const proficiency = ctx.actor?.proficiencyRank || 0;
            // Untrained/Trained (0-1) = 2 hexes
            // Expert (2) = 3 hexes
            // Master/Legendary (3-4) = 4 hexes
            return proficiency >= 3 ? 4 : proficiency >= 2 ? 3 : 2;
          },
          title: 'Select hexes to claim (count based on proficiency)'
        },
        success: {
          count: 1,
          title: 'Select 1 hex to claim'
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
      description: 'Your kingdom expands rapidly.',
      modifiers: []
    },
    success: {
      description: 'Your kingdom expands.',
      modifiers: []
    },
    failure: {
      description: 'The expansion fails.',
      modifiers: []
    },
    criticalFailure: {
      description: 'The expansion attempt backfires.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    }
  },

  preview: {
    providedByInteraction: true  // Map selection shows hexes in real-time
  },

  // Execute function - explicitly handles ALL outcomes
  execute: async (ctx) => {
    switch (ctx.outcome) {
      case 'criticalSuccess':
      case 'success':
        // Explicit hex selection and claiming logic
        const hexIds = ctx.resolutionData.compoundData?.selectedHexes;
        if (!hexIds || hexIds.length === 0) {
          return { success: false, error: 'No hexes selected' };
        }
        await claimHexesExecution(hexIds);
        return { success: true };
        
      case 'failure':
        // Explicitly do nothing for failure (no modifiers defined)
        return { success: true };
        
      case 'criticalFailure':
        // Explicitly apply +1 unrest modifier from pipeline
        await applyPipelineModifiers(claimHexesPipeline, ctx.outcome);
        return { success: true };
        
      default:
        return { success: false, error: `Unexpected outcome: ${ctx.outcome}` };
    }
  }
};
