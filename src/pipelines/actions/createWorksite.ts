/**
 * Create Worksite Action Pipeline
 * Establish farms, mines, quarries, or lumber camps
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { getKingdomData } from '../../stores/KingdomStore';
import { createWorksiteExecution } from '../../execution/territory/createWorksite';
import { getWorksiteBaseProduction } from '../../services/economics/production';
import WorksiteTypeSelector from '../../services/hex-selector/WorksiteTypeSelector.svelte';
import {
  validateClaimed,
  validateNoSettlement,
  safeValidation,
  getFreshKingdomData,
  type ValidationResult
} from '../shared/hexValidators';

export const createWorksitePipeline: CheckPipeline = {
  // === BASE DATA ===
  id: 'create-worksite',
  name: 'Create Worksite',
  description: 'Establish resource extraction operations to harness the natural wealth of your territories',
  brief: 'Establish farms, mines, quarries, or lumber camps',
  category: 'expand-borders',
  checkType: 'action',

  skills: [
    { skill: 'crafting', description: 'build infrastructure' },
    { skill: 'nature', description: 'identify resources' },
    { skill: 'survival', description: 'frontier operations' },
    { skill: 'athletics', description: 'manual labor' },
    { skill: 'arcana', description: 'magical extraction' },
    { skill: 'religion', description: 'blessed endeavors' }
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

  // === TYPESCRIPT LOGIC ===
  requirements: () => ({ met: true }),

  preview: {
    calculate: (ctx) => {
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
          const kingdom = getFreshKingdomData();
          const hex = kingdom.hexes?.find((h: any) => h.id === hexId);
          
          if (!hex) {
            return { valid: false, message: 'Hex not found' };
          }
          
          const claimedResult = validateClaimed(hexId, kingdom);
          if (!claimedResult.valid) return claimedResult;
          
          const settlementResult = validateNoSettlement(hexId, kingdom);
          if (!settlementResult.valid) return settlementResult;
          
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
    switch (ctx.outcome) {
      case 'criticalSuccess':
      case 'success': {
        const selectedHexData = ctx.resolutionData?.compoundData?.selectedHex;
        
        if (!selectedHexData) {
          return { success: true };
        }
        
        let hexId: string | undefined;
        let worksiteType: string | undefined;
        
        if (Array.isArray(selectedHexData)) {
          hexId = selectedHexData[0];
          return { success: false, error: 'Worksite type not selected' };
        } else if (selectedHexData?.hexIds) {
          hexId = selectedHexData.hexIds[0];
          worksiteType = selectedHexData.metadata?.worksiteType;
        }

        if (!hexId || !worksiteType) {
          return { success: false, error: 'Worksite selection incomplete' };
        }

        await createWorksiteExecution(hexId, worksiteType);

        const message = ctx.outcome === 'criticalSuccess'
          ? `Successfully created ${worksiteType} on hex ${hexId} (work completed swiftly!)`
          : `Successfully created ${worksiteType} on hex ${hexId}`;
        ui.notifications?.info(message);
        
        if (ctx.outcome === 'criticalSuccess') {
          const kingdom = getKingdomData();
          const hex = kingdom.hexes?.find((h: any) => h.id === hexId);
          
          if (hex) {
            const production = getWorksiteBaseProduction(worksiteType, hex.terrain);
            
            if (production.size > 0) {
              const { createGameCommandsService } = await import('../../services/GameCommandsService');
              const gameCommandsService = await createGameCommandsService();
              
              const modifiers = Array.from(production.entries()).map(([resource, amount]) => ({
                resource: resource as import('../../types/modifiers').ResourceType,
                value: amount
              }));
              
              await gameCommandsService.applyNumericModifiers(modifiers, ctx.outcome);
              
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
        return { success: true };
        
      case 'criticalFailure':
        return { success: true };
        
      default:
        return { success: false, error: `Unexpected outcome: ${ctx.outcome}` };
    }
  }
};
