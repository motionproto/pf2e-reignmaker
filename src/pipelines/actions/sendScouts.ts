/**
 * Send Scouts Action Pipeline
 *
 * Learn about unexplored hexes.
 * Converted from data/player-actions/send-scouts.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const sendScoutsPipeline: CheckPipeline = {
  id: 'send-scouts',
  name: 'Send Scouts',
  description: 'Dispatch explorers to gather intelligence about neighboring territories and potential threats',
  checkType: 'action',
  category: 'expand-borders',

  skills: [
    { skill: 'stealth', description: 'covert reconnaissance' },
    { skill: 'survival', description: 'wilderness expertise' },
    { skill: 'nature', description: 'read the land' },
    { skill: 'society', description: 'gather local information' },
    { skill: 'athletics', description: 'rapid exploration' },
    { skill: 'acrobatics', description: 'navigate obstacles' }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'The scouts return with detailed information.',
      modifiers: []
    },
    success: {
      description: 'The scouts return with information.',
      modifiers: []
    },
    failure: {
      description: 'The scouts find nothing.',
      modifiers: []
    },
    criticalFailure: {
      description: 'The scouts are lost.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    }
  },

  preview: {
    calculate: (ctx) => {
      if (ctx.outcome === 'criticalFailure') {
        return {
          resources: [{ resource: 'unrest', value: 1 }],
          specialEffects: [],
          warnings: []
        };
      }
      // Scouts reveal hex information (handled by custom logic)
      return {
        resources: [],
        specialEffects: [{
          type: 'status',
          message: 'Scouts will reveal hex information',
          variant: 'positive'
        }],
        warnings: []
      };
    }
  }
};
