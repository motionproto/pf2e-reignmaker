/**
 * Settlement Crisis Incident Pipeline
 *
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import type { GameCommandContext } from '../../../services/gameCommands/GameCommandHandler';
import { textBadge } from '../../../types/OutcomeBadge';

export const settlementCrisisPipeline: CheckPipeline = {
  id: 'settlement-crisis',
  name: 'Settlement Crisis',
  description: 'One of your settlements faces a major crisis',
  checkType: 'incident',
  severity: 'moderate',

  skills: [
      { skill: 'diplomacy', description: 'address concerns' },
      { skill: 'society', description: 'emergency aid' },
      { skill: 'religion', description: 'provide hope' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The settlement thrives despite adversity.',
      modifiers: []
    },
    success: {
      description: 'The settlement is stabilized.',
      modifiers: []
    },
    failure: {
      description: 'The crisis threatens the settlement.',
      modifiers: [],
      outcomeBadges: [
        textBadge('1 random structure damaged', 'fa-house-crack', 'negative')
      ]
    },
    criticalFailure: {
      description: 'A settlement collapses.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ],
      outcomeBadges: [
        textBadge('1 random settlement loses 1 level', 'fa-city', 'negative'),
        textBadge('1 random structure damaged', 'fa-house-crack', 'negative')
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
          { actionId: 'settlement-crisis', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
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

      // For critical failure: reduce settlement level AND damage structure
      if (ctx.outcome === 'criticalFailure') {
        // Reduce settlement level
        const { ReduceSettlementLevelHandler } = await import('../../../services/gameCommands/handlers/ReduceSettlementLevelHandler');
        const reduceHandler = new ReduceSettlementLevelHandler();
        
        const preparedReduce = await reduceHandler.prepare(
          { type: 'reduceSettlementLevel', reduction: 1 },
          { actionId: 'settlement-crisis', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
        );

        if (preparedReduce) {
          ctx.metadata._preparedReduceSettlement = preparedReduce;
          // Support both single badge and array of badges
          if (preparedReduce.outcomeBadges) {
            outcomeBadges.push(...preparedReduce.outcomeBadges);
          } else if (preparedReduce.outcomeBadge) {
            outcomeBadges.push(preparedReduce.outcomeBadge);
          }
        } else {
          warnings.push('No settlements available to reduce (all at minimum level)');
        }

        // Damage structure
        const { DamageStructureHandler } = await import('../../../services/gameCommands/handlers/DamageStructureHandler');
        const damageHandler = new DamageStructureHandler();
        
        const preparedDamage = await damageHandler.prepare(
          { type: 'damageStructure', count: 1 },
          { actionId: 'settlement-crisis', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
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
        console.log('[Settlement Crisis] Damaged structure');
      }
    }

    // Execute settlement level reduction (critical failure)
    if (ctx.outcome === 'criticalFailure') {
      const preparedReduce = ctx.metadata._preparedReduceSettlement;
      if (preparedReduce?.commit) {
        await preparedReduce.commit();
        console.log('[Settlement Crisis] Reduced settlement level');
      }

      const preparedDamage = ctx.metadata._preparedDamageStructure;
      if (preparedDamage?.commit) {
        await preparedDamage.commit();
        console.log('[Settlement Crisis] Damaged structure');
      }
    }

    return { success: true };
  },

  // No postApplyInteractions needed

  traits: ["dangerous"]
};
