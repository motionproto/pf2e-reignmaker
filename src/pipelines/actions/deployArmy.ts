/**
 * Deploy Army Action Pipeline
 * Move troops to strategic positions
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { textBadge } from '../../types/OutcomeBadge';
import { PLAYER_KINGDOM } from '../../types/ownership';

export const deployArmyPipeline: CheckPipeline = {
  // === BASE DATA ===
  id: 'deploy-army',
  name: 'Deploy Army',
  description: 'Mobilize and maneuver your military forces across the kingdom\'s territory using various navigation methods',
  brief: 'Move troops to strategic positions',
  category: 'military-operations',
  checkType: 'action',

  skills: [
    { skill: 'nature', description: 'natural pathways' },
    { skill: 'survival', description: 'wilderness navigation' },
    { skill: 'athletics', description: 'forced march' },
    { skill: 'stealth', description: 'covert movement' }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your forces move swiftly into position, confident in their victory.',
      modifiers: [],
      gameCommands: [
        {
          type: 'deployArmy',
          conditionsToApply: ['+1 initiative (status bonus)', '+1 saving throws (status bonus)', '+1 attack (status bonus)']
        }
      ]
    },
    success: {
      description: 'A steady march. Your forces arrive at their destination ready for action.',
      modifiers: [],
      gameCommands: [
        { type: 'deployArmy' }
      ]
    },
    failure: {
      description: 'Your troops arrive tired and less prepared for combat.',
      modifiers: [],
      gameCommands: [
        {
          type: 'deployArmy',
          conditionsToApply: ['-1 initiative (status penalty)', 'fatigued']
        }
      ]
    },
    criticalFailure: {
      description: 'Your forces get lost and arrive demoralized and exhausted.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ],
      gameCommands: [
        {
          type: 'deployArmy',
          conditionsToApply: ['-2 initiative (status penalty)', 'enfeebled 1', 'fatigued']
        }
      ]
    }
  },

  // === TYPESCRIPT LOGIC ===
  requirements: (kingdom) => {
    const playerArmies = (kingdom.armies || []).filter((army: any) => army.ledBy === PLAYER_KINGDOM);
    
    if (playerArmies.length === 0) {
      return {
        met: false,
        reason: 'No player armies available'
      };
    }
    
    const deployedArmyIds = kingdom.turnState?.actionsPhase?.deployedArmyIds || [];
    
    const availableArmies = playerArmies.filter((army: any) => 
      !deployedArmyIds.includes(army.id) && army.actorId
    );
    
    if (availableArmies.length === 0) {
      const playerArmiesWithoutActors = playerArmies.filter((army: any) => !army.actorId);
      
      if (deployedArmyIds.length >= playerArmies.length) {
        return {
          met: false,
          reason: 'All armies have already moved this turn'
        };
      } else if (playerArmiesWithoutActors.length === playerArmies.length) {
        return {
          met: false,
          reason: 'No armies have linked actors (required for deployment)'
        };
      } else {
        return {
          met: false,
          reason: 'No armies available to deploy (all moved or missing actors)'
        };
      }
    }
    
    return { met: true };
  },

  preRollInteractions: [
    {
      type: 'map-selection',
      id: 'deployment',
      mode: 'hex-path',
      colorType: 'movement'
    }
  ],

  preview: {
    calculate: (ctx) => {
      const deployment = ctx.metadata.deployment || {};
      const path = deployment.path || [];
      const finalHex = path.length > 0 ? path[path.length - 1] : 'unknown';
      const armyName = deployment.armyName || ctx.metadata.armyName || 'army';

      const resources = ctx.outcome === 'criticalFailure' ? [{ resource: 'unrest', value: 1 }] : [];

      const outcomeBadges = [
        textBadge(`Will deploy ${armyName} to ${finalHex}`, 'fa-flag', 'positive')
      ];

      if (ctx.outcome === 'criticalSuccess') {
        outcomeBadges.push(
          textBadge('+1 initiative (status bonus)', 'fa-bolt', 'positive'),
          textBadge('+1 saving throws (status bonus)', 'fa-shield-alt', 'positive'),
          textBadge('+1 attack (status bonus)', 'fa-sword', 'positive')
        );
      } else if (ctx.outcome === 'failure') {
        outcomeBadges.push(
          textBadge('-1 initiative (status penalty)', 'fa-bolt', 'negative'),
          textBadge('fatigued', 'fa-tired', 'negative')
        );
      } else if (ctx.outcome === 'criticalFailure') {
        outcomeBadges.push(
          textBadge('-2 initiative (status penalty)', 'fa-bolt', 'negative'),
          textBadge('enfeebled 1', 'fa-dizzy', 'negative'),
          textBadge('fatigued', 'fa-tired', 'negative')
        );
      }

      return { resources, outcomeBadges, warnings: [] };
    }
  },

  // PipelineCoordinator handles gameCommands automatically
  // Note: gameCommands need armyId and path from metadata
  execute: async (ctx: any) => {
    // Validate required metadata
    const deployment = ctx.metadata.deployment || {};
    const armyId = deployment.armyId || ctx.metadata.armyId;
    const path = deployment.path || ctx.metadata.path || [];
    
    if (!armyId || !path || path.length < 2) {
      return { success: false, error: 'Missing army or path data (path must have at least 2 hexes)' };
    }
    
    // Add metadata to game commands
    const commands = ctx.resolutionData?.gameCommands || [];
    for (const command of commands) {
      if (command.type === 'deployArmy') {
        command.armyId = armyId;
        command.path = path;
        command.outcome = ctx.outcome;
      }
    }
    
    return { success: true };
  }
};
