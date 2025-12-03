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
        outcomeBadge: {
          icon: 'fa-exclamation-triangle',
          template: 'Settlement not found',
          variant: 'info'
        },
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
        outcomeBadge: {
          icon: 'fa-check',
          template: `${settlement.name} already owned by ${toFaction}`,
          variant: 'info'
        },
        commit: async () => {
          logger.info('[TransferSettlementHandler] No change needed - skipping');
        }
      };
    }
    
    // Only allow transfer from player-owned settlements
    if (currentOwner !== PLAYER_KINGDOM) {
      logger.warn(`[TransferSettlementHandler] Settlement ${settlement.name} is not player-owned (owned by ${currentOwner})`);
      return {
        outcomeBadge: {
          icon: 'fa-exclamation-triangle',
          template: `${settlement.name} is not player-owned`,
          variant: 'info'
        },
        commit: async () => {
          logger.info('[TransferSettlementHandler] Not player-owned - skipping');
        }
      };
    }
    
    const factionName = command.factionName || toFaction;
    
    logger.info(`[TransferSettlementHandler] Will transfer ${settlement.name} to ${factionName}`);
    
    return {
      outcomeBadge: {
        icon: 'fa-city',
        template: `${settlement.name} secedes to ${factionName}`,
        variant: 'negative'
      },
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
        });
        
        // Chat message
        ChatMessage.create({
          content: `<p><strong>Settlement Secedes!</strong></p><p><strong>${settlement.name}</strong> has declared independence and joined the ${factionName} faction.</p>`,
          speaker: ChatMessage.getSpeaker()
        });
        
        logger.info(`[TransferSettlementHandler] Successfully transferred ${settlement.name}`);
      },
      metadata: {
        settlementId: settlement.id,
        settlementName: settlement.name,
        toFaction,
        factionName
      }
    };
  }
}

