/**
 * Monster Attack Event Pipeline
 *
 * A dangerous creature attacks a settlement.
 * Success drives it off, failure causes property damage.
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { DamageStructureHandler } from '../../services/gameCommands/handlers/DamageStructureHandler';
import { DestroyStructureHandler } from '../../services/gameCommands/handlers/DestroyStructureHandler';

export const monsterAttackPipeline: CheckPipeline = {
  id: 'monster-attack',
  name: 'Monster Attack',
  description: 'A dangerous creature attacks a settlement or travellers.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'intimidation', description: 'drive it off' },
      { skill: 'nature', description: 'understand and redirect' },
      { skill: 'stealth', description: 'track and ambush' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The monster is slain! Valuable remains are collected and the people celebrate.',
      endsEvent: true,
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d3', duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: -2, duration: 'immediate' },
      ]
    },
    success: {
      description: 'The monster is driven away before causing serious harm.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The monster causes significant damage before retreating.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ],
      gameCommands: [
        { type: 'damageStructure', count: 1 }
      ]
    },
    criticalFailure: {
      description: 'The monster rampages through the settlement, destroying property.',
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
      // NOTE: Gold/unrest badges are AUTO-GENERATED from JSON modifiers
      // Only add ADDITIONAL badges here (like structure damage/destroy)
      const outcomeBadges: any[] = [];

      // Success outcomes: No additional badges needed (modifiers handle display)
      if (ctx.outcome === 'criticalSuccess' || ctx.outcome === 'success') {
        return { resources: [], outcomeBadges: [] };
      }

      // Failure: Add structure damage badge
      if (ctx.outcome === 'failure') {
        const commandContext = {
          actionId: 'monster-attack',
          outcome: ctx.outcome,
          kingdom: ctx.kingdom,
          metadata: ctx.metadata || {}
        };
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
        return { resources: [], outcomeBadges };
      }
      
      // Critical Failure: Add structure destroy badge
      if (ctx.outcome === 'criticalFailure') {
        const commandContext = {
          actionId: 'monster-attack',
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
