/**
 * Arrest Dissidents Action Pipeline
 *
 * Convert current unrest to imprisoned unrest.
 * Converted from data/player-actions/arrest-dissidents.json
 *
 * NOTE: Uses custom resolution component (ArrestDissidentsResolution.svelte)
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const arrestDissidentsPipeline: CheckPipeline = {
  id: 'arrest-dissidents',
  name: 'Arrest Dissidents',
  description: 'Round up troublemakers and malcontents, converting unrest into imprisoned unrest that can be dealt with through the justice system',
  checkType: 'action',
  category: 'uphold-stability',

  skills: [
    { skill: 'intimidation', description: 'show of force' },
    { skill: 'society', description: 'legal procedures' },
    { skill: 'stealth', description: 'covert operations' },
    { skill: 'deception', description: 'infiltration tactics' },
    { skill: 'athletics', description: 'physical pursuit' }
  ],

  // Post-roll: Custom resolution component handles settlements and amounts
  postRollInteractions: [
    {
      type: 'custom-component',
      id: 'arrestDetails',
      component: 'ArrestDissidentsResolution',
      condition: (ctx) => ctx.outcome === 'criticalSuccess' || ctx.outcome === 'success'
    }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'The troublemakers are swiftly arrested.',
      modifiers: []
    },
    success: {
      description: 'The troublemakers are arrested.',
      modifiers: []
    },
    failure: {
      description: 'The arrests fail.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 0, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'Botched arrests cause riots.',
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

      // Custom component provides preview
      return {
        resources: [],
        specialEffects: [{
          type: 'status' as const,
          message: 'Will convert unrest to imprisoned unrest',
          variant: 'positive' as const
        }],
        warnings: []
      };
    }
  }

  // NOTE: Execution handled by custom implementation
};
