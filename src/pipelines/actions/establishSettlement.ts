/**
 * establishSettlement Action Pipeline
 * Data from: data/player-actions/establish-settlement.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';
import { applyActionCost } from '../shared/applyActionCost';
import { foundSettlementExecution } from '../../execution';
import { textBadge } from '../../types/OutcomeBadge';
import {
  validateClaimed,
  validateNoSettlement,
  validateExplored,
  safeValidation,
  getFreshKingdomData,
  type ValidationResult
} from '../shared/hexValidators';
import { PLAYER_KINGDOM } from '../../types/ownership';
import SettlementCustomSelector from '../../services/hex-selector/SettlementCustomSelector.svelte';
import { getAdjacentHexes } from '../../utils/hexUtils';

export const establishSettlementPipeline = createActionPipeline('establish-settlement', {
  requirements: (kingdom) => {
    const requirements: string[] = [];
    
    const resources = kingdom.resources || {};
    const gold = resources.gold || 0;
    const food = resources.food || 0;
    const lumber = resources.lumber || 0;
    
    if (gold < 2) requirements.push(`Need 2 Gold (have ${gold})`);
    if (food < 2) requirements.push(`Need 2 Food (have ${food})`);
    if (lumber < 2) requirements.push(`Need 2 Lumber (have ${lumber})`);
    
    return {
      met: requirements.length === 0,
      reason: requirements.length > 0 ? requirements.join(', ') : undefined
    };
  },

  preview: {
    calculate: (ctx) => {
      const resourceCost = ctx.outcome === 'failure' ? -1 : -2;

      const resources = [
        { resource: 'gold', value: resourceCost },
        { resource: 'food', value: resourceCost },
        { resource: 'lumber', value: resourceCost }
      ];

      if (ctx.outcome === 'criticalFailure') {
        resources.push({ resource: 'unrest', value: 1 });
      }

      const outcomeBadges = [];
      if (ctx.outcome === 'success') {
        outcomeBadges.push(textBadge('Will found new settlement', 'fa-building', 'positive'));
      } else if (ctx.outcome === 'criticalSuccess') {
        outcomeBadges.push(textBadge('Will found new settlement', 'fa-building', 'positive'));
        outcomeBadges.push(textBadge('Grants free Tier 1 structure', 'fa-gift', 'positive'));
      }

      return { resources, outcomeBadges, warnings: [] };
    }
  },

  postRollInteractions: [],

  postApplyInteractions: [
    {
      type: 'map-selection',
      id: 'location',
      mode: 'hex-selection',
      count: 1,
      colorType: 'settlement',
      title: 'Select hex for new settlement',
      required: true,
      condition: (ctx) => ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess',
      validateHex: (hexId: string): ValidationResult => {
        return safeValidation(() => {
          const kingdom = getFreshKingdomData();
          const hex = kingdom.hexes?.find((h: any) => h.id === hexId);
          
          if (!hex) {
            return { valid: false, message: 'Hex not found' };
          }
          
          // Must be claimed by player
          const claimedResult = validateClaimed(hexId, kingdom);
          if (!claimedResult.valid) return claimedResult;
          
          // Must be explored (if World Explorer active)
          const exploredResult = validateExplored(hexId);
          if (!exploredResult.valid) return exploredResult;
          
          // Cannot already have a settlement
          const settlementResult = validateNoSettlement(hexId, kingdom);
          if (!settlementResult.valid) return settlementResult;
          
          // Check spacing requirement (must NOT be adjacent to any other settlement)
          // PF2e Rule: Settlements cannot be placed in hexes adjacent to other settlements
          const [hX, hY] = hexId.split('.').map(Number);
          const adjacentHexes = getAdjacentHexes(hX, hY);
          
          const settlements = kingdom.settlements || [];
          for (const settlement of settlements) {
            if (!settlement.location || (settlement.location.x === 0 && settlement.location.y === 0)) continue;
            
            // Check if settlement is adjacent to the target hex
            const isAdjacent = adjacentHexes.some(
              adjacent => adjacent.i === settlement.location.x && adjacent.j === settlement.location.y
            );
            
            if (isAdjacent) {
              return {
                valid: false,
                message: `Cannot be adjacent to ${settlement.name}`
              };
            }
          }
          
          return { valid: true };
        }, hexId, 'establishSettlement validation');
      },
      customSelector: {
        component: SettlementCustomSelector,
        props: {
          showStructureSelection: true  // Always shown, only matters on critical success
        }
      }
    }
  ],

  execute: async (ctx) => {
    switch (ctx.outcome) {
      case 'criticalSuccess':
      case 'success': {
        // Read hex selection from resolutionData
        const locationData = ctx.resolutionData?.compoundData?.location;
        
        // Handle both array and object formats (with metadata from custom selector)
        let hexId: string | undefined;
        let settlementName: string | undefined;
        
        if (!locationData) {
          console.log('⏭️ [establishSettlement] User cancelled hex selection, skipping execution gracefully');
          return { success: true };  // Graceful cancellation
        }
        
        if (Array.isArray(locationData)) {
          // Array format (shouldn't happen with custom selector, but handle it)
          if (locationData.length === 0) {
            console.log('⏭️ [establishSettlement] No hex selected, skipping execution gracefully');
            return { success: true };
          }
          hexId = locationData[0];
        } else if (locationData?.hexIds) {
          // Object format with metadata from custom selector
          hexId = locationData.hexIds[0];
          settlementName = locationData.metadata?.settlementName;
        }
        
        if (!hexId) {
          console.error('❌ [establishSettlement] Missing hex ID');
          return { success: false, error: 'Settlement location not provided' };
        }
        
        const [x, y] = hexId.split('.').map(Number);
        
        // Use fallback name if not provided by custom selector
        const finalName = settlementName && settlementName.trim() !== '' 
          ? settlementName.trim() 
          : 'Settlement';
        
        // Get free structure ID from metadata (if critical success)
        const freeStructureId = locationData.metadata?.structureId || null;
        
        console.log(`[establishSettlement] Creating settlement "${finalName}" at ${hexId}`);
        if (freeStructureId) {
          console.log(`[establishSettlement] Including free structure: ${freeStructureId}`);
        }
        
        // Deduct costs
        await applyActionCost(establishSettlementPipeline);
        
        // Execute settlement creation
        await foundSettlementExecution({
          name: finalName,
          location: { x, y },
          hexId,
          freeStructureId
        });
        
        return { success: true };
      }
        
      case 'failure':
        // Modifiers (half costs) applied automatically by execute-first pattern
        return { success: true };
        
      case 'criticalFailure':
        // Modifiers (full costs + unrest) applied automatically by execute-first pattern
        return { success: true };
        
      default:
        return { success: false, error: `Unexpected outcome: ${ctx.outcome}` };
    }
  }
});
