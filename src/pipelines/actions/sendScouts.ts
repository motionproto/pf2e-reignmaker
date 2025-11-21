/**
 * Send Scouts Action Pipeline
 *
 * Learn about unexplored hexes.
 * Converted from data/player-actions/send-scouts.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { sendScoutsExecution } from '../../execution/territory/sendScouts';
import { worldExplorerService } from '../../services/WorldExplorerService';
import { getNeighborHexIds } from '../../services/pathfinding/coordinates';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';
import { applyActionCost } from '../shared/applyActionCost';

export const sendScoutsPipeline: CheckPipeline = {
  id: 'send-scouts',
  name: 'Send Scouts',
  description: 'Dispatch explorers to gather intelligence about neighboring territories and potential threats',
  checkType: 'action',
  category: 'expand-borders',

  cost: {
    gold: 1
  },

  skills: [
    { skill: 'stealth', description: 'covert reconnaissance' },
    { skill: 'survival', description: 'wilderness expertise' },
    { skill: 'nature', description: 'read the land' },
    { skill: 'society', description: 'gather local information' },
    { skill: 'athletics', description: 'rapid exploration' },
    { skill: 'acrobatics', description: 'navigate obstacles' }
  ],

  // Post-apply: Select hexes to scout based on outcome (AFTER Apply button clicked)
  postApplyInteractions: [
    {
      type: 'map-selection',
      id: 'selectedHexes',
      mode: 'hex-selection',
      colorType: 'scout',
      validation: (hexId: string) => {
        // Only allow selection of hexes that are:
        // 1. NOT already revealed
        // 2. Adjacent to at least one revealed hex
        if (worldExplorerService.isAvailable()) {
          const isRevealed = worldExplorerService.isRevealed(hexId);
          
          // Can't select already-revealed hexes
          if (isRevealed) {
            return {
              valid: false,
              message: 'This hex has already been scouted'
            };
          }
          
          // Must be adjacent to at least one revealed hex
          const adjacentHexes = getNeighborHexIds(hexId);
          const hasRevealedAdjacent = adjacentHexes.some((adjId: string) => 
            worldExplorerService.isRevealed(adjId)
          );
          
          if (!hasRevealedAdjacent) {
            return {
              valid: false,
              message: 'Can only scout hexes adjacent to revealed territory'
            };
          }
          
          return { valid: true };
        }
        return { valid: true };  // If World Explorer not available, allow any hex
      },
      // Outcome-based adjustments
      outcomeAdjustment: {
        criticalSuccess: {
          count: 2,
          title: 'Select 2 hexes to scout'
        },
        success: {
          count: 1,
          title: 'Select 1 hex to scout'
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
      description: 'The scouts return with detailed information.',
      modifiers: []
    },
    success: {
      description: 'The scouts return with information.',
      modifiers: []
    },
    failure: {
      description: 'The scouts find nothing.',
      modifiers: []
    },
    criticalFailure: {
      description: 'The scouts are lost.',
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
    // Deduct cost first (regardless of outcome - action was attempted)
    await applyActionCost(sendScoutsPipeline);
    
    switch (ctx.outcome) {
      case 'criticalSuccess':
      case 'success':
        // Read hex selections from resolutionData (populated by postApplyInteractions)
        const hexIds = ctx.resolutionData.compoundData?.selectedHexes;
        if (!hexIds || hexIds.length === 0) {
          return { success: false, error: 'No hexes selected' };
        }
        await sendScoutsExecution(hexIds);
        return { success: true };
        
      case 'failure':
        // Explicitly do nothing (no modifiers defined)
        return { success: true };
        
      case 'criticalFailure':
        // Explicitly apply +1 unrest modifier from pipeline
        await applyPipelineModifiers(sendScoutsPipeline, ctx.outcome);
        return { success: true };
        
      default:
        return { success: false, error: `Unexpected outcome: ${ctx.outcome}` };
    }
  }
};
