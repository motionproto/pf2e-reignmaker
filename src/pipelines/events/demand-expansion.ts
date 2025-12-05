/**
 * Demand Expansion Event Pipeline
 *
 * Enhanced event where citizens demand a specific hex be claimed.
 * 
 * Initial Event:
 * - Critical Success: -1 unrest, ends (leadership inspires confidence)
 * - Success: ends (promises of expansion accepted)
 * - Failure: Select target hex exactly 2 hexes from border, ongoing (no immediate penalty)
 * - Critical Failure: +1 unrest, select target hex, ongoing
 *
 * Target Hex Selection Rules:
 * - Must be exactly 2 hexes away from kingdom border (not adjacent)
 * - Can be unclaimed OR enemy faction territory
 * - If enemy territory, must not have a settlement or worksite (must be empty)
 * - Must be explored
 *
 * Ongoing Phase (each subsequent turn):
 * - Critical Success: ends (exceptional diplomacy convinces them)
 * - Success: No penalty (managed expectations this turn)
 * - Failure: +1 unrest (pressure builds)
 * - Critical Failure: +1 unrest (citizens grow restless)
 *
 * Auto-Resolution (when target hex is claimed):
 * - Player selects a free worksite for the newly claimed hex
 * - -1d3 unrest (citizens celebrate)
 * - +2d3 gold (celebration bonus)
 * - Event ends
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { textBadge } from '../../types/OutcomeBadge';
import { logger } from '../../utils/Logger';

export const demandExpansionPipeline: CheckPipeline = {
  id: 'demand-expansion',
  name: 'Demand Expansion',
  description: 'Citizens demand the kingdom claim new territory.',
  checkType: 'event',
  tier: 1,

  skills: [
    { skill: 'diplomacy', description: 'promise future growth' },
    { skill: 'survival', description: 'show expansion plans' },
    { skill: 'intimidation', description: 'demand patience' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'The people are inspired by your vision of growth.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    success: {
      description: 'The people accept your promises.',
      endsEvent: true,
      modifiers: []
    },
    failure: {
      description: 'The people point to a specific unclaimed hex and demand it be claimed.',
      endsEvent: false,
      modifiers: []  // No immediate penalty on failure
    },
    criticalFailure: {
      description: 'The people grow angry and demand a specific hex be claimed immediately.',
      endsEvent: false,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
  },

  preview: {
    calculate: async (ctx) => {
      const outcomeBadges: any[] = [];
      
      // Only select target hex on failure/criticalFailure for NON-ongoing instances
      if ((ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure') && !ctx.metadata?.targetHexId) {
        // First time this event triggers with failure - select a target hex
        const { getBorderHexes } = await import('../../services/commands/territory/borderHexes');
        const { getHexesAtExactDistance, isHexExplored, hexHasSettlement } = await import('../shared/hexValidation');
        const { PLAYER_KINGDOM } = await import('../../types/ownership');
        
        // Get border hexes
        const borderHexIds = await getBorderHexes(ctx.kingdom);
        
        if (borderHexIds.length > 0) {
          // Find valid hexes EXACTLY 2 steps from border (not adjacent, not closer)
          // Can be unclaimed OR enemy faction territory (but not player territory)
          // If enemy territory, must not have settlement or worksite (empty hex)
          const candidateHexes = getHexesAtExactDistance(
            borderHexIds,
            2,
            ctx.kingdom,
            (hex: any) => {
              // Must not be player territory
              if (hex.claimedBy === PLAYER_KINGDOM) return false;
              
              // Must be explored
              if (!isHexExplored(hex.id)) return false;
              
              // If it's enemy territory, must be empty (no settlement or worksite)
              if (hex.claimedBy) {
                // Has an owner (enemy faction)
                if (hexHasSettlement(hex.id, ctx.kingdom)) return false;
                if (hex.worksite) return false;
              }
              
              return true;
            }
          );
          
          if (candidateHexes.length > 0) {
            // Select random target hex
            const targetHex = candidateHexes[Math.floor(Math.random() * candidateHexes.length)];
            ctx.metadata.targetHexId = targetHex.id;
            ctx.metadata.targetHexTerrain = targetHex.terrain || 'unknown';
            ctx.metadata.isEnemyTerritory = !!targetHex.claimedBy;
            ctx.metadata.enemyFaction = targetHex.claimedBy || null;
            
            logger.info(`[DemandExpansion] Selected target hex: ${targetHex.id} (${targetHex.terrain})${targetHex.claimedBy ? ` [Enemy: ${targetHex.claimedBy}]` : ''}`);
            
            // Add badge showing the demanded hex
            const badgeText = targetHex.claimedBy 
              ? `Demanded Hex: ${targetHex.id} (${targetHex.terrain}) - Enemy Territory!`
              : `Demanded Hex: ${targetHex.id} (${targetHex.terrain})`;
            outcomeBadges.push(
              textBadge(badgeText, 'fa-bullseye', targetHex.claimedBy ? 'negative' : 'info')
            );
          } else {
            logger.warn('[DemandExpansion] No valid candidate hexes found at distance 2 from border');
            // Add warning badge
            outcomeBadges.push(
              textBadge('No valid expansion targets found (need hexes 2 steps from border)', 'fa-exclamation-triangle', 'info')
            );
          }
        } else {
          logger.warn('[DemandExpansion] No border hexes found');
          outcomeBadges.push(
            textBadge('No border hexes available', 'fa-exclamation-triangle', 'info')
          );
        }
      } else if (ctx.metadata?.targetHexId) {
        // Ongoing event - show the existing target hex
        const enemyLabel = ctx.metadata.isEnemyTerritory ? ' (Enemy Territory)' : '';
        outcomeBadges.push(
          textBadge(`Target Hex: ${ctx.metadata.targetHexId}${enemyLabel}`, 'fa-bullseye', ctx.metadata.isEnemyTerritory ? 'negative' : 'info')
        );
        
        // For ongoing events, show different messages based on outcome
        if (ctx.outcome === 'criticalSuccess') {
          outcomeBadges.push(
            textBadge('Event Ends - Citizens convinced!', 'fa-check-circle', 'positive')
          );
        } else if (ctx.outcome === 'success') {
          outcomeBadges.push(
            textBadge('Expectations managed for now', 'fa-handshake', 'info')
          );
        }
      }
      
      return { resources: [], outcomeBadges };
    }
  },

  execute: async (ctx) => {
    // Add 'demanded' feature to the target hex when event triggers with failure
    if ((ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure') && ctx.metadata?.targetHexId) {
      logger.info(`[DemandExpansion] Adding 'demanded' feature to hex: ${ctx.metadata.targetHexId}`);
      
      const { updateKingdom } = await import('../../stores/KingdomStore');
      
      await updateKingdom(kingdom => {
        const hex = kingdom.hexes?.find((h: any) => h.id === ctx.metadata.targetHexId);
        if (hex) {
          // Initialize features array if needed
          if (!hex.features) hex.features = [];
          
          // Check if already has a demanded feature (prevent duplicates)
          const existingDemand = hex.features.find((f: any) => f.type === 'demanded');
          if (!existingDemand) {
            hex.features.push({
              type: 'demanded',
              eventInstanceId: ctx.instanceId,
              createdTurn: kingdom.currentTurn
            });
            logger.info(`[DemandExpansion] Added 'demanded' feature to hex ${ctx.metadata.targetHexId}`);
          } else {
            logger.info(`[DemandExpansion] Hex ${ctx.metadata.targetHexId} already has 'demanded' feature`);
          }
        } else {
          logger.warn(`[DemandExpansion] Could not find hex ${ctx.metadata.targetHexId} to add demanded feature`);
        }
      });
    }
    
    return { success: true };
  },

  // Show demanded hex on map after applying result
  postApplyInteractions: [
    {
      type: 'map-selection' as const,
      id: 'demandedHex',
      mode: 'display' as const,
      count: (ctx: any) => {
        // Use metadata (still available from preview.calculate)
        return ctx.metadata?.targetHexId ? 1 : 0;
      },
      colorType: 'demanded' as const,
      title: () => 'Citizens Demand This Hex!',
      condition: (ctx: any) => {
        // Only show for failure/criticalFailure outcomes that have a target hex
        if (ctx.outcome !== 'failure' && ctx.outcome !== 'criticalFailure') return false;
        return !!ctx.metadata?.targetHexId;
      },
      existingHexes: (ctx: any) => {
        return ctx.metadata?.targetHexId ? [ctx.metadata.targetHexId] : [];
      },
      validateHex: () => {
        return { valid: false, message: 'Display only - showing demanded hex' };
      },
      allowToggle: false,
      getHexInfo: (hexId: string, ctx: any) => {
        const terrain = ctx.metadata?.targetHexTerrain || 'unknown';
        return `<p style="color: #90EE90;"><strong>Demanded by Citizens!</strong></p>
          <p style="color: #999;">Hex: ${hexId}</p>
          <p style="color: #999;">Terrain: ${terrain}</p>
          <p style="color: #98FB98; margin-top: 8px;"><em>Claim this hex to earn a free worksite and reduce unrest!</em></p>`;
      }
    }
  ],

  traits: ["dangerous", "ongoing"],
};
