/**
 * Recruit Unit Action Pipeline
 *
 * Raise new troops for your armies.
 * Converted from data/player-actions/recruit-unit.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { recruitArmyExecution } from '../../execution/armies/recruitArmy';
import { getPartyLevel } from '../../services/commands/armies/armyCommands';

export const recruitUnitPipeline: CheckPipeline = {
  id: 'recruit-unit',
  name: 'Recruit Army',
  description: 'Rally citizens to arms, drawing from the population to form new military units through inspiration, coercion, or demonstration of prowess',
  checkType: 'action',
  category: 'military-operations',

  skills: [
    { skill: 'diplomacy', description: 'inspire patriotism' },
    { skill: 'intimidation', description: 'conscription' },
    { skill: 'society', description: 'civic duty' },
    { skill: 'performance', description: 'recruitment rallies' },
    { skill: 'athletics', description: 'demonstrations of prowess' }
  ],

  // Pre-roll: Compound form for army details (name, type, settlement)
  preRollInteractions: [
    {
      type: 'compound',
      id: 'armyDetails',
      label: 'Configure army recruitment'
    }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Patriotic fervor spreads.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    success: {
      description: 'Troops are recruited.',
      modifiers: []
    },
    failure: {
      description: 'Recruitment fails.',
      modifiers: []
    },
    criticalFailure: {
      description: 'The recruitment attempt angers the populace.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    }
  },

  preview: {
    calculate: (ctx) => {
      const unrestChange = ctx.outcome === 'criticalSuccess' ? -1 :
                          ctx.outcome === 'criticalFailure' ? 1 : 0;

      const specialEffects = [];
      if (ctx.outcome !== 'failure' && ctx.outcome !== 'criticalFailure') {
        const level = getPartyLevel();
        specialEffects.push({
          type: 'entity' as const,
          message: `Will recruit ${ctx.metadata.armyName || 'new army'} (Level ${level})`,
          variant: 'positive' as const
        });
      }

      return {
        resources: unrestChange !== 0 ? [{ resource: 'unrest', value: unrestChange }] : [],
        specialEffects,
        warnings: []
      };
    }
  },

  execute: async (ctx) => {
    if (ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure') {
      return; // No army recruited
    }

    const { ARMY_TYPES } = await import('../../utils/armyHelpers');
    const level = getPartyLevel();

    await recruitArmyExecution({
      name: ctx.metadata.armyName || 'New Army',
      level,
      type: ctx.metadata.armyType || 'infantry',
      image: ARMY_TYPES[ctx.metadata.armyType as keyof typeof ARMY_TYPES]?.image || ARMY_TYPES.infantry.image,
      settlementId: ctx.metadata.settlementId
    });
  }
};
