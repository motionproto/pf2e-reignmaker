/**
 * Infrastructure Damage Incident Pipeline
 *
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import type { GameCommandContext } from '../../../services/gameCommands/GameCommandHandler';
import { textBadge } from '../../../types/OutcomeBadge';

export const infrastructureDamagePipeline: CheckPipeline = {
  id: 'infrastructure-damage',
  name: 'Infrastructure Damage',
  description: 'Critical infrastructure is damaged or sabotaged',
  checkType: 'incident',
  tier: 'moderate',

  skills: [
      { skill: 'crafting', description: 'emergency repairs' },
      { skill: 'athletics', description: 'labor mobilization' },
      { skill: 'society', description: 'organize response' },
      { skill: 'arcana', description: 'magical restoration' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'Infrastructure is reinforced.',
      modifiers: []
    },
    success: {
      description: 'Damage is prevented.',
      modifiers: []
    },
    failure: {
      description: 'Infrastructure damage impacts your kingdom.',
      modifiers: [],
      outcomeBadges: [
        textBadge('1 structure will be damaged', 'fa-house-crack', 'negative')
      ]
    },
    criticalFailure: {
      description: 'Widespread infrastructure damage causes chaos.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ],
      outcomeBadges: [
        textBadge('1d3 structures will be damaged', 'fa-house-crack', 'negative')
      ]
    },
  },

  preview: {
    calculate: async (ctx) => {
      // Only show preview for failure outcomes
      if (ctx.outcome !== 'failure' && ctx.outcome !== 'criticalFailure') {
        return { resources: [], outcomeBadges: [], warnings: [] };
      }

      // Determine count (failure: 1, critical failure: 1d3)
      let count = 1;
      if (ctx.outcome === 'criticalFailure') {
        count = Math.floor(Math.random() * 3) + 1; // Roll 1d3
        ctx.metadata._rolledCount = count; // Store for execute
      }

      // Use DamageStructureHandler to prepare the command
      const { DamageStructureHandler } = await import('../../../services/gameCommands/handlers/DamageStructureHandler');
      const handler = new DamageStructureHandler();
      
      const preparedCommand = await handler.prepare(
        { type: 'damageStructure', count },
        { 
          actionId: 'infrastructure-damage', 
          outcome: ctx.outcome, 
          kingdom: ctx.kingdom, 
          metadata: ctx.metadata 
        } as GameCommandContext
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
    
    // Execute structure damage on failure outcomes
    if (ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure') {
      const preparedCommand = ctx.metadata._preparedDamageStructure;
      
      if (!preparedCommand) {
        console.warn('[Infrastructure Damage] No prepared command - skipping damage');
        return { success: true, message: 'No structures to damage' };
      }

      // Commit the structure damage
      if (preparedCommand.commit) {
        await preparedCommand.commit();
      }
    }
    
    return { success: true };
  }
};
