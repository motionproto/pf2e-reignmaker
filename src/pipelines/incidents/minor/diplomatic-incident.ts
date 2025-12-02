/**
 * Diplomatic Incident Incident Pipeline
 *
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';
import { textBadge } from '../../../types/OutcomeBadge';

export const diplomaticIncidentPipeline: CheckPipeline = {
  id: 'diplomatic-incident',
  name: 'Diplomatic Incident',
  description: 'A diplomatic misstep strains relations with neighbors',
  checkType: 'incident',
  tier: 1,

  skills: [
      { skill: 'diplomacy', description: 'smooth over' },
      { skill: 'society', description: 'formal apology' },
      { skill: 'deception', description: 'deny involvement' },
    ],

  outcomes: {
    success: {
      description: 'Relations are maintained.',
      modifiers: [],
      outcomeBadges: []
    },
    failure: {
      description: 'A neighboring kingdom\'s attitude worsens.',
      modifiers: [],
      outcomeBadges: [
        textBadge('-1 attitude for 1 random faction', 'fa-handshake', 'negative')
      ]
    },
    criticalFailure: {
      description: 'Multiple kingdoms turn against you.',
      modifiers: [],
      outcomeBadges: [
        textBadge('-1 attitude for 2 random factions', 'fa-handshake', 'negative')
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
            textBadge(`${faction.name}: ${oldAttitude} → ${newAttitude}`, 'fa-handshake', 'negative')
          );
        } else {
          outcomeBadges.push(
            textBadge(`${faction.name} remains ${oldAttitude}`, 'fa-handshake', 'info')
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
    // Apply modifiers from outcome
    await applyPipelineModifiers(diplomaticIncidentPipeline, ctx.outcome, ctx);

    const { getGameCommandRegistry } = await import('../../../services/gameCommands/GameCommandHandlerRegistry');
    const registry = getGameCommandRegistry();
    
    // Get the pre-selected faction IDs from preview.calculate
    const selectedFactionIds = ctx.metadata?.selectedFactionIds || [];
    
    if (selectedFactionIds.length === 0) {
      console.warn('[Diplomatic Incident] No factions were selected in preview - skipping attitude adjustments');
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
          console.log(`[Diplomatic Incident] Adjusted attitude for faction: ${factionId}`);
        }
      } catch (error) {
        console.error('[Diplomatic Incident] Failed to adjust faction attitude:', error);
      }
    }

    return { success: true };
  }
};
