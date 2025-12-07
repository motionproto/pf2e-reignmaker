/**
 * TransferSettlement Command Handler
 * 
 * Transfers ownership of a settlement to a specified faction.
 * Used by secession-crisis incident.
 * 
 * Command format:
 * {
 *   type: 'transferSettlement',
 *   settlementId: string,   // Settlement to transfer
 *   toFaction: string       // Target faction ID
 * }
 */

import { BaseGameCommandHandler } from '../GameCommandHandler';
import type { GameCommandContext } from '../GameCommandHandler';
import type { PreparedCommand } from '../../../types/game-commands';
import { logger } from '../../../utils/Logger';
import { getKingdomActor, updateKingdom } from '../../../stores/KingdomStore';
import { PLAYER_KINGDOM } from '../../../types/ownership';
import type { Settlement } from '../../../models/Settlement';

export class TransferSettlementHandler extends BaseGameCommandHandler {
  canHandle(command: any): boolean {
    return command.type === 'transferSettlement';
  }
  
  async prepare(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null> {
    const { settlementId, toFaction } = command;
    
    if (!settlementId) {
      logger.error('[TransferSettlementHandler] Missing settlementId');
      return null;
    }
    
    if (!toFaction) {
      logger.error('[TransferSettlementHandler] Missing toFaction');
      return null;
    }
    
    // Get current kingdom data
    const actor = getKingdomActor();
    if (!actor) {
      logger.error('[TransferSettlementHandler] No kingdom actor available');
      return null;
    }
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      logger.error('[TransferSettlementHandler] No kingdom data available');
      return null;
    }
    
    // Find the settlement
    const settlement = kingdom.settlements?.find((s: Settlement) => s.id === settlementId);
    
    if (!settlement) {
      logger.warn(`[TransferSettlementHandler] Settlement not found: ${settlementId}`);
      return {
        outcomeBadges: [{
          icon: 'fa-exclamation-triangle',
          template: 'Settlement not found',
          variant: 'info'
        }],
        commit: async () => {
          logger.info('[TransferSettlementHandler] Settlement not found - skipping');
        }
      };
    }
    
    // Get current ownership from the hex (single source of truth)
    const settlementHex = kingdom.hexes?.find((h: any) => 
      h.row === settlement.location.x && h.col === settlement.location.y
    );
    const currentOwner = settlementHex?.claimedBy ?? null;
    
    // Check if already owned by target faction
    if (currentOwner === toFaction) {
      logger.info(`[TransferSettlementHandler] Settlement ${settlement.name} already owned by ${toFaction}`);
      return {
        outcomeBadges: [{
          icon: 'fa-check',
          template: `${settlement.name} already owned by ${toFaction}`,
          variant: 'info'
        }],
        commit: async () => {
          logger.info('[TransferSettlementHandler] No change needed - skipping');
        }
      };
    }
    
    // Only allow transfer from player-owned settlements
    if (currentOwner !== PLAYER_KINGDOM) {
      logger.warn(`[TransferSettlementHandler] Settlement ${settlement.name} is not player-owned (owned by ${currentOwner})`);
      return {
        outcomeBadges: [{
          icon: 'fa-exclamation-triangle',
          template: `${settlement.name} is not player-owned`,
          variant: 'info'
        }],
        commit: async () => {
          logger.info('[TransferSettlementHandler] Not player-owned - skipping');
        }
      };
    }
    
    const factionName = command.factionName || toFaction;
    
    // Track imprisoned unrest that will be lost with the settlement
    const imprisonedUnrest = settlement.imprisonedUnrest || 0;
    
    logger.info(`[TransferSettlementHandler] Will transfer ${settlement.name} to ${factionName}`);
    if (imprisonedUnrest > 0) {
      logger.info(`[TransferSettlementHandler] Settlement has ${imprisonedUnrest} imprisoned unrest that will be lost`);
    }
    
    // Build outcome badges
    const outcomeBadges = [
      {
        icon: 'fa-city',
        template: `${settlement.name} secedes to ${factionName}`,
        variant: 'negative'
      }
    ];
    
    // Add badge for imprisoned unrest if any
    if (imprisonedUnrest > 0) {
      outcomeBadges.push({
        icon: 'fa-handcuffs',
        template: `${imprisonedUnrest} imprisoned unrest lost`,
        variant: 'negative'
      });
    }
    
    return {
      outcomeBadges,
      commit: async () => {
        logger.info(`[TransferSettlementHandler] Transferring ${settlement.name} to ${toFaction}`);
        
        await updateKingdom((kingdom) => {
          // Find the settlement to get its location
          const targetSettlement = kingdom.settlements?.find((s: Settlement) => s.id === settlementId);
          if (!targetSettlement) {
            logger.error(`[TransferSettlementHandler] Settlement not found during commit: ${settlementId}`);
            return;
          }
          
          // Update the hex's claimedBy (single source of truth for ownership)
          const hex = kingdom.hexes?.find((h: any) => 
            h.row === targetSettlement.location.x && h.col === targetSettlement.location.y
          );
          
          if (hex) {
            logger.info(`[TransferSettlementHandler] Found hex ${hex.id} for settlement ${targetSettlement.name}, current owner: ${hex.claimedBy}`);
            hex.claimedBy = toFaction;
            logger.info(`[TransferSettlementHandler] Hex ${hex.id} now claimed by ${toFaction}`);
          } else {
            logger.error(`[TransferSettlementHandler] Hex not found for settlement: ${targetSettlement.name}`);
          }
          
          // Clear imprisoned unrest - it goes with the seceding settlement
          // (the new faction takes control of those prisoners)
          if (targetSettlement.imprisonedUnrest && targetSettlement.imprisonedUnrest > 0) {
            logger.info(`[TransferSettlementHandler] Clearing ${targetSettlement.imprisonedUnrest} imprisoned unrest from ${targetSettlement.name}`);
            targetSettlement.imprisonedUnrest = 0;
          }
        });
        
        // Chat message
        let chatContent = `<p><strong>Settlement Secedes!</strong></p><p><strong>${settlement.name}</strong> has declared independence and joined the ${factionName} faction.</p>`;
        if (imprisonedUnrest > 0) {
          chatContent += `<p><em>${imprisonedUnrest} imprisoned unrest was lost with the settlement.</em></p>`;
        }
        ChatMessage.create({
          content: chatContent,
          speaker: ChatMessage.getSpeaker()
        });
        
        logger.info(`[TransferSettlementHandler] Successfully transferred ${settlement.name}`);
      },
      metadata: {
        settlementId: settlement.id,
        settlementName: settlement.name,
        toFaction,
        factionName,
        imprisonedUnrestLost: imprisonedUnrest
      }
    };
  }
}

