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
        // Basic hex validation (worksite type validated by custom component)
        return validateCreateWorksiteForPipeline(hexId);
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
