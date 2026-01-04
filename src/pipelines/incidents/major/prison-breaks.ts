/**
 * Prison Breaks Incident Pipeline
 *
 * Failure: Release 50% of imprisoned unrest back to regular unrest
 * Critical Failure: Release all imprisoned unrest back to regular unrest
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import type { GameCommandContext } from '../../../services/gameCommands/GameCommandHandler';
import { textBadge } from '../../../types/OutcomeBadge';

export const prisonBreaksPipeline: CheckPipeline = {
  id: 'prison-breaks',
  name: 'Prison Breaks',
  description: 'Mass prison breaks release dangerous criminals',
  checkType: 'incident',
  severity: 'major',

  skills: [
    { skill: 'intimidation', description: 'lockdown prisons' },
    { skill: 'athletics', description: 'pursuit' },
    { skill: 'society', description: 'negotiation' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'The break is prevented.',
      modifiers: []  // +1 Fame auto-applied by UnifiedCheckHandler
    },
    success: {
      description: 'The break is prevented.',
      modifiers: []
    },
    failure: {
      description: 'A mass prison break releases many criminals.',
      modifiers: [],
      outcomeBadges: [
        textBadge('50% of imprisoned unrest released', 'fa-door-open', 'negative')
      ]
    },
    criticalFailure: {
      description: 'A complete prison break releases all criminals.',
      modifiers: [],
      outcomeBadges: [
        textBadge('All imprisoned unrest released', 'fa-door-open', 'negative')
      ]
    },
  },

  preview: {
    calculate: async (ctx) => {
      // Only show preview for failure outcomes
      if (ctx.outcome !== 'failure' && ctx.outcome !== 'criticalFailure') {
        return { resources: [], outcomeBadges: [], warnings: [] };
      }

      // Initialize metadata
      if (!ctx.metadata) {
        ctx.metadata = {};
      }

      const percentage = ctx.outcome === 'failure' ? 50 : 'all';

      // Use ReleaseImprisonedHandler to prepare the command
      const { ReleaseImprisonedHandler } = await import('../../../services/gameCommands/handlers/ReleaseImprisonedHandler');
      const handler = new ReleaseImprisonedHandler();
      
      const preparedCommand = await handler.prepare(
        { type: 'releaseImprisoned', percentage },
        { actionId: 'prison-breaks', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
      );
      
      if (!preparedCommand) {
        return { 
          resources: [], 
          outcomeBadges: [],
          warnings: ['Failed to prepare release command']
        };
      }
      
      // Store prepared command for execute step
      ctx.metadata._preparedReleaseImprisoned = preparedCommand;
      
      // Support both single badge and array of badges
      const outcomeBadges: any[] = [];
      if (preparedCommand.outcomeBadges) {
        outcomeBadges.push(...preparedCommand.outcomeBadges);
      } else if (preparedCommand.outcomeBadge) {
        outcomeBadges.push(preparedCommand.outcomeBadge);
      }
      
      return {
        resources: [],
        outcomeBadges,
        warnings: []
      };
    }
  },

  execute: async (ctx) => {
    // Only execute on failure or critical failure
    if (ctx.outcome !== 'failure' && ctx.outcome !== 'criticalFailure') {
      return { success: true };
    }
    
    // Get prepared command from preview step
    const preparedCommand = ctx.metadata._preparedReleaseImprisoned;
    
    if (!preparedCommand) {
      // Fallback: prepare now if somehow missed
      const percentage = ctx.outcome === 'failure' ? 50 : 'all';
      
      const { ReleaseImprisonedHandler } = await import('../../../services/gameCommands/handlers/ReleaseImprisonedHandler');
      const handler = new ReleaseImprisonedHandler();
      
      const fallbackCommand = await handler.prepare(
        { type: 'releaseImprisoned', percentage },
        { actionId: 'prison-breaks', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
      );
      
      if (fallbackCommand?.commit) {
        await fallbackCommand.commit();
      }
      
      return { success: true };
    }
    
    // Commit the release
    if (preparedCommand.commit) {
      await preparedCommand.commit();
    }
    
    return { success: true };
  },

  traits: ["dangerous"],
};
