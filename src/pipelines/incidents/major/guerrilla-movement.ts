/**
 * Guerrilla Movement Incident Pipeline
 *
 * Failure: 1d3 contiguous hexes seized by rebels faction
 * Critical Failure: 2d3 contiguous hexes seized + enemy army spawned
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import type { GameCommandContext } from '../../../services/gameCommands/GameCommandHandler';
import { textBadge } from '../../../types/OutcomeBadge';
import { SeizeHexesHandler } from '../../../services/gameCommands/handlers/SeizeHexesHandler';

export const guerrillaMovementPipeline: CheckPipeline = {
  id: 'guerrilla-movement',
  name: 'Guerrilla Movement',
  description: 'Armed rebels seize control of kingdom territory',
  checkType: 'incident',
  severity: 'major',

  skills: [
      { skill: 'diplomacy', description: 'negotiate with rebels' },
      { skill: 'intimidation', description: 'crush rebellion' },
      { skill: 'society', description: 'address grievances' },
      { skill: 'religion', description: 'appeal to faith' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'Your kingdom utterly defeats the guerrilla movement and captures their leaders.',
      modifiers: []  // No modifiers needed (+1 Fame auto-applied by UnifiedCheckHandler)
    },
    success: {
      description: 'The rebellion is dispersed.',
      modifiers: []
    },
    failure: {
      description: 'Rebels seize territory.',
      modifiers: [],
      outcomeBadges: [
        textBadge('1d3 contiguous hexes seized by rebels', 'fa-flag', 'negative')
      ]
    },
    criticalFailure: {
      description: 'Rebels establish a stronghold.',
      modifiers: [],
      outcomeBadges: [
        textBadge('2d3 contiguous hexes seized by rebels', 'fa-flag', 'negative'),
        textBadge('Enemy army spawned (level = kingdom level - 1)', 'fa-shield', 'negative')
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

      // Initialize metadata
      if (!ctx.metadata) {
        ctx.metadata = {};
      }

      // Determine hex count based on outcome
      const hexCount = ctx.outcome === 'failure' ? '1d3' : '2d3';

      // Prepare hex seizure
      const { SeizeHexesHandler } = await import('../../../services/gameCommands/handlers/SeizeHexesHandler');
      const seizeHandler = new SeizeHexesHandler();
      
      const preparedSeize = await seizeHandler.prepare(
        { type: 'seizeHexes', count: hexCount },
        { actionId: 'guerrilla-movement', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
      );

      if (preparedSeize) {
        // Store metadata for post-apply interactions (map display)
        if (preparedSeize.metadata) {
          Object.assign(ctx.metadata, preparedSeize.metadata);
        }
        
        // Store prepared command for execute step
        ctx.metadata._preparedSeizeHexes = preparedSeize;
        
        // Add badge
        outcomeBadges.push(preparedSeize.outcomeBadge);
      } else {
        warnings.push('No eligible hexes available to seize');
      }

      // For critical failure, also spawn enemy army
      if (ctx.outcome === 'criticalFailure') {
        const { SpawnEnemyArmyHandler } = await import('../../../services/gameCommands/handlers/SpawnEnemyArmyHandler');
        const armyHandler = new SpawnEnemyArmyHandler();
        
        const preparedArmy = await armyHandler.prepare(
          { 
            type: 'spawnEnemyArmy', 
            factionId: ctx.metadata.rebelsFactionId || 'rebels',
            factionName: 'Rebels'
            // armyName not provided - handler will generate random type name (e.g., "Rebel Infantry")
          },
          { actionId: 'guerrilla-movement', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
        );

        if (preparedArmy) {
          // Store metadata for post-apply interactions
          if (preparedArmy.metadata) {
            Object.assign(ctx.metadata, preparedArmy.metadata);
          }
          
          // Store prepared command for execute step
          ctx.metadata._preparedSpawnArmy = preparedArmy;
          
          // Add badge
          outcomeBadges.push(preparedArmy.outcomeBadge);
        } else {
          warnings.push('Could not prepare enemy army');
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
    // Only execute game commands on failure or critical failure
    if (ctx.outcome !== 'failure' && ctx.outcome !== 'criticalFailure') {
      return { success: true };
    }

    // Execute hex seizure
    const preparedSeize = ctx.metadata._preparedSeizeHexes;
    if (preparedSeize?.commit) {
      await preparedSeize.commit();
      console.log('[Guerrilla Movement] Hexes seized by rebels');
    }

    // Execute army spawning (critical failure only)
    if (ctx.outcome === 'criticalFailure') {
      const preparedArmy = ctx.metadata._preparedSpawnArmy;
      if (preparedArmy?.commit) {
        await preparedArmy.commit();
        console.log('[Guerrilla Movement] Enemy army spawned');
      }
    }

    return { success: true };
  },

  // Post-apply interaction to show seized hexes on map
  postApplyInteractions: [
    SeizeHexesHandler.getMapDisplayInteraction('Territory Seized by Rebels')
  ],

  traits: ["dangerous"],
};
