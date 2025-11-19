/**
 * Create Worksite Action Pipeline
 *
 * Establish farms, mines, quarries, or lumber camps.
 * Converted from data/player-actions/create-worksite.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { createWorksiteExecution } from '../../execution/territory/createWorksite';
import { getKingdomData } from '../../stores/KingdomStore';
import { validateCreateWorksiteForPipeline } from '../shared/worksiteValidator';
import WorksiteTypeSelector from '../../services/hex-selector/WorksiteTypeSelector.svelte';
import { PLAYER_KINGDOM } from '../../types/ownership';
import { isHexClaimedByPlayer, hexHasSettlement } from '../shared/hexValidation';

export const createWorksitePipeline: CheckPipeline = {
  id: 'create-worksite',
  name: 'Create Worksite',
  description: 'Establish resource extraction operations to harness the natural wealth of your territories',
  checkType: 'action',
  category: 'expand-borders',

  skills: [
    { skill: 'crafting', description: 'build infrastructure' },
    { skill: 'nature', description: 'identify resources' },
    { skill: 'survival', description: 'frontier operations' },
    { skill: 'athletics', description: 'manual labor' },
    { skill: 'arcana', description: 'magical extraction' },
    { skill: 'religion', description: 'blessed endeavors' }
  ],

  // Post-apply: Select hex + worksite type via custom selector
  postApplyInteractions: [
    {
      type: 'map-selection',
      id: 'selectedHex',
      mode: 'hex-selection',
      colorType: 'worksite',
      
      // Custom selector component for worksite type selection
      customSelector: {
        component: WorksiteTypeSelector,
        props: {} // No additional props needed
      },
      
      validation: (hexId: string, ctx: any) => {
        try {
          // Basic hex validation with detailed error messages
          // (worksite type terrain compatibility validated by custom component)
          const kingdom = getKingdomData();
          
          if (!kingdom) {
            return { valid: false, message: 'Kingdom data not loaded' };
          }
          
          const hex = kingdom.hexes?.find(h => h.id === hexId);
          
          if (!hex) {
            return { valid: false, message: 'Hex not found' };
          }
          
          // ✅ CHECK SETTLEMENT FIRST (more specific error message)
          // Cannot have a settlement (settlements block worksites)
          if (hexHasSettlement(hexId, kingdom)) {
            return { valid: false, message: 'Cannot build worksites in settlement hexes' };
          }
          
          // ✅ THEN check if hex is claimed by player kingdom (uses PLAYER_KINGDOM constant)
          if (!isHexClaimedByPlayer(hexId, kingdom)) {
            return { valid: false, message: 'Must be in claimed territory' };
          }
          
          // Cannot already have a worksite
          if (hex.worksite) {
            const worksiteType = hex.worksite.type || 'worksite';
            return { valid: false, message: `Hex already has a ${worksiteType} (only one worksite per hex)` };
          }
          
          // Valid hex - terrain compatibility will be checked by custom selector
          return { valid: true, message: 'Select worksite type for this hex' };
        } catch (error) {
          console.error('[CreateWorksite] Validation error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return { valid: false, message: `Validation failed: ${errorMessage}` };
        }
      },
      // Outcome-based adjustments
      outcomeAdjustment: {
        criticalSuccess: {
          count: 1,
          title: 'Select 1 hex to create worksite (critical success!)'
        },
        success: {
          count: 1,
          title: 'Select 1 hex to create worksite'
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
      // Custom execution: Handle worksite creation
      onComplete: async (result: any, ctx: any) => {
        // Result can be either string[] (backward compat) or { hexIds, metadata }
        let hexId: string;
        let worksiteType: string;
        
        if (Array.isArray(result)) {
          // Old format - shouldn't happen with custom selector, but handle gracefully
          console.warn('[CreateWorksite] Received array format, expected object with metadata');
          return;
        } else {
          // New format: { hexIds: string[], metadata: { worksiteType: string } }
          hexId = result.hexIds[0];
          worksiteType = result.metadata.worksiteType;
        }

        if (!hexId || !worksiteType) {
          console.error('[CreateWorksite] Missing hex or worksite type:', { hexId, worksiteType });
          ui.notifications?.error('Worksite selection incomplete');
          return;
        }

        console.log(`[CreateWorksite] Creating ${worksiteType} on hex ${hexId}`);

        // Execute worksite creation
        await createWorksiteExecution(hexId, worksiteType);

        // Show success notification
        const message = ctx.outcome === 'criticalSuccess'
          ? `Successfully created ${worksiteType} on hex ${hexId} (work completed swiftly!)`
          : `Successfully created ${worksiteType} on hex ${hexId}`;

        ui.notifications?.info(message);
      }
    }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'The worksite is established quickly.',
      modifiers: []
    },
    success: {
      description: 'The worksite is established.',
      modifiers: []
    },
    failure: {
      description: 'The workers make no progress.',
      modifiers: []
    },
    criticalFailure: {
      description: 'The work is abandoned.',
      modifiers: []
    }
  },

  preview: {
    providedByInteraction: true,  // Map selection shows worksites in real-time
    calculate: (ctx) => {
      // No resource costs for worksites currently
      // Future: could add resource costs here if needed
      return {
        resources: [],
        specialEffects: [],
        warnings: []
      };
    }
  }
};
