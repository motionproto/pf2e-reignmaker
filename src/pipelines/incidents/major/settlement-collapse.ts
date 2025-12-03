/**
 * Settlement Collapse Incident Pipeline
 *
 * A major settlement faces total collapse due to accumulated problems.
 * Settlement is randomly determined.
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import type { GameCommandContext } from '../../../services/gameCommands/GameCommandHandler';
import { DamageStructureHandler } from '../../../services/gameCommands/handlers/DamageStructureHandler';
import { DestroyStructureHandler } from '../../../services/gameCommands/handlers/DestroyStructureHandler';
import { ReduceSettlementLevelHandler } from '../../../services/gameCommands/handlers/ReduceSettlementLevelHandler';
import { PLAYER_KINGDOM } from '../../../types/ownership';
import { logger } from '../../../utils/Logger';

export const settlementCollapsePipeline: CheckPipeline = {
  id: 'settlement-collapse',
  name: 'Settlement Collapse',
  description: 'A settlement faces total collapse',
  checkType: 'incident',
  severity: 'major',

  skills: [
    { skill: 'diplomacy', description: 'address concerns' },
    { skill: 'society', description: 'emergency aid' },
    { skill: 'religion', description: 'provide hope' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'The settlement is stabilized and strengthened.',
      modifiers: []
    },
    success: {
      description: 'The settlement is stabilized.',
      modifiers: []
    },
    failure: {
      description: 'A major crisis threatens the settlement.',
      modifiers: [],
      outcomeBadges: [
        { icon: 'fa-building', template: '2 structures damaged', variant: 'negative' }
      ]
    },
    criticalFailure: {
      description: 'A settlement collapses.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ],
      outcomeBadges: [
        { icon: 'fa-building', template: '1 structure destroyed', variant: 'negative' },
        { icon: 'fa-city', template: 'Settlement loses 1 level', variant: 'negative' }
      ]
    },
  },

  preview: {
    async calculate(ctx) {
      const outcomeBadges: any[] = [];
      const warnings: string[] = [];
      
      if (!ctx.metadata) {
        ctx.metadata = {};
      }
      
      // Check if settlement was already selected (persists across rerolls)
      let settlementId = ctx.metadata._targetSettlementId;
      let settlementName = ctx.metadata._targetSettlementName;
      
      if (!settlementId) {
        // Randomly select a player-owned settlement (only on first calculation)
        const hexes = ctx.kingdom.hexes || [];
        const playerSettlements = (ctx.kingdom.settlements || []).filter((s: any) => {
          // Check if settlement's hex is player-owned
          const hexId = s.kingmakerLocation 
            ? `${s.kingmakerLocation.x}.${String(s.kingmakerLocation.y).padStart(2, '0')}`
            : `${s.location.x}.${String(s.location.y).padStart(2, '0')}`;
          const hex = hexes.find((h: any) => h.id === hexId);
          return hex?.claimedBy === PLAYER_KINGDOM;
        });
        
        if (playerSettlements.length === 0) {
          warnings.push('No player settlements available');
          return { resources: [], outcomeBadges, warnings };
        }
        
        const randomIndex = Math.floor(Math.random() * playerSettlements.length);
        const targetSettlement = playerSettlements[randomIndex];
        settlementId = targetSettlement.id;
        settlementName = targetSettlement.name;
        ctx.metadata._targetSettlementId = settlementId;
        ctx.metadata._targetSettlementName = settlementName;
        
        logger.info(`[settlement-collapse] Selected settlement: ${settlementName} (${settlementId})`);
      } else {
        logger.info(`[settlement-collapse] Reusing previously selected settlement: ${settlementName} (${settlementId})`);
      }
      
      if (ctx.outcome === 'failure') {
        // Damage 2 structures in the target settlement
        const damageHandler = new DamageStructureHandler();
        const preparedDamage = await damageHandler.prepare(
          { type: 'damageStructure', count: 2, settlementId },
          { actionId: 'settlement-collapse', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
        );
        
        if (preparedDamage) {
          ctx.metadata._preparedDamage = preparedDamage;
          // Support both single badge and array of badges
          if (preparedDamage.outcomeBadges) {
            outcomeBadges.push(...preparedDamage.outcomeBadges);
          } else if (preparedDamage.outcomeBadge) {
            outcomeBadges.push(preparedDamage.outcomeBadge);
          }
        }
      }
      
      if (ctx.outcome === 'criticalFailure') {
        // Destroy 1 structure in the target settlement
        const destroyHandler = new DestroyStructureHandler();
        const preparedDestroy = await destroyHandler.prepare(
          { type: 'destroyStructure', count: 1, settlementId },
          { actionId: 'settlement-collapse', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
        );
        
        if (preparedDestroy) {
          ctx.metadata._preparedDestroy = preparedDestroy;
          outcomeBadges.push(preparedDestroy.outcomeBadge);
        }
        
        // Reduce settlement level
        const reduceHandler = new ReduceSettlementLevelHandler();
        const preparedReduce = await reduceHandler.prepare(
          { type: 'reduceSettlementLevel', reduction: 1, settlementId },
          { actionId: 'settlement-collapse', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
        );
        
        if (preparedReduce) {
          ctx.metadata._preparedReduce = preparedReduce;
          outcomeBadges.push(preparedReduce.outcomeBadge);
        }
      }
      
      return { resources: [], outcomeBadges, warnings };
    }
  },

  execute: async (ctx) => {
    // Only execute on failure outcomes
    if (ctx.outcome !== 'failure' && ctx.outcome !== 'criticalFailure') {
      return { success: true };
    }
    
    logger.info(`[settlement-collapse] Executing for outcome: ${ctx.outcome}`);
    
    if (ctx.outcome === 'failure') {
      // Commit structure damage
      if (ctx.metadata?._preparedDamage?.commit) {
        await ctx.metadata._preparedDamage.commit();
      }
    }
    
    if (ctx.outcome === 'criticalFailure') {
      // Commit structure destruction
      if (ctx.metadata?._preparedDestroy?.commit) {
        await ctx.metadata._preparedDestroy.commit();
      }
      
      // Commit settlement level reduction
      if (ctx.metadata?._preparedReduce?.commit) {
        await ctx.metadata._preparedReduce.commit();
      }
    }
    
    logger.info(`[settlement-collapse] Execution complete`);
    return { success: true };
  }
};
