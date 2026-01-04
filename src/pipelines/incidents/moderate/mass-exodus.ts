/**
 * Mass Exodus Incident Pipeline
 *
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import type { GameCommandContext } from '../../../services/gameCommands/GameCommandHandler';
import { textBadge } from '../../../types/OutcomeBadge';
import { DestroyWorksiteHandler } from '../../../services/gameCommands/handlers/DestroyWorksiteHandler';

export const massExodusPipeline: CheckPipeline = {
  id: 'mass-exodus',
  name: 'Mass Exodus',
  description: 'Large numbers of citizens flee your kingdom',
  checkType: 'incident',
  severity: 'moderate',

  skills: [
      { skill: 'diplomacy', description: 'convince to stay' },
      { skill: 'performance', description: 'inspire hope' },
      { skill: 'religion', description: 'spiritual guidance' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The population remains.',
      modifiers: []
    },
    success: {
      description: 'The population remains.',
      modifiers: []
    },
    failure: {
      description: 'Citizens abandon projects.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ],
      outcomeBadges: [
        textBadge('1 random worksite destroyed', 'fa-hammer', 'negative')
      ]
    },
    criticalFailure: {
      description: 'A mass exodus damages your kingdom.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
        { type: 'static', resource: 'fame', value: -1, duration: 'immediate' },
        { type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' }
      ],
      outcomeBadges: [
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

      // For failure: destroy worksite
      if (ctx.outcome === 'failure') {
        const { DestroyWorksiteHandler } = await import('../../../services/gameCommands/handlers/DestroyWorksiteHandler');
        const worksiteHandler = new DestroyWorksiteHandler();
        
        const preparedWorksite = await worksiteHandler.prepare(
          { type: 'destroyWorksite', count: 1 },
          { actionId: 'mass-exodus', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
        );

        if (preparedWorksite) {
          if (preparedWorksite.metadata) {
            Object.assign(ctx.metadata, preparedWorksite.metadata);
          }
          ctx.metadata._preparedDestroyWorksite = preparedWorksite;
          // Support both single badge and array of badges
          if (preparedWorksite.outcomeBadges) {
            outcomeBadges.push(...preparedWorksite.outcomeBadges);
          } else if (preparedWorksite.outcomeBadge) {
            outcomeBadges.push(preparedWorksite.outcomeBadge);
          }
        } else {
          warnings.push('No worksites available to destroy');
        }
      }

      // For critical failure: damage structure
      if (ctx.outcome === 'criticalFailure') {
        const { DamageStructureHandler } = await import('../../../services/gameCommands/handlers/DamageStructureHandler');
        const damageHandler = new DamageStructureHandler();
        
        const preparedDamage = await damageHandler.prepare(
          { type: 'damageStructure', count: 1 },
          { actionId: 'mass-exodus', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
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

    // Execute worksite destruction (failure)
    if (ctx.outcome === 'failure') {
      const preparedWorksite = ctx.metadata._preparedDestroyWorksite;
      if (preparedWorksite?.commit) {
        await preparedWorksite.commit();
        console.log('[Mass Exodus] Destroyed worksite');
      }
    }

    // Execute structure damage (critical failure)
    if (ctx.outcome === 'criticalFailure') {
      const preparedDamage = ctx.metadata._preparedDamageStructure;
      if (preparedDamage?.commit) {
        await preparedDamage.commit();
        console.log('[Mass Exodus] Damaged structure');
      }
    }

    return { success: true };
  },

  postApplyInteractions: [
    DestroyWorksiteHandler.getMapDisplayInteraction()
  ],

  traits: ["dangerous"]
};
