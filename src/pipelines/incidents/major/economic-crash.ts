/**
 * Economic Crash Incident Pipeline
 *
 * Failure: Lose 2d6 gold + damage 1 structure
 * Critical Failure: Lose 4d6 gold + destroy 1 commerce structure (highest tier)
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import type { GameCommandContext } from '../../../services/gameCommands/GameCommandHandler';
import { textBadge } from '../../../types/OutcomeBadge';

export const economicCrashPipeline: CheckPipeline = {
  id: 'economic-crash',
  name: 'Economic Crash',
  description: 'A severe economic downturn threatens your kingdom\'s prosperity',
  checkType: 'incident',
  tier: 'major',

  skills: [
      { skill: 'diplomacy', description: 'stabilize markets' },
      { skill: 'society', description: 'public confidence' },
      { skill: 'intimidation', description: 'force compliance' },
      { skill: 'occultism', description: 'divine intervention' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'Your kingdom stabilizes the economy and emerges stronger.',
      modifiers: []  // No modifiers needed (+1 Fame auto-applied by UnifiedCheckHandler)
    },
    success: {
      description: 'The economy is stabilized.',
      modifiers: []
    },
    failure: {
      description: 'An economic downturn causes significant losses.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d6', negative: true, duration: 'immediate' }
      ],
      outcomeBadges: [
        textBadge('1 random structure damaged', 'fa-house-crack', 'negative')
      ]
    },
    criticalFailure: {
      description: 'Economic collapse devastates your kingdom.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '4d6', negative: true, duration: 'immediate' }
      ],
      outcomeBadges: [
        textBadge('1 economic structure destroyed (commerce/crafting)', 'fa-building', 'negative')
      ]
    },
  },

  preview: {
    calculate: async (ctx) => {
      const outcomeBadges: any[] = [];
      const warnings: string[] = [];

      // Only show preview for failure outcomes
      if (ctx.outcome !== 'failure' && ctx.outcome !== 'criticalFailure') {
        return { resources: [], outcomeBadges: [], warnings: [] };
      }

      // Initialize metadata
      if (!ctx.metadata) {
        ctx.metadata = {};
      }

      // For failure: damage structure
      if (ctx.outcome === 'failure') {
        const { DamageStructureHandler } = await import('../../../services/gameCommands/handlers/DamageStructureHandler');
        const damageHandler = new DamageStructureHandler();
        
        const preparedDamage = await damageHandler.prepare(
          { type: 'damageStructure', count: 1 },
          { actionId: 'economic-crash', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
        );

        if (preparedDamage) {
          ctx.metadata._preparedDamageStructure = preparedDamage;
          outcomeBadges.push(preparedDamage.outcomeBadge);
        } else {
          warnings.push('No structures available to damage');
        }
      }

      // For critical failure: destroy commerce structure (highest tier)
      // Fallback to crafting-trade if no commerce structures exist
      if (ctx.outcome === 'criticalFailure') {
        const { DestroyStructureHandler } = await import('../../../services/gameCommands/handlers/DestroyStructureHandler');
        const destroyHandler = new DestroyStructureHandler();
        
        // Try commerce first
        let preparedDestroy = await destroyHandler.prepare(
          { type: 'destroyStructure', category: 'commerce', targetTier: 'highest', count: 1 },
          { actionId: 'economic-crash', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
        );

        // If no commerce structures, try crafting-trade as fallback
        if (!preparedDestroy || !preparedDestroy.commit) {
          preparedDestroy = await destroyHandler.prepare(
            { type: 'destroyStructure', category: 'crafting-trade', targetTier: 'highest', count: 1 },
            { actionId: 'economic-crash', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
          );
        }

        if (preparedDestroy && preparedDestroy.commit) {
          ctx.metadata._preparedDestroyStructure = preparedDestroy;
          outcomeBadges.push(preparedDestroy.outcomeBadge);
        } else {
          warnings.push('No commerce or crafting structures available to destroy');
        }
      }

      return {
        resources: [],
        outcomeBadges,
        warnings
      };
    }
  },

  execute: async (ctx) => {
    // Modifiers already applied by execute-first pattern
    
    // Only execute game commands on failure or critical failure
    if (ctx.outcome !== 'failure' && ctx.outcome !== 'criticalFailure') {
      return { success: true };
    }

    // Execute structure damage (failure)
    if (ctx.outcome === 'failure') {
      const preparedDamage = ctx.metadata._preparedDamageStructure;
      if (preparedDamage?.commit) {
        await preparedDamage.commit();
        console.log('[Economic Crash] Damaged structure');
      }
    }

    // Execute structure destruction (critical failure)
    if (ctx.outcome === 'criticalFailure') {
      const preparedDestroy = ctx.metadata._preparedDestroyStructure;
      if (preparedDestroy?.commit) {
        await preparedDestroy.commit();
        console.log('[Economic Crash] Destroyed commerce structure');
      }
    }

    return { success: true };
  },

  traits: ["dangerous"],
};
