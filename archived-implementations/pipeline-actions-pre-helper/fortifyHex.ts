/**
 * fortifyHex Action Pipeline
 * Data from: data/player-actions/fortify-hex.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

export const fortifyHexPipeline = createActionPipeline('fortify-hex', {
  requirements: (kingdom) => {
    // Must have at least 1 lumber (minimum cost for Tier 1 Earthworks)
    if (!kingdom.resources || kingdom.resources.lumber < 1) {
      return {
        met: false,
        reason: 'Need at least 1 lumber to build fortifications.'
      };
    }
    
    // Must have at least one claimed hex (using PLAYER_KINGDOM constant)
    const claimedHexes = kingdom.hexes?.filter((h: any) => h.claimedBy === PLAYER_KINGDOM) || [];
    if (claimedHexes.length === 0) {
      return {
        met: false,
        reason: 'No claimed territory to fortify'
      };
    }
    
    return { met: true };
  },

  preview: {
    providedByInteraction: true,  // Map selection shows fortifications in real-time
    calculate: (ctx) => {
      const resources = [];

      // Show unrest changes
      if (ctx.outcome === 'criticalSuccess') {
        resources.push({ resource: 'unrest', value: -1 });
      } else if (ctx.outcome === 'criticalFailure') {
        resources.push({ resource: 'unrest', value: 1 });
      }

      return {
        resources,
        specialEffects: [],
        warnings: []
      };
    }
  },

  execute: async (ctx) => {
    switch (ctx.outcome) {
      case 'criticalSuccess':
      case 'success': {
        // Read hex selection from resolutionData (populated by postApplyInteractions)
        const selectedHexes = ctx.resolutionData?.compoundData?.selectedHex;
        if (!selectedHexes || selectedHexes.length === 0) {
          console.log('[FortifyHex] No hexes selected');
          return { success: true };  // Graceful cancellation
        }

        const hexId = Array.isArray(selectedHexes) ? selectedHexes[0] : selectedHexes;
        const kingdom = getKingdomData();

        // Find the hex
        const hex = kingdom.hexes.find((h: any) => h.id === hexId);
        if (!hex) {
          console.error(`[FortifyHex] Hex ${hexId} not found in kingdom data`);
          return { success: false, error: `Hex ${hexId} not found` };
        }

        // Determine next tier
        const currentTier = hex.fortification?.tier || 0;
        const nextTier = currentTier + 1;
        
        console.log(`[FortifyHex] Upgrading hex ${hexId} from tier ${currentTier} to tier ${nextTier}`);

        // Execute fortification
        await fortifyHexExecution(hexId, nextTier as 1 | 2 | 3 | 4);

        // Apply modifiers for critical success
        if (ctx.outcome === 'criticalSuccess') {
          await applyPipelineModifiers(fortifyHexPipeline, ctx.outcome);
        }
        return { success: true };
      }
        
      case 'failure':
        // Explicitly do nothing (no modifiers defined)
        return { success: true };
        
      case 'criticalFailure':
        // Explicitly apply +1 unrest modifier from pipeline
        await applyPipelineModifiers(fortifyHexPipeline, ctx.outcome);
        return { success: true };
        
      default:
        return { success: false, error: `Unexpected outcome: ${ctx.outcome}` };
    }
  }
});
