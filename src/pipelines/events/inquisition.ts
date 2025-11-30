/**
 * Inquisition Event Pipeline
 *
 * Generated from data/events/inquisition.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

export const inquisitionPipeline: CheckPipeline = {
  id: 'inquisition',
  name: 'Inquisition',
  description: 'Zealots mobilize against a minority group or belief.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'religion', description: 'theological debate' },
      { skill: 'intimidation', description: 'suppress zealots' },
      { skill: 'diplomacy', description: 'protect victims' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The situation is peacefully resolved.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    success: {
      description: 'The zealots are dispersed.',
      modifiers: []
    },
    failure: {
      description: 'The persecution spreads.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'Violence erupts.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ]
    },
  },

  preview: {
  }
};
