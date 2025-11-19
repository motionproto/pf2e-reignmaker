/**
 * Recover Army Action Pipeline
 *
 * Heal and restore damaged units.
 * Converted from data/player-actions/recover-army.json
 *
 * NOTE: Custom implementation handles army healing calculations
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const recoverArmyPipeline: CheckPipeline = {
  id: 'recover-army',
  name: 'Recover Army',
  description: 'Tend to wounded troops, restore morale, and replenish ranks after battle losses',
  checkType: 'action',
  category: 'military',

  // Requirements: Must have at least one army
  requirements: (kingdom) => {
    if (kingdom.armies.length === 0) {
      return {
        met: false,
        reason: 'No armies available'
      };
    }
    return { met: true };
  },

  skills: [
    { skill: 'medicine', description: 'heal the wounded' },
    { skill: 'performance', description: 'boost morale' },
    { skill: 'religion', description: 'spiritual restoration' },
    { skill: 'nature', description: 'natural remedies' },
    { skill: 'crafting', description: 'repair equipment' }
  ],

  // Pre-roll: Select wounded army
  preRollInteractions: [
    {
      type: 'entity-selection',
      id: 'armyId',
      label: 'Select wounded army to recover',
      entityType: 'army'
    }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'The troops recover completely.',
      modifiers: [],
      manualEffects: ['Army fully healed']
    },
    success: {
      description: 'The troops recover.',
      modifiers: [],
      manualEffects: ['Army partially healed']
    },
    failure: {
      description: 'The troops fail to recover.',
      modifiers: []
    },
    criticalFailure: {
      description: 'The recovery effort fails.',
      modifiers: []
    }
  },

  preview: {
    calculate: (ctx) => {
      const specialEffects = [];

      if (ctx.outcome === 'criticalSuccess') {
        specialEffects.push({
          type: 'status' as const,
          message: `${ctx.metadata.armyName || 'Army'} will be fully healed`,
          variant: 'positive' as const
        });
      } else if (ctx.outcome === 'success') {
        specialEffects.push({
          type: 'status' as const,
          message: `${ctx.metadata.armyName || 'Army'} will be partially healed`,
          variant: 'positive' as const
        });
      }

      return { resources: [], specialEffects, warnings: [] };
    }
  }

  // NOTE: Execution handled by custom implementation (army healing logic)
};
