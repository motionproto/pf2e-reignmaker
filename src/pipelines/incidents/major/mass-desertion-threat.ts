/**
 * Mass Desertion Threat Incident Pipeline
 *
 * Failure: 1 random structure damaged, 1 army morale check
 * Critical Failure: 1 military structure destroyed (highest tier), 2 armies morale check
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { textBadge } from '../../../types/OutcomeBadge';
import type { GameCommandContext } from '../../../services/gameCommands/GameCommandHandler';
import { PLAYER_KINGDOM } from '../../../types/ownership';
import type { Army } from '../../../models/Army';

export const massDesertionThreatPipeline: CheckPipeline = {
  id: 'mass-desertion-threat',
  name: 'Mass Desertion Threat',
  description: 'Your armies threaten mass desertion',
  checkType: 'incident',
  severity: 'major',

  skills: [
      { skill: 'diplomacy', description: 'rally troops' },
      { skill: 'intimidation', description: 'threaten deserters' },
      { skill: 'performance', description: 'inspire loyalty' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'Your leadership inspires unwavering loyalty in your troops.',
      modifiers: []  // No modifiers needed (+1 Fame auto-applied by UnifiedCheckHandler)
    },
    success: {
      description: 'The troops remain loyal.',
      modifiers: []
    },
    failure: {
      description: 'A military morale crisis damages your forces.',
      modifiers: [],
      outcomeBadges: [
        textBadge('1 random structure damaged', 'fa-house-crack', 'negative'),
        textBadge('1 army morale check', 'fa-shield-halved', 'negative')
      ]
    },
    criticalFailure: {
      description: 'Widespread desertion devastates your military.',
      modifiers: [],
      outcomeBadges: [
        textBadge('1 military structure destroyed', 'fa-building', 'negative'),
        textBadge('2 armies morale check', 'fa-shield-halved', 'negative')
      ]
    },
  },

  preview: {
    calculate: async (ctx) => {
      const outcomeBadges: any[] = [];
      const warnings: string[] = [];

      if (ctx.outcome !== 'failure' && ctx.outcome !== 'criticalFailure') {
        return { resources: [], outcomeBadges: [], warnings: [] };
      }

      if (!ctx.metadata) {
        ctx.metadata = {};
      }

      // Get player armies for morale check count
      const playerArmies = ctx.kingdom.armies?.filter((a: Army) => a.ledBy === PLAYER_KINGDOM) || [];
      const moraleCheckCount = ctx.outcome === 'failure' ? 1 : 2;
      const actualMoraleCount = Math.min(moraleCheckCount, playerArmies.length);

      if (ctx.outcome === 'failure') {
        // Damage 1 random structure
        const { DamageStructureHandler } = await import('../../../services/gameCommands/handlers/DamageStructureHandler');
        const damageHandler = new DamageStructureHandler();
        const preparedDamage = await damageHandler.prepare(
          { type: 'damageStructure', count: 1 },
          { actionId: 'mass-desertion-threat', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
        );

        if (preparedDamage) {
          ctx.metadata._preparedDamageStructure = preparedDamage;
          // Support both single badge and array of badges
          if (preparedDamage.outcomeBadges) {
            outcomeBadges.push(...preparedDamage.outcomeBadges);
          } else if (preparedDamage.outcomeBadge) {
            outcomeBadges.push(preparedDamage.outcomeBadge);
          }
        } else {
          warnings.push('No structures available to damage');
        }

        // Add morale check badge
        if (actualMoraleCount > 0) {
          outcomeBadges.push(textBadge(`${actualMoraleCount} army morale check`, 'fa-shield-halved', 'negative'));
          ctx.metadata._moraleCheckCount = actualMoraleCount;
        } else {
          warnings.push('No player armies available for morale check');
        }
      }

      if (ctx.outcome === 'criticalFailure') {
        // Destroy 1 highest-tier military structure
        const { DestroyStructureHandler } = await import('../../../services/gameCommands/handlers/DestroyStructureHandler');
        const destroyHandler = new DestroyStructureHandler();
        const preparedDestroy = await destroyHandler.prepare(
          { type: 'destroyStructure', category: 'military-training', targetTier: 'highest', count: 1 },
          { actionId: 'mass-desertion-threat', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
        );

        if (preparedDestroy) {
          ctx.metadata._preparedDestroyStructure = preparedDestroy;
          // Support both single badge and array of badges
          if (preparedDestroy.outcomeBadges) {
            outcomeBadges.push(...preparedDestroy.outcomeBadges);
          } else if (preparedDestroy.outcomeBadge) {
            outcomeBadges.push(preparedDestroy.outcomeBadge);
          }
        } else {
          warnings.push('No military structures available to destroy');
        }

        // Add morale check badge
        if (actualMoraleCount > 0) {
          outcomeBadges.push(textBadge(`${actualMoraleCount} ${actualMoraleCount === 1 ? 'army' : 'armies'} morale check`, 'fa-shield-halved', 'negative'));
          ctx.metadata._moraleCheckCount = actualMoraleCount;
        } else {
          warnings.push('No player armies available for morale check');
        }
      }

      return {
        resources: [],
        outcomeBadges,
        warnings
      };
    }
  },

  execute: async (ctx) => {
    if (ctx.outcome !== 'failure' && ctx.outcome !== 'criticalFailure') {
      return { success: true };
    }

    // Apply structure damage/destruction
    if (ctx.outcome === 'failure') {
      const preparedDamage = ctx.metadata._preparedDamageStructure;
      if (preparedDamage?.commit) {
        await preparedDamage.commit();
      }
    }

    if (ctx.outcome === 'criticalFailure') {
      const preparedDestroy = ctx.metadata._preparedDestroyStructure;
      if (preparedDestroy?.commit) {
        await preparedDestroy.commit();
      }
    }

    // Trigger morale checks
    const moraleCheckCount = ctx.metadata._moraleCheckCount || 0;
    if (moraleCheckCount > 0) {
      const playerArmies = ctx.kingdom.armies?.filter((a: Army) => a.ledBy === PLAYER_KINGDOM) || [];
      
      if (playerArmies.length > 0) {
        // Select armies for morale check (first N armies, or let player choose via panel)
        const armiesToCheck = playerArmies.slice(0, moraleCheckCount);
        const armyIds = armiesToCheck.map((a: Army) => a.id);
        
        // Open morale check panel
        const { armyService } = await import('../../../services/army');
        await armyService.checkArmyMorale(armyIds);
      }
    }

    return { success: true };
  }
};
