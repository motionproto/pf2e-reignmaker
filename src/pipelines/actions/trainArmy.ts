/**
 * trainArmy Action Pipeline
 * Data from: data/player-actions/train-army.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';
import { textBadge } from '../../types/OutcomeBadge';
import { getPartyLevel } from '../shared/ActionHelpers';
import { trainArmyExecution } from '../../execution/armies/trainArmy';

export const trainArmyPipeline = createActionPipeline('train-army', {
  requirements: (kingdom) => {
    // Check if there are any armies at all
    if (!kingdom.armies || kingdom.armies.length === 0) {
      return {
        met: false,
        reason: 'No armies available'
      };
    }
    
    // ✅ FIX: Always recalculate party level from game actors (don't use stale stored value)
    // This ensures requirements check is always up-to-date even if hook hasn't synced yet
    const partyLevel = getPartyLevel();
    
    // Check if any army is below party level
    const armiesBelowLevel = kingdom.armies.filter((army: any) => army.level < partyLevel);
    
    if (armiesBelowLevel.length === 0) {
      return {
        met: false,
        reason: `All armies are already at party level (${partyLevel})`
      };
    }
    
    return { met: true };
  },

  // No pre-roll interactions - army selection happens post-roll

  preview: {
    calculate: (ctx) => {
      const partyLevel = getPartyLevel();
      const outcomeBadges = [];

      if (ctx.outcome === 'criticalSuccess') {
        // Badge 1: Train army to party level
        outcomeBadges.push(textBadge(`Train army to party level ${partyLevel}`, 'fa-shield-alt', 'positive'));
        // Badge 2: Well trained effect
        outcomeBadges.push(textBadge('Well trained: +1 to all saving throws', 'fa-star', 'positive'));
      } else if (ctx.outcome === 'success') {
        // Train army to party level
        outcomeBadges.push(textBadge(`Train army to party level ${partyLevel}`, 'fa-shield-alt', 'positive'));
      } else if (ctx.outcome === 'failure') {
        // No badge - no game effect
      } else if (ctx.outcome === 'criticalFailure') {
        // Poorly trained effect
        outcomeBadges.push(textBadge('Poorly trained: -1 to all saves', 'fa-exclamation-triangle', 'negative'));
      }

      return { resources: [], outcomeBadges, warnings: [] };
    }
  },

  postApplyInteractions: [
    {
      type: 'configuration',
      id: 'train-army-resolution',
      condition: (ctx: any) => ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess' || ctx.outcome === 'criticalFailure',
      component: 'TrainArmyResolution',
      componentProps: {
        show: true
      },
      onComplete: async (data: any, ctx: any) => {
        // Store army selection for execute step
        ctx.resolutionData = ctx.resolutionData || {};
        ctx.resolutionData.customComponentData = ctx.resolutionData.customComponentData || {};
        ctx.resolutionData.customComponentData['train-army-resolution'] = data;
      }
    }
  ],

  execute: async (ctx: any) => {
    // Get army selection from postApplyInteractions resolution
    const trainData = ctx.resolutionData?.customComponentData?.['train-army-resolution'];
    
    // Handle cancellation gracefully (user cancelled selection)
    if (!trainData) {
      return { 
        success: true, 
        message: 'Army training cancelled - no training was applied',
        cancelled: true 
      };
    }

    const armyId = trainData.armyId;
    const armyName = trainData.armyName;

    // Validate selection
    if (!armyId) {
      return { success: false, error: 'No army selected' };
    }

    const partyLevel = getPartyLevel();
    await trainArmyExecution(armyId, partyLevel, ctx.outcome);
    
    if (ctx.outcome === 'criticalFailure') {
      return { success: true, message: `Applied Poorly Trained effect to ${armyName || 'army'}` };
    } else {
      return { success: true, message: `Successfully trained ${armyName || 'army'} to level ${partyLevel}` };
    }
  }
});
