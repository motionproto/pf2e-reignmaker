/**
 * Disband Army Action Pipeline
 * Decommission troops and return soldiers home
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { textBadge } from '../../types/OutcomeBadge';
import { disbandArmyExecution } from '../../execution/armies/disbandArmy';
import { PLAYER_KINGDOM } from '../../types/ownership';

export const disbandArmyPipeline: CheckPipeline = {
  // === BASE DATA ===
  id: 'disband-army',
  name: 'Disband Army',
  description: 'Release military units from service, returning soldiers to civilian life',
  brief: 'Decommission troops and return soldiers home',
  category: 'military-operations',
  checkType: 'action',

  skills: [
    { skill: 'intimidation', description: 'stern dismissal' },
    { skill: 'diplomacy', description: 'honorable discharge' },
    { skill: 'society', description: 'reintegration programs' },
    { skill: 'performance', description: 'farewell ceremony' }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'The people welcome them home with honor.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -2, duration: 'immediate' }
      ]
    },
    success: {
      description: 'The army is disbanded smoothly.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The army is disbanded.',
      modifiers: []
    },
    criticalFailure: {
      description: 'The disbandment causes unrest.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    }
  },

  // === TYPESCRIPT LOGIC ===
  requirements: (kingdom) => {
    const playerArmies = kingdom.armies.filter((army: any) => army.ledBy === PLAYER_KINGDOM);
    
    if (playerArmies.length === 0) {
      return {
        met: false,
        reason: 'No player armies to disband'
      };
    }
    return { met: true };
  },

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
      condition: () => true,
      component: 'DisbandArmyResolution',
      componentProps: {
        show: true
      },
      onComplete: async (data: any, ctx: any) => {
        ctx.resolutionData = ctx.resolutionData || {};
        ctx.resolutionData.customComponentData = ctx.resolutionData.customComponentData || {};
        ctx.resolutionData.customComponentData['disband-army-resolution'] = data;
      }
    }
  ],

  execute: async (ctx: any) => {
    const disbandData = ctx.resolutionData?.customComponentData?.['disband-army-resolution'];
    
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

    if (!armyId) {
      return { success: false, error: 'No army selected' };
    }

    await disbandArmyExecution(armyId, deleteActor);
    return { success: true, message: `Successfully disbanded ${armyName || 'army'}` };
  }
};
