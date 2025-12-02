/**
 * Economic Crash Incident Pipeline
 *
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const economicCrashPipeline: CheckPipeline = {
  id: 'economic-crash',
  name: 'Economic Crash',
  description: 'A severe economic downturn threatens your kingdom\'s prosperity',
  checkType: 'incident',
  tier: 'major',

  skills: [
      { skill: 'diplomacy', description: 'stabilize markets' },
      { skill: 'society', description: 'public confidence' },
      { skill: 'intimidation', description: 'force compliance' },
      { skill: 'occultism', description: 'divine intervention' },
    ],

  outcomes: {
    success: {
      description: 'The economy is stabilized.',
      modifiers: []
    },
    failure: {
      description: 'An economic downturn causes significant losses.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d6', negative: true, duration: 'immediate' }
      ],
      gameCommands: [
        { type: 'damageStructure', count: 1 }
      ]
    },
    criticalFailure: {
      description: 'Economic collapse devastates your kingdom.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '4d6', negative: true, duration: 'immediate' }
      ],
      gameCommands: [
        { type: 'destroyStructure', category: 'commerce', targetTier: 'highest', count: 1 }
      ]
    },
  },

  // Auto-convert JSON modifiers to badges
  preview: undefined,

  // PipelineCoordinator handles gameCommands automatically
  execute: undefined
};
