/**
 * Assassination Attempt Event Pipeline
 *
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { textBadge } from '../../types/OutcomeBadge';

export const assassinationAttemptPipeline: CheckPipeline = {
  id: 'assassination-attempt',
  name: 'Assassination Attempt',
  description: 'Someone attempts to kill one of your leaders.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'stealth', description: 'avoid the assassin' },
      { skill: 'intimidation', description: 'deter through fear' },
      { skill: 'medicine', description: 'survive wounds' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The assassin is captured.',
      endsEvent: true,
      modifiers: []
    },
    success: {
      description: 'The attempt is foiled.',
      endsEvent: true,
      modifiers: []
    },
    failure: {
      description: 'Your leader narrowly escapes.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'Your leader is wounded and cannot act.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ],
      outcomeBadges: [
        textBadge('One leader loses their action this turn', 'fa-user-injured', 'negative')
      ]
    },
  },

  preview: {
    calculate: async (ctx) => {
      // Only show preview on critical failure
      if (ctx.outcome !== 'criticalFailure') {
        return { resources: [], outcomeBadges: [], warnings: [] };
      }

      // Call handler to get the specific character who will lose their action
      const { SpendPlayerActionHandler } = await import('../../services/gameCommands/handlers/SpendPlayerActionHandler');
      const handler = new SpendPlayerActionHandler();
      
      const preparedCommand = await handler.prepare(
        { type: 'spendPlayerAction', characterSelection: 'random' },
        { actionId: 'assassination-attempt', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
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
    // Only execute on critical failure
    if (ctx.outcome !== 'criticalFailure') {
      return { success: true };
    }
    
    // Get prepared command from preview step
    const preparedCommand = ctx.metadata._preparedSpendAction;
    
    if (!preparedCommand) {
      // Fallback: prepare now if somehow missed
      const { SpendPlayerActionHandler } = await import('../../services/gameCommands/handlers/SpendPlayerActionHandler');
      const handler = new SpendPlayerActionHandler();
      
      const fallbackCommand = await handler.prepare(
        { type: 'spendPlayerAction', characterSelection: 'random' },
        { actionId: 'assassination-attempt', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
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
