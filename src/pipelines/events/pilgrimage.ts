/**
 * Pilgrimage Event Pipeline
 *
 * Generated from data/events/pilgrimage.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

export const pilgrimagePipeline: CheckPipeline = {
  id: 'pilgrimage',
  name: 'Pilgrimage',
  description: 'Religious pilgrims seek passage or sanctuary in your kingdom.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'religion', description: 'provide sanctuary' },
      { skill: 'diplomacy', description: 'welcome pilgrims' },
      { skill: 'society', description: 'organize accommodations' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'A major pilgrimage brings prosperity.',
      modifiers: [
        { type: 'static', resource: 'gold', value: 1, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' },
        { type: 'static', resource: 'fame', value: 1, duration: 'immediate' },
      ]
    },
    success: {
      description: 'The pilgrims pass through peacefully.',
      modifiers: [
        { type: 'static', resource: 'gold', value: 1, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'Minor disruptions occur.',
      modifiers: []
    },
    criticalFailure: {
      description: 'Religious tensions arise.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
  },

  preview: {
  }
};
