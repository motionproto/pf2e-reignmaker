/**
 * buildRoads Action Pipeline
 * Data from: data/player-actions/build-roads.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';
import { applyActionCost } from '../shared/applyActionCost';
import { buildRoadsExecution } from '../../execution/territory/buildRoads';
import { validateRoadHex } from '../shared/roadValidator';
import { PLAYER_KINGDOM } from '../../types/ownership';
export const buildRoadsPipeline = createActionPipeline('build-roads', {
  requirements: (kingdom) => {
    // Check resource costs
    const lumber = kingdom.resources?.lumber || 0;
    const stone = kingdom.resources?.stone || 0;
    
    if (lumber < 1 || stone < 1) {
      const missing: string[] = [];
      if (lumber < 1) missing.push(`Need 1 Lumber (have ${lumber})`);
      if (stone < 1) missing.push(`Need 1 Stone (have ${stone})`);
      return { met: false, reason: missing.join(', ') };
    }
    
    // Check if we have claimed hexes to build roads in
    const claimedHexes = (kingdom.hexes || []).filter((h: any) => h.claimedBy === PLAYER_KINGDOM);
    if (claimedHexes.length === 0) {
      return { met: false, reason: 'No claimed territory to build roads in' };
    }
    
    return { met: true };
  },

  preview: {
    calculate: (ctx) => {
      const resources = [];
      
      // Show resource costs for all outcomes
      resources.push({ resource: 'lumber', value: -1 });
      resources.push({ resource: 'stone', value: -1 });
      
      // Critical failure unrest is automatically detected from pipeline JSON
      // No need to manually add it here - convertModifiersToBadges handles it
      
      return {
        resources,
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
      count: 1,  // Default for success
      colorType: 'road',
      condition: (ctx) => ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess',
      validateHex: (hexId: string, pendingSelection: string[] = []) => {
        // Use dedicated road validation (checks claimed status, existing roads, and adjacency)
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
          count: 2,  // Build roads on 2 hexes
          title: 'Select hexes to build roads (Critical Success)'
        },
        success: {
          count: 1,  // Build road on 1 hex
          title: 'Select 1 hex to build a road'
        },
        failure: { count: 0 },  // No roads on failure
        criticalFailure: { count: 0 }  // No roads on critical failure
      }
    }
  ],

  execute: async (ctx) => {
    switch (ctx.outcome) {
      case 'criticalSuccess':
      case 'success':
        // Read hex selections from resolutionData (populated by postApplyInteractions)
        const selectedHexes = ctx.resolutionData?.compoundData?.selectedHexes;
        if (!selectedHexes || selectedHexes.length === 0) {
          console.log('⏭️ [buildRoads] User cancelled hex selection, skipping execution gracefully');
          return { success: true };  // Graceful cancellation - no error thrown
        }
        
        // Deduct costs and build roads
        await applyActionCost(buildRoadsPipeline);
        await buildRoadsExecution(selectedHexes);
        return { success: true };
        
      case 'failure':
        // Deduct costs even on failure (action was attempted)
        await applyActionCost(buildRoadsPipeline);
        return { success: true };
        
      case 'criticalFailure':
        // Deduct costs (modifiers applied automatically by execute-first pattern)
        await applyActionCost(buildRoadsPipeline);
        return { success: true };
        
      default:
        return { success: false, error: `Unexpected outcome: ${ctx.outcome}` };
    }
  }
});
