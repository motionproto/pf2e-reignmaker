/**
 * Train Army Action Pipeline
 * Improve unit levels up to party level
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { textBadge } from '../../types/OutcomeBadge';
import { getPartyLevel } from '../shared/ActionHelpers';
import { trainArmyExecution } from '../../execution/armies/trainArmy';

export const trainArmyPipeline: CheckPipeline = {
  // === BASE DATA ===
  id: 'train-army',
  name: 'Train Army',
  description: 'Drill your troops in tactics and discipline to improve their combat effectiveness through various training methods',
  brief: 'Improve unit levels up to party level',
  category: 'military-operations',
  checkType: 'action',

  skills: [
    { skill: 'intimidation', description: 'harsh discipline' },
    { skill: 'athletics', description: 'physical conditioning' },
    { skill: 'acrobatics', description: 'agility training' },
    { skill: 'survival', description: 'endurance exercises' }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'The troops train exceptionally well.',
      modifiers: [],
      outcomeBadges: [
        textBadge('Army gains +2 proficiency', 'fa-graduation-cap', 'positive')
      ],
      manualEffects: ['Well trained: +1 to all saving throws']
    },
    success: {
      description: 'The troops train well.',
      modifiers: []
    },
    failure: {
      description: 'Your army does not improve.',
      modifiers: []
    },
    criticalFailure: {
      description: 'The training goes poorly.',
      modifiers: []
    }
  },

  // === TYPESCRIPT LOGIC ===
  requirements: (kingdom) => {
    if (!kingdom.armies || kingdom.armies.length === 0) {
      return {
        met: false,
        reason: 'No armies available'
      };
    }
    
    const partyLevel = getPartyLevel();
    
    const armiesBelowLevel = kingdom.armies.filter((army: any) => army.level < partyLevel);
    
    if (armiesBelowLevel.length === 0) {
      return {
        met: false,
        reason: `All armies are already at party level (${partyLevel})`
      };
    }
    
    return { met: true };
  },

  preview: {
    calculate: (ctx) => {
      const partyLevel = getPartyLevel();
      const outcomeBadges = [];

      if (ctx.outcome === 'criticalSuccess') {
        outcomeBadges.push(textBadge(`Train army to party level ${partyLevel}`, 'fa-shield-alt', 'positive'));
        outcomeBadges.push(textBadge('Well trained: +1 to all saving throws', 'fa-star', 'positive'));
      } else if (ctx.outcome === 'success') {
        outcomeBadges.push(textBadge(`Train army to party level ${partyLevel}`, 'fa-shield-alt', 'positive'));
      } else if (ctx.outcome === 'criticalFailure') {
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
        ctx.resolutionData = ctx.resolutionData || {};
        ctx.resolutionData.customComponentData = ctx.resolutionData.customComponentData || {};
        ctx.resolutionData.customComponentData['train-army-resolution'] = data;
      }
    }
  ],

  execute: async (ctx: any) => {
    const trainData = ctx.resolutionData?.customComponentData?.['train-army-resolution'];
    
    if (!trainData) {
      return { 
        success: true, 
        message: 'Army training cancelled - no training was applied',
        cancelled: true 
      };
    }

    const armyId = trainData.armyId;
    const armyName = trainData.armyName;

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
};
