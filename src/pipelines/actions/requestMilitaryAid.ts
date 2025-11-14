/**
 * Request Military Aid Action Pipeline
 *
 * Call for allied troops in battle.
 * Converted from data/player-actions/request-military-aid.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { recruitArmyExecution } from '../../execution/armies/recruitArmy';
import { adjustFactionAttitudeExecution } from '../../execution/factions/adjustFactionAttitude';

export const requestMilitaryAidPipeline: CheckPipeline = {
  id: 'request-military-aid',
  name: 'Request Military Aid',
  description: 'Call upon allies to provide troops or military support during conflicts',
  checkType: 'action',
  category: 'foreign-affairs',

  skills: [
    { skill: 'diplomacy', description: 'alliance obligations' },
    { skill: 'intimidation', description: 'pressure tactics' },
    { skill: 'society', description: 'mutual defense' },
    { skill: 'arcana', description: 'magical pacts' }
  ],

  // Pre-roll: Select friendly faction
  preRollInteractions: [
    {
      type: 'entity-selection',
      id: 'factionId',
      label: 'Select friendly faction for military aid',
      entityType: 'faction'
    }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your ally sends elite reinforcements to support your cause.',
      modifiers: []
    },
    success: {
      description: 'Your ally provides military equipment and supplies.',
      modifiers: []
    },
    failure: {
      description: 'Your ally cannot help at this time.',
      modifiers: []
    },
    criticalFailure: {
      description: 'Your ally is offended by the request.',
      modifiers: []
    }
  },

  preview: {
    calculate: (ctx) => {
      const specialEffects = [];

      if (ctx.outcome === 'criticalSuccess') {
        specialEffects.push({
          type: 'entity' as const,
          message: `Allied army will be recruited (exempt from upkeep)`,
          variant: 'positive' as const
        });
      } else if (ctx.outcome === 'success') {
        specialEffects.push({
          type: 'status' as const,
          message: 'Military equipment provided',
          variant: 'positive' as const
        });
      } else if (ctx.outcome === 'criticalFailure') {
        specialEffects.push({
          type: 'status' as const,
          message: `Relations worsen with ${ctx.metadata.factionName || 'faction'}`,
          variant: 'negative' as const
        });
      }

      return { resources: [], specialEffects, warnings: [] };
    }
  },

  execute: async (ctx) => {
    if (ctx.outcome === 'criticalSuccess') {
      // Recruit allied army (exempt from upkeep)
      const { getPartyLevel } = await import('../../services/commands/armies/armyCommands');
      const { ARMY_TYPES } = await import('../../utils/armyHelpers');

      const level = getPartyLevel();
      const factionName = ctx.metadata.factionName || 'Allied';

      await recruitArmyExecution({
        name: `${factionName} Reinforcements`,
        level,
        type: 'infantry', // Default type
        image: ARMY_TYPES.infantry.image,
        exemptFromUpkeep: true,
        supportedBy: factionName
      });
    } else if (ctx.outcome === 'success') {
      // Equipment/supplies - could be implemented as resources
      // For now, just a notification
    } else if (ctx.outcome === 'criticalFailure') {
      await adjustFactionAttitudeExecution(ctx.metadata.factionId, -1);
    }
  }
};
