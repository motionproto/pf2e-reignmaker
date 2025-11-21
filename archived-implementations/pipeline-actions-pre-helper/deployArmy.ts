/**
 * deployArmy Action Pipeline
 * Data from: data/player-actions/deploy-army.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';

export const deployArmyPipeline = createActionPipeline('deploy-army', {
  requirements: (kingdom) => {
    if (kingdom.armies.length === 0) {
      return {
        met: false,
        reason: 'No armies available'
      };
    }
    return { met: true };
  },

  preRollInteractions: [
    {
      type: 'entity-selection',
      id: 'armyId',
      label: 'Select army to deploy',
      entityType: 'army'
    },
    {
      type: 'map-selection',
      id: 'path',
      mode: 'hex-path',
      colorType: 'movement'
    }
  ],

  preview: {
    providedByInteraction: true,
    calculate: (ctx) => {
      const path = ctx.metadata.path || [];
      const finalHex = path.length > 0 ? path[path.length - 1] : 'unknown';

      const resources = ctx.outcome === 'criticalFailure' ? [{ resource: 'unrest', value: 1 }] : [];

      const specialEffects = [{
        type: 'status' as const,
        message: `Will deploy ${ctx.metadata.armyName || 'army'} to ${finalHex}`,
        variant: 'positive' as const
      }];

      if (ctx.outcome === 'criticalSuccess') {
        specialEffects.push({
          type: 'status' as const,
          message: 'Army gains combat bonuses',
          variant: 'positive' as const
        });
      } else if (ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure') {
        specialEffects.push({
          type: 'status' as const,
          message: 'Army arrives with penalties',
          variant: 'negative' as const
        });
      }

      return { resources, specialEffects, warnings: [] };
    }
  },

  execute: async (ctx) => {
    const conditionsToApply = ctx.outcome === 'criticalSuccess' ?
      ['+1 initiative (status bonus)', '+1 saving throws (status bonus)', '+1 attack (status bonus)'] :
      ctx.outcome === 'failure' ?
      ['-1 initiative (status penalty)', 'fatigued'] :
      ctx.outcome === 'criticalFailure' ?
      ['-2 initiative (status penalty)', 'enfeebled 1', 'fatigued'] :
      [];

    await deployArmyExecution({
      armyId: ctx.metadata.armyId,
      path: ctx.metadata.path || [],
      conditionsToApply,
      animationSpeed: 100
    });
    return { success: true, message: 'Army deployed' };
  }
});
