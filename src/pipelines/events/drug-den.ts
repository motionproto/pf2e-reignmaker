/**
 * Drug Den Event Pipeline
 *
 * Generated from data/events/drug-den.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

export const drugDenPipeline: CheckPipeline = {
  id: 'drug-den',
  name: 'Drug Den',
  description: 'An illicit drug trade threatens to corrupt your settlement.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'stealth', description: 'undercover investigation' },
      { skill: 'medicine', description: 'treat addicts, trace source' },
      { skill: 'intimidation', description: 'crack down hard' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The drug ring is destroyed.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    success: {
      description: 'Major arrests disrupt the drug trade.',
      modifiers: [
        { type: 'static', resource: 'imprisoned_unrest', value: 1, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The drug trade spreads.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
        { type: 'static', resource: 'gold', value: -1, duration: 'immediate' },
      ]
    },
    criticalFailure: {
      description: 'A major drug crisis erupts.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ]
    },
  },

  preview: {
  }
};
