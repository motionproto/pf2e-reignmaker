/**
 * createWorksite Action Pipeline
 * Data from: data/player-actions/create-worksite.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';
import { getKingdomData } from '../../stores/KingdomStore';
import { createWorksiteExecution } from '../../execution/territory/createWorksite';
import { getWorksiteBaseProduction } from '../../services/economics/production';
import { textBadge } from '../../types/OutcomeBadge';
import WorksiteTypeSelector from '../../services/hex-selector/WorksiteTypeSelector.svelte';
import { validateCreateWorksiteForPipeline } from '../shared/worksiteValidator';
import {
  validateClaimed,
  validateNoSettlement,
  safeValidation,
  getFreshKingdomData,
  type ValidationResult
} from '../shared/hexValidators';

export const createWorksitePipeline = createActionPipeline('create-worksite', {
  // No cost - always available
  requirements: () => ({ met: true }),

  preview: {
    calculate: (ctx) => {
      // No resource costs for worksites currently
      // Future: could add resource costs here if needed
      return {
        resources: [],
        outcomeBadges: [],
        warnings: []
      };
    }
  },

  postApplyInteractions: [
    {
      id: 'selectedHex',
      type: 'map-selection',
      mode: 'hex-selection',
      count: 1,
      title: 'Select a hex for the worksite',
      colorType: 'worksite',
      required: true,
      condition: (ctx) => ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess',
      validateHex: (hexId: string): ValidationResult => {
        return safeValidation(() => {
          // Basic validation without worksite type (type-specific validation happens in customSelector)
          const kingdom = getFreshKingdomData();
          const hex = kingdom.hexes?.find((h: any) => h.id === hexId);
          
          if (!hex) {
            return { valid: false, message: 'Hex not found' };
          }
          
          // Check if claimed
          const claimedResult = validateClaimed(hexId, kingdom);
          if (!claimedResult.valid) return claimedResult;
          
          // Check for settlement
          const settlementResult = validateNoSettlement(hexId, kingdom);
          if (!settlementResult.valid) return settlementResult;
          
          // Check for existing worksite
          if (hex.worksite) {
            return { valid: false, message: `Hex already has a ${hex.worksite.type}` };
          }
          
          return { valid: true, message: 'Valid location for worksite' };
        }, hexId, 'createWorksite validation');
      },
      customSelector: {
        component: WorksiteTypeSelector
      }
    }
  ],

  execute: async (ctx) => {
    console.log('[CreateWorksite] Execute called with outcome:', ctx.outcome);
    console.log('[CreateWorksite] Resolution data:', JSON.stringify(ctx.resolutionData, null, 2));
    
    switch (ctx.outcome) {
      case 'criticalSuccess':
      case 'success': {
        // Read hex selection from resolutionData (populated by postApplyInteractions)
        // Custom selector returns { hexIds: [...], metadata: { worksiteType: "..." } }
        const selectedHexData = ctx.resolutionData?.compoundData?.selectedHex;
        
        if (!selectedHexData) {
          console.log('[CreateWorksite] No hex selected');
          return { success: true };  // Graceful cancellation
        }
        
        let hexId: string | undefined;
        let worksiteType: string | undefined;
        
        // Handle both array and object formats
        if (Array.isArray(selectedHexData)) {
          hexId = selectedHexData[0];
          console.warn('[CreateWorksite] Got array format for selectedHex, cannot determine worksite type');
          return { success: false, error: 'Worksite type not selected' };
        } else if (selectedHexData?.hexIds) {
          hexId = selectedHexData.hexIds[0];
          worksiteType = selectedHexData.metadata?.worksiteType;
        }

        if (!hexId || !worksiteType) {
          console.error('[CreateWorksite] Missing hex or worksite type:', { hexId, worksiteType });
          return { success: false, error: 'Worksite selection incomplete' };
        }

        console.log(`[CreateWorksite] Creating ${worksiteType} on hex ${hexId}`);

        // Execute worksite creation
        await createWorksiteExecution(hexId, worksiteType);

        // Show success notification
        const message = ctx.outcome === 'criticalSuccess'
          ? `Successfully created ${worksiteType} on hex ${hexId} (work completed swiftly!)`
          : `Successfully created ${worksiteType} on hex ${hexId}`;
        ui.notifications?.info(message);
        
        // Grant immediate resources on critical success
        if (ctx.outcome === 'criticalSuccess') {
          const { updateKingdom } = await import('../../stores/KingdomStore');
          const kingdom = getKingdomData();
          const hex = kingdom.hexes?.find((h: any) => h.id === hexId);
          
          if (hex) {
            const production = getWorksiteBaseProduction(worksiteType, hex.terrain);
            
            if (production.size > 0) {
              await updateKingdom(k => {
                production.forEach((amount, resource) => {
                  if (k.resources && resource in k.resources) {
                    k.resources[resource] += amount;
                  }
                });
              });
              
              const resourceText = Array.from(production.entries())
                .map(([res, amt]) => `+${amt} ${res}`)
                .join(', ');
              ui.notifications?.info(`🎉 Critical success! Worksite immediately produces: ${resourceText}`);
            }
          }
        }
        return { success: true };
      }
        
      case 'failure':
        // No effects on failure
        return { success: true };
        
      case 'criticalFailure': {
        // Apply +1 unrest modifier from pipeline
        const { applyPipelineModifiers } = await import('../shared/applyPipelineModifiers');
        await applyPipelineModifiers(createWorksitePipeline, ctx.outcome);
        return { success: true };
      }
        
      default:
        return { success: false, error: `Unexpected outcome: ${ctx.outcome}` };
    }
  }
});
