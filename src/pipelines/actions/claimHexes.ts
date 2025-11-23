/**
 * claimHexes Action Pipeline
 * Data from: data/player-actions/claim-hexes.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';
import { claimHexesExecution } from '../../execution/territory/claimHexes';
import {
  validateUnclaimed,
  validateNotPending,
  validateExplored,
  validateAdjacentToClaimed,
  safeValidation,
  getFreshKingdomData,
  type ValidationResult
} from '../shared/hexValidators';

export const claimHexesPipeline = createActionPipeline('claim-hexes', {
  // No cost - always available. Adjacency enforced by hex selector.
  requirements: () => ({ met: true }),

  preview: {
    calculate: (ctx) => {
      // No resource costs for claiming hexes
      // Critical failure unrest is automatically detected from pipeline JSON
      return {
        resources: [],
        outcomeBadges: [],
        warnings: []
      };
    }
  },

  postApplyInteractions: [
    {
      type: 'map-selection',
      id: 'selectedHexes',
      mode: 'hex-selection',
      count: 1,  // Default count (used for success)
      colorType: 'claim',
      condition: (ctx) => ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess',
      validateHex: (hexId: string, pendingClaims: string[] = []): ValidationResult => {
        return safeValidation(() => {
          // Get fresh kingdom data
          const kingdom = getFreshKingdomData();
          
          // Check 1: Cannot claim already claimed hex
          const unclaimedResult = validateUnclaimed(hexId, kingdom);
          if (!unclaimedResult.valid) return unclaimedResult;
          
          // Check 2: Cannot already be selected as pending claim
          const notPendingResult = validateNotPending(hexId, pendingClaims);
          if (!notPendingResult.valid) return notPendingResult;
          
          // Check 3: Cannot claim unexplored hex (requires World Explorer)
          const exploredResult = validateExplored(hexId);
          if (!exploredResult.valid) return exploredResult;
          
          // Check 4 & 5: Must be adjacent to existing claimed OR pending claims
          // (First claim bootstrap rule handled inside validateAdjacentToClaimed)
          const adjacencyResult = validateAdjacentToClaimed(hexId, pendingClaims, kingdom);
          if (!adjacencyResult.valid) return adjacencyResult;
          
          return { valid: true };
        }, hexId, 'claimHexes validation');
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
