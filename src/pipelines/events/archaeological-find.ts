/**
 * Archaeological Find Event Pipeline
 *
 * Ancient ruins or artifacts are discovered in your territory.
 * Uses ChoiceModifier for simple resource selection.
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const archaeologicalFindPipeline: CheckPipeline = {
  id: 'archaeological-find',
  name: 'Archaeological Find',
  description: 'Ancient ruins or artifacts are discovered in your territory.',
  checkType: 'event',
  tier: 1,

  skills: [
    { skill: 'society', description: 'historical research' },
    { skill: 'religion', description: 'divine significance' },
    { skill: 'occultism', description: 'arcane investigation' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'A major discovery - choose how to leverage it.',
      endsEvent: true,
      modifiers: [
        { type: 'choice', resources: ['fame', 'gold'], value: 3, duration: 'immediate' }
      ]
    },
    success: {
      description: 'Valuable artifacts are uncovered - choose the benefit.',
      endsEvent: true,
      modifiers: [
        { type: 'choice', resources: ['fame', 'gold'], value: 2, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'Only minor artifacts are found.',
      endsEvent: true,
      modifiers: [
        { type: 'choice', resources: ['food', 'lumber', 'ore', 'stone'], value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'The site awakens something dangerous.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
  },

  preview: {
    calculate: async (ctx) => {
      // ChoiceModifier is handled automatically by the system
      return { resources: [], outcomeBadges: [] };
    }
  },

  traits: ['beneficial'],
};
