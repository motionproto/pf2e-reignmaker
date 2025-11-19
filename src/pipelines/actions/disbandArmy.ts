/**
 * Disband Army Action Pipeline
 *
 * Decommission troops and return soldiers home.
 * Converted from data/player-actions/disband-army.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { disbandArmyExecution } from '../../execution/armies/disbandArmy';

export const disbandArmyPipeline: CheckPipeline = {
  id: 'disband-army',
  name: 'Disband Army',
  description: 'Release military units from service, returning soldiers to civilian life',
  checkType: 'action',
  category: 'military-operations',

  // Requirements: Must have at least one army
  requirements: (kingdom) => {
    if (kingdom.armies.length === 0) {
      return {
        met: false,
        reason: 'No armies to disband'
      };
    }
    return { met: true };
  },

  skills: [
    { skill: 'intimidation', description: 'stern dismissal' },
    { skill: 'diplomacy', description: 'honorable discharge' },
    { skill: 'society', description: 'reintegration programs' },
    { skill: 'performance', description: 'farewell ceremony' }
  ],

  // Pre-roll: Select army to disband
  preRollInteractions: [
    {
      type: 'entity-selection',
      id: 'armyId',
      label: 'Select army to disband',
      entityType: 'army'
    }
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

  preview: {
    calculate: (ctx) => {
      const unrestChange = ctx.outcome === 'criticalSuccess' ? -2 :
                          ctx.outcome === 'success' ? -1 :
                          ctx.outcome === 'criticalFailure' ? 1 : 0;

      return {
        resources: unrestChange !== 0 ? [{ resource: 'unrest', value: unrestChange }] : [],
        specialEffects: [{
          type: 'entity' as const,
          message: `Will disband ${ctx.metadata.armyName || 'army'}`,
          variant: 'negative' as const
        }],
        warnings: []
      };
    }
  },

  execute: async (ctx) => {
    await disbandArmyExecution(ctx.metadata.armyId, true);
    return { success: true, message: 'Army disbanded' };
  }
};
