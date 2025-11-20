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
      case 'criticalSuccess': {
        console.log('[CreateWorksite] Processing critical success...');
        
        // Worksite created by onComplete handler
        // Grant immediate resources from worksite production
        const selectedHexData = ctx.resolutionData?.compoundData?.selectedHex;
        console.log('[CreateWorksite] selectedHexData:', selectedHexData);
        
        let hexId: string | undefined;
        let worksiteType: string | undefined;
        
        // Handle both array and object formats
        if (Array.isArray(selectedHexData)) {
          // Old format: ["hexId"]
          hexId = selectedHexData[0];
          console.warn('[CreateWorksite] Got array format for selectedHex, cannot determine worksite type');
        } else if (selectedHexData?.hexIds) {
          // New format: { hexIds: ["hexId"], metadata: { worksiteType: "..." } }
          hexId = selectedHexData.hexIds[0];
          worksiteType = selectedHexData.metadata?.worksiteType;
          console.log('[CreateWorksite] Extracted hexId:', hexId, 'worksiteType:', worksiteType);
        }
        
        if (hexId && worksiteType) {
          console.log('[CreateWorksite] Granting resources for', worksiteType, 'on hex', hexId);
          
          const { updateKingdom } = await import('../../stores/KingdomStore');
          const kingdom = getKingdomData();
          const hex = kingdom.hexes?.find((h: any) => h.id === hexId);
          
          if (hex) {
            console.log('[CreateWorksite] Found hex with terrain:', hex.terrain);
            
            // Calculate production based on worksite type and terrain
            const production = getWorksiteProduction(worksiteType, hex.terrain);
            console.log('[CreateWorksite] Calculated production:', Array.from(production.entries()));
            
            if (production.size > 0) {
              console.log('[CreateWorksite] Updating kingdom resources...');
              
              await updateKingdom(k => {
                production.forEach((amount, resource) => {
                  if (k.resources && resource in k.resources) {
                    const oldValue = k.resources[resource];
                    k.resources[resource] += amount;
                    console.log(`[CreateWorksite] ${resource}: ${oldValue} → ${k.resources[resource]} (+${amount})`);
                  } else {
                    console.warn(`[CreateWorksite] Resource ${resource} not found in kingdom resources`);
                  }
                });
              });
              
              // Notify user
              const resourceText = Array.from(production.entries())
                .map(([res, amt]) => `+${amt} ${res}`)
                .join(', ');
              ui.notifications?.info(`🎉 Critical success! Worksite immediately produces: ${resourceText}`);
              console.log('[CreateWorksite] ✅ Resources granted successfully');
            } else {
              console.warn('[CreateWorksite] Production map is empty - no resources to grant');
            }
          } else {
            console.error('[CreateWorksite] Hex not found:', hexId);
          }
        } else {
          console.error('[CreateWorksite] Missing hexId or worksiteType:', { hexId, worksiteType });
        }
        return { success: true };
      }
      
      case 'success':
        // Worksite created by onComplete handler
        // No additional effects
        return { success: true };
        
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
