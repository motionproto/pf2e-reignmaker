/**
 * Local Disaster Event Pipeline
 *
 * Fire, flood, or structural collapse strikes a settlement.
 * Failure damages structures, critical failure destroys them.
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { DamageStructureHandler } from '../../services/gameCommands/handlers/DamageStructureHandler';
import { DestroyStructureHandler } from '../../services/gameCommands/handlers/DestroyStructureHandler';

export const localDisasterPipeline: CheckPipeline = {
  id: 'local-disaster',
  name: 'Local Disaster',
  description: 'Fire, flood, or structural collapse strikes a settlement.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'crafting', description: 'emergency repairs' },
      { skill: 'survival', description: 'evacuation and rescue' },
      { skill: 'society', description: 'organize response' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The disaster is contained with no damage.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    success: {
      description: 'Damage is limited to minor repairs.',
      endsEvent: true,
      modifiers: []
    },
    failure: {
      description: 'Major damage occurs to a building.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ],
      gameCommands: [
        { type: 'damageStructure', count: 1 }
      ]
    },
    criticalFailure: {
      description: 'The disaster is catastrophic, destroying a building.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ],
      gameCommands: [
        { type: 'destroyStructure', count: 1 }
      ]
    },
  },

  preview: {
    calculate: async (ctx) => {
      // Only generate badges for failure/criticalFailure
      if (ctx.outcome !== 'failure' && ctx.outcome !== 'criticalFailure') {
        return { resources: [], outcomeBadges: [] };
      }

      const outcomeBadges: any[] = [];
      const commandContext = {
        actionId: 'local-disaster',
        outcome: ctx.outcome,
        kingdom: ctx.kingdom,
        metadata: ctx.metadata || {}
      };

      if (ctx.outcome === 'failure') {
        // Prepare damage structure command and get badges
        const damageHandler = new DamageStructureHandler();
        const damageCommand = await damageHandler.prepare(
          { type: 'damageStructure', count: 1 },
          commandContext
        );

        if (damageCommand) {
          ctx.metadata._preparedDamageStructure = damageCommand;
          if (damageCommand.outcomeBadges) {
            outcomeBadges.push(...damageCommand.outcomeBadges);
          } else if (damageCommand.outcomeBadge) {
            outcomeBadges.push(damageCommand.outcomeBadge);
          }
        }
      } else if (ctx.outcome === 'criticalFailure') {
        // Prepare destroy structure command and get badges
        const destroyHandler = new DestroyStructureHandler();
        const destroyCommand = await destroyHandler.prepare(
          { type: 'destroyStructure', count: 1 },
          commandContext
        );

        if (destroyCommand) {
          ctx.metadata._preparedDestroyStructure = destroyCommand;
          if (destroyCommand.outcomeBadges) {
            outcomeBadges.push(...destroyCommand.outcomeBadges);
          } else if (destroyCommand.outcomeBadge) {
            outcomeBadges.push(destroyCommand.outcomeBadge);
          }
        }
      }

      return { resources: [], outcomeBadges };
    }
  },

  execute: async (ctx) => {
    if (ctx.outcome === 'failure') {
      const damageCommand = ctx.metadata?._preparedDamageStructure;
      if (damageCommand?.commit) {
        await damageCommand.commit();
      }
    } else if (ctx.outcome === 'criticalFailure') {
      const destroyCommand = ctx.metadata?._preparedDestroyStructure;
      if (destroyCommand?.commit) {
        await destroyCommand.commit();
      }
    }
    return { success: true };
  },

  traits: ["dangerous"],
};
