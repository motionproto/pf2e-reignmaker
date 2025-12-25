/**
 * Fortify Hex Action Pipeline
 * Strengthen defensive positions
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { fortifyHexExecution } from '../../execution/territory/fortifyHex';
import { getKingdomData } from '../../stores/KingdomStore';
import { PLAYER_KINGDOM } from '../../types/ownership';
import { getResourceIcon, getResourceColor } from '../../view/kingdom/utils/presentation';
import {
  validateClaimed,
  validateNoSettlement,
  safeValidation,
  getFreshKingdomData,
  type ValidationResult
} from '../shared/hexValidators';
import { fortificationTiers, getFortificationTier } from '../../data/fortificationTiers';
import { textBadge } from '../../types/OutcomeBadge';

export const fortifyHexPipeline: CheckPipeline = {
  // === BASE DATA ===
  id: 'fortify-hex',
  name: 'Fortify Hex',
  description: 'Construct or upgrade defensive fortifications in claimed territory to improve resistance against invasion',
  brief: 'Strengthen defensive positions',
  category: 'expand-borders',
  checkType: 'action',
  special: 'Must be placed in claimed territory. Automatically upgrades existing fortifications by one tier. Unpaid maintenance reduces effectiveness by one tier (minimum Tier 1).',

  skills: [
    { skill: 'crafting', description: 'build fortifications', doctrine: 'practical' },
    { skill: 'athletics', description: 'manual construction', doctrine: 'practical' },
    { skill: 'survival', description: 'wilderness defenses', doctrine: 'practical' },
    { skill: 'intimidation', description: 'defensive displays', doctrine: 'ruthless' }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'The fortification is constructed swiftly.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ],
      outcomeBadges: [
        textBadge('Fortify hex', 'fa-fort-awesome', 'positive')
      ],
      outcomeBadges: [
        textBadge('Build or upgrade fortification', 'fa-fort-awesome', 'positive')
      ]
    },
    success: {
      description: 'The fortification is constructed.',
      modifiers: [],
      outcomeBadges: [
        textBadge('Build or upgrade fortification', 'fa-fort-awesome', 'positive')
      ]
    },
    failure: {
      description: 'Construction accidents delay progress.',
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'Workers are injured in a construction mishap.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ],
      outcomeBadges: []
    }
  },

  // === TYPESCRIPT LOGIC ===
  requirements: (kingdom) => {
    if (!kingdom.resources || kingdom.resources.lumber < 1) {
      return {
        met: false,
        reason: 'Need at least 1 lumber to build fortifications.'
      };
    }
    
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
      const outcomeBadges = [];
      const resources = [];

      if (ctx.outcome === 'criticalSuccess') {
        resources.push({ resource: 'unrest', value: -1 });
        outcomeBadges.push(
          textBadge('Build or upgrade fortification', 'fa-fort-awesome', 'positive')
        );
      } else if (ctx.outcome === 'success') {
        outcomeBadges.push(
          textBadge('Build or upgrade fortification', 'fa-fort-awesome', 'positive')
        );
      } else if (ctx.outcome === 'criticalFailure') {
        resources.push({ resource: 'unrest', value: 1 });
      }

      return {
        resources,
        outcomeBadges,
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
          
          const hex = kingdom.hexes?.find((h: any) => h.id === hexId);
          if (!hex) {
            return { valid: false, message: 'Hex not found' };
          }
          
          const claimedResult = validateClaimed(hexId, kingdom);
          if (!claimedResult.valid) return claimedResult;
          
          const currentTier = hex.fortification?.tier || 0;
          if (currentTier >= 4) {
            return { valid: false, message: 'Already at maximum fortification (Fortress)' };
          }
          
          const settlementResult = validateNoSettlement(hexId, kingdom);
          if (!settlementResult.valid) return settlementResult;
          
          const nextTier = currentTier + 1;
          const tierConfig = fortificationTiers[nextTier - 1];
          
          if (!tierConfig) {
            return { valid: false, message: 'Invalid tier' };
          }
          
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
          
          const costSummary = Object.entries(tierConfig.cost)
            .map(([r, a]) => `${a} ${r}`)
            .join(', ');
          
          const action = currentTier === 0 ? 'Build' : 'Upgrade to';
          const message = `${action} ${tierConfig.name} (cost: ${costSummary})`;
          
          return { valid: true, message };
        }, hexId, 'fortifyHex validation');
      },
      
      getHexInfo: (hoveredHexId: string) => {
        const kingdom = getFreshKingdomData();
        
        const hoveredHex = kingdom.hexes?.find((h: any) => h.id === hoveredHexId);
        if (!hoveredHex) {
          return null;
        }
        
        const currentTier = hoveredHex.fortification?.tier || 0;
        
        if (currentTier >= 4) {
          return `<div style="color: var(--text-warning); text-align: center; font-size: var(--font-md);">
            <i class="fas fa-crown"></i> Maximum fortification (Fortress)
          </div>`;
        }
        
        const nextTier = currentTier + 1;
        const tierConfig = fortificationTiers[nextTier - 1];
        
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
        const selectedHexes = ctx.resolutionData?.compoundData?.selectedHex;
        if (!selectedHexes || selectedHexes.length === 0) {
          return { success: true };
        }

        const hexId = Array.isArray(selectedHexes) ? selectedHexes[0] : selectedHexes;
        const kingdom = getKingdomData();

        const hex = kingdom.hexes.find((h: any) => h.id === hexId);
        if (!hex) {
          return { success: false, error: `Hex ${hexId} not found` };
        }

        const currentTier = hex.fortification?.tier || 0;
        const nextTier = currentTier + 1;

        await fortifyHexExecution(hexId, nextTier as 1 | 2 | 3 | 4);

        return { success: true };
      }
        
      case 'failure':
        return { success: true };
        
      case 'criticalFailure':
        return { success: true };
        
      default:
        return { success: false, error: `Unexpected outcome: ${ctx.outcome}` };
    }
  }
};
