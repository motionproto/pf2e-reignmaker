/**
 * Natural Disaster Event Pipeline
 *
 * Earthquake, tornado, wildfire, or severe flooding strikes the kingdom.
 * Failure damages structures and worksites, critical failure is devastating.
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { DestroyWorksiteHandler } from '../../services/gameCommands/handlers/DestroyWorksiteHandler';
import { DamageStructureHandler } from '../../services/gameCommands/handlers/DamageStructureHandler';

export const naturalDisasterPipeline: CheckPipeline = {
  id: 'natural-disaster',
  name: 'Natural Disaster',
  description: 'Earthquake, tornado, wildfire, or severe flooding strikes the kingdom.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'survival', description: 'evacuation and rescue' },
      { skill: 'crafting', description: 'emergency shelters' },
      { skill: 'society', description: 'coordinate relief' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'Damage is minimal.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    success: {
      description: 'Some damage occurs.',
      endsEvent: true,
      modifiers: [
        { type: 'choice-buttons', resources: ["lumber", "ore", "food", "stone"], value: 1, negative: true, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'Major damage occurs.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ],
      gameCommands: [
        { type: 'damageStructure', count: 1 },
        { type: 'destroyWorksite', count: 1 }
      ]
    },
    criticalFailure: {
      description: 'The disaster is devastating.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ],
      gameCommands: [
        { type: 'damageStructure', count: '1d3' },
        { type: 'destroyWorksite', count: '1d3' }
      ]
    },
  },

  preview: {
    calculate: async (ctx) => {
      // Only generate badges for failure/criticalFailure
      if (ctx.outcome !== 'failure' && ctx.outcome !== 'criticalFailure') {
        return { resources: [], outcomeBadges: [] };
      }

      const outcomeBadges: any[] = [];
      const commandContext = {
        actionId: 'natural-disaster',
        outcome: ctx.outcome,
        kingdom: ctx.kingdom,
        metadata: ctx.metadata || {}
      };

      // Get damage structure count based on outcome
      const damageCount = ctx.outcome === 'criticalFailure' ? '1d3' : 1;
      const worksiteCount = ctx.outcome === 'criticalFailure' ? '1d3' : 1;

      // Prepare damage structure command and get badges
      const damageHandler = new DamageStructureHandler();
      const damageCommand = await damageHandler.prepare(
        { type: 'damageStructure', count: damageCount },
        commandContext
      );

      if (damageCommand) {
        // Store for execute step
        ctx.metadata._preparedDamageStructure = damageCommand;
        
        // Add badges (can be single or array)
        if (damageCommand.outcomeBadges) {
          outcomeBadges.push(...damageCommand.outcomeBadges);
        } else if (damageCommand.outcomeBadge) {
          outcomeBadges.push(damageCommand.outcomeBadge);
        }
      }

      // Prepare destroy worksite command and get badges
      const worksiteHandler = new DestroyWorksiteHandler();
      const worksiteCommand = await worksiteHandler.prepare(
        { type: 'destroyWorksite', count: worksiteCount },
        commandContext
      );

      if (worksiteCommand) {
        // Store for execute step
        ctx.metadata._preparedDestroyWorksite = worksiteCommand;
        
        // Store metadata for post-apply interaction (hex display)
        if (worksiteCommand.metadata) {
          ctx.metadata.destroyedHexIds = worksiteCommand.metadata.destroyedHexIds;
          ctx.metadata.destroyedWorksites = worksiteCommand.metadata.destroyedWorksites;
        }
        
        // Add badges (can be single or array)
        if (worksiteCommand.outcomeBadges) {
          outcomeBadges.push(...worksiteCommand.outcomeBadges);
        } else if (worksiteCommand.outcomeBadge) {
          outcomeBadges.push(worksiteCommand.outcomeBadge);
        }
      }

      return { resources: [], outcomeBadges };
    }
  },

  // Execute the prepared commands
  execute: async (ctx) => {
    // Only execute for failure/criticalFailure
    if (ctx.outcome !== 'failure' && ctx.outcome !== 'criticalFailure') {
      return { success: true };
    }

    // Execute prepared damage structure command
    const damageCommand = ctx.metadata?._preparedDamageStructure;
    if (damageCommand?.commit) {
      await damageCommand.commit();
    }

    // Execute prepared destroy worksite command
    const worksiteCommand = ctx.metadata?._preparedDestroyWorksite;
    if (worksiteCommand?.commit) {
      await worksiteCommand.commit();
    }

    return { success: true };
  },

  // Show destroyed worksites on map after applying result
  postApplyInteractions: [
    {
      ...DestroyWorksiteHandler.getMapDisplayInteraction('Worksites Destroyed by Disaster'),
      condition: (ctx: any) => {
        // Only show for failure/criticalFailure outcomes
        if (ctx.outcome !== 'failure' && ctx.outcome !== 'criticalFailure') return false;
        const instance = ctx.kingdom?.pendingOutcomes?.find((i: any) => i.previewId === ctx.instanceId);
        return (instance?.metadata?.destroyedHexIds?.length > 0) || (ctx.metadata?.destroyedHexIds?.length > 0);
      }
    }
  ],

  traits: ["dangerous"],
};
