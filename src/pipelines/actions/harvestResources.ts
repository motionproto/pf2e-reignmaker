import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';
import { applyResourceChanges } from '../shared/InlineActionHelpers';
import ResourceChoiceSelector from '../../view/kingdom/components/OutcomeDisplay/components/ResourceChoiceSelector.svelte';

/**
 * Harvest Resources - Choose resource type after seeing outcome
 * 
 * Post-roll interaction: User chooses resource type inline (before Apply)
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

  // Post-roll: Select resource inline (BEFORE Apply button, shown in outcome display)
  postRollInteractions: [
    {
      type: 'configuration',
      id: 'resourceSelection',
      component: ResourceChoiceSelector,  // Custom Svelte component
      // Only show for successful harvests
      condition: (ctx) => {
        return ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess';
      },
      // Execute harvest when user confirms selection
      onComplete: async (data: any, ctx: any) => {
        console.log('🎯 [HarvestResources] User selected:', data);
        const { selectedResource, amount } = data || {};
        
        if (!selectedResource || !amount) {
          throw new Error('No resource selection was made');
        }
        
        // Apply resource gain
        const result = await applyResourceChanges([
          { resource: selectedResource, amount: amount }
        ], 'harvest-resources');
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to apply resource changes');
        }
        
        console.log('✅ [HarvestResources] Resources harvested successfully');
      }
    }
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
  
  preview: {
    providedByInteraction: true  // Resource selector shows preview
  },

  // Execute function - explicitly handles ALL outcomes
  execute: async (ctx) => {
    switch (ctx.outcome) {
      case 'criticalSuccess':
      case 'success':
        // Resource selection and application handled by postRollInteractions.onComplete
        // The onComplete handler already applied the resource changes during Step 7,
        // so we just need to verify it ran successfully.
        console.log('[HarvestResources] ✅ Resources harvested via postRollInteractions');
        return { success: true };
        
      case 'failure':
        // No action taken on failure
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
