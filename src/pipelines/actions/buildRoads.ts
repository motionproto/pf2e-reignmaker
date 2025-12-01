/**
 * Build Roads Action Pipeline
 * Connect your territory with infrastructure
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyActionCost } from '../shared/applyActionCost';
import { buildRoadsExecution } from '../../execution/territory/buildRoads';
import { validateRoadHex } from '../shared/roadValidator';
import { PLAYER_KINGDOM } from '../../types/ownership';

export const buildRoadsPipeline: CheckPipeline = {
  // === BASE DATA ===
  id: 'build-roads',
  name: 'Build Roads',
  description: 'Construct pathways between settlements to improve trade, travel, and military movement. Roads must be built in claimed territory.',
  brief: 'Connect your territory with infrastructure',
  category: 'expand-borders',
  checkType: 'action',
  cost: { lumber: 1, stone: 1 },

  skills: [
    { skill: 'crafting', description: 'engineering expertise' },
    { skill: 'survival', description: 'pathfinding routes' },
    { skill: 'athletics', description: 'manual labor' },
    { skill: 'nature', description: 'work with terrain' }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Excellent roads are constructed.',
      modifiers: []
    },
    success: {
      description: 'A road is constructed.',
      modifiers: []
    },
    failure: {
      description: 'Construction fails.',
      modifiers: []
    },
    criticalFailure: {
      description: 'Work crews are lost.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    }
  },

  // === TYPESCRIPT LOGIC ===
  requirements: (kingdom) => {
    const lumber = kingdom.resources?.lumber || 0;
    const stone = kingdom.resources?.stone || 0;
    
    if (lumber < 1 || stone < 1) {
      const missing: string[] = [];
      if (lumber < 1) missing.push(`Need 1 Lumber (have ${lumber})`);
      if (stone < 1) missing.push(`Need 1 Stone (have ${stone})`);
      return { met: false, reason: missing.join(', ') };
    }
    
    const claimedHexes = (kingdom.hexes || []).filter((h: any) => h.claimedBy === PLAYER_KINGDOM);
    if (claimedHexes.length === 0) {
      return { met: false, reason: 'No claimed territory to build roads in' };
    }
    
    return { met: true };
  },

  preview: {
    calculate: (ctx) => {
      return {
        resources: [
          { resource: 'lumber', value: -1 },
          { resource: 'stone', value: -1 }
        ],
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
      colorType: 'road',
      condition: (ctx) => ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess',
      validateHex: (hexId: string, pendingSelection: string[] = []) => {
        const isValid = validateRoadHex(hexId, pendingSelection);
        
        if (!isValid) {
          return {
            valid: false,
            message: 'Roads must be built in claimed territory, adjacent to existing roads or settlements'
          };
        }
        
        return { valid: true };
      },
      outcomeAdjustment: {
        criticalSuccess: {
          count: 2,
          title: 'Select hexes to build roads (Critical Success)'
        },
        success: {
          count: 1,
          title: 'Select 1 hex to build a road'
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
        const selectedHexes = ctx.resolutionData?.compoundData?.selectedHexes;
        if (!selectedHexes || selectedHexes.length === 0) {
          return { success: true };
        }
        
        await applyActionCost(buildRoadsPipeline);
        await buildRoadsExecution(selectedHexes);
        return { success: true };
        
      case 'failure':
        await applyActionCost(buildRoadsPipeline);
        return { success: true };
        
      case 'criticalFailure':
        await applyActionCost(buildRoadsPipeline);
        return { success: true };
        
      default:
        return { success: false, error: `Unexpected outcome: ${ctx.outcome}` };
    }
  }
};
