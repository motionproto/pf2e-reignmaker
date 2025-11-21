/**
 * claimHexes Action Pipeline
 * Data from: data/player-actions/claim-hexes.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';
import { claimHexesExecution } from '../../execution/territory/claimHexes';
import { worldExplorerService } from '../../services/WorldExplorerService';
import { getKingdomData } from '../../stores/KingdomStore';
import { PLAYER_KINGDOM } from '../../types/ownership';
import { getAdjacentHexes } from '../../utils/hexUtils';

/**
 * Check if a hex is adjacent to any hex in the target list
 */
function isAdjacentToAny(hexId: string, targetHexIds: string[]): boolean {
  if (targetHexIds.length === 0) return false;
  
  const [i, j] = hexId.split('.').map(Number);
  const neighbors = getAdjacentHexes(i, j);
  const adjacentIds = neighbors.map((n) => `${n.i}.${n.j}`);
  
  return adjacentIds.some(id => targetHexIds.includes(id));
}

export const claimHexesPipeline = createActionPipeline('claim-hexes', {
  // No cost - always available. Adjacency enforced by hex selector.
  requirements: () => ({ met: true }),

  preview: {
  },

  postApplyInteractions: [
    {
      type: 'map-selection',
      id: 'selectedHexes',
      mode: 'hex-selection',
      count: 1,  // Default count (used for success)
      colorType: 'claim',
      condition: (ctx) => ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess',
      validation: (hexId: string, pendingClaims: string[] = []) => {
        // Get fresh kingdom data
        const kingdom = getKingdomData();
        
        // Check 1: Cannot claim already claimed hex
        const hex = kingdom.hexes.find((h: any) => h.id === hexId);
        if (hex?.claimedBy === PLAYER_KINGDOM) {
          return {
            valid: false,
            message: 'This hex is already claimed by your kingdom'
          };
        }
        
        // Check 2: Cannot already be selected as pending claim
        if (pendingClaims.includes(hexId)) {
          return {
            valid: false,
            message: 'This hex is already selected'
          };
        }
        
        // Check 3: Cannot claim unexplored hex (requires World Explorer)
        if (worldExplorerService.isAvailable()) {
          const revealed = worldExplorerService.isRevealed(hexId);
          if (revealed === false) {
            return {
              valid: false,
              message: 'This hex has not been explored yet. Use "Send Scouts" to explore it first.'
            };
          }
        }
        
        // Get all currently claimed hexes
        const claimedHexIds = kingdom.hexes
          .filter((h: any) => h.claimedBy === PLAYER_KINGDOM)
          .map((h: any) => h.id);
        
        // Check 4: First claim (bootstrap rule) - any unclaimed, explored hex is valid
        if (claimedHexIds.length === 0 && pendingClaims.length === 0) {
          return { valid: true };
        }
        
        // Check 5: Must be adjacent to existing claimed OR pending claims
        const allClaimedIds = [...claimedHexIds, ...pendingClaims];
        const isAdjacent = isAdjacentToAny(hexId, allClaimedIds);
        
        if (!isAdjacent) {
          return {
            valid: false,
            message: 'This hex must be adjacent to your existing territory'
          };
        }
        
        return { valid: true };
      },
      outcomeAdjustment: {
        criticalSuccess: { 
          count: (ctx) => {
            // Dynamic count based on proficiency rank
            // 0 = untrained (2 hexes - minimum)
            // 1 = trained (2 hexes - minimum)
            // 2 = expert (2 hexes)
            // 3 = master (3 hexes)
            // 4 = legendary (4 hexes)
            const proficiencyRank = ctx.metadata?.proficiencyRank || 0;
            return Math.max(2, proficiencyRank);
          },
          title: 'Select hexes to claim (Critical Success)'
        },
        success: { 
          count: 1, 
          title: 'Select 1 hex to claim' 
        },
        failure: { count: 0 },  // No hexes on failure
        criticalFailure: { count: 0 }  // No hexes on critical failure
      }
    }
  ],

  execute: async (ctx) => {
    switch (ctx.outcome) {
      case 'criticalSuccess':
      case 'success':
        // Hex selection data from postApplyInteractions (stored in compoundData)
        const hexIds = ctx.resolutionData.compoundData?.selectedHexes;
        
        // Handle cancellation gracefully (user cancelled hex selection)
        if (!hexIds || hexIds.length === 0) {
          return { 
            success: true, 
            message: 'Action cancelled - no hexes selected',
            cancelled: true 
          };
        }
        
        await claimHexesExecution(hexIds);
        return { success: true };
        
      case 'failure':
        // Explicitly do nothing for failure (no modifiers defined)
        return { success: true };
        
      case 'criticalFailure':
        // Explicitly apply +1 unrest modifier from pipeline
        await applyPipelineModifiers(claimHexesPipeline, ctx.outcome);
        return { success: true };
        
      default:
        return { success: false, error: `Unexpected outcome: ${ctx.outcome}` };
    }
  }
});
