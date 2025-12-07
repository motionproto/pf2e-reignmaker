/**
 * International Scandal Incident Pipeline
 *
 * An internal scandal undermines leadership authority and damages governmental institutions
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { textBadge } from '../../../types/OutcomeBadge';
import type { GameCommandContext } from '../../../services/gameCommands/GameCommandHandler';

export const internationalScandalPipeline: CheckPipeline = {
  id: 'international-scandal',
  name: 'International Scandal',
  description: 'A massive internal scandal undermines your leadership\'s authority',
  checkType: 'incident',
  severity: 'major',

  skills: [
      { skill: 'performance', description: 'grand gesture' },
      { skill: 'diplomacy', description: 'public relations' },
      { skill: 'deception', description: 'cover-up' },
      { skill: 'intimidation', description: 'silence critics' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'Your kingdom handles the scandal masterfully, strengthening public trust.',
      modifiers: []  // No modifiers needed (+1 Fame auto-applied by UnifiedCheckHandler)
    },
    success: {
      description: 'The scandal is contained.',
      modifiers: []
    },
    failure: {
      description: 'A scandal undermines your leadership and damages diplomatic institutions.',
      modifiers: [
        { type: 'static', resource: 'fame', value: -1, duration: 'immediate' },
        { type: 'static', resource: 'leadershipPenalty', value: -1, duration: 1 }
      ],
      outcomeBadges: [
        textBadge('1 diplomatic structure damaged', 'fa-house-crack', 'negative')
      ]
    },
    criticalFailure: {
      description: 'A devastating scandal destroys public confidence in your government.',
      modifiers: [
        { type: 'static', resource: 'fame', value: -1, duration: 'immediate' },
        { type: 'static', resource: 'leadershipPenalty', value: -2, duration: 1 }
      ],
      outcomeBadges: [
        textBadge('1 diplomatic structure destroyed (highest tier)', 'fa-building-circle-xmark', 'negative')
      ]
    },
  },

  preview: {
    calculate: async (ctx) => {
      const outcomeBadges: any[] = [];
      const warnings: string[] = [];

      if (ctx.outcome !== 'failure' && ctx.outcome !== 'criticalFailure') {
        return { resources: [], outcomeBadges: [], warnings: [] };
      }

      if (!ctx.metadata) {
        ctx.metadata = {};
      }

      if (ctx.outcome === 'failure') {
        // Damage 1 random diplomatic structure
        const { DamageStructureHandler } = await import('../../../services/gameCommands/handlers/DamageStructureHandler');
        const damageHandler = new DamageStructureHandler();
        const preparedDamage = await damageHandler.prepare(
          { type: 'damageStructure', category: 'diplomacy', count: 1 },
          { actionId: 'international-scandal', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
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
          warnings.push('No diplomatic structures available to damage');
        }
      }

      if (ctx.outcome === 'criticalFailure') {
        // Destroy 1 highest-tier diplomatic structure
        const { DestroyStructureHandler } = await import('../../../services/gameCommands/handlers/DestroyStructureHandler');
        const destroyHandler = new DestroyStructureHandler();
        const preparedDestroy = await destroyHandler.prepare(
          { type: 'destroyStructure', category: 'diplomacy', targetTier: 'highest', count: 1 },
          { actionId: 'international-scandal', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
        );

        if (preparedDestroy && preparedDestroy.commit) {
          ctx.metadata._preparedDestroyStructure = preparedDestroy;
          // Support both single badge and array of badges
          if (preparedDestroy.outcomeBadges) {
            outcomeBadges.push(...preparedDestroy.outcomeBadges);
          } else if (preparedDestroy.outcomeBadge) {
            outcomeBadges.push(preparedDestroy.outcomeBadge);
          }
        } else {
          warnings.push('No diplomatic structures available to destroy');
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
    if (ctx.outcome !== 'failure' && ctx.outcome !== 'criticalFailure') {
      return { success: true };
    }

    if (ctx.outcome === 'failure') {
      const preparedDamage = ctx.metadata._preparedDamageStructure;
      if (preparedDamage?.commit) {
        await preparedDamage.commit();
      }
    }

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
