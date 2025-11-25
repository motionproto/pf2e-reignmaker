/**
 * disbandArmy Action Pipeline
 * Data from: data/player-actions/disband-army.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';
import { textBadge } from '../../types/OutcomeBadge';
import { disbandArmyExecution } from '../../execution/armies/disbandArmy';
import { PLAYER_KINGDOM } from '../../types/ownership';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

// Store reference for execute function
const disbandArmyPipelineInternal = createActionPipeline('disband-army', {
  requirements: (kingdom) => {
    // Filter to only player-led armies
    const playerArmies = kingdom.armies.filter((army: any) => army.ledBy === PLAYER_KINGDOM);
    
    if (playerArmies.length === 0) {
      return {
        met: false,
        reason: 'No player armies to disband'
      };
    }
    return { met: true };
  },

  // No pre-roll interactions - army selection happens post-roll

  preview: {
    calculate: (ctx) => {
      const unrestChange = ctx.outcome === 'criticalSuccess' ? -2 :
                          ctx.outcome === 'success' ? -1 :
                          ctx.outcome === 'criticalFailure' ? 1 : 0;

      return {
        resources: unrestChange !== 0 ? [{ resource: 'unrest', value: unrestChange }] : [],
        outcomeBadges: [
          textBadge('Will disband selected army', 'fa-times-circle', 'negative')
        ],
        warnings: []
      };
    }
  },

  postApplyInteractions: [
    {
      type: 'configuration',
      id: 'disband-army-resolution',
      condition: () => true, // Always show for all outcomes
      component: 'DisbandArmyResolution',
      componentProps: {
        show: true
      },
      onComplete: async (data: any, ctx: any) => {
        // Store army selection and deleteActor choice for execute step
        ctx.resolutionData = ctx.resolutionData || {};
        ctx.resolutionData.customComponentData = ctx.resolutionData.customComponentData || {};
        ctx.resolutionData.customComponentData['disband-army-resolution'] = data;
      }
    }
  ],

  execute: async (ctx: any) => {
    // Get army selection and deleteActor choice from postApplyInteractions resolution
    const disbandData = ctx.resolutionData?.customComponentData?.['disband-army-resolution'];
    
    // Handle cancellation gracefully (user cancelled selection)
    if (!disbandData) {
      return { 
        success: true, 
        message: 'Army disbanding cancelled - no army was disbanded',
        cancelled: true 
      };
    }

    const armyId = disbandData.armyId;
    const armyName = disbandData.armyName;
    const deleteActor = disbandData.deleteActor ?? true;

    // Validate selection
    if (!armyId) {
      return { success: false, error: 'No army selected' };
    }

    // Apply modifiers (unrest changes) from JSON outcomes
    await applyPipelineModifiers(disbandArmyPipelineInternal, ctx.outcome);

    // Disband the army
    await disbandArmyExecution(armyId, deleteActor);
    return { success: true, message: `Successfully disbanded ${armyName || 'army'}` };
  }
});

export const disbandArmyPipeline = disbandArmyPipelineInternal;
