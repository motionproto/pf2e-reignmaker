/**
 * Secession Crisis Incident Pipeline
 *
 * Failure: Lose 2d4 gold + one random settlement loses 1 level + highest structure damaged
 * Critical Failure: +2 Unrest + one settlement and adjacent hexes secede to Rebels faction
 * 
 * Uses three focused handlers:
 * - SeizeHexesHandler: Claims hexes for rebels
 * - TransferSettlementHandler: Transfers settlement ownership
 * - DefectArmiesHandler: Transfers army ownership
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import type { GameCommandContext } from '../../../services/gameCommands/GameCommandHandler';
import { textBadge } from '../../../types/OutcomeBadge';
import { SeizeHexesHandler, REBELS_FACTION_ID, REBELS_FACTION_NAME } from '../../../services/gameCommands/handlers/SeizeHexesHandler';
import { TransferSettlementHandler } from '../../../services/gameCommands/handlers/TransferSettlementHandler';
import { DefectArmiesHandler } from '../../../services/gameCommands/handlers/DefectArmiesHandler';
import { getAdjacentHexes } from '../../../utils/hexUtils';
import { PLAYER_KINGDOM } from '../../../types/ownership';
import type { Settlement } from '../../../models/Settlement';
import { logger } from '../../../utils/Logger';
import { getSettlementHex, isSettlementOwnedBy } from '../../../utils/settlementOwnership';

export const secessionCrisisPipeline: CheckPipeline = {
  id: 'secession-crisis',
  name: 'Secession Crisis',
  description: 'A settlement declares independence from your kingdom',
  checkType: 'incident',
  severity: 'major',

  skills: [
    { skill: 'diplomacy', description: 'negotiate autonomy' },
    { skill: 'intimidation', description: 'suppress movement' },
    { skill: 'society', description: 'address grievances' },
    { skill: 'performance', description: 'inspire loyalty' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'The independence movement is quelled and grievances addressed.',
      modifiers: []  // +1 Fame auto-applied by UnifiedCheckHandler
    },
    success: {
      description: 'The independence movement is quelled.',
      modifiers: []
    },
    failure: {
      description: 'A settlement revolts.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d4', negative: true, duration: 'immediate' }
      ],
      outcomeBadges: [
        textBadge('1 settlement loses 1 level', 'fa-city', 'negative'),
        textBadge('1d3 structures destroyed', 'fa-house-crack', 'negative')
      ]
    },
    criticalFailure: {
      description: 'A settlement declares independence.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ]
      // Note: Dynamic badges generated in preview.calculate() with actual settlement/hex names
    },
  },

  preview: {
    calculate: async (ctx) => {
      const outcomeBadges: any[] = [];
      const warnings: string[] = [];

      // Only show preview for failure outcomes
      if (ctx.outcome !== 'failure' && ctx.outcome !== 'criticalFailure') {
        return { resources: [], outcomeBadges: [], warnings: [] };
      }

      // Initialize metadata
      if (!ctx.metadata) {
        ctx.metadata = {};
      }

      if (ctx.outcome === 'failure') {
        // Reduce settlement level
        const { ReduceSettlementLevelHandler } = await import('../../../services/gameCommands/handlers/ReduceSettlementLevelHandler');
        const reduceHandler = new ReduceSettlementLevelHandler();
        
        const preparedReduce = await reduceHandler.prepare(
          { type: 'reduceSettlementLevel', reduction: 1, settlementSelection: 'random' },
          { actionId: 'secession-crisis', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
        );

        if (preparedReduce) {
          ctx.metadata._preparedReduceLevel = preparedReduce;
          outcomeBadges.push(preparedReduce.outcomeBadge);
        } else {
          warnings.push('No settlements available to reduce level');
        }

        // Destroy 1d3 structures
        const { DestroyStructureHandler } = await import('../../../services/gameCommands/handlers/DestroyStructureHandler');
        const destroyHandler = new DestroyStructureHandler();
        
        const preparedDestroy = await destroyHandler.prepare(
          { type: 'destroyStructure', count: '1d3' },
          { actionId: 'secession-crisis', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
        );

        if (preparedDestroy) {
          ctx.metadata._preparedDestroyStructure = preparedDestroy;
          outcomeBadges.push(preparedDestroy.outcomeBadge);
        } else {
          warnings.push('No structures available to destroy');
        }
      }

      if (ctx.outcome === 'criticalFailure') {
        // === STEP 1: Select a random player settlement (excluding capital) ===
        logger.info(`[SecessionCrisis] Starting critical failure processing`);
        logger.info(`[SecessionCrisis] Total settlements: ${ctx.kingdom.settlements?.length || 0}`);
        
        // Filter player settlements by hex ownership (single source of truth)
        // Exclude the capital - it cannot secede
        const hexes = ctx.kingdom.hexes || [];
        const playerSettlements = ctx.kingdom.settlements?.filter((s: Settlement) => 
          isSettlementOwnedBy(s, hexes, PLAYER_KINGDOM) && !s.isCapital
        ) || [];
        
        logger.info(`[SecessionCrisis] Eligible player settlements (excluding capital): ${playerSettlements.length}`);
        
        if (playerSettlements.length === 0) {
          warnings.push('No eligible settlements to secede (capital is protected)');
          logger.warn(`[SecessionCrisis] No eligible settlements found (capital excluded)`);
          return { resources: [], outcomeBadges, warnings };
        }
        
        // Pick random settlement
        const randomIndex = Math.floor(Math.random() * playerSettlements.length);
        const targetSettlement = playerSettlements[randomIndex];
        
        logger.info(`[SecessionCrisis] Selected settlement: ${targetSettlement.name} (id: ${targetSettlement.id})`);
        logger.info(`[SecessionCrisis] Settlement location: ${JSON.stringify(targetSettlement.location)}`);
        
        // === STEP 2: Find settlement's hex using utility function ===
        const settlementHex = getSettlementHex(targetSettlement, hexes);
        
        if (!settlementHex) {
          warnings.push(`Could not find hex for settlement ${targetSettlement.name}`);
          logger.error(`[SecessionCrisis] Could not find hex for settlement ${targetSettlement.name} at location (${targetSettlement.location?.x}, ${targetSettlement.location?.y})`);
          return { resources: [], outcomeBadges, warnings };
        }
        
        logger.info(`[SecessionCrisis] Settlement hex: ${settlementHex.id} (${settlementHex.row}, ${settlementHex.col})`);
        
        // Get adjacent hexes
        const adjacentCoords = getAdjacentHexes(settlementHex.row, settlementHex.col);
        
        // Build list of all affected hex IDs (settlement + adjacent)
        const allHexIds: string[] = [settlementHex.id];
        const hexesById = new Map(ctx.kingdom.hexes?.map((h: any) => [h.id, h]) || []);
        const hexesByCoords = new Map<string, any>();
        for (const hex of ctx.kingdom.hexes || []) {
          hexesByCoords.set(`${hex.row}:${hex.col}`, hex);
        }
        
        for (const adj of adjacentCoords) {
          const adjHex = hexesByCoords.get(`${adj.i}:${adj.j}`);
          if (adjHex) {
            allHexIds.push(adjHex.id);
          }
        }
        
        // Filter to only player-owned hexes for seizure
        const playerOwnedHexIds = allHexIds.filter(hexId => {
          const hex = hexesById.get(hexId);
          return hex && (hex.claimedBy === PLAYER_KINGDOM || hex.claimedBy === 'player');
        });
        
        logger.info(`[SecessionCrisis] All hex IDs: ${allHexIds.join(', ')}`);
        logger.info(`[SecessionCrisis] Player-owned hex IDs to seize: ${playerOwnedHexIds.join(', ')}`);
        
        // Store for later use
        ctx.metadata._targetSettlement = targetSettlement;
        ctx.metadata._allHexIds = allHexIds;
        ctx.metadata._playerOwnedHexIds = playerOwnedHexIds;
        
        // === STEP 3: Prepare SeizeHexesHandler ===
        const seizeHandler = new SeizeHexesHandler();
        const preparedSeize = await seizeHandler.prepare(
          { 
            type: 'seizeHexes', 
            hexIds: playerOwnedHexIds,
            factionId: REBELS_FACTION_ID,
            factionName: REBELS_FACTION_NAME
          },
          { actionId: 'secession-crisis', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
        );
        
        if (preparedSeize) {
          ctx.metadata._preparedSeize = preparedSeize;
          outcomeBadges.push(preparedSeize.outcomeBadge);
          
          // Copy seize metadata for map display
          if (preparedSeize.metadata) {
            Object.assign(ctx.metadata, preparedSeize.metadata);
          }
        }
        
        // === STEP 4: Prepare TransferSettlementHandler ===
        const transferHandler = new TransferSettlementHandler();
        const preparedTransfer = await transferHandler.prepare(
          { 
            type: 'transferSettlement', 
            settlementId: targetSettlement.id,
            toFaction: REBELS_FACTION_ID,
            factionName: REBELS_FACTION_NAME
          },
          { actionId: 'secession-crisis', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
        );
        
        if (preparedTransfer) {
          ctx.metadata._preparedTransfer = preparedTransfer;
          outcomeBadges.push(preparedTransfer.outcomeBadge);
        }
        
        // === STEP 5: Prepare DefectArmiesHandler ===
        const defectHandler = new DefectArmiesHandler();
        const preparedDefect = await defectHandler.prepare(
          { 
            type: 'defectArmies', 
            hexIds: allHexIds,
            toFaction: REBELS_FACTION_ID,
            factionName: REBELS_FACTION_NAME
          },
          { actionId: 'secession-crisis', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
        );
        
        if (preparedDefect) {
          ctx.metadata._preparedDefect = preparedDefect;
          // Only add badge if armies actually defected (not "No armies in area")
          if (preparedDefect.metadata?.defectedArmies?.length > 0) {
            outcomeBadges.push(preparedDefect.outcomeBadge);
          }
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
    // Only execute on failure outcomes
    if (ctx.outcome !== 'failure' && ctx.outcome !== 'criticalFailure') {
      return { success: true };
    }

    if (ctx.outcome === 'failure') {
      // Reduce settlement level
      const preparedReduce = ctx.metadata._preparedReduceLevel;
      if (preparedReduce?.commit) {
        await preparedReduce.commit();
      }

      // Destroy structures
      const preparedDestroy = ctx.metadata._preparedDestroyStructure;
      if (preparedDestroy?.commit) {
        await preparedDestroy.commit();
      }
    }

    if (ctx.outcome === 'criticalFailure') {
      // Execute all three commands in order
      
      // 1. Seize hexes
      const preparedSeize = ctx.metadata._preparedSeize;
      if (preparedSeize?.commit) {
        logger.info('[SecessionCrisis] Executing hex seizure');
        await preparedSeize.commit();
      }
      
      // 2. Transfer settlement
      const preparedTransfer = ctx.metadata._preparedTransfer;
      if (preparedTransfer?.commit) {
        logger.info('[SecessionCrisis] Executing settlement transfer');
        await preparedTransfer.commit();
      }
      
      // 3. Defect armies
      const preparedDefect = ctx.metadata._preparedDefect;
      if (preparedDefect?.commit) {
        logger.info('[SecessionCrisis] Executing army defection');
        await preparedDefect.commit();
      }
    }

    return { success: true };
  },

  // Show seceded territory on map after critical failure
  postApplyInteractions: [
    SeizeHexesHandler.getMapDisplayInteraction('Territory Seceded')
  ],

  traits: ["dangerous"],
};
