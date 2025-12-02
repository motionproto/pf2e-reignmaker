/**
 * Mass Exodus Incident Pipeline
 *
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import type { GameCommandContext } from '../../../services/gameCommands/GameCommandHandler';
import { textBadge } from '../../../types/OutcomeBadge';

export const massExodusPipeline: CheckPipeline = {
  id: 'mass-exodus',
  name: 'Mass Exodus',
  description: 'Large numbers of citizens flee your kingdom',
  checkType: 'incident',
  tier: 'moderate',

  skills: [
      { skill: 'diplomacy', description: 'convince to stay' },
      { skill: 'performance', description: 'inspire hope' },
      { skill: 'religion', description: 'spiritual guidance' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The population is reassured.',
      modifiers: []
    },
    success: {
      description: 'The population remains.',
      modifiers: []
    },
    failure: {
      description: 'Citizens abandon their homes.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ],
      outcomeBadges: [
        textBadge('1 random structure damaged', 'fa-house-crack', 'negative')
      ]
    },
    criticalFailure: {
      description: 'A mass exodus devastates your kingdom.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
        { type: 'static', resource: 'fame', value: -1, duration: 'immediate' },
      ],
      outcomeBadges: [
        textBadge('1 random structure destroyed', 'fa-building', 'negative')
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
          { actionId: 'mass-exodus', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
        );

        if (preparedDamage) {
          ctx.metadata._preparedDamageStructure = preparedDamage;
          outcomeBadges.push(preparedDamage.outcomeBadge);
        } else {
          warnings.push('No structures available to damage');
        }
      }

      // For critical failure: destroy structure
      if (ctx.outcome === 'criticalFailure') {
        const { DestroyStructureHandler } = await import('../../../services/gameCommands/handlers/DestroyStructureHandler');
        const destroyHandler = new DestroyStructureHandler();
        
        const preparedDestroy = await destroyHandler.prepare(
          { type: 'destroyStructure', count: 1 },
          { actionId: 'mass-exodus', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
        );

        if (preparedDestroy) {
          ctx.metadata._preparedDestroyStructure = preparedDestroy;
          outcomeBadges.push(preparedDestroy.outcomeBadge);
        } else {
          warnings.push('No structures available to destroy');
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
        console.log('[Mass Exodus] Damaged structure');
      }
    }

    // Execute structure destruction (critical failure)
    if (ctx.outcome === 'criticalFailure') {
      const preparedDestroy = ctx.metadata._preparedDestroyStructure;
      if (preparedDestroy?.commit) {
        await preparedDestroy.commit();
        console.log('[Mass Exodus] Destroyed structure');
      }
    }

    return { success: true };
  },

  // No postApplyInteractions needed - structure destruction doesn't use map display

  traits: ["dangerous"]
};
