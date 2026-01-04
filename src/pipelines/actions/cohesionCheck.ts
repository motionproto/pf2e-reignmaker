/**
 * Kingdom Cohesion Check Pipeline
 *
 * Triggers when kingdom has >= 20 claimed hexes.
 * A rotating leader makes a skill check to maintain kingdom stability.
 * This does NOT consume a leader action - it's part of the Status Phase.
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const cohesionCheckPipeline: CheckPipeline = {
  // === BASE DATA ===
  id: 'cohesion-check',
  name: 'Kingdom Cohesion',
  description: 'How does your leader bring stability to the growing kingdom?',
  category: 'status-phase',  // Special category for status phase checks
  checkType: 'action',

  // Skills are dynamic - populated at runtime from active leader's top skills
  // The StatusPhase.svelte component passes skills via metadata
  skills: [],

  outcomes: {
    criticalSuccess: {
      description: 'Perfect cohesion maintained despite growth.',
      modifiers: [
        { type: 'dice', resource: 'unrest', formula: '1d4', negative: true, duration: 'immediate' }
      ]
    },
    success: {
      description: 'Cohesion maintained.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'Cohesion slips; dissent spreads.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'Kingdom fragments; factions form.',
      modifiers: [
        { type: 'dice', resource: 'unrest', formula: '1d4', duration: 'immediate' }
      ]
    }
  },

  // No requirements - this is triggered automatically based on hex count
  requirements: () => ({ met: true }),

  // Preview configuration
  preview: {}
};
