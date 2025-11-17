/**
 * Deal with Unrest Action Pipeline
 *
 * Address grievances and calm tensions through various approaches.
 * Converted from data/player-actions/deal-with-unrest.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

export const dealWithUnrestPipeline: CheckPipeline = {
  id: 'deal-with-unrest',
  name: 'Deal with Unrest',
  description: 'Address grievances and calm tensions through various approaches: entertainment, religious ceremonies, shows of force, diplomatic engagement, scholarly discourse, or magical displays',
  checkType: 'action',
  category: 'uphold-stability',

  skills: [
    { skill: 'performance', description: 'entertainment and festivities' },
    { skill: 'religion', description: 'religious ceremonies' },
    { skill: 'intimidation', description: 'shows of force' },
    { skill: 'diplomacy', description: 'diplomatic engagement' },
    { skill: 'arcana', description: 'magical persuasion' },
    { skill: 'medicine', description: 'public health initiatives' },
    { skill: 'occultism', description: 'mystical demonstrations' }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'The people rally to your cause.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -3, duration: 'immediate' }
      ]
    },
    success: {
      description: 'The people listen.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -2, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'Tensions ease slightly.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'No one listens.',
      modifiers: []  // No change to unrest
    }
  },

  preview: {
    calculate: (ctx) => {
      // Calculate based on actual outcome (not hardcoded to success)
      let unrestChange = 0;
      
      switch (ctx.outcome) {
        case 'criticalSuccess':
          unrestChange = -3;
          break;
        case 'success':
          unrestChange = -2;
          break;
        case 'failure':
          unrestChange = -1;
          break;
        case 'criticalFailure':
          unrestChange = 0;  // No change
          break;
      }
      
      return {
        resources: unrestChange !== 0 ? [
          { resource: 'unrest', value: unrestChange }
        ] : [],
        specialEffects: []
      };
    }
  },

  // Execute function - explicitly handles ALL outcomes
  execute: async (ctx) => {
    switch (ctx.outcome) {
      case 'criticalSuccess':
        // Explicitly apply -3 unrest modifier from pipeline
        await applyPipelineModifiers(dealWithUnrestPipeline, ctx.outcome);
        return { success: true };
        
      case 'success':
        // Explicitly apply -2 unrest modifier from pipeline
        await applyPipelineModifiers(dealWithUnrestPipeline, ctx.outcome);
        return { success: true };
        
      case 'failure':
        // Explicitly apply -1 unrest modifier from pipeline
        await applyPipelineModifiers(dealWithUnrestPipeline, ctx.outcome);
        return { success: true };
        
      case 'criticalFailure':
        // Explicitly do nothing (no modifiers defined in pipeline)
        return { success: true };
        
      default:
        return { success: false, error: `Unexpected outcome: ${ctx.outcome}` };
    }
  }
};
