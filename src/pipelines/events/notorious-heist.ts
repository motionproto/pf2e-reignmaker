/**
 * Notorious Heist Event Pipeline
 *
 * Generated from data/events/notorious-heist.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

export const notoriousHeistPipeline: CheckPipeline = {
  id: 'notorious-heist',
  name: 'Notorious Heist',
  description: 'A daring theft threatens your kingdom\'s security and reputation.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'thievery', description: 'understand criminal methods' },
      { skill: 'stealth', description: 'track the thieves' },
      { skill: 'society', description: 'investigate connections' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The thieves are captured with the stolen goods.',
      modifiers: [
        { type: 'static', resource: 'imprisoned_unrest', value: 2, duration: 'immediate' }
      ]
    },
    success: {
      description: 'The thieves are arrested.',
      modifiers: [
        { type: 'static', resource: 'imprisoned_unrest', value: 1, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The thieves escape.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
      ]
    },
    criticalFailure: {
      description: 'A crime syndicate thrives.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4+1', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' },
      ]
    },
  },

  preview: {
  }
};
