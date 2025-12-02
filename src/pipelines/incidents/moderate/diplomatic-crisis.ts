/**
 * Diplomatic Crisis Incident Pipeline
 *
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { textBadge } from '../../../types/OutcomeBadge';

export const diplomaticCrisisPipeline: CheckPipeline = {
  id: 'diplomatic-crisis',
  name: 'Diplomatic Crisis',
  description: 'A serious diplomatic crisis threatens relations',
  checkType: 'incident',
  tier: 'moderate',

  skills: [
      { skill: 'diplomacy', description: 'smooth over' },
      { skill: 'deception', description: 'deny responsibility' },
      { skill: 'society', description: 'formal apology' },
    ],

  outcomes: {
    success: {
      description: 'Relations are maintained.',
      modifiers: []
    },
    failure: {
      description: 'A neighboring kingdom\'s attitude worsens. Costly reparations are needed.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' }
      ],
      outcomeBadges: [
        textBadge('-1 attitude for 1 random faction', 'fa-handshake-slash', 'negative')
      ]
    },
    criticalFailure: {
      description: 'Multiple kingdoms turn against you. Extensive diplomatic efforts required.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d4', negative: true, duration: 'immediate' }
      ],
      outcomeBadges: [
        textBadge('-1 attitude for 2 random factions', 'fa-handshake-slash', 'negative')
      ]
    },
  },

  // Preview shows exact faction names and attitudes (after roll, before apply)
  preview: {
    calculate: async (ctx) => {
      const outcomeBadges: any[] = [];
      const warnings: string[] = [];
      
      // Only show preview for failure outcomes
      if (ctx.outcome !== 'failure' && ctx.outcome !== 'criticalFailure') {
        return { resources: [], outcomeBadges: [], warnings: [] };
      }
      
      // Import faction service and utilities
      const { factionService } = await import('../../../services/factions/index');
      const { adjustAttitudeBySteps } = await import('../../../utils/faction-attitude-adjuster');
      
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
      
      // Determine how many factions to affect
      const count = ctx.outcome === 'criticalFailure' ? 2 : 1;
      
      // Randomly select faction(s)
      const selectedFactions = [];
      const availableFactions = [...allFactions];
      
      for (let i = 0; i < Math.min(count, availableFactions.length); i++) {
        const randomIndex = Math.floor(Math.random() * availableFactions.length);
        selectedFactions.push(availableFactions[randomIndex]);
        availableFactions.splice(randomIndex, 1); // Remove to avoid duplicates
      }
      
      // Store selected faction IDs in metadata for execute step
      // IMPORTANT: Mutate existing object, don't reassign (so PipelineCoordinator sees changes)
      if (!ctx.metadata) {
        ctx.metadata = {};
      }
      ctx.metadata.selectedFactionIds = selectedFactions.map(f => f.id);
      
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
    // No modifiers to apply (empty arrays)
    
    // Only execute on failure outcomes
    if (ctx.outcome !== 'failure' && ctx.outcome !== 'criticalFailure') {
      return { success: true };
    }

    const { getGameCommandRegistry } = await import('../../../services/gameCommands/GameCommandHandlerRegistry');
    const registry = getGameCommandRegistry();
    
    // Get the pre-selected faction IDs from preview.calculate
    const selectedFactionIds = ctx.metadata?.selectedFactionIds || [];
    
    if (selectedFactionIds.length === 0) {
      console.warn('[Diplomatic Crisis] No factions were selected in preview - skipping attitude adjustments');
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
          console.log(`[Diplomatic Crisis] Adjusted attitude for faction: ${factionId}`);
        }
      } catch (error) {
        console.error('[Diplomatic Crisis] Failed to adjust faction attitude:', error);
      }
    }

    return { success: true };
  },

  traits: ["dangerous"],
};
