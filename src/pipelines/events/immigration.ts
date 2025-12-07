/**
 * Immigration Event Pipeline
 *
 * Critical Success: +1 settlement level for random settlement
 * Success: +1d3 gold (economy boost)
 * Failure/Critical Failure: No penalty (beneficial event)
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { textBadge } from '../../types/OutcomeBadge';

export const immigrationPipeline: CheckPipeline = {
  id: 'immigration',
  name: 'Immigration',
  description: 'New settlers arrive seeking homes in your kingdom.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'diplomacy', description: 'welcome newcomers' },
      { skill: 'society', description: 'integrate settlers' },
      { skill: 'survival', description: 'find them land' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'A wave of settlers brings growth and prosperity.',
      modifiers: [],
      outcomeBadges: [
        textBadge('+1 level for random settlement', 'fa-city', 'positive')
      ]
    },
    success: {
      description: 'Immigration stimulates the local economy.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d3', duration: 'immediate' }
      ]
    },
    failure: {
      description: 'Few settlers decide to stay.',
      modifiers: []
    },
    criticalFailure: {
      description: 'Seasonal workers return home.',
      modifiers: []
    },
  },

  preview: {
    calculate: async (ctx) => {
      const outcomeBadges: any[] = [];
      const warnings: string[] = [];
      
      // Only show settlement level preview for critical success
      if (ctx.outcome !== 'criticalSuccess') {
        return { resources: [], outcomeBadges: [], warnings: [] };
      }
      
      // Import handler
      const { IncreaseSettlementLevelHandler } = await import('../../services/gameCommands/handlers/IncreaseSettlementLevelHandler');
      const handler = new IncreaseSettlementLevelHandler();
      
      const preparedCommand = await handler.prepare(
        { type: 'increaseSettlementLevel', increase: 1 },
        { actionId: 'immigration', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
      );
      
      if (!preparedCommand) {
        warnings.push('No settlements available');
        return { resources: [], outcomeBadges: [], warnings };
      }
      
      // Store prepared command for execute step
      if (!ctx.metadata) {
        ctx.metadata = {};
      }
      ctx.metadata._preparedIncreaseLevel = preparedCommand;
      
      // Support both single badge and array of badges
      if (preparedCommand.outcomeBadges) {
        outcomeBadges.push(...preparedCommand.outcomeBadges);
      } else if (preparedCommand.outcomeBadge) {
        outcomeBadges.push(preparedCommand.outcomeBadge);
      }
      
      return {
        resources: [],
        outcomeBadges,
        warnings
      };
    }
  },

  execute: async (ctx) => {
    // Only execute on critical success
    if (ctx.outcome !== 'criticalSuccess') {
      return { success: true };
    }
    
    // Get prepared command from preview step
    const preparedCommand = ctx.metadata._preparedIncreaseLevel;
    
    if (!preparedCommand) {
      // Fallback: prepare now if somehow missed
      const { IncreaseSettlementLevelHandler } = await import('../../services/gameCommands/handlers/IncreaseSettlementLevelHandler');
      const handler = new IncreaseSettlementLevelHandler();
      
      const fallbackCommand = await handler.prepare(
        { type: 'increaseSettlementLevel', increase: 1 },
        { actionId: 'immigration', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
      );
      
      if (!fallbackCommand?.commit) {
        return { success: true, message: 'No settlements to increase' };
      }
      
      await fallbackCommand.commit();
      return { success: true };
    }
    
    // Commit the settlement level increase
    if (preparedCommand.commit) {
      await preparedCommand.commit();
    }
    
    return { success: true };
  },

  traits: ["beneficial"],
};
