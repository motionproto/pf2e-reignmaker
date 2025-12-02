/**
 * Assassination Attempt Incident Pipeline
 *
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import type { GameCommandContext } from '../../../services/gameCommands/GameCommandHandler';
import { textBadge } from '../../../types/OutcomeBadge';

export const assassinAttackPipeline: CheckPipeline = {
  id: 'assassin-attack',
  name: 'Assassin Attack',
  description: 'An assassin targets one of your kingdom\'s leaders',
  checkType: 'incident',
  tier: 2,

  skills: [
    { skill: 'athletics', description: 'protect target' },
    { skill: 'medicine', description: 'treat wounds' },
    { skill: 'stealth', description: 'avoid the assassin' },
  ],

  outcomes: {
    success: {
      description: 'The assassination is prevented.',
      modifiers: []
    },
    failure: {
      description: 'The leader escapes.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'The leader is wounded and cannot act.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
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
      const { SpendPlayerActionHandler } = await import('../../../services/gameCommands/handlers/SpendPlayerActionHandler');
      const handler = new SpendPlayerActionHandler();
      
      const preparedCommand = await handler.prepare(
        { type: 'spendPlayerAction', characterSelection: 'random' },
        { actionId: 'assassin-attack', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
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
        { actionId: 'assassin-attack', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
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
