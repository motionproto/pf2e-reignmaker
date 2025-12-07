/**
 * Raiders Event Pipeline
 *
 * Armed raiders threaten settlements and trade routes.
 * Critical failure destroys a worksite.
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { textBadge } from '../../types/OutcomeBadge';
import { DestroyWorksiteHandler } from '../../services/gameCommands/handlers/DestroyWorksiteHandler';

export const raidersPipeline: CheckPipeline = {
  id: 'raiders',
  name: 'Raiders',
  description: 'Armed raiders threaten settlements and trade routes.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'intimidation', description: 'military response' },
      { skill: 'diplomacy', description: 'negotiate tribute' },
      { skill: 'stealth', description: 'track to their base' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The raiders are defeated and their loot recovered!',
      endsEvent: true,
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d3', duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    success: {
      description: 'The raiders are repelled and the people feel protected.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The raiders plunder your holdings.',
      endsEvent: false,
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d3', negative: true, duration: 'immediate' },
        { type: 'dice', resource: 'food', formula: '1d3', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'A major raid devastates the area, destroying a worksite.',
      endsEvent: false,
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d3', negative: true, duration: 'immediate' },
        { type: 'dice', resource: 'food', formula: '1d3', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ],
      outcomeBadges: [
        textBadge('Destroy 1 worksite', 'fa-hammer', 'negative')
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
      const { DestroyWorksiteHandler } = await import('../../services/gameCommands/handlers/DestroyWorksiteHandler');
      const handler = new DestroyWorksiteHandler();
      
      const preparedCommand = await handler.prepare(
        { type: 'destroyWorksite', count: 1 },
        { actionId: 'raiders', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata }
      );
      
      if (!preparedCommand) {
        return { resources: [], outcomeBadges: [], warnings: ['No worksites available to destroy'] };
      }
      
      // Store metadata in context for post-apply interactions
      // IMPORTANT: Mutate existing object, don't reassign (so PipelineCoordinator sees changes)
      if (preparedCommand.metadata) {
        Object.assign(ctx.metadata, preparedCommand.metadata);
      }
      
      // Store prepared command for execute step
      ctx.metadata._preparedDestroyWorksite = preparedCommand;
      
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
    // Only execute worksite destruction on critical failure
    if (ctx.outcome !== 'criticalFailure') {
      return { success: true };
    }
    
    // Get prepared command from preview step
    const preparedCommand = ctx.metadata?._preparedDestroyWorksite;
    
    if (!preparedCommand) {
      // Fallback: prepare now if somehow missed
      const { getGameCommandRegistry } = await import('../../services/gameCommands/GameCommandHandlerRegistry');
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
    DestroyWorksiteHandler.getMapDisplayInteraction('Worksite Destroyed by Raiders')
  ],

  traits: ["dangerous", "ongoing"],
};
