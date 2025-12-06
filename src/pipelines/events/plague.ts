/**
 * Plague Event Pipeline
 *
 * Disease spreads through settlements.
 * Critical failure destroys a structure (burned to stop spread).
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { DestroyStructureHandler } from '../../services/gameCommands/handlers/DestroyStructureHandler';

export const plaguePipeline: CheckPipeline = {
  id: 'plague',
  name: 'Plague',
  description: 'Disease spreads rapidly through your settlements.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'medicine', description: 'treat the sick' },
      { skill: 'religion', description: 'divine healing' },
      { skill: 'society', description: 'quarantine measures' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The plague is cured and the healers are celebrated.',
      endsEvent: true,
      modifiers: [
        { type: 'dice', resource: 'unrest', formula: '1d3', negative: true, duration: 'immediate' }
      ]
    },
    success: {
      description: 'The plague is contained through effective quarantine.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The plague spreads, requiring costly treatment.',
      endsEvent: false,
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d3', negative: true, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'A devastating outbreak forces desperate measures - a building is burned to stop the spread.',
      endsEvent: false,
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
      // Only generate badges for criticalFailure (structure destruction)
      if (ctx.outcome !== 'criticalFailure') {
        return { resources: [], outcomeBadges: [] };
      }

      const outcomeBadges: any[] = [];
      const commandContext = {
        actionId: 'plague',
        outcome: ctx.outcome,
        kingdom: ctx.kingdom,
        metadata: ctx.metadata || {}
      };

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

      return { resources: [], outcomeBadges };
    }
  },

  execute: async (ctx) => {
    if (ctx.outcome === 'criticalFailure') {
      const destroyCommand = ctx.metadata?._preparedDestroyStructure;
      if (destroyCommand?.commit) {
        await destroyCommand.commit();
      }
    }
    return { success: true };
  },

  traits: ["dangerous", "ongoing"],
};
