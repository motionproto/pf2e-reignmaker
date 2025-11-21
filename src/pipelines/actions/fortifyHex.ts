/**
 * Fortify Hex Action Pipeline
 *
 * Build or upgrade defensive fortifications in claimed territory.
 * Converted from data/player-actions/fortify-hex.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { fortifyHexExecution } from '../../execution/territory/fortifyHex';
import { getKingdomData } from '../../stores/KingdomStore';
import { validateFortifyHexForPipeline } from '../shared/fortifyHexValidator';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';
import { PLAYER_KINGDOM } from '../../types/ownership';
import fortificationData from '../../../data/player-actions/fortify-hex.json';

export const fortifyHexPipeline: CheckPipeline = {
  id: 'fortify-hex',
  name: 'Fortify Hex',
  description: 'Construct or upgrade defensive fortifications in claimed territory to improve resistance against invasion. Automatically upgrades existing fortifications by one tier.',
  checkType: 'action',
  category: 'expand-borders',

  skills: [
    { skill: 'crafting', description: 'build fortifications' },
    { skill: 'athletics', description: 'manual construction' },
    { skill: 'intimidation', description: 'defensive displays' },
    { skill: 'survival', description: 'wilderness defenses' }
  ],

  // Step 1: Requirements Check - validate minimum resources
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

  // Post-apply: Select hex for fortification based on outcome (AFTER Apply button clicked)
  postApplyInteractions: [
    {
      type: 'map-selection',
      id: 'selectedHex',
      mode: 'hex-selection',
      colorType: 'fortify',
      validation: (hexId: string) => {
        // Synchronous validation for hex selector
        // Return full ValidationResult object so hex selector can display specific error message
        return validateFortifyHexForPipeline(hexId);
      },
      // Show cost/benefit info when hex is selected
      getHexInfo: (hexId: string) => {
        const kingdom = getKingdomData();
        const hex = kingdom.hexes?.find((h: any) => h.id === hexId);
        
        if (!hex) {
          return '<div style="color: #999; font-style: italic;">Hex not found</div>';
        }

        // Determine current and next tier
        const currentTier = hex.fortification?.tier || 0;
        const nextTier = currentTier + 1;

        if (nextTier > 4) {
          return '<div style="color: #FF6B6B;">Maximum fortification level reached</div>';
        }

        // Use imported fortification data
        const tierConfig = fortificationData.tiers[nextTier - 1];

        // Format cost
        const costEntries = Object.entries(tierConfig.cost).map(([resource, amount]) => {
          const displayResource = resource.charAt(0).toUpperCase() + resource.slice(1);
          return `${amount} ${displayResource}`;
        });
        const costText = costEntries.join(', ');

        // Format benefits
        const benefits = [];
        if (tierConfig.benefits.ac > 0) {
          benefits.push(`+${tierConfig.benefits.ac} AC`);
        }
        if (tierConfig.benefits.initiative > 0) {
          benefits.push(`+${tierConfig.benefits.initiative} Initiative`);
        }
        const benefitsText = benefits.join(', ') + ' to defending troops';

        // Build info HTML
        let html = '<div style="font-size: 13px;">';
        
        // Title
        if (currentTier === 0) {
          html += `<div style="font-weight: bold; color: #D2691E; margin-bottom: 8px;">Building: ${tierConfig.name}</div>`;
        } else {
          const currentConfig = fortificationData.tiers[currentTier - 1];
          html += `<div style="font-weight: bold; color: #D2691E; margin-bottom: 8px;">Upgrading: ${currentConfig.name} → ${tierConfig.name}</div>`;
        }

        // Cost
        html += `<div style="margin-bottom: 6px;"><i class="fas fa-coins" style="color: #FFD700; margin-right: 6px;"></i><strong>Cost:</strong> ${costText}</div>`;

        // Benefits
        html += `<div style="margin-bottom: 6px;"><i class="fas fa-shield-alt" style="color: #4CAF50; margin-right: 6px;"></i><strong>Benefits:</strong> ${benefitsText}</div>`;

        // Special effects (Tier 4 fortress)
        if (tierConfig.special) {
          html += `<div style="margin-top: 8px; padding: 6px; background: rgba(76, 175, 80, 0.1); border-left: 3px solid #4CAF50; font-size: 12px;"><i class="fas fa-star" style="color: #FFD700; margin-right: 6px;"></i>${tierConfig.special}</div>`;
        }

        html += '</div>';
        return html;
      },
      // Outcome-based adjustments
      outcomeAdjustment: {
        criticalSuccess: {
          count: 1,
          title: 'Select 1 hex to fortify (critical success - unrest reduced!)'
        },
        success: {
          count: 1,
          title: 'Select 1 hex to fortify'
        },
        failure: {
          count: 0  // No interaction on failure
        },
        criticalFailure: {
          count: 0  // No interaction on critical failure
        }
      },
      // Condition: only show for success/criticalSuccess
      condition: (ctx: any) => {
        return ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess';
      }
    }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'The fortification is constructed swiftly.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    success: {
      description: 'The fortification is constructed.',
      modifiers: []
    },
    failure: {
      description: 'Construction accidents delay progress.',
      modifiers: []
    },
    criticalFailure: {
      description: 'Workers are injured in a construction mishap.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    }
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

  // Execute function - explicitly handles ALL outcomes
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
};
