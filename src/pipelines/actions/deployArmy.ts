/**
 * deployArmy Action Pipeline
 * Data from: data/player-actions/deploy-army.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';

import { textBadge } from '../../types/OutcomeBadge';
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
    calculate: (ctx) => {
      const path = ctx.metadata.path || [];
      const finalHex = path.length > 0 ? path[path.length - 1] : 'unknown';

      const resources = ctx.outcome === 'criticalFailure' ? [{ resource: 'unrest', value: 1 }] : [];

      const outcomeBadges = [
        textBadge(`Will deploy ${ctx.metadata.armyName || 'army'} to ${finalHex}`, 'fa-flag', 'positive')
      ];

      if (ctx.outcome === 'criticalSuccess') {
        outcomeBadges.push(textBadge('Army gains combat bonuses', 'fa-star', 'positive'));
      } else if (ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure') {
        outcomeBadges.push(textBadge('Army arrives with penalties', 'fa-exclamation-triangle', 'negative'));
      }

      return { resources, outcomeBadges, warnings: [] };
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
