/**
 * Bandit Raids Incident Pipeline
 *
 * Renamed from bandit-activity to avoid ID conflict with event
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { textBadge } from '../../../types/OutcomeBadge';
import { DestroyWorksiteHandler } from '../../../services/gameCommands/handlers/DestroyWorksiteHandler';

export const banditRaidsPipeline: CheckPipeline = {
  id: 'bandit-raids',
  name: 'Bandit Raids',
  description: 'Bandit raids threaten your trade routes and settlements',
  checkType: 'incident',
  tier: 1,

  skills: [
      { skill: 'intimidation', description: 'show force' },
      { skill: 'stealth', description: 'infiltrate bandits' },
      { skill: 'survival', description: 'track to lair' },
      { skill: 'occultism', description: 'scrying' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The bandits are routed completely.',
      modifiers: []
    },
    success: {
      description: 'The bandits are deterred.',
      modifiers: []
    },
    failure: {
      description: 'The bandits raid your holdings.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'Major bandit raids devastate the area.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d4', negative: true, duration: 'immediate' }
      ],
      outcomeBadges: [
        textBadge('1 random worksite destroyed', 'fa-hammer-war', 'negative')
      ]
    },
  },

  preview: {
    calculate: async (ctx) => {
      // Only show preview on critical failure
      if (ctx.outcome !== 'criticalFailure') {
        return { resources: [], outcomeBadges: [], warnings: [] };
      }

      // Call handler to generate preview and metadata
      const { DestroyWorksiteHandler } = await import('../../../services/gameCommands/handlers/DestroyWorksiteHandler');
      const handler = new DestroyWorksiteHandler();
      
      const preparedCommand = await handler.prepare(
        { type: 'destroyWorksite', count: 1 },
        { actionId: 'bandit-raids', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata }
      );
      
      if (!preparedCommand) {
        return { resources: [], outcomeBadges: [], warnings: [] };
      }
      
      // Store metadata in context for post-apply interactions
      // IMPORTANT: Mutate existing object, don't reassign (so PipelineCoordinator sees changes)
      if (preparedCommand.metadata) {
        Object.assign(ctx.metadata, preparedCommand.metadata);
      }
      
      // Store prepared command for execute step
      ctx.metadata._preparedDestroyWorksite = preparedCommand;
      
      return {
        resources: [],
        outcomeBadges: [preparedCommand.outcomeBadge],
        warnings: []
      };
    }
  },

  execute: async (ctx) => {
    // Modifiers already applied by execute-first pattern
    
    // Only execute worksite destruction on critical failure
    if (ctx.outcome !== 'criticalFailure') {
      return { success: true };
    }
    
    // Get prepared command from preview step
    const preparedCommand = ctx.metadata._preparedDestroyWorksite;
    
    if (!preparedCommand) {
      // Fallback: prepare now if somehow missed
      const { getGameCommandRegistry } = await import('../../../services/gameCommands/GameCommandHandlerRegistry');
      const registry = getGameCommandRegistry();
      
      const fallbackCommand = await registry.process(
        { type: 'destroyWorksite', count: 1 },
        { kingdom: ctx.kingdom, outcome: ctx.outcome, metadata: ctx.metadata }
      );
      
      if (!fallbackCommand?.commit) {
        return { success: true, message: 'No worksites to destroy' };
      }
      
      await fallbackCommand.commit();
      return { success: true };
    }
    
    // Commit the worksite destruction
    if (preparedCommand.commit) {
      await preparedCommand.commit();
    }
    
    return { success: true };
  },

  // Post-apply interaction to show destroyed worksites on map
  postApplyInteractions: [
    DestroyWorksiteHandler.getMapDisplayInteraction('Worksite Destroyed by Bandits')
  ],

  // ✅ REMOVED: No longer needed - now using preview.calculate
};
