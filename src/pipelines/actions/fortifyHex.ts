/**
 * Fortify Hex Action Pipeline
 *
 * Build or upgrade defensive fortifications in claimed territory.
 * Converted from data/player-actions/fortify-hex.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { fortifyHexExecution } from '../../execution/territory/fortifyHex';
import { getKingdomData } from '../../stores/KingdomStore';
import { validateFortifyHexForPipeline } from '../../actions/fortify-hex/fortifyHexValidator';

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

  // Post-apply: Select hex for fortification based on outcome (AFTER Apply button clicked)
  postApplyInteractions: [
    {
      type: 'map-selection',
      id: 'selectedHex',
      mode: 'hex-selection',
      colorType: 'fortify',
      validation: (hexId: string) => {
        // Synchronous validation for hex selector
        return validateFortifyHexForPipeline(hexId);
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
      },
      // Custom execution: Handle fortification upgrade
      onComplete: async (selectedHexIds: string[], ctx: any) => {
        if (!selectedHexIds || selectedHexIds.length === 0) {
          console.log('[FortifyHex] No hexes selected');
          return;
        }

        const hexId = selectedHexIds[0];
        const kingdom = getKingdomData();

        // Find the hex
        const hex = kingdom.hexes.find((h: any) => h.id === hexId);
        if (!hex) {
          console.error(`[FortifyHex] Hex ${hexId} not found in kingdom data`);
          ui.notifications?.error(`Hex ${hexId} not found`);
          return;
        }

        console.log(`[FortifyHex] Found hex ${hexId}, current fortification:`, hex.fortification);

        // Load fortification data
        const fortificationDataModule = await import('../../../data/player-actions/fortify-hex.json');
        const fortificationData = fortificationDataModule.default || fortificationDataModule;

        // Determine next tier (validation already confirmed it's affordable)
        const currentTier = hex.fortification?.tier || 0;
        const nextTier = currentTier + 1;
        const tierConfig = fortificationData.tiers[nextTier - 1];
        
        console.log(`[FortifyHex] Upgrading hex ${hexId} from tier ${currentTier} to tier ${nextTier}`);

        // Execute fortification (validation already confirmed affordability)
        await fortifyHexExecution(hexId, nextTier as 1 | 2 | 3 | 4);

        console.log(`[FortifyHex] Fortification complete - checking hex data...`);
        const updatedKingdom = getKingdomData();
        const updatedHex = updatedKingdom.hexes.find((h: any) => h.id === hexId);
        console.log(`[FortifyHex] Updated hex fortification:`, updatedHex?.fortification);

        // Show success notification
        const actionVerb = currentTier === 0 ? 'Built' : 'Upgraded to';
        const costSummary = Object.entries(tierConfig.cost)
          .map(([r, a]) => `${a} ${r}`)
          .join(', ');
        
        const message = ctx.outcome === 'criticalSuccess'
          ? `${actionVerb} ${tierConfig.name} at hex ${hexId} (cost: ${costSummary}). ${tierConfig.description}`
          : `${actionVerb} ${tierConfig.name} at hex ${hexId} (cost: ${costSummary}). ${tierConfig.description}`;

        ui.notifications?.info(message);
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
  }
};
