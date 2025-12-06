/**
 * Undead Uprising Event Pipeline
 *
 * The dead rise from their graves to threaten the living.
 * Critical failure destroys a worksite.
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { textBadge } from '../../types/OutcomeBadge';
import { DestroyWorksiteHandler } from '../../services/gameCommands/handlers/DestroyWorksiteHandler';

export const undeadUprisingPipeline: CheckPipeline = {
  id: 'undead-uprising',
  name: 'Undead Uprising',
  description: 'The dead rise from their graves to threaten the living.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'religion', description: 'consecrate and bless' },
      { skill: 'arcana', description: 'magical containment' },
      { skill: 'intimidation', description: 'destroy by force' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The undead are utterly destroyed and the people rejoice!',
      endsEvent: true,
      modifiers: [
        { type: 'dice', resource: 'unrest', formula: '1d3', negative: true, duration: 'immediate' }
      ]
    },
    success: {
      description: 'The undead are put down and peace is restored.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The undead spread, terrorizing the populace.',
      endsEvent: false,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'A major outbreak devastates the area, overrunning a worksite.',
      endsEvent: false,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ],
      outcomeBadges: [
        textBadge('Destroy 1 worksite', 'fa-skull', 'negative')
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
        { actionId: 'undead-uprising', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata }
      );
      
      if (!preparedCommand) {
        return { resources: [], outcomeBadges: [], warnings: ['No worksites available to destroy'] };
      }
      
      // Store metadata in context for post-apply interactions
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
    DestroyWorksiteHandler.getMapDisplayInteraction('Worksite Overrun by Undead')
  ],

  traits: ["dangerous", "ongoing"],
};
