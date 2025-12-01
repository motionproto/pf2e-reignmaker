/**
 * Send Scouts Action Pipeline
 * Learn about unexplored hexes
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyActionCost } from '../shared/applyActionCost';
import { sendScoutsExecution } from '../../execution/territory/sendScouts';
import { worldExplorerService } from '../../services/WorldExplorerService';
import {
  validateUnexplored,
  validateNotPending,
  validateAdjacentToExplored,
  safeValidation,
  type ValidationResult
} from '../shared/hexValidators';

export const sendScoutsPipeline: CheckPipeline = {
  // === BASE DATA ===
  id: 'send-scouts',
  name: 'Send Scouts',
  description: 'Dispatch explorers to gather intelligence about neighboring territories and potential threats',
  brief: 'Learn about unexplored hexes',
  category: 'expand-borders',
  checkType: 'action',
  cost: { gold: 1 },

  skills: [
    { skill: 'stealth', description: 'covert reconnaissance' },
    { skill: 'survival', description: 'wilderness expertise' },
    { skill: 'nature', description: 'read the land' },
    { skill: 'society', description: 'gather local information' },
    { skill: 'athletics', description: 'rapid exploration' },
    { skill: 'acrobatics', description: 'navigate obstacles' }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'The scouts return with detailed information.',
      modifiers: []
    },
    success: {
      description: 'The scouts return with information.',
      modifiers: []
    },
    failure: {
      description: 'The scouts find nothing.',
      modifiers: []
    },
    criticalFailure: {
      description: 'The scouts are lost.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    }
  },

  // === TYPESCRIPT LOGIC ===
  requirements: (kingdom) => {
    if (!worldExplorerService.isAvailable()) {
      return { 
        met: false, 
        reason: 'World Explorer module is not active on this scene' 
      };
    }

    const goldCost = 1;
    const currentGold = kingdom.resources?.gold || 0;
    if (currentGold < goldCost) {
      return { met: false, reason: `Requires 1 Gold (have ${currentGold})` };
    }
    return { met: true };
  },

  preview: {
    calculate: async (ctx) => {
      return {
        resources: [
          { resource: 'gold', change: -1, reason: 'Scout expedition cost' }
        ],
        outcomeBadges: []
      };
    }
  },

  postApplyInteractions: [
    {
      type: 'map-selection',
      id: 'selectedHexes',
      mode: 'hex-selection',
      count: 1,
      colorType: 'scout',
      condition: (ctx) => ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess',
      validateHex: (hexId: string, pendingSelections: string[] = []): ValidationResult => {
        return safeValidation(() => {
          const unexploredResult = validateUnexplored(hexId);
          if (!unexploredResult.valid) return unexploredResult;
          
          const notPendingResult = validateNotPending(hexId, pendingSelections);
          if (!notPendingResult.valid) return notPendingResult;

          const adjacencyResult = validateAdjacentToExplored(hexId, pendingSelections);
          if (!adjacencyResult.valid) return adjacencyResult;
          
          return { valid: true };
        }, hexId, 'sendScouts validation');
      },
      outcomeAdjustment: {
        criticalSuccess: { 
          count: 2,
          title: 'Select 2 hexes to scout (Critical Success)'
        },
        success: { 
          count: 1, 
          title: 'Select 1 hex to scout' 
        },
        failure: { count: 0 },
        criticalFailure: { count: 0 }
      }
    }
  ],

  execute: async (ctx) => {
    await applyActionCost(sendScoutsPipeline);
    
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
        
        await sendScoutsExecution(hexIds);
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
