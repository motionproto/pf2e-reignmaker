/**
 * Emigration Threat Incident Pipeline
 *
 * Failure: Lose 1d4 of a random commodity (food, lumber, stone, ore)
 * Critical Failure: Lose 1d4 of a random commodity AND destroy 1 worksite
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import type { ValidationResult } from '../../../services/hex-selector/types';
import type { GameCommandContext } from '../../../services/gameCommands/GameCommandHandler';
import { diceBadge, textBadge } from '../../../types/OutcomeBadge';

// Random commodity resources (not gold - that's not a commodity)
const COMMODITY_RESOURCES = ['food', 'lumber', 'stone', 'ore'] as const;

function pickRandomCommodity(): string {
  return COMMODITY_RESOURCES[Math.floor(Math.random() * COMMODITY_RESOURCES.length)];
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const emigrationThreatPipeline: CheckPipeline = {
  id: 'emigration-threat',
  name: 'Emigration Threat',
  description: 'Citizens threaten to leave your kingdom permanently',
  checkType: 'incident',
  tier: 1,  // minor = 1

  skills: [
    { skill: 'diplomacy', description: 'convince to stay' },
    { skill: 'society', description: 'address concerns' },
    { skill: 'religion', description: 'appeal to faith' },
    { skill: 'nature', description: 'improve local conditions' },
  ],

  outcomes: {
    success: {
      description: 'The population stays.',
      modifiers: []
    },
    failure: {
      description: 'Citizens abandon ongoing projects, taking resources with them.',
      modifiers: [],
      // Show what will happen (specific resource chosen at roll time)
      outcomeBadges: [
        textBadge('Lose 1d4 of a random resource', 'fa-box', 'negative')
      ]
    },
    criticalFailure: {
      description: 'Mass emigration causes chaos. Citizens flee with resources and abandon worksites.',
      modifiers: [],
      // Show what will happen (specific details chosen at roll time)
      outcomeBadges: [
        textBadge('Lose 1d4 of a random resource', 'fa-box', 'negative'),
        textBadge('1 random worksite destroyed', 'fa-hammer', 'negative')
      ]
    },
  },

  preview: {
    calculate: async (ctx) => {
      const outcomeBadges: any[] = [];
      const warnings: string[] = [];

      // Only show preview for failure outcomes
      if (ctx.outcome !== 'failure' && ctx.outcome !== 'criticalFailure') {
        return { resources: [], outcomeBadges: [], warnings: [] };
      }

      // Pick a random commodity resource
      const randomResource = pickRandomCommodity();
      
      // Store in metadata for reference
      if (!ctx.metadata) {
        ctx.metadata = {};
      }
      ctx.metadata._randomResource = randomResource;

      // Create dice badge for the random resource loss
      // Template must match pattern: "Lose {{value}} [Resource]" for auto-conversion
      outcomeBadges.push(
        diceBadge(`Lose {{value}} ${capitalizeFirst(randomResource)}`, 'fa-box', '1d4', 'negative')
      );

      // For critical failure, also handle worksite destruction
      if (ctx.outcome === 'criticalFailure') {
        const { DestroyWorksiteHandler } = await import('../../../services/gameCommands/handlers/DestroyWorksiteHandler');
        const handler = new DestroyWorksiteHandler();

        const preparedCommand = await handler.prepare(
          { type: 'destroyWorksite', count: 1 },
          { actionId: 'emigration-threat', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
        );

        if (preparedCommand) {
          // Store metadata for post-apply interactions
          if (preparedCommand.metadata) {
            Object.assign(ctx.metadata, preparedCommand.metadata);
          }

          // Store prepared command for execute step
          ctx.metadata._preparedDestroyWorksite = preparedCommand;

          // Add worksite badge
          outcomeBadges.push(preparedCommand.outcomeBadge);
        }
      }

      return {
        resources: [],
        outcomeBadges,
        warnings
      };
    }
  },

  execute: async (ctx) => {
    // Resource modifiers are applied automatically via ResolutionDataBuilder
    // from the dice badges returned by preview.calculate
    
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
        { kingdom: ctx.kingdom, outcome: ctx.outcome, metadata: ctx.metadata, actionId: 'emigration-threat', pendingActions: [], pendingState: {} }
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

  // Post-apply interaction to show destroyed worksites on map (critical failure only)
  postApplyInteractions: [
    {
      type: 'map-selection',
      id: 'affectedHexes',
      mode: 'display',
      count: (ctx: any) => {
        const instance = ctx.kingdom?.pendingOutcomes?.find((i: any) => i.previewId === ctx.instanceId);
        return instance?.metadata?.destroyedHexIds?.length || 0;
      },
      colorType: 'destroyed',
      title: (ctx: any) => {
        const instance = ctx.kingdom?.pendingOutcomes?.find((i: any) => i.previewId === ctx.instanceId);
        const count = instance?.metadata?.destroyedHexIds?.length || 0;
        return count === 1
          ? 'Worksite Abandoned by Emigrants'
          : `${count} Worksites Abandoned by Emigrants`;
      },
      condition: (ctx: any) => {
        if (ctx.outcome !== 'criticalFailure') return false;
        const instance = ctx.kingdom?.pendingOutcomes?.find((i: any) => i.previewId === ctx.instanceId);
        return instance?.metadata?.destroyedHexIds?.length > 0;
      },
      existingHexes: (ctx: any) => {
        const instance = ctx.kingdom?.pendingOutcomes?.find((i: any) => i.previewId === ctx.instanceId);
        return instance?.metadata?.destroyedHexIds || [];
      },
      validateHex: (): ValidationResult => {
        return { valid: false, message: 'Display only - showing affected hexes' };
      },
      allowToggle: false,
      getHexInfo: (hexId: string, ctx: any) => {
        const instance = ctx.kingdom?.pendingOutcomes?.find((i: any) => i.previewId === ctx.instanceId);
        const worksite = instance?.metadata?.destroyedWorksites?.find((w: any) => w.id === hexId);
        if (worksite) {
          return `<p style="color: #FF4444;"><strong>Abandoned:</strong> ${worksite.worksiteType}</p><p style="color: #999;">${worksite.name}</p>`;
        }
        return '<p style="color: #FF4444;"><strong>Worksite abandoned</strong></p>';
      }
    }
  ],

  traits: ["dangerous"],
};
