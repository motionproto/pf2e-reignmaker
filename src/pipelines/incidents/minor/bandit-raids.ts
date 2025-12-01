/**
 * Bandit Raids Incident Pipeline
 *
 * Renamed from bandit-activity to avoid ID conflict with event
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import type { ValidationResult } from '../../../services/hex-selector/types';
import { textBadge } from '../../../types/OutcomeBadge';

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
      const { createGameCommandsResolver } = await import('../../../services/GameCommandsResolver');
      const resolver = await createGameCommandsResolver();
      const fallbackCommand = await resolver.destroyWorksite(1);
      
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
    {
      type: 'map-selection',
      id: 'affectedHexes',
      mode: 'display',  // EXPLICIT: Display-only mode, no user interaction
      count: (ctx) => {
        // Get metadata from instance (populated by preview.calculate)
        const instance = ctx.kingdom?.pendingOutcomes?.find(i => i.previewId === ctx.instanceId);
        console.log('[bandit-raids] count() - Looking for instance:', {
          instanceId: ctx.instanceId,
          foundInstance: !!instance,
          metadata: instance?.metadata,
          destroyedHexIds: instance?.metadata?.destroyedHexIds
        });
        return instance?.metadata?.destroyedHexIds?.length || 0;
      },
      colorType: 'destroyed',  // Red color for negative outcome
      title: (ctx) => {
        const instance = ctx.kingdom?.pendingOutcomes?.find(i => i.previewId === ctx.instanceId);
        const count = instance?.metadata?.destroyedHexIds?.length || 0;
        return count === 1
          ? 'Worksite Destroyed by Bandits'
          : `${count} Worksites Destroyed by Bandits`;
      },
      // Only run on critical failure when worksites were destroyed
      condition: (ctx) => {
        if (ctx.outcome !== 'criticalFailure') return false;
        
        // Get metadata from instance (synced across clients)
        const instance = ctx.kingdom?.pendingOutcomes?.find(i => i.previewId === ctx.instanceId);
        return instance?.metadata?.destroyedHexIds?.length > 0;
      },
      // Pre-populate with hexes that will be destroyed
      existingHexes: (ctx) => {
        const instance = ctx.kingdom?.pendingOutcomes?.find(i => i.previewId === ctx.instanceId);
        console.log('[bandit-raids] existingHexes() - Looking for instance:', {
          instanceId: ctx.instanceId,
          foundInstance: !!instance,
          metadata: instance?.metadata,
          destroyedHexIds: instance?.metadata?.destroyedHexIds
        });
        return instance?.metadata?.destroyedHexIds || [];
      },
      // Display-only: no validation needed, user can't select hexes
      validateHex: (): ValidationResult => {
        return { valid: false, message: 'Display only - showing affected hexes' };
      },
      allowToggle: false,  // Disable deselection
      getHexInfo: (hexId, ctx) => {
        // Show worksite info for each hex
        const instance = ctx.kingdom?.pendingOutcomes?.find(i => i.previewId === ctx.instanceId);
        const worksite = instance?.metadata?.destroyedWorksites?.find((w: any) => w.id === hexId);
        if (worksite) {
          return `<p style="color: #FF4444;"><strong>Destroyed:</strong> ${worksite.worksiteType}</p><p style="color: #999;">${worksite.name}</p>`;
        }
        return '<p style="color: #FF4444;"><strong>Worksite destroyed</strong></p>';
      }
    }
  ],

  // ✅ REMOVED: No longer needed - now using preview.calculate
};
