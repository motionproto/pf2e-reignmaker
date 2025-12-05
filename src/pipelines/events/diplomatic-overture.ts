/**
 * Diplomatic Overture Event Pipeline
 *
 * Success: +1 attitude for 1 random faction
 * Critical Success: +1 attitude for 1 random faction, +1 gold, -1 unrest
 * Critical Failure: -1 attitude for 1 random faction, +1 unrest
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { textBadge } from '../../types/OutcomeBadge';

export const diplomaticOverturePipeline: CheckPipeline = {
  id: 'diplomatic-overture',
  name: 'Diplomatic Overture',
  description: 'A neighboring kingdom reaches out to establish or improve diplomatic relations.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'diplomacy', description: 'formal negotiations' },
      { skill: 'society', description: 'cultural exchange' },
      { skill: 'deception', description: 'gain advantage' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'Relations with the neighboring kingdom improve greatly.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'gold', value: 1, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' },
      ],
      outcomeBadges: [
        textBadge('+1 attitude for 1 random faction', 'fa-handshake', 'positive')
      ]
    },
    success: {
      description: 'Relations with the neighboring kingdom improve.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: [
        textBadge('+1 attitude for 1 random faction', 'fa-handshake', 'positive')
      ]
    },
    failure: {
      description: 'The negotiations go nowhere.',
      endsEvent: true,
      modifiers: []
    },
    criticalFailure: {
      description: 'The negotiations turn sour.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ],
      outcomeBadges: [
        textBadge('-1 attitude for 1 random faction', 'fa-handshake-slash', 'negative')
      ]
    },
  },

  // Preview shows exact faction names and attitudes (after roll, before apply)
  preview: {
    calculate: async (ctx) => {
      const outcomeBadges: any[] = [];
      const warnings: string[] = [];
      
      // Only show preview for success and failure outcomes that affect factions
      if (ctx.outcome === 'failure') {
        return { resources: [], outcomeBadges: [], warnings: [] };
      }
      
      // Import faction service and utilities
      const { factionService } = await import('../../services/factions/index');
      const { adjustAttitudeBySteps } = await import('../../utils/faction-attitude-adjuster');
      
      // Get all available factions
      const allFactions = factionService.getAllFactions();
      if (allFactions.length === 0) {
        warnings.push('No factions available - please add factions to your kingdom first');
        return { 
          resources: [], 
          outcomeBadges: [], 
          warnings 
        };
      }
      
      // Determine steps based on outcome
      const steps = (ctx.outcome === 'criticalSuccess' || ctx.outcome === 'success') ? 1 : -1;
      
      // For positive changes, filter out factions already at max attitude
      // For negative changes, filter out factions already at min attitude
      let availableFactions = [...allFactions];
      if (steps > 0) {
        availableFactions = availableFactions.filter(f => f.attitude !== 'Helpful');
      } else {
        availableFactions = availableFactions.filter(f => f.attitude !== 'Hostile');
      }
      
      if (availableFactions.length === 0) {
        const reason = steps > 0 ? 'All factions already at maximum attitude' : 'All factions already at minimum attitude';
        warnings.push(reason);
        return { 
          resources: [], 
          outcomeBadges: [], 
          warnings 
        };
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
      
      return {
        resources: [],
        outcomeBadges,
        warnings
      };
    }
  },

  execute: async (ctx) => {
    // Only execute faction changes for success/criticalSuccess/criticalFailure
    if (ctx.outcome === 'failure') {
      return { success: true };
    }

    const { getGameCommandRegistry } = await import('../../services/gameCommands/GameCommandHandlerRegistry');
    const registry = getGameCommandRegistry();
    
    // Get the pre-selected faction ID and steps from preview.calculate
    const factionId = ctx.metadata?.selectedFactionId;
    const steps = ctx.metadata?.attitudeSteps;
    
    if (!factionId) {
      console.warn('[Diplomatic Overture] No faction was selected in preview - skipping attitude adjustment');
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
        console.log(`[Diplomatic Overture] Adjusted attitude for faction: ${factionId} by ${steps}`);
      }
    } catch (error) {
      console.error('[Diplomatic Overture] Failed to adjust faction attitude:', error);
    }

    return { success: true };
  },

  traits: ["beneficial"],
};
