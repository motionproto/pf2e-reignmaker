import type { CheckPipeline } from '../../types/CheckPipeline';

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
  
  // NEW: Post-roll interaction (inline choice widget before Apply)
  postRollInteractions: [
    {
      type: 'choice-buttons',
      condition: (ctx: any) => ctx.outcome === 'criticalSuccess' || ctx.outcome === 'success',
      options: [
        { label: 'Food', value: 'food' },
        { label: 'Lumber', value: 'lumber' },
        { label: 'Stone', value: 'stone' },
        { label: 'Ore', value: 'ore' }
      ],
      storeAs: 'chosenResource'
    }
  ],
  
  preview: {
    calculate: (ctx: any) => {
      const changes = [];
      
      if (ctx.outcome === 'criticalFailure') {
        changes.push({ resource: 'gold', value: -1 });
      } else if (ctx.outcome === 'criticalSuccess' && ctx.metadata.chosenResource) {
        changes.push({ resource: ctx.metadata.chosenResource, value: 2 });
      } else if (ctx.outcome === 'success' && ctx.metadata.chosenResource) {
        changes.push({ resource: ctx.metadata.chosenResource, value: 1 });
      }
      
      return { resources: changes };
    }
  }
};
