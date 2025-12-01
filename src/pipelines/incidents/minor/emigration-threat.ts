/**
 * Emigration Threat Incident Pipeline
 *
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';

export const emigrationThreatPipeline: CheckPipeline = {
  id: 'emigration-threat',
  name: 'Emigration Threat',
  description: 'Citizens threaten to leave your kingdom permanently',
  checkType: 'incident',
  tier: 'minor',

  skills: [
      { skill: 'diplomacy', description: 'convince to stay' },
      { skill: 'society', description: 'address concerns' },
      { skill: 'religion', description: 'appeal to faith' },
      { skill: 'nature', description: 'improve local conditions' },
    ],

  outcomes: {
    success: {
      description: 'The population stays.',
      modifiers: []
    },
    failure: {
      description: 'Citizens abandon ongoing projects.',
      modifiers: []
    },
    criticalFailure: {
      description: 'Mass emigration causes chaos.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
  },

  execute: async (ctx) => {
    // Modifiers already applied by execute-first pattern
    
    // Only execute worksite destruction on failure or critical failure
    if (ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess') {
      return { success: true };
    }
    
    const { createGameCommandsResolver } = await import('../../../services/GameCommandsResolver');
    const resolver = await createGameCommandsResolver();
    
    // Failure: destroy 1 worksite, Critical Failure: destroy 1d3 worksites
    const count = ctx.outcome === 'criticalFailure' ? '1d3' : 1;
    const preparedCommand = await resolver.destroyWorksite(count);
    
    if (!preparedCommand) {
      return { success: true, message: 'No worksites to destroy' };
    }
    
    if (preparedCommand.commit) {
      await preparedCommand.commit();
    }
    
    return { success: true };
  },

  // Auto-convert JSON modifiers to badges
  preview: undefined,

  traits: ["dangerous"],
};
