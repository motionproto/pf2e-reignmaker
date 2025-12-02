/**
 * Religious Schism Incident Pipeline
 *
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const religiousSchismPipeline: CheckPipeline = {
  id: 'religious-schism',
  name: 'Religious Schism',
  description: 'Religious divisions tear your kingdom apart',
  checkType: 'incident',
  tier: 'major',

  skills: [
      { skill: 'religion', description: 'theological debate' },
      { skill: 'diplomacy', description: 'mediate factions' },
      { skill: 'occultism', description: 'divine intervention' },
      { skill: 'society', description: 'secular compromise' },
    ],

  outcomes: {
    success: {
      description: 'The schism is averted.',
      modifiers: []
    },
    failure: {
      description: 'Religious divisions weaken your kingdom.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d6', negative: true, duration: 'immediate' }
      ],
      gameCommands: [
        { type: 'damageStructure', count: 1 }
      ]
    },
    criticalFailure: {
      description: 'The church splits entirely.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '4d6', negative: true, duration: 'immediate' }
      ],
      gameCommands: [
        { type: 'destroyStructure', category: 'religion', targetTier: 'highest', count: 1 }
      ]
    },
  },

  // Auto-convert JSON modifiers to badges
  preview: undefined,

  // PipelineCoordinator handles gameCommands automatically
  execute: undefined
};
