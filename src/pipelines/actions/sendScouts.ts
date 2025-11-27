/**
 * sendScouts Action Pipeline
 * Data from: data/player-actions/send-scouts.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';
import { applyActionCost } from '../shared/applyActionCost';
import { sendScoutsExecution } from '../../execution/territory/sendScouts';
import { worldExplorerService } from '../../services/WorldExplorerService';
import {
  validateUnexplored,
  validateNotPending,
  validateAdjacentToExplored,
  safeValidation,
  type ValidationResult
} from '../shared/hexValidators';

export const sendScoutsPipeline = createActionPipeline('send-scouts', {
  requirements: (kingdom) => {
    // Check 1: World Explorer availability
    if (!worldExplorerService.isAvailable()) {
      return { 
        met: false, 
        reason: 'World Explorer module is not active on this scene' 
      };
    }

    // Check 2: Resource cost
    const goldCost = 1;
    const currentGold = kingdom.resources?.gold || 0;
    if (currentGold < goldCost) {
      return { met: false, reason: `Requires 1 Gold (have ${currentGold})` };
    }
    return { met: true };
  },

  preview: {
    calculate: async (ctx) => {
      // Preview shows gold cost deduction
      return {
        resources: [
          {
            resource: 'gold',
            change: -1,
            reason: 'Scout expedition cost'
          }
        ],
        outcomeBadges: []
      };
    }
  },

  postApplyInteractions: [
    {
      type: 'map-selection',
      id: 'selectedHexes',
      mode: 'hex-selection',
      count: 1,  // Default count (used for success)
      colorType: 'scout',
      condition: (ctx) => ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess',
      validateHex: (hexId: string, pendingSelections: string[] = []): ValidationResult => {
        return safeValidation(() => {
          // Check 1: Cannot select already-revealed hex
          const unexploredResult = validateUnexplored(hexId);
          if (!unexploredResult.valid) return unexploredResult;
          
          // Check 2: Cannot already be selected as pending
          const notPendingResult = validateNotPending(hexId, pendingSelections);
          if (!notPendingResult.valid) return notPendingResult;

          // Check 3: Must be adjacent to explored hex or pending selection
          const adjacencyResult = validateAdjacentToExplored(hexId, pendingSelections);
          if (!adjacencyResult.valid) return adjacencyResult;
          
          return { valid: true };
        }, hexId, 'sendScouts validation');
      },
      outcomeAdjustment: {
        criticalSuccess: { 
          count: 2,
          title: 'Select 2 hexes to scout (Critical Success)'
        },
        success: { 
          count: 1, 
          title: 'Select 1 hex to scout' 
        },
        failure: { count: 0 },  // No hexes on failure
        criticalFailure: { count: 0 }  // No hexes on critical failure
      }
    }
  ],

  execute: async (ctx) => {
    // Deduct cost first (regardless of outcome - action was attempted)
    await applyActionCost(sendScoutsPipeline);
    
    switch (ctx.outcome) {
      case 'criticalSuccess':
      case 'success':
        // Read hex selections from resolutionData (populated by postApplyInteractions)
        const hexIds = ctx.resolutionData.compoundData?.selectedHexes;
        
        // Handle cancellation gracefully (user cancelled hex selection)
        if (!hexIds || hexIds.length === 0) {
          return { 
            success: true, 
            message: 'Action cancelled - no hexes selected',
            cancelled: true 
          };
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
});
