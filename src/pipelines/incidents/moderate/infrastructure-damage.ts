/**
 * Infrastructure Damage Incident Pipeline
 *
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const infrastructureDamagePipeline: CheckPipeline = {
  id: 'infrastructure-damage',
  name: 'Infrastructure Damage',
  description: 'Critical infrastructure is damaged or sabotaged',
  checkType: 'incident',
  tier: 'moderate',

  skills: [
      { skill: 'crafting', description: 'emergency repairs' },
      { skill: 'athletics', description: 'labor mobilization' },
      { skill: 'society', description: 'organize response' },
      { skill: 'arcana', description: 'magical restoration' },
    ],

  preRollInteractions: [
    {
      type: 'entity-selection',
      id: 'settlement',
      entityType: 'settlement',
      label: 'Select Settlement with Infrastructure Damage',
      required: true,
      filter: (settlement: any) => settlement.structures?.length > 0
    }
  ],

  outcomes: {
    success: {
      description: 'Damage is prevented.',
      modifiers: []
    },
    failure: {
      description: 'Infrastructure damage impacts your kingdom.',
      modifiers: [],
      gameCommands: [
        { type: 'damageStructure', count: 1 }
      ]
    },
    criticalFailure: {
      description: 'Widespread infrastructure damage causes chaos.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
      // Note: Critical failure uses dice (1d3) - handled in execute block
    },
  },

  // Auto-convert JSON modifiers to badges
  preview: undefined,

  execute: async (ctx) => {
    // Critical failure needs dice roll for count
    if (ctx.outcome === 'criticalFailure') {
      const roll = Math.floor(Math.random() * 3) + 1;
      
      const { getGameCommandRegistry } = await import('../../../services/gameCommands/GameCommandHandlerRegistry');
      const registry = getGameCommandRegistry();
      
      const command = await registry.process({ type: 'damageStructure', count: roll }, {
        kingdom: ctx.kingdom,
        outcome: ctx.outcome,
        metadata: ctx.metadata
      });
      
      if (command?.commit) {
        await command.commit();
      }
    }
    
    return { success: true };
  }
};
