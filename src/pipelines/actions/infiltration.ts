/**
 * infiltration Action Pipeline
 * Data from: data/player-actions/infiltration.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';
import { textBadge } from '../../types/OutcomeBadge';
import { adjustFactionAttitudeExecution } from '../../execution';
import { adjustAttitudeBySteps } from '../../utils/faction-attitude-adjuster';

export const infiltrationPipeline = createActionPipeline('infiltration', {
  // No cost - always available
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
      
      // Extract faction name from metadata (entity-selection stores { id, name })
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
        // Calculate resulting attitude after -1 step
        const factionId = ctx.metadata.targetFactionId?.id || ctx.metadata.targetFactionId;
        const faction = ctx.kingdom.factions?.find((f: any) => f.id === factionId);
        
        if (faction) {
          const newAttitude = adjustAttitudeBySteps(faction.attitude, -1);
          if (newAttitude) {
            outcomeBadges.push(textBadge(`${factionName} becomes ${newAttitude}`, 'fa-frown', 'negative'));
          } else {
            // Already at worst attitude (Hostile)
            outcomeBadges.push(textBadge(`${factionName} remains Hostile`, 'fa-frown', 'negative'));
          }
        } else {
          // Fallback if faction not found
          outcomeBadges.push(textBadge(`Relations worsen with ${factionName}`, 'fa-frown', 'negative'));
        }
      }

      return { resources, outcomeBadges, warnings: [] };
    }
  },

  execute: async (ctx) => {
    const { createGameCommandsService } = await import('../../services/GameCommandsService');
    const gameCommandsService = await createGameCommandsService();
    
    // Apply dice roll results and static modifiers via proper service
    if (ctx.outcome === 'criticalSuccess') {
      // Apply +1d4 gold from dice roll
      const goldGained = ctx.resolutionData.diceRolls?.goldGained || 2;
      await gameCommandsService.applyNumericModifiers([
        { resource: 'gold', value: goldGained }
      ], ctx.outcome);
    } else if (ctx.outcome === 'criticalFailure') {
      // Apply -1d4 gold from dice roll + 1 unrest (static)
      const goldLost = ctx.resolutionData.diceRolls?.goldLost || 2;
      await gameCommandsService.applyNumericModifiers([
        { resource: 'gold', value: -goldLost },
        { resource: 'unrest', value: 1 }
      ], ctx.outcome);
      
      // Worsen relations with the target faction
      // Extract ID from entity-selection structure { id, name }
      const factionId = ctx.metadata.targetFactionId?.id || ctx.metadata.targetFactionId;
      await adjustFactionAttitudeExecution(factionId, -1);
    }
    
    return { success: true };
  }
});
