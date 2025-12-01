/**
 * Infiltration Action Pipeline
 * Gather intelligence through espionage
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { textBadge } from '../../types/OutcomeBadge';
import { adjustFactionAttitudeExecution } from '../../execution';
import { adjustAttitudeBySteps } from '../../utils/faction-attitude-adjuster';

export const infiltrationPipeline: CheckPipeline = {
  // === BASE DATA ===
  id: 'infiltration',
  name: 'Infiltration',
  description: 'Deploy spies and agents to gather intelligence on rival kingdoms or potential threats',
  brief: 'Gather intelligence through espionage',
  category: 'foreign-affairs',
  checkType: 'action',

  skills: [
    { skill: 'deception', description: 'false identities' },
    { skill: 'stealth', description: 'covert operations' },
    { skill: 'thievery', description: 'steal secrets' },
    { skill: 'society', description: 'social infiltration' },
    { skill: 'arcana', description: 'magical espionage' },
    { skill: 'acrobatics', description: 'daring infiltration' }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Valuable intel is gathered.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', duration: 'immediate' }
      ],
      manualEffects: ['The GM should disclose sensitive information.']
    },
    success: {
      description: 'Intel is gathered.',
      modifiers: [],
      manualEffects: ['The GM should disclose sensitive information.']
    },
    failure: {
      description: 'The mission fails.',
      modifiers: []
    },
    criticalFailure: {
      description: 'Your spies are captured.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
        { type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' }
      ]
    }
  },

  // === TYPESCRIPT LOGIC ===
  requirements: () => ({ met: true }),

  preRollInteractions: [
    {
      type: 'entity-selection',
      id: 'targetFactionId',
      label: 'Select faction to infiltrate',
      entityType: 'faction'
    }
  ],

  postRollInteractions: [
    {
      type: 'dice',
      id: 'goldGained',
      formula: '1d4',
      storeAs: 'goldGained',
      condition: (ctx) => ctx.outcome === 'criticalSuccess'
    },
    {
      type: 'dice',
      id: 'goldLost',
      formula: '1d4',
      storeAs: 'goldLost',
      condition: (ctx) => ctx.outcome === 'criticalFailure'
    }
  ],

  preview: {
    calculate: (ctx) => {
      const resources = [];
      
      const factionName = ctx.metadata.targetFactionId?.name || 'the target faction';

      if (ctx.outcome === 'criticalSuccess') {
        const goldGained = ctx.resolutionData.diceRolls.goldGained || 2;
        resources.push({ resource: 'gold', value: goldGained });
      } else if (ctx.outcome === 'criticalFailure') {
        const goldLost = ctx.resolutionData.diceRolls.goldLost || 2;
        resources.push({ resource: 'gold', value: -goldLost });
        resources.push({ resource: 'unrest', value: 1 });
      }

      const outcomeBadges = [];
      if (ctx.outcome === 'criticalSuccess' || ctx.outcome === 'success') {
        outcomeBadges.push(textBadge(`GM will disclose sensitive information about ${factionName}`, 'fa-user-secret', 'positive'));
      } else if (ctx.outcome === 'criticalFailure') {
        const factionId = ctx.metadata.targetFactionId?.id || ctx.metadata.targetFactionId;
        const faction = ctx.kingdom.factions?.find((f: any) => f.id === factionId);
        
        if (faction) {
          const newAttitude = adjustAttitudeBySteps(faction.attitude, -1);
          if (newAttitude) {
            outcomeBadges.push(textBadge(`${factionName} becomes ${newAttitude}`, 'fa-frown', 'negative'));
          } else {
            outcomeBadges.push(textBadge(`${factionName} remains Hostile`, 'fa-frown', 'negative'));
          }
        } else {
          outcomeBadges.push(textBadge(`Relations worsen with ${factionName}`, 'fa-frown', 'negative'));
        }
      }

      return { resources, outcomeBadges, warnings: [] };
    }
  },

  execute: async (ctx) => {
    const { createGameCommandsService } = await import('../../services/GameCommandsService');
    const gameCommandsService = await createGameCommandsService();
    
    if (ctx.outcome === 'criticalSuccess') {
      const goldGained = ctx.resolutionData.diceRolls?.goldGained || 2;
      await gameCommandsService.applyNumericModifiers([
        { resource: 'gold', value: goldGained }
      ], ctx.outcome);
    } else if (ctx.outcome === 'criticalFailure') {
      const goldLost = ctx.resolutionData.diceRolls?.goldLost || 2;
      await gameCommandsService.applyNumericModifiers([
        { resource: 'gold', value: -goldLost },
        { resource: 'unrest', value: 1 }
      ], ctx.outcome);
      
      const factionId = ctx.metadata.targetFactionId?.id || ctx.metadata.targetFactionId;
      await adjustFactionAttitudeExecution(factionId, -1);
    }
    
    return { success: true };
  }
};
