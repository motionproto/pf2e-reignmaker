import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

/**
 * Harvest Resources - Choose resource type after seeing outcome
 * 
 * Post-roll interaction: User chooses resource type inline (NEW phase)
 * - Critical Success: +2 of chosen resource
 * - Success: +1 of chosen resource
 * - Failure: Nothing
 * - Critical Failure: -1 gold
 */
export const harvestResourcesPipeline: CheckPipeline = {
  id: 'harvest-resources',
  name: 'Harvest Resources',
  description: 'Extract natural resources from your territory to stockpile materials.',
  checkType: 'action',
  category: 'resource-management',
  
  skills: [
    { skill: 'nature', description: 'natural harvesting' },
    { skill: 'survival', description: 'efficient extraction' },
    { skill: 'crafting', description: 'process materials' }
  ],
  
  outcomes: {
    criticalSuccess: {
      description: 'The harvest is exceptional.',
      modifiers: []
    },
    success: {
      description: 'The harvest is good.',
      modifiers: []
    },
    failure: {
      description: 'The harvest yields nothing.',
      modifiers: []
    },
    criticalFailure: {
      description: 'Damaged equipment and wasted effort.',
      modifiers: [
        { type: 'static', resource: 'gold', value: -1 }
      ]
    }
  },
  
  // Post-apply: Choose resource type based on outcome (AFTER Apply button clicked)
  postApplyInteractions: [
    {
      type: 'choice',
      id: 'resourceChoice',
      condition: (ctx: any) => ctx.outcome === 'criticalSuccess' || ctx.outcome === 'success',
      label: 'Choose Resource Type',
      options: ['food', 'lumber', 'stone', 'ore'],
      storeAs: 'chosenResource'
    }
  ],
  
  preview: {
    calculate: (ctx: any) => {
      const changes = [];
      const specialEffects = [];
      
      if (ctx.outcome === 'criticalFailure') {
        changes.push({ resource: 'gold', value: -1 });
      } else if (ctx.outcome === 'criticalSuccess' && ctx.resolutionData?.choices?.chosenResource) {
        changes.push({ resource: ctx.resolutionData.choices.chosenResource, value: 2 });
      } else if (ctx.outcome === 'success' && ctx.resolutionData?.choices?.chosenResource) {
        changes.push({ resource: ctx.resolutionData.choices.chosenResource, value: 1 });
      } else if (ctx.outcome === 'criticalSuccess' || ctx.outcome === 'success') {
        // No resource chosen yet - will be chosen in post-apply interaction
        specialEffects.push({
          type: 'status',
          message: 'Choose resource type in next step',
          variant: 'neutral'
        });
      }
      
      return { 
        resources: changes,
        entities: [],
        specialEffects,
        warnings: []
      };
    }
  },

  // Execute function - explicitly handles ALL outcomes
  execute: async (ctx) => {
    switch (ctx.outcome) {
      case 'criticalSuccess':
      case 'success': {
        // Get chosen resource from resolution data (from post-roll interaction)
        const chosenResource = ctx.resolutionData?.choices?.chosenResource;
        
        if (!chosenResource) {
          return { success: false, error: 'No resource chosen' };
        }
        
        // Determine amount based on outcome
        const amount = ctx.outcome === 'criticalSuccess' ? 2 : 1;
        
        // Apply resource gain using GameCommandsService
        const { createGameCommandsService } = await import('../../services/GameCommandsService');
        const gameCommandsService = await createGameCommandsService();
        
        const result = await gameCommandsService.applyOutcome({
          type: 'action',
          sourceId: harvestResourcesPipeline.id,
          sourceName: harvestResourcesPipeline.name,
          outcome: ctx.outcome,
          modifiers: [
            { type: 'static', resource: chosenResource, value: amount, duration: 'immediate' }
          ]
        });
        
        return result;
      }
        
      case 'failure':
        // Explicitly do nothing (no modifiers defined)
        return { success: true };
        
      case 'criticalFailure':
        // Explicitly apply -1 gold modifier from pipeline
        await applyPipelineModifiers(harvestResourcesPipeline, ctx.outcome);
        return { success: true };
        
      default:
        return { success: false, error: `Unexpected outcome: ${ctx.outcome}` };
    }
  }
};
