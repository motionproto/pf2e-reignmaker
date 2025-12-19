/**
 * Harvest Resources Action Pipeline
 * Gather materials from your kingdom's lands
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { textBadge } from '../../types/OutcomeBadge';
import { applyResourceChanges } from '../shared/InlineActionHelpers';

export const harvestResourcesPipeline: CheckPipeline = {
  // === BASE DATA ===
  id: 'harvest-resources',
  name: 'Harvest Resources',
  description: 'Organize gathering expeditions to collect raw materials from your kingdom\'s territories. Choose which resource to focus on after seeing how successful your efforts are.',
  brief: 'Gather materials from your kingdom\'s lands',
  category: 'economic-resources',
  checkType: 'action',

  skills: [
    { skill: 'nature', description: 'natural harvesting' },
    { skill: 'survival', description: 'efficient extraction' },
    { skill: 'crafting', description: 'process materials' }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'The harvest is exceptional.',
      modifiers: [],
      outcomeBadges: [
        textBadge('Choose resource to harvest', 'fa-seedling', 'info')
      ]
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
        { type: 'static', resource: 'gold', value: -1, duration: 'immediate' }
      ]
    }
  },

  // === TYPESCRIPT LOGIC ===
  requirements: () => ({ met: true }),

  postRollInteractions: [
    {
      type: 'configuration',
      id: 'resourceSelection',
      component: 'ResourceChoiceSelector',
      condition: (ctx) => {
        return ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess';
      },
      onComplete: async (data: any, ctx: any) => {
        const { selectedResource, amount } = data || {};
        
        if (!selectedResource || !amount) {
          throw new Error('No resource selection was made');
        }
        
        const result = await applyResourceChanges([
          { resource: selectedResource, amount: amount }
        ], 'harvest-resources');
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to apply resource changes');
        }
      }
    }
  ],

  preview: {
    calculate: async (ctx) => ({
      resources: []
    })
  },

  execute: async (ctx) => {
    switch (ctx.outcome) {
      case 'criticalSuccess':
      case 'success':
        return { success: true };
        
      case 'failure':
        return { success: true };
        
      case 'criticalFailure':
        return { success: true };
        
      default:
        return { success: false, error: `Unexpected outcome: ${ctx.outcome}` };
    }
  }
};
