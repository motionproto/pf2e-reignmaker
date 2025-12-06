/**
 * Feud Event Pipeline
 *
 * Two prominent families are engaged in a bitter feud.
 * Critical failure causes property damage.
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { DamageStructureHandler } from '../../services/gameCommands/handlers/DamageStructureHandler';

export const feudPipeline: CheckPipeline = {
  id: 'feud',
  name: 'Feud',
  description: 'Two prominent families are engaged in a bitter feud that threatens to tear the community apart.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'diplomacy', description: 'mediate between families' },
      { skill: 'intimidation', description: 'force them to stop' },
      { skill: 'deception', description: 'manipulate resolution' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The families become allies.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: -2, duration: 'immediate' },
        { type: 'static', resource: 'fame', value: 1, duration: 'immediate' },
      ]
    },
    success: {
      description: 'The feud is resolved.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The feud escalates.',
      endsEvent: false,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'Violence erupts in the streets, damaging property.',
      endsEvent: false,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ],
      gameCommands: [
        { type: 'damageStructure', count: 1 }
      ]
    },
  },

  preview: {
    calculate: async (ctx) => {
      // Only generate badges for criticalFailure (structure damage)
      if (ctx.outcome !== 'criticalFailure') {
        return { resources: [], outcomeBadges: [] };
      }

      const outcomeBadges: any[] = [];
      const commandContext = {
        actionId: 'feud',
        outcome: ctx.outcome,
        kingdom: ctx.kingdom,
        metadata: ctx.metadata || {}
      };

      // Prepare damage structure command and get badges
      const damageHandler = new DamageStructureHandler();
      const damageCommand = await damageHandler.prepare(
        { type: 'damageStructure', count: 1 },
        commandContext
      );

      if (damageCommand) {
        // Store for execute step
        ctx.metadata._preparedDamageStructure = damageCommand;
        
        // Add badges (can be single or array)
        if (damageCommand.outcomeBadges) {
          outcomeBadges.push(...damageCommand.outcomeBadges);
        } else if (damageCommand.outcomeBadge) {
          outcomeBadges.push(damageCommand.outcomeBadge);
        }
      }

      return { resources: [], outcomeBadges };
    }
  },

  // Execute the prepared commands
  execute: async (ctx) => {
    // Only execute for criticalFailure
    if (ctx.outcome !== 'criticalFailure') {
      return { success: true };
    }

    // Execute prepared damage structure command
    const damageCommand = ctx.metadata?._preparedDamageStructure;
    if (damageCommand?.commit) {
      await damageCommand.commit();
    }

    return { success: true };
  },

  traits: ["dangerous", "ongoing"],
};
