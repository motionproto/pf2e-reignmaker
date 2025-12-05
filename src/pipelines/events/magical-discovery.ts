/**
 * Magical Discovery Event Pipeline
 *
 * Critical Success: +1 faction attitude (impressed by arcane mastery)
 * Success: +1d3 gold (artifacts can be traded)
 * Failure: Destroy 1 worksite (ley line destabilization)
 * Critical Failure: -1 faction attitude + 1 unrest (neighbors fear your instability)
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { textBadge } from '../../types/OutcomeBadge';

export const magicalDiscoveryPipeline: CheckPipeline = {
  id: 'magical-discovery',
  name: 'Magical Discovery',
  description: 'A powerful magical site or artifact is discovered in your kingdom.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'arcana', description: 'understand the magic' },
      { skill: 'religion', description: 'divine its purpose' },
      { skill: 'occultism', description: 'unlock its secrets' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'Your magical prowess earns respect from neighboring realms.',
      modifiers: [],
      outcomeBadges: [
        textBadge('+1 attitude for 1 random faction', 'fa-handshake', 'positive')
      ]
    },
    success: {
      description: 'The discovery yields valuable artifacts that can be traded.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d3', duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The magic disrupts nearby ley lines, destabilizing the land.',
      modifiers: [],
      outcomeBadges: [
        textBadge('Destroy 1 worksite', 'fa-hammer', 'negative')
      ]
    },
    criticalFailure: {
      description: 'A magical disaster erupts. Neighbors fear your instability.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ],
      outcomeBadges: [
        textBadge('-1 attitude for 1 random faction', 'fa-handshake-slash', 'negative')
      ]
    },
  },

  preview: {
    calculate: async (ctx) => {
      const outcomeBadges: any[] = [];
      const warnings: string[] = [];
      
      // Initialize metadata
      if (!ctx.metadata) {
        ctx.metadata = {};
      }
      
      // Critical Success: +1 faction attitude
      if (ctx.outcome === 'criticalSuccess') {
        const { factionService } = await import('../../services/factions/index');
        const { adjustAttitudeBySteps } = await import('../../utils/faction-attitude-adjuster');
        
        const allFactions = factionService.getAllFactions();
        const availableFactions = allFactions.filter(f => f.attitude !== 'Helpful');
        
        if (availableFactions.length === 0) {
          warnings.push('All factions already at maximum attitude');
        } else {
          const randomIndex = Math.floor(Math.random() * availableFactions.length);
          const selectedFaction = availableFactions[randomIndex];
          
          ctx.metadata.selectedFactionId = selectedFaction.id;
          ctx.metadata.attitudeSteps = 1;
          
          const oldAttitude = selectedFaction.attitude;
          const newAttitude = adjustAttitudeBySteps(oldAttitude, 1);
          
          if (newAttitude) {
            outcomeBadges.push(
              textBadge(`${selectedFaction.name}: ${oldAttitude} → ${newAttitude}`, 'fa-handshake', 'positive')
            );
          }
        }
      }
      
      // Failure: Destroy 1 worksite
      if (ctx.outcome === 'failure') {
        const { DestroyWorksiteHandler } = await import('../../services/gameCommands/handlers/DestroyWorksiteHandler');
        const handler = new DestroyWorksiteHandler();
        
        const preparedCommand = await handler.prepare(
          { type: 'destroyWorksite', count: 1 },
          { actionId: 'magical-discovery', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
        );
        
        if (preparedCommand) {
          ctx.metadata._preparedDestroyWorksite = preparedCommand;
          outcomeBadges.push(preparedCommand.outcomeBadge);
        } else {
          warnings.push('No worksites available to destroy');
        }
      }
      
      // Critical Failure: -1 faction attitude
      if (ctx.outcome === 'criticalFailure') {
        const { factionService } = await import('../../services/factions/index');
        const { adjustAttitudeBySteps } = await import('../../utils/faction-attitude-adjuster');
        
        const allFactions = factionService.getAllFactions();
        const availableFactions = allFactions.filter(f => f.attitude !== 'Hostile');
        
        if (availableFactions.length === 0) {
          warnings.push('All factions already at minimum attitude');
        } else {
          const randomIndex = Math.floor(Math.random() * availableFactions.length);
          const selectedFaction = availableFactions[randomIndex];
          
          ctx.metadata.selectedFactionId = selectedFaction.id;
          ctx.metadata.attitudeSteps = -1;
          
          const oldAttitude = selectedFaction.attitude;
          const newAttitude = adjustAttitudeBySteps(oldAttitude, -1);
          
          if (newAttitude) {
            outcomeBadges.push(
              textBadge(`${selectedFaction.name}: ${oldAttitude} → ${newAttitude}`, 'fa-handshake-slash', 'negative')
            );
          }
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
    const { getGameCommandRegistry } = await import('../../services/gameCommands/GameCommandHandlerRegistry');
    const registry = getGameCommandRegistry();
    
    // Critical Success: Apply faction attitude increase
    if (ctx.outcome === 'criticalSuccess') {
      const factionId = ctx.metadata?.selectedFactionId;
      if (factionId) {
        try {
          const prepared = await registry.process(
            { type: 'adjustFactionAttitude', factionId, steps: 1 },
            { kingdom: ctx.kingdom, outcome: ctx.outcome, metadata: ctx.metadata }
          );
          if (prepared?.commit) {
            await prepared.commit();
          }
        } catch (error) {
          console.error('[Magical Discovery] Failed to adjust faction attitude:', error);
        }
      }
    }
    
    // Failure: Destroy worksite
    if (ctx.outcome === 'failure') {
      const preparedCommand = ctx.metadata?._preparedDestroyWorksite;
      if (preparedCommand?.commit) {
        await preparedCommand.commit();
      }
    }
    
    // Critical Failure: Apply faction attitude decrease
    if (ctx.outcome === 'criticalFailure') {
      const factionId = ctx.metadata?.selectedFactionId;
      if (factionId) {
        try {
          const prepared = await registry.process(
            { type: 'adjustFactionAttitude', factionId, steps: -1 },
            { kingdom: ctx.kingdom, outcome: ctx.outcome, metadata: ctx.metadata }
          );
          if (prepared?.commit) {
            await prepared.commit();
          }
        } catch (error) {
          console.error('[Magical Discovery] Failed to adjust faction attitude:', error);
        }
      }
    }
    
    return { success: true };
  },

  // Show destroyed worksites on map after failure
  postApplyInteractions: [
    {
      type: 'map-display',
      id: 'destroyedWorksites',
      title: 'Worksites Destroyed by Magical Disruption',
      colorType: 'danger',
      condition: (ctx: any) => {
        if (ctx.outcome !== 'failure') return false;
        const destroyedHexIds = ctx.metadata?.destroyedHexIds || [];
        return destroyedHexIds.length > 0;
      },
      getHexIds: (ctx: any) => ctx.metadata?.destroyedHexIds || []
    }
  ],

  traits: ["dangerous"],
};
