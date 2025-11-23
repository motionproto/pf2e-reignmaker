/**
 * fortifyHex Action Pipeline
 * Data from: data/player-actions/fortify-hex.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';
import { fortifyHexExecution } from '../../execution/territory/fortifyHex';
import { getKingdomData } from '../../stores/KingdomStore';
import { PLAYER_KINGDOM } from '../../types/ownership';
import { getResourceIcon, getResourceColor } from '../../view/kingdom/utils/presentation';
import fortificationData from '../../../data/player-actions/fortify-hex.json';
import {
  validateClaimed,
  validateNoSettlement,
  safeValidation,
  getFreshKingdomData,
  type ValidationResult
} from '../shared/hexValidators';
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
    calculate: (ctx) => {
      const resources = [];

      // Note: Actual fortification costs vary by hex (depends on current tier)
      // Costs will be displayed during hex selection via getHexInfo callback
      // Here we just show outcome-based modifiers

      // Show unrest changes
      if (ctx.outcome === 'criticalSuccess') {
        resources.push({ resource: 'unrest', value: -1 });
      } else if (ctx.outcome === 'criticalFailure') {
        resources.push({ resource: 'unrest', value: 1 });
      }

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
      id: 'selectedHex',
      mode: 'hex-selection',
      count: 1,
      colorType: 'fortify',
      condition: (ctx) => ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess',
      validateHex: (hexId: string): ValidationResult => {
        return safeValidation(() => {
          const kingdom = getFreshKingdomData();
          
          // Find the hex
          const hex = kingdom.hexes?.find((h: any) => h.id === hexId);
          if (!hex) {
            return { valid: false, message: 'Hex not found' };
          }
          
          // Must be claimed territory
          const claimedResult = validateClaimed(hexId, kingdom);
          if (!claimedResult.valid) return claimedResult;
          
          // Check current tier
          const currentTier = hex.fortification?.tier || 0;
          if (currentTier >= 4) {
            return { valid: false, message: 'Already at maximum fortification (Fortress)' };
          }
          
          // Cannot fortify hexes with settlements
          const settlementResult = validateNoSettlement(hexId, kingdom);
          if (!settlementResult.valid) return settlementResult;
          
          // Check affordability for next tier (using pre-imported data)
          const nextTier = currentTier + 1;
          const tierConfig = fortificationData.tiers[nextTier - 1];
          
          if (!tierConfig) {
            return { valid: false, message: 'Invalid tier' };
          }
          
          // Check if we can afford this tier
          const missingResources: string[] = [];
          for (const [resource, amount] of Object.entries(tierConfig.cost)) {
            const available = kingdom.resources?.[resource] || 0;
            if (available < (amount as number)) {
              const resourceName = resource.charAt(0).toUpperCase() + resource.slice(1);
              missingResources.push(`${resourceName}: need ${amount}, have ${available}`);
            }
          }
          
          if (missingResources.length > 0) {
            return { 
              valid: false, 
              message: `Cannot afford ${tierConfig.name}. ${missingResources.join(', ')}` 
            };
          }
          
          // ✅ Valid hex - provide informative message showing what will be built
          const costSummary = Object.entries(tierConfig.cost)
            .map(([r, a]) => `${a} ${r}`)
            .join(', ');
          
          const action = currentTier === 0 ? 'Build' : 'Upgrade to';
          const message = `${action} ${tierConfig.name} (cost: ${costSummary})`;
          
          return { valid: true, message };
        }, hexId, 'fortifyHex validation');
      },
      
      getHexInfo: (hoveredHexId: string) => {
        console.log('[FortifyHex] getHexInfo called for hex:', hoveredHexId);
        const kingdom = getFreshKingdomData();
        
        // Find the hovered hex
        const hoveredHex = kingdom.hexes?.find((h: any) => h.id === hoveredHexId);
        if (!hoveredHex) {
          console.log('[FortifyHex] Hex not found in kingdom data');
          return null;
        }
        
        // Get current fortification tier
        const currentTier = hoveredHex.fortification?.tier || 0;
        console.log('[FortifyHex] Current tier:', currentTier);
        
        // Check if already at max tier
        if (currentTier >= 4) {
          console.log('[FortifyHex] Max tier reached');
          return `<div style="color: var(--text-warning); text-align: center; font-size: var(--font-md);">
            <i class="fas fa-crown"></i> Maximum fortification (Fortress)
          </div>`;
        }
        
        // Calculate next tier
        const nextTier = currentTier + 1;
        const tierConfig = fortificationData.tiers[nextTier - 1];
        console.log('[FortifyHex] Displaying info for tier:', tierConfig.name);
        
        // Build resource icon cost display using FA icons from presentation.ts
        const costIconsHtml = Object.entries(tierConfig.cost)
          .map(([resource, amount]) => {
            const icon = getResourceIcon(resource);
            const color = getResourceColor(resource);
            return `<div style="display: inline-flex; align-items: center; gap: 4px; margin-left: 8px;">
              <i class="fas ${icon}" style="color: ${color};"></i>
              <span style="color: var(--text-primary);">${amount}</span>
            </div>`;
          })
          .join('');
        
        // Format benefits for third row
        const benefitsStr = Object.entries(tierConfig.benefits)
          .filter(([_, value]) => value > 0)
          .map(([stat, value]) => `+${value} ${stat.toUpperCase()}`)
          .join(', ');
        
        return `
          <div style="line-height: 1.6; font-size: var(--font-md);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <div style="font-weight: bold; color: var(--text-primary);">
                ${currentTier === 0 ? 'Build' : 'Upgrade to'}: ${tierConfig.name}
              </div>
              <div style="display: flex; align-items: center;">
                ${costIconsHtml}
              </div>
            </div>
            <div style="margin-bottom: 4px; color: var(--text-tertiary);">
              ${tierConfig.description}
            </div>
            ${benefitsStr ? `<div style="color: var(--text-success); font-weight: bold;">
              Benefits: ${benefitsStr}
            </div>` : ''}
          </div>
        `;
      },
      outcomeAdjustment: {
        criticalSuccess: { count: 1, title: 'Select hex to fortify (Critical Success)' },
        success: { count: 1, title: 'Select hex to fortify' },
        failure: { count: 0 },
        criticalFailure: { count: 0 }
      }
    }
  ],

  execute: async (ctx) => {
    switch (ctx.outcome) {
      case 'criticalSuccess':
      case 'success': {
        // Read hex selection from resolutionData (populated by postApplyInteractions)
        const selectedHexes = ctx.resolutionData?.compoundData?.selectedHex;
        if (!selectedHexes || selectedHexes.length === 0) {
          console.log('⏭️ [FortifyHex] User cancelled hex selection, skipping execution gracefully');
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

        // Execute fortification (handles cost deduction internally)
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
