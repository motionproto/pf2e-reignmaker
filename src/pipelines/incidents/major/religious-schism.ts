/**
 * Religious Schism Incident Pipeline
 *
 * Failure: Lose 2d6 gold + damage 1 random structure
 * Critical Failure: Lose 4d6 gold + destroy 1 highest-tier faith structure
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import type { GameCommandContext } from '../../../services/gameCommands/GameCommandHandler';
import { textBadge } from '../../../types/OutcomeBadge';

export const religiousSchismPipeline: CheckPipeline = {
  id: 'religious-schism',
  name: 'Religious Schism',
  description: 'Religious divisions tear your kingdom apart',
  checkType: 'incident',
  severity: 'major',

  skills: [
    { skill: 'religion', description: 'theological debate' },
    { skill: 'diplomacy', description: 'mediate factions' },
    { skill: 'occultism', description: 'divine intervention' },
    { skill: 'society', description: 'secular compromise' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'The schism is averted.',
      modifiers: []  // +1 Fame auto-applied by UnifiedCheckHandler
    },
    success: {
      description: 'The schism is averted.',
      modifiers: []
    },
    failure: {
      description: 'Religious divisions weaken your kingdom.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d6', negative: true, duration: 'immediate' }
      ],
      outcomeBadges: [
        textBadge('1 random structure damaged', 'fa-house-crack', 'negative')
      ]
    },
    criticalFailure: {
      description: 'The church splits entirely.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '4d6', negative: true, duration: 'immediate' }
      ],
      outcomeBadges: [
        textBadge('1 faith structure destroyed', 'fa-church', 'negative')
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

      // For failure: damage random structure
      if (ctx.outcome === 'failure') {
        const { DamageStructureHandler } = await import('../../../services/gameCommands/handlers/DamageStructureHandler');
        const damageHandler = new DamageStructureHandler();
        
        const preparedDamage = await damageHandler.prepare(
          { type: 'damageStructure', count: 1 },
          { actionId: 'religious-schism', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
        );

        if (preparedDamage) {
          ctx.metadata._preparedDamageStructure = preparedDamage;
          // Support both single badge and array of badges
          if (preparedDamage.outcomeBadges) {
            outcomeBadges.push(...preparedDamage.outcomeBadges);
          } else if (preparedDamage.outcomeBadge) {
            outcomeBadges.push(preparedDamage.outcomeBadge);
          }
        } else {
          warnings.push('No structures available to damage');
        }
      }

      // For critical failure: destroy highest-tier faith structure
      if (ctx.outcome === 'criticalFailure') {
        const { DestroyStructureHandler } = await import('../../../services/gameCommands/handlers/DestroyStructureHandler');
        const destroyHandler = new DestroyStructureHandler();
        
        const preparedDestroy = await destroyHandler.prepare(
          { type: 'destroyStructure', category: 'faith-nature', targetTier: 'highest', count: 1 },
          { actionId: 'religious-schism', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
        );

        if (preparedDestroy) {
          ctx.metadata._preparedDestroyStructure = preparedDestroy;
          // Support both single badge and array of badges
          if (preparedDestroy.outcomeBadges) {
            outcomeBadges.push(...preparedDestroy.outcomeBadges);
          } else if (preparedDestroy.outcomeBadge) {
            outcomeBadges.push(preparedDestroy.outcomeBadge);
          }
        } else {
          warnings.push('No faith structures available to destroy');
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
    // Only execute on failure or critical failure
    if (ctx.outcome !== 'failure' && ctx.outcome !== 'criticalFailure') {
      return { success: true };
    }

    // Execute structure damage (failure)
    if (ctx.outcome === 'failure') {
      const preparedDamage = ctx.metadata._preparedDamageStructure;
      if (preparedDamage?.commit) {
        await preparedDamage.commit();
      }
    }

    // Execute structure destruction (critical failure)
    if (ctx.outcome === 'criticalFailure') {
      const preparedDestroy = ctx.metadata._preparedDestroyStructure;
      if (preparedDestroy?.commit) {
        await preparedDestroy.commit();
      }
    }

    return { success: true };
  },

  traits: ["dangerous"],
};
