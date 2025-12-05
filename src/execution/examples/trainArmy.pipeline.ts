/**
 * Example Pipeline Configuration: Train Army
 *
 * This demonstrates how to create an action pipeline with:
 * - Pre-roll interaction (entity selection)
 * - Game command execution
 * - Preview calculation showing training effects
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { PreviewData } from '../../types/PreviewData';
import { trainArmyExecution } from '../armies/trainArmy';
import { getPartyLevel } from '../../services/commands/armies/armyCommands';

/**
 * Train Army Action Pipeline
 *
 * Action with:
 * - Pre-roll: Select army to train
 * - Game command: trainArmy
 * - Preview: Show level up + training bonuses
 */
export const trainArmyPipeline: CheckPipeline = {
  // Identity
  id: 'train-army',
  name: 'Train Army',
  description: 'Improve an army\'s combat effectiveness',
  checkType: 'action',
  category: 'warfare',

  // Skills
  skills: [
    { skill: 'warfare', description: 'military training' }
  ],

  // Pre-roll: Select army to train
  preRollInteractions: [
    {
      type: 'entity-selection',
      id: 'armyId',
      label: 'Select Army to Train',
      entityType: 'army'
    }
  ],

  // Outcomes with different training bonuses
  outcomes: {
    criticalSuccess: {
      description: 'Elite Training',
      modifiers: [],  // Effects applied via game command
      manualEffects: ['+2 to attack rolls and AC for 1 month']
    },
    success: {
      description: 'Standard Training',
      modifiers: [],
      manualEffects: ['+1 to attack rolls for 1 month']
    },
    failure: {
      description: 'Training Ineffective',
      modifiers: [],
      manualEffects: ['No bonus effects']
    },
    criticalFailure: {
      description: 'Training Accident',
      modifiers: [],
      manualEffects: ['No bonus effects']
    }
  },

  // Preview
  preview: {
    calculate: (ctx) => {
      const partyLevel = getPartyLevel();

      const preview: PreviewData = {
        resources: [],
        entities: [{
          type: 'army',
          name: ctx.metadata.armyName || 'Selected Army',
          action: 'modify',
          details: `Will train to level ${partyLevel}`
        }],
        outcomeBadges: [],
        warnings: []
      };

      // Add training bonus preview based on outcome
      if (ctx.outcome === 'criticalSuccess') {
        preview.outcomeBadges!.push({
          icon: 'fa-star',
          template: 'Elite Training: +2 attack/AC for 1 month',
          variant: 'positive'
        });
      } else if (ctx.outcome === 'success') {
        preview.outcomeBadges!.push({
          icon: 'fa-shield',
          template: 'Standard Training: +1 attack for 1 month',
          variant: 'positive'
        });
      }

      return preview;
    }
  },

  // Execution via game command
  execute: async (ctx) => {
    const partyLevel = getPartyLevel();

    await trainArmyExecution(
      ctx.metadata.armyId,
      partyLevel,
      ctx.outcome
    );
  }
};
