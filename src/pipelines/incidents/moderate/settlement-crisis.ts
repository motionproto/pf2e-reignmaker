/**
 * Settlement Crisis Incident Pipeline
 *
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const settlementCrisisPipeline: CheckPipeline = {
  id: 'settlement-crisis',
  name: 'Settlement Crisis',
  description: 'One of your settlements faces a major crisis',
  checkType: 'incident',
  tier: 'moderate',

  skills: [
      { skill: 'diplomacy', description: 'address concerns' },
      { skill: 'society', description: 'emergency aid' },
      { skill: 'religion', description: 'provide hope' },
    ],

  preRollInteractions: [
    {
      type: 'entity-selection',
      id: 'settlement',
      entityType: 'settlement',
      label: 'Select Settlement in Crisis',
      required: true
    }
  ],

  outcomes: {
    success: {
      description: 'The settlement is stabilized.',
      modifiers: []
    },
    failure: {
      description: 'The crisis threatens the settlement.',
      modifiers: [],
      gameCommands: [
        { type: 'damageStructure', count: 1 }
      ]
    },
    criticalFailure: {
      description: 'A settlement collapses.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ],
      manualEffects: ["The selected settlement loses one level (minimum level 1)"]
    },
  },

  // Auto-convert JSON modifiers to badges
  preview: undefined,

  // PipelineCoordinator handles gameCommands automatically
  execute: undefined
};
