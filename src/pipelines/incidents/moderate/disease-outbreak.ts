/**
 * Disease Outbreak Incident Pipeline
 *
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { textBadge } from '../../../types/OutcomeBadge';

export const diseaseOutbreakPipeline: CheckPipeline = {
  id: 'disease-outbreak',
  name: 'Disease Outbreak',
  description: 'A dangerous disease spreads through your settlements',
  checkType: 'incident',
  severity: 'moderate',

  skills: [
      { skill: 'medicine', description: 'treat disease' },
      { skill: 'nature', description: 'natural remedies' },
      { skill: 'religion', description: 'divine healing' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The disease is eradicated.',
      modifiers: []
    },
    success: {
      description: 'The disease is contained.',
      modifiers: []
    },
    failure: {
      description: 'The disease spreads through settlements.',
      modifiers: [
        { type: 'dice', resource: 'food', formula: '1d4', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
      ]
    },
    criticalFailure: {
      description: 'The disease devastates your kingdom.',
      modifiers: [
        { type: 'dice', resource: 'food', formula: '2d4', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
      ],
      outcomeBadges: [
        textBadge('1 random structure damaged', 'fa-house-crack', 'negative')
      ]
    },
  },

  preview: {
    calculate: async (ctx) => {
      // Only show preview on critical failure
      if (ctx.outcome !== 'criticalFailure') {
        return { resources: [], outcomeBadges: [], warnings: [] };
      }

      // Use DamageStructureHandler to prepare the command
      const { DamageStructureHandler } = await import('../../../services/gameCommands/handlers/DamageStructureHandler');
      const handler = new DamageStructureHandler();
      
      const preparedCommand = await handler.prepare(
        { type: 'damageStructure', count: 1 },
        { actionId: 'disease-outbreak', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata }
      );

      if (!preparedCommand) {
        return {
          resources: [],
          outcomeBadges: [],
          warnings: ['No structures available to damage']
        };
      }

      // Store prepared command for execute step
      ctx.metadata._preparedDamageStructure = preparedCommand;

      return {
        resources: [],
        outcomeBadges: [preparedCommand.outcomeBadge],
        warnings: []
      };
    }
  },

  execute: async (ctx) => {
    // Modifiers are already applied automatically by UnifiedCheckHandler

    // Critical failure: damage a structure
    if (ctx.outcome === 'criticalFailure') {
      const preparedCommand = ctx.metadata._preparedDamageStructure;
      
      if (!preparedCommand) {
        console.warn('[Disease Outbreak] No prepared command - skipping damage');
        return { success: true, message: 'No structures to damage' };
      }

      // Commit the structure damage
      if (preparedCommand.commit) {
        await preparedCommand.commit();
      }
    }

    return { success: true };
  },

  traits: ["dangerous"],
};
