/**
 * Deploy Army Action Pipeline
 *
 * Move troops to strategic positions.
 * Converted from data/player-actions/deploy-army.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { deployArmyExecution } from '../../execution/armies/deployArmy';

export const deployArmyPipeline: CheckPipeline = {
  id: 'deploy-army',
  name: 'Deploy Army',
  description: 'Mobilize and maneuver your military forces across the kingdom\'s territory using various navigation methods',
  checkType: 'action',
  category: 'military-operations',

  // Requirements: Must have at least one army
  requirements: (kingdom) => {
    if (kingdom.armies.length === 0) {
      return {
        met: false,
        reason: 'No armies available'
      };
    }
    return { met: true };
  },

  skills: [
    { skill: 'nature', description: 'natural pathways' },
    { skill: 'survival', description: 'wilderness navigation' },
    { skill: 'athletics', description: 'forced march' },
    { skill: 'stealth', description: 'covert movement' }
  ],

  // Pre-roll: Select army and path
  preRollInteractions: [
    {
      type: 'entity-selection',
      id: 'armyId',
      label: 'Select army to deploy',
      entityType: 'army'
    },
    {
      type: 'map-selection',
      id: 'path',
      mode: 'hex-path',
      colorType: 'movement'
    }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your forces move swiftly into position, confident in their victory.',
      modifiers: [],
      manualEffects: ['+1 initiative, +1 saving throws, +1 attack (status bonuses)']
    },
    success: {
      description: 'A steady march. Your forces arrive at their destination ready for action.',
      modifiers: []
    },
    failure: {
      description: 'Your troops arrive tired and less prepared for combat.',
      modifiers: [],
      manualEffects: ['-1 initiative (status penalty), fatigued']
    },
    criticalFailure: {
      description: 'Your forces get lost and arrive exhausted.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ],
      manualEffects: ['-2 initiative (status penalty), enfeebled 1, fatigued']
    }
  },

  preview: {
    providedByInteraction: true,
    calculate: (ctx) => {
      const path = ctx.metadata.path || [];
      const finalHex = path.length > 0 ? path[path.length - 1] : 'unknown';

      const resources = ctx.outcome === 'criticalFailure' ? [{ resource: 'unrest', value: 1 }] : [];

      const specialEffects = [{
        type: 'status' as const,
        message: `Will deploy ${ctx.metadata.armyName || 'army'} to ${finalHex}`,
        variant: 'positive' as const
      }];

      if (ctx.outcome === 'criticalSuccess') {
        specialEffects.push({
          type: 'status' as const,
          message: 'Army gains combat bonuses',
          variant: 'positive' as const
        });
      } else if (ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure') {
        specialEffects.push({
          type: 'status' as const,
          message: 'Army arrives with penalties',
          variant: 'negative' as const
        });
      }

      return { resources, specialEffects, warnings: [] };
    }
  },

  execute: async (ctx) => {
    const conditionsToApply = ctx.outcome === 'criticalSuccess' ?
      ['+1 initiative (status bonus)', '+1 saving throws (status bonus)', '+1 attack (status bonus)'] :
      ctx.outcome === 'failure' ?
      ['-1 initiative (status penalty)', 'fatigued'] :
      ctx.outcome === 'criticalFailure' ?
      ['-2 initiative (status penalty)', 'enfeebled 1', 'fatigued'] :
      [];

    await deployArmyExecution({
      armyId: ctx.metadata.armyId,
      path: ctx.metadata.path || [],
      conditionsToApply,
      animationSpeed: 100
    });
    return { success: true, message: 'Army deployed' };
  }
};
