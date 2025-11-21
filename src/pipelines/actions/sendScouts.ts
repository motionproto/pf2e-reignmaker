/**
 * sendScouts Action Pipeline
 * Data from: data/player-actions/send-scouts.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

export const sendScoutsPipeline = createActionPipeline('send-scouts', {
  requirements: (kingdom) => {
    const goldCost = 1;
    const currentGold = kingdom.resources?.gold || 0;
    if (currentGold < goldCost) {
      return { met: false, reason: `Requires 1 Gold (have ${currentGold})` };
    }
    return { met: true };
  },

  preview: {
  },

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
});
