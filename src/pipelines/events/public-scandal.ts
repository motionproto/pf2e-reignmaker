/**
 * Public Scandal Event Pipeline
 *
 * A leader is implicated in an embarrassing or criminal situation.
 * Critical success implicates a rival faction, critical failure damages faction relations.
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { textBadge } from '../../types/OutcomeBadge';

export const publicScandalPipeline: CheckPipeline = {
  id: 'public-scandal',
  name: 'Public Scandal',
  description: 'A leader is implicated in an embarrassing or criminal situation.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'deception', description: 'cover up' },
      { skill: 'diplomacy', description: 'public apology' },
      { skill: 'intimidation', description: 'silence critics' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'You turn the tables - a rival faction is implicated instead!',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ],
      outcomeBadges: [
        textBadge('+1 attitude for 1 random faction', 'fa-handshake', 'positive')
      ]
    },
    success: {
      description: 'The scandal is contained and quickly forgotten.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'Covering up the scandal requires substantial bribes.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
        { type: 'dice', resource: 'gold', formula: '1d3', negative: true, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'The scandal spreads and factions distance themselves from your kingdom.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
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
      
      // Only show preview for outcomes that affect factions
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
      
      // Filter factions based on direction
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
      } else {
        outcomeBadges.push(
          textBadge(`${selectedFaction.name} remains ${oldAttitude}`, 'fa-handshake', 'info')
        );
      }
      
      return { resources: [], outcomeBadges, warnings };
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
      console.warn('[Public Scandal] No faction was selected in preview - skipping attitude adjustment');
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
        console.log(`[Public Scandal] Adjusted attitude for faction: ${factionId} by ${steps}`);
      }
    } catch (error) {
      console.error('[Public Scandal] Failed to adjust faction attitude:', error);
    }

    return { success: true };
  },

  traits: ["dangerous"],
};
