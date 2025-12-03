/**
 * International Crisis Incident Pipeline
 *
 * Failure: 2 random factions' attitudes worsen by -1
 * Critical Failure: 3 random factions' attitudes worsen by -1, -1 Fame
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { textBadge } from '../../../types/OutcomeBadge';

export const internationalCrisisPipeline: CheckPipeline = {
  id: 'international-crisis',
  name: 'International Crisis',
  description: 'Multiple kingdoms turn against you due to internal chaos',
  checkType: 'incident',
  severity: 'major',

  skills: [
      { skill: 'diplomacy', description: 'damage control' },
      { skill: 'deception', description: 'blame shifting' },
      { skill: 'society', description: 'formal reparations' },
      { skill: 'performance', description: 'public relations' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'Your kingdom handles the crisis masterfully, improving your international reputation.',
      modifiers: []  // No modifiers needed (+1 Fame auto-applied by UnifiedCheckHandler)
    },
    success: {
      description: 'The crisis is contained.',
      modifiers: []
    },
    failure: {
      description: 'Diplomatic relations are severely damaged.',
      modifiers: [],
      outcomeBadges: [
        textBadge('-1 attitude for 2 random factions', 'fa-handshake-slash', 'negative')
      ]
    },
    criticalFailure: {
      description: 'Multiple kingdoms turn against you.',
      modifiers: [
        { type: 'static', resource: 'fame', value: -1, duration: 'immediate' }
      ],
      outcomeBadges: [
        textBadge('-1 attitude for 3 random factions', 'fa-handshake-slash', 'negative')
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

      // Determine number of affected factions
      const factionCount = ctx.outcome === 'failure' ? 2 : 3;

      // Get available factions
      const availableFactions = ctx.kingdom.factions?.filter((f: any) => f.attitude !== 'Hostile') || [];
      
      if (availableFactions.length === 0) {
        warnings.push('No factions available for attitude change');
        return {
          resources: [],
          outcomeBadges: [],
          warnings
        };
      }

      // Select random factions (without duplicates)
      const selectedFactions: any[] = [];
      const shuffled = [...availableFactions].sort(() => Math.random() - 0.5);
      const actualCount = Math.min(factionCount, shuffled.length);
      
      for (let i = 0; i < actualCount; i++) {
        selectedFactions.push(shuffled[i]);
      }

      if (selectedFactions.length < factionCount) {
        warnings.push(`Only ${selectedFactions.length} faction(s) available (needed ${factionCount})`);
      }

      ctx.metadata.selectedFactionIds = selectedFactions.map(f => f.id);
      
      // Import attitude adjustment utility
      const { adjustAttitudeBySteps } = await import('../../../utils/faction-attitude-adjuster');
      
      // Create badge for each selected faction
      for (const faction of selectedFactions) {
        const oldAttitude = faction.attitude;
        const newAttitude = adjustAttitudeBySteps(oldAttitude, -1);
        
        if (newAttitude) {
          outcomeBadges.push(
            textBadge(`${faction.name}: ${oldAttitude} → ${newAttitude}`, 'fa-handshake-slash', 'negative')
          );
        } else {
          outcomeBadges.push(
            textBadge(`${faction.name} remains ${oldAttitude}`, 'fa-handshake-slash', 'info')
          );
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
    // Only execute for failure outcomes
    if (ctx.outcome !== 'failure' && ctx.outcome !== 'criticalFailure') {
      return { success: true };
    }

    const { getGameCommandRegistry } = await import('../../../services/gameCommands/GameCommandHandlerRegistry');
    const registry = getGameCommandRegistry();
    
    // Get the pre-selected faction IDs from preview.calculate
    const selectedFactionIds = ctx.metadata?.selectedFactionIds || [];
    
    if (selectedFactionIds.length === 0) {
      console.warn('[International Crisis] No factions were selected in preview - skipping attitude adjustments');
      return { success: true, message: 'No factions selected' };
    }

    // Apply attitude changes to the pre-selected factions
    for (const factionId of selectedFactionIds) {
      try {
        const prepared = await registry.process(
          { type: 'adjustFactionAttitude', factionId, steps: -1 },
          { kingdom: ctx.kingdom, outcome: ctx.outcome, metadata: ctx.metadata }
        );
        
        if (prepared?.commit) {
          await prepared.commit();
          console.log(`[International Crisis] Adjusted attitude for faction: ${factionId}`);
        }
      } catch (error) {
        console.error('[International Crisis] Failed to adjust faction attitude:', error);
      }
    }

    return { success: true };
  },

  traits: ["dangerous"],
};
