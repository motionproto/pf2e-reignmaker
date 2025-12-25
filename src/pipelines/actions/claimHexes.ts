/**
 * Claim Hexes Action Pipeline
 * Expand your kingdom's territorial control
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { claimHexesExecution } from '../../execution/territory/claimHexes';
import {
  validateNotPending,
  validateExplored,
  validateAdjacentToClaimed,
  safeValidation,
  getFreshKingdomData,
  hasPlayerArmyInHex,
  type ValidationResult
} from '../shared/hexValidators';
import { PLAYER_KINGDOM } from '../../types/ownership';
import { logger } from '../../utils/Logger';
import { textBadge } from '../../types/OutcomeBadge';

export const claimHexesPipeline: CheckPipeline = {
  // === BASE DATA ===
  id: 'claim-hexes',
  name: 'Claim Hexes',
  description: 'Expand your kingdom\'s borders by claiming adjacent wilderness hexes through surveying, settlement, and administrative control. Hexes must be adjacent to controlled territory. Enemy territory can only be claimed if occupied by your army.',
  brief: 'Expand your kingdom\'s territorial control',
  category: 'expand-borders',
  checkType: 'action',
  special: 'Can only claim hexes adjacent to existing territory. Enemy territory requires army occupation.',

  skills: [
    { skill: 'diplomacy', description: 'peaceful integration', doctrine: 'virtuous' },
    { skill: 'survival', description: 'wilderness expertise', doctrine: 'practical' },
    { skill: 'society', description: 'administrative control', doctrine: 'practical' },
    { skill: 'intimidation', description: 'show of dominance', doctrine: 'ruthless' }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your kingdom expands rapidly.',
      modifiers: [],
      outcomeBadges: [
        textBadge('Claim multiple hexes', 'fa-map', 'positive')
      ]
    },
    success: {
      description: 'Your kingdom expands.',
      modifiers: [],
      outcomeBadges: [
        textBadge('Claim 1 hex', 'fa-map', 'positive')
      ]
    },
    failure: {
      description: 'The expansion fails.',
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'The expansion attempt backfires.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ],
      outcomeBadges: []
    }
  },

  // === TYPESCRIPT LOGIC ===
  requirements: () => ({ met: true }),

  preview: {
    calculate: (ctx) => {
      const outcomeBadges = [];
      
      if (ctx.outcome === 'criticalSuccess') {
        const proficiencyRank = ctx.metadata?.proficiencyRank || 0;
        const hexCount = Math.max(2, proficiencyRank);
        outcomeBadges.push(
          textBadge(`Claim ${hexCount} ${hexCount === 1 ? 'hex' : 'hexes'}`, 'fa-map', 'positive')
        );
      } else if (ctx.outcome === 'success') {
        outcomeBadges.push(
          textBadge('Claim 1 hex', 'fa-map', 'positive')
        );
      }
      // Failure and criticalFailure already have modifiers that convert to badges
      
      return {
        resources: [],
        outcomeBadges,
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
          const hex = kingdom.hexes?.find((h: any) => h.id === hexId);
          
          if (!hex) {
            return { valid: false, message: 'Hex not found in kingdom data' };
          }
          
          // Already claimed by player?
          if (hex.claimedBy === PLAYER_KINGDOM) {
            return { valid: false, message: 'This hex is already claimed by your kingdom' };
          }
          
          // Enemy territory? Requires army occupation
          if (hex.claimedBy && hex.claimedBy !== PLAYER_KINGDOM) {
            if (!hasPlayerArmyInHex(hexId)) {
              return { 
                valid: false, 
                message: 'You need an army occupying this hex to claim enemy territory' 
              };
            }
            // Army is present - allow claiming enemy territory
            logger.info(`[ClaimHexes] Hex ${hexId} is enemy territory but player army is present - allowing conquest`);
          }
          
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
        
        // Get kingdom data BEFORE claiming to check for demanded hexes
        const kingdom = getFreshKingdomData();
        const demandedHexesToResolve: Array<{ hexId: string; terrain: string; eventInstanceId?: string }> = [];
        
        for (const hexId of hexIds) {
          const hex = kingdom.hexes?.find((h: any) => h.id === hexId);
          if (hex?.features?.some((f: any) => f.type === 'demanded')) {
            const demandedFeature = hex.features.find((f: any) => f.type === 'demanded');
            demandedHexesToResolve.push({
              hexId,
              terrain: hex.terrain || 'unknown',
              eventInstanceId: demandedFeature?.eventInstanceId
            });
            logger.info(`[ClaimHexes] Hex ${hexId} has 'demanded' feature - will trigger resolution dialog`);
          }
        }
        
        // Claim the hexes
        await claimHexesExecution(hexIds);
        
        // After claiming, show dialog for any demanded hexes that were claimed
        for (const demandedHex of demandedHexesToResolve) {
          const { DemandFulfilledDialog } = await import('../../ui/dialogs/DemandFulfilledDialog');
          const result = await DemandFulfilledDialog.show({
            hexId: demandedHex.hexId,
            terrain: demandedHex.terrain,
            eventInstanceId: demandedHex.eventInstanceId
          });
          
          if (result) {
            await DemandFulfilledDialog.applyRewards(
              demandedHex.hexId,
              result,
              demandedHex.eventInstanceId
            );
          } else {
            logger.info(`[ClaimHexes] User cancelled demand resolution for hex ${demandedHex.hexId}`);
          }
        }
        
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
