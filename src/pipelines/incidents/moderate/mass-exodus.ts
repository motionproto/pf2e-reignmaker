/**
 * Mass Exodus Incident Pipeline
 *
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';

export const massExodusPipeline: CheckPipeline = {
  id: 'mass-exodus',
  name: 'Mass Exodus',
  description: 'Large numbers of citizens flee your kingdom',
  checkType: 'incident',
  tier: 'moderate',

  skills: [
      { skill: 'diplomacy', description: 'convince to stay' },
      { skill: 'performance', description: 'inspire hope' },
      { skill: 'religion', description: 'spiritual guidance' },
    ],

  outcomes: {
    success: {
      description: 'The population remains.',
      modifiers: []
    },
    failure: {
      description: 'Citizens abandon projects.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'A mass exodus damages your kingdom.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
        { type: 'static', resource: 'fame', value: -1, duration: 'immediate' },
      ]
    },
  },

  execute: async (ctx) => {
    // Modifiers already applied by execute-first pattern
    
    // Only execute game commands on failure or critical failure
    if (ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess') {
      return { success: true };
    }
    
    const { createGameCommandsResolver } = await import('../../../services/GameCommandsResolver');
    const resolver = await createGameCommandsResolver();
    
    // Both outcomes destroy 1 worksite
    const worksiteCommand = await resolver.destroyWorksite(1);
    if (worksiteCommand?.commit) {
      await worksiteCommand.commit();
    }
    
    // Critical failure also damages 1 structure
    if (ctx.outcome === 'criticalFailure') {
      const structureCommand = await resolver.damageStructure(1);
      if (structureCommand?.commit) {
        await structureCommand.commit();
      }
    }
    
    return { success: true };
  },

  // Auto-convert JSON modifiers to badges
  preview: undefined,

  traits: ["dangerous"],
};
