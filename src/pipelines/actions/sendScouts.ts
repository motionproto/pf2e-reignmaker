/**
 * sendScouts Action Pipeline
 * Data from: data/player-actions/send-scouts.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';
import { applyActionCost } from '../shared/applyActionCost';
import { sendScoutsExecution } from '../../execution/territory/sendScouts';
import { worldExplorerService } from '../../services/WorldExplorerService';
import { getAdjacentHexes } from '../../utils/hexUtils';

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
        specialEffects: []
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
      validation: (hexId: string, pendingSelections: string[] = []) => {
        // Check 1: Cannot select already-revealed hex
        if (worldExplorerService.isAvailable()) {
          const isRevealed = worldExplorerService.isRevealed(hexId);
          if (isRevealed === true) {
            return {
              valid: false,
              message: 'This hex has already been explored'
            };
          }
        }
        
        // Check 2: Cannot already be selected as pending
        if (pendingSelections.includes(hexId)) {
          return {
            valid: false,
            message: 'This hex is already selected'
          };
        }

        // Check 3: Must be adjacent to explored hex or pending selection
        if (worldExplorerService.isAvailable()) {
          const [i, j] = hexId.split('.').map(Number);
          const neighbors = getAdjacentHexes(i, j);
          
          const isAdjacentToValid = neighbors.some(neighbor => {
            const neighborId = `${neighbor.i}.${neighbor.j}`;
            
            // Valid if neighbor is already explored
            if (worldExplorerService.isRevealed(neighborId)) return true;
            
            // Valid if neighbor is being explored in this action
            if (pendingSelections.includes(neighborId)) return true;
            
            return false;
          });

          if (!isAdjacentToValid) {
            return {
              valid: false,
              message: 'Must be adjacent to explored territory or other scouts'
            };
          }
        }
        
        return { valid: true };
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
