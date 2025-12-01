/**
 * Claim Hexes Action Pipeline
 * Expand your kingdom's territorial control
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
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

export const claimHexesPipeline: CheckPipeline = {
  // === BASE DATA ===
  id: 'claim-hexes',
  name: 'Claim Hexes',
  description: 'Expand your kingdom\'s borders by claiming adjacent wilderness hexes through surveying, settlement, and administrative control. Hexes must be adjacent to controlled territory.',
  brief: 'Expand your kingdom\'s territorial control',
  category: 'expand-borders',
  checkType: 'action',
  special: 'Can only claim hexes adjacent to existing kingdom territory',

  skills: [
    { skill: 'survival', description: 'wilderness expertise' },
    { skill: 'society', description: 'administrative control' }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your kingdom expands rapidly.',
      modifiers: []
    },
    success: {
      description: 'Your kingdom expands.',
      modifiers: []
    },
    failure: {
      description: 'The expansion fails.',
      modifiers: []
    },
    criticalFailure: {
      description: 'The expansion attempt backfires.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    }
  },

  // === TYPESCRIPT LOGIC ===
  requirements: () => ({ met: true }),

  preview: {
    calculate: (ctx) => {
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
      count: 1,
      colorType: 'claim',
      condition: (ctx) => ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess',
      validateHex: (hexId: string, pendingClaims: string[] = []): ValidationResult => {
        return safeValidation(() => {
          const kingdom = getFreshKingdomData();
          
          const unclaimedResult = validateUnclaimed(hexId, kingdom);
          if (!unclaimedResult.valid) return unclaimedResult;
          
          const notPendingResult = validateNotPending(hexId, pendingClaims);
          if (!notPendingResult.valid) return notPendingResult;
          
          const exploredResult = validateExplored(hexId);
          if (!exploredResult.valid) return exploredResult;
          
          const adjacencyResult = validateAdjacentToClaimed(hexId, pendingClaims, kingdom);
          if (!adjacencyResult.valid) return adjacencyResult;
          
          return { valid: true };
        }, hexId, 'claimHexes validation');
      },
      outcomeAdjustment: {
        criticalSuccess: { 
          count: (ctx) => {
            const proficiencyRank = ctx.metadata?.proficiencyRank || 0;
            return Math.max(2, proficiencyRank);
          },
          title: 'Select hexes to claim (Critical Success)'
        },
        success: { 
          count: 1, 
          title: 'Select 1 hex to claim' 
        },
        failure: { count: 0 },
        criticalFailure: { count: 0 }
      }
    }
  ],

  execute: async (ctx) => {
    switch (ctx.outcome) {
      case 'criticalSuccess':
      case 'success':
        const hexIds = ctx.resolutionData.compoundData?.selectedHexes;
        
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
        return { success: true };
        
      case 'criticalFailure':
        return { success: true };
        
      default:
        return { success: false, error: `Unexpected outcome: ${ctx.outcome}` };
    }
  }
};
