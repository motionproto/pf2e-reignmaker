/**
 * Pilgrimage Event Pipeline
 *
 * Critical Success: +1 Fame, +1 faction attitude, +1d3 gold
 * Success: +1d3 gold (donations)
 * Failure: Nothing
 * Critical Failure: -1 faction attitude
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { textBadge } from '../../types/OutcomeBadge';

export const pilgrimagePipeline: CheckPipeline = {
  id: 'pilgrimage',
  name: 'Pilgrimage',
  description: 'Religious pilgrims seek passage or sanctuary in your kingdom.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'religion', description: 'provide sanctuary' },
      { skill: 'diplomacy', description: 'welcome pilgrims' },
      { skill: 'society', description: 'organize accommodations' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'Word spreads of your hospitality, and donations flow.',
      modifiers: [
        { type: 'static', resource: 'fame', value: 1, duration: 'immediate' },
        { type: 'dice', resource: 'gold', formula: '1d3', duration: 'immediate' },
      ],
      outcomeBadges: [
        textBadge('+1 attitude for 1 random faction', 'fa-handshake', 'positive')
      ]
    },
    success: {
      description: 'Pilgrims leave generous offerings.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d3', duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The pilgrims pass quietly.',
      modifiers: []
    },
    criticalFailure: {
      description: 'You offend the pilgrims\' faith.',
      modifiers: [],
      outcomeBadges: [
        textBadge('-1 attitude for 1 random faction', 'fa-handshake-slash', 'negative')
      ]
    },
  },

  preview: {
    calculate: async (ctx) => {
      const outcomeBadges: any[] = [];
      const warnings: string[] = [];
      
      // Only show faction preview for criticalSuccess and criticalFailure
      if (ctx.outcome !== 'criticalSuccess' && ctx.outcome !== 'criticalFailure') {
        return { resources: [], outcomeBadges: [], warnings: [] };
      }
      
      // Import faction service and utilities
      const { factionService } = await import('../../services/factions/index');
      const { adjustAttitudeBySteps } = await import('../../utils/faction-attitude-adjuster');
      
      // Get all available factions
      const allFactions = factionService.getAllFactions();
      if (allFactions.length === 0) {
        warnings.push('No factions available');
        return { resources: [], outcomeBadges: [], warnings };
      }
      
      // Determine steps based on outcome
      const steps = ctx.outcome === 'criticalSuccess' ? 1 : -1;
      
      // Filter out factions already at max/min attitude
      let availableFactions = [...allFactions];
      if (steps > 0) {
        availableFactions = availableFactions.filter(f => f.attitude !== 'Helpful');
      } else {
        availableFactions = availableFactions.filter(f => f.attitude !== 'Hostile');
      }
      
      if (availableFactions.length === 0) {
        const reason = steps > 0 ? 'All factions already at maximum attitude' : 'All factions already at minimum attitude';
        warnings.push(reason);
        return { resources: [], outcomeBadges: [], warnings };
      }
      
      // Randomly select 1 faction
      const randomIndex = Math.floor(Math.random() * availableFactions.length);
      const selectedFaction = availableFactions[randomIndex];
      
      // Store selected faction ID in metadata for execute step
      if (!ctx.metadata) {
        ctx.metadata = {};
      }
      ctx.metadata.selectedFactionId = selectedFaction.id;
      ctx.metadata.attitudeSteps = steps;
      
      // Create badge showing the change
      const oldAttitude = selectedFaction.attitude;
      const newAttitude = adjustAttitudeBySteps(oldAttitude, steps);
      
      if (newAttitude) {
        const icon = steps > 0 ? 'fa-handshake' : 'fa-handshake-slash';
        const variant = steps > 0 ? 'positive' : 'negative';
        outcomeBadges.push(
          textBadge(`${selectedFaction.name}: ${oldAttitude} → ${newAttitude}`, icon, variant)
        );
      }
      
      return {
        resources: [],
        outcomeBadges,
        warnings
      };
    }
  },

  execute: async (ctx) => {
    // Only execute faction changes for criticalSuccess/criticalFailure
    if (ctx.outcome !== 'criticalSuccess' && ctx.outcome !== 'criticalFailure') {
      return { success: true };
    }

    const { getGameCommandRegistry } = await import('../../services/gameCommands/GameCommandHandlerRegistry');
    const registry = getGameCommandRegistry();
    
    // Get the pre-selected faction ID and steps from preview.calculate
    const factionId = ctx.metadata?.selectedFactionId;
    const steps = ctx.metadata?.attitudeSteps;
    
    if (!factionId) {
      console.warn('[Pilgrimage] No faction was selected in preview - skipping attitude adjustment');
      return { success: true, message: 'No faction selected' };
    }

    // Apply attitude change to the pre-selected faction
    try {
      const prepared = await registry.process(
        { type: 'adjustFactionAttitude', factionId, steps },
        { kingdom: ctx.kingdom, outcome: ctx.outcome, metadata: ctx.metadata }
      );
      
      if (prepared?.commit) {
        await prepared.commit();
        console.log(`[Pilgrimage] Adjusted attitude for faction: ${factionId} by ${steps}`);
      }
    } catch (error) {
      console.error('[Pilgrimage] Failed to adjust faction attitude:', error);
    }

    return { success: true };
  },

  traits: ["beneficial"],
};
