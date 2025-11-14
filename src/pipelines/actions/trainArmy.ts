/**
 * Train Army Action Pipeline
 *
 * Improve unit levels up to party level.
 * Converted from data/player-actions/train-army.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { trainArmyExecution } from '../../execution/armies/trainArmy';
import { getPartyLevel } from '../../services/commands/armies/armyCommands';

export const trainArmyPipeline: CheckPipeline = {
  id: 'train-army',
  name: 'Train Army',
  description: 'Drill your troops in tactics and discipline to improve their combat effectiveness through various training methods',
  checkType: 'action',
  category: 'military-operations',

  skills: [
    { skill: 'intimidation', description: 'harsh discipline' },
    { skill: 'athletics', description: 'physical conditioning' },
    { skill: 'acrobatics', description: 'agility training' },
    { skill: 'survival', description: 'endurance exercises' }
  ],

  // Pre-roll: Select army to train
  preRollInteractions: [
    {
      type: 'entity-selection',
      id: 'armyId',
      label: 'Select army to train',
      entityType: 'army'
    }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'The troops train exceptionally well.',
      modifiers: [],
      manualEffects: ['+2 to attack rolls and AC for 1 month']
    },
    success: {
      description: 'The troops train well.',
      modifiers: [],
      manualEffects: ['+1 to attack rolls for 1 month']
    },
    failure: {
      description: 'Your army does not improve.',
      modifiers: [],
      manualEffects: []
    },
    criticalFailure: {
      description: 'The training goes poorly.',
      modifiers: [],
      manualEffects: []
    }
  },

  preview: {
    calculate: (ctx) => {
      const partyLevel = getPartyLevel();
      const specialEffects = [];

      specialEffects.push({
        type: 'entity' as const,
        message: `Will train ${ctx.metadata.armyName || 'army'} to level ${partyLevel}`,
        variant: 'positive' as const
      });

      if (ctx.outcome === 'criticalSuccess') {
        specialEffects.push({
          type: 'status' as const,
          message: 'Elite Training: +2 attack/AC for 1 month',
          variant: 'positive' as const
        });
      } else if (ctx.outcome === 'success') {
        specialEffects.push({
          type: 'status' as const,
          message: 'Standard Training: +1 attack for 1 month',
          variant: 'positive' as const
        });
      }

      return { resources: [], specialEffects, warnings: [] };
    }
  },

  execute: async (ctx) => {
    const partyLevel = getPartyLevel();
    await trainArmyExecution(ctx.metadata.armyId, partyLevel, ctx.outcome);
  }
};
