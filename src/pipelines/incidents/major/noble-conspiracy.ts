/**
 * Noble Conspiracy Incident Pipeline
 *
 * Failure: Lose 1d4 gold, -1 Fame
 * Critical Failure: Lose 2d4 gold, -1 Fame, +1 Unrest, one leader loses their action
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import type { GameCommandContext } from '../../../services/gameCommands/GameCommandHandler';
import { textBadge } from '../../../types/OutcomeBadge';

export const nobleConspiracyPipeline: CheckPipeline = {
  id: 'noble-conspiracy',
  name: 'Noble Conspiracy',
  description: 'Nobles plot to overthrow the kingdom\'s leadership',
  checkType: 'incident',
  severity: 'major',

  skills: [
    { skill: 'stealth', description: 'uncover plot' },
    { skill: 'intimidation', description: 'arrests' },
    { skill: 'society', description: 'political maneuvering' },
    { skill: 'occultism', description: 'divine truth' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'The conspiracy is exposed and the ringleaders arrested.',
      modifiers: []  // +1 Fame auto-applied by UnifiedCheckHandler
    },
    success: {
      description: 'The conspiracy is exposed.',
      modifiers: []
    },
    failure: {
      description: 'The conspiracy undermines your kingdom.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'fame', value: -1, duration: 'immediate' },
      ]
      // outcomeBadges auto-generated from modifiers
    },
    criticalFailure: {
      description: 'The conspiracy strikes and a leader is compromised.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d4', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'fame', value: -1, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
      ],
      outcomeBadges: [
        // Only include badges for effects NOT covered by modifiers
        textBadge('One leader loses their action', 'fa-user-injured', 'negative')
      ]
    },
  },

  preview: {
    calculate: async (ctx) => {
      // Only show preview on critical failure
      if (ctx.outcome !== 'criticalFailure') {
        return { resources: [], outcomeBadges: [], warnings: [] };
      }

      // Initialize metadata
      if (!ctx.metadata) {
        ctx.metadata = {};
      }

      // Call handler to get the specific character who will lose their action
      const { SpendPlayerActionHandler } = await import('../../../services/gameCommands/handlers/SpendPlayerActionHandler');
      const handler = new SpendPlayerActionHandler();
      
      const preparedCommand = await handler.prepare(
        { type: 'spendPlayerAction', characterSelection: 'random' },
        { actionId: 'noble-conspiracy', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
      );
      
      if (!preparedCommand) {
        return { 
          resources: [], 
          outcomeBadges: [],
          warnings: ['No leaders available to target']
        };
      }
      
      // Store prepared command for execute step
      ctx.metadata._preparedSpendAction = preparedCommand;
      
      return {
        resources: [],
        outcomeBadges: [preparedCommand.outcomeBadge],
        warnings: []
      };
    }
  },

  execute: async (ctx) => {
    // Modifiers already applied by execute-first pattern
    
    // Only execute on critical failure
    if (ctx.outcome !== 'criticalFailure') {
      return { success: true };
    }
    
    // Get prepared command from preview step
    const preparedCommand = ctx.metadata._preparedSpendAction;
    
    if (!preparedCommand) {
      // Fallback: prepare now if somehow missed
      const { SpendPlayerActionHandler } = await import('../../../services/gameCommands/handlers/SpendPlayerActionHandler');
      const handler = new SpendPlayerActionHandler();
      
      const fallbackCommand = await handler.prepare(
        { type: 'spendPlayerAction', characterSelection: 'random' },
        { actionId: 'noble-conspiracy', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
      );
      
      if (!fallbackCommand?.commit) {
        return { success: true, message: 'No leaders to affect' };
      }
      
      await fallbackCommand.commit();
      return { success: true };
    }
    
    // Commit the action spending
    if (preparedCommand.commit) {
      await preparedCommand.commit();
    }
    
    return { success: true };
  },

  traits: ["dangerous"],
};
