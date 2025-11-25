/**
 * deployArmy Action Pipeline
 * Data from: data/player-actions/deploy-army.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';
import { textBadge } from '../../types/OutcomeBadge';

// Store reference for execute function
const pipeline = createActionPipeline('deploy-army', {
  requirements: (kingdom) => {
    // Check if there are any armies at all
    if (!kingdom.armies || kingdom.armies.length === 0) {
      return {
        met: false,
        reason: 'No armies available'
      };
    }
    
    // Check if all armies have already been deployed this turn
    const deployedArmyIds = kingdom.turnState?.actionsPhase?.deployedArmyIds || [];
    if (deployedArmyIds.length >= kingdom.armies.length) {
      return {
        met: false,
        reason: 'All armies have already moved this turn'
      };
    }
    
    return { met: true };
  },

  preRollInteractions: [
    {
      type: 'map-selection',
      id: 'deployment',
      mode: 'hex-path',
      colorType: 'movement'
    }
  ],

  preview: {
    calculate: (ctx) => {
      const deployment = ctx.metadata.deployment || {};
      const path = deployment.path || [];
      const finalHex = path.length > 0 ? path[path.length - 1] : 'unknown';
      const armyName = deployment.armyName || ctx.metadata.armyName || 'army';

      const resources = ctx.outcome === 'criticalFailure' ? [{ resource: 'unrest', value: 1 }] : [];

      const outcomeBadges = [
        textBadge(`Will deploy ${armyName} to ${finalHex}`, 'fa-flag', 'positive')
      ];

      if (ctx.outcome === 'criticalSuccess') {
        outcomeBadges.push(textBadge('Army gains combat bonuses', 'fa-star', 'positive'));
      } else if (ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure') {
        outcomeBadges.push(textBadge('Army arrives with penalties', 'fa-exclamation-triangle', 'negative'));
      }

      return { resources, outcomeBadges, warnings: [] };
    }
  },

  execute: async (ctx: any) => {
    // Apply modifiers (unrest changes) from JSON outcomes first
    await applyPipelineModifiers(pipeline, ctx.outcome);

    const conditionsToApply = ctx.outcome === 'criticalSuccess' ?
      ['+1 initiative (status bonus)', '+1 saving throws (status bonus)', '+1 attack (status bonus)'] :
      ctx.outcome === 'failure' ?
      ['-1 initiative (status penalty)', 'fatigued'] :
      ctx.outcome === 'criticalFailure' ?
      ['-2 initiative (status penalty)', 'enfeebled 1', 'fatigued'] :
      [];

    // Get deployment data from metadata
    const deployment = ctx.metadata.deployment || {};
    const armyId = deployment.armyId || ctx.metadata.armyId;
    const path = deployment.path || ctx.metadata.path || [];
    
    if (!armyId || !path || path.length === 0) {
      return { success: false, error: 'Missing army or path data' };
    }
    
    // Use execution function directly (deployArmyExecution handles everything)
    const { deployArmyExecution } = await import('../../execution/armies/deployArmy');
    
    await deployArmyExecution({
      armyId: armyId,
      path: path,
      conditionsToApply,
      animationSpeed: 100
    });
    
    return { success: true, message: 'Army deployed' };
  }
});

export const deployArmyPipeline = pipeline;
