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
      }
    }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'The worksite is established quickly and immediately produces resources.',
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
      description: 'The work is abandoned and tensions rise.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
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
  },

  // Execute function - handles outcome-specific logic
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
            const production = getWorksiteProduction(worksiteType, hex.terrain);
            
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
};

/**
 * Get immediate production from a worksite type on specific terrain
 * Used for critical success bonus
 */
function getWorksiteProduction(worksiteType: string, terrain: string): Map<string, number> {
  const normalizedTerrain = terrain.toLowerCase();
  
  switch (worksiteType) {
    case 'Farmstead':
      if (normalizedTerrain === 'plains') {
        return new Map([['food', 2]]);
      } else {
        return new Map([['food', 1]]);
      }
      
    case 'Logging Camp':
      if (normalizedTerrain === 'forest') {
        return new Map([['lumber', 2]]);
      }
      return new Map();
      
    case 'Quarry':
      if (normalizedTerrain === 'hills' || normalizedTerrain === 'mountains') {
        return new Map([['stone', 1]]);
      }
      return new Map();
      
    case 'Mine':
    case 'Bog Mine':
      if (normalizedTerrain === 'mountains' || normalizedTerrain === 'swamp') {
        return new Map([['ore', 1]]);
      }
      return new Map();
      
    default:
      return new Map();
  }
}
