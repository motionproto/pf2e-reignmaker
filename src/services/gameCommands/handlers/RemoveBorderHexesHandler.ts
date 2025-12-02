/**
 * RemoveBorderHexes Command Handler
 * 
 * Handles removing border hexes from kingdom (border raids, secession).
 * - Calculates border hexes (adjacent to unclaimed territory)
 * - Supports dice formulas for count
 * - Opens hex selector dialog during prepare phase
 * - Stores selections for commit phase
 */

import { BaseGameCommandHandler } from '../GameCommandHandler';
import type { GameCommandContext } from '../GameCommandHandler';
import type { PreparedCommand } from '../../../types/game-commands';
import { logger } from '../../../utils/Logger';
import { getKingdomActor } from '../../../stores/KingdomStore';

export class RemoveBorderHexesHandler extends BaseGameCommandHandler {
  canHandle(command: any): boolean {
    return command.type === 'removeBorderHexes';
  }
  
  async prepare(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null> {
    const count = command.count;
    const dice = command.dice;
    
    logger.info(`[RemoveBorderHexesHandler] Preparing to remove border hexes: count=${count}, dice=${dice}`);
    
    // Get current kingdom data
    const actor = getKingdomActor();
    if (!actor) {
      logger.error('[RemoveBorderHexesHandler] No kingdom actor available');
      return null;
    }
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      logger.error('[RemoveBorderHexesHandler] No kingdom data available');
      return null;
    }
    
    // 1. Handle dice rolling if needed
    let hexCount: number;
    if (count === 'dice') {
      if (!dice) {
        logger.error('[RemoveBorderHexesHandler] Dice formula required when count is "dice"');
        return null;
      }
      
      const roll = new Roll(dice);
      await roll.evaluate();
      hexCount = roll.total || 1;
      
      // Show dice roll in chat
      await roll.toMessage({
        flavor: 'Border Hexes Lost',
        speaker: { alias: 'Kingdom' }
      });
      
      logger.info(`🎲 [RemoveBorderHexesHandler] Rolled ${dice} = ${hexCount}`);
    } else {
      hexCount = count;
    }

    // 2. Calculate border hexes
    const { getBorderHexes } = await import('../../commands/territory/borderHexes');
    const borderHexes = await getBorderHexes(kingdom);
    
    if (borderHexes.length === 0) {
      logger.warn('[RemoveBorderHexesHandler] No border hexes available to remove');
      return {
        outcomeBadge: {
          icon: 'fa-exclamation-triangle',
          template: 'No border hexes available to remove',
          variant: 'neutral'
        },
        commit: async () => {
          logger.info('[RemoveBorderHexesHandler] No border hexes - skipping');
        }
      };
    }

    logger.info(`[RemoveBorderHexesHandler] Found ${borderHexes.length} border hexes`);

    // Cap hexCount to available border hexes
    const actualCount = Math.min(hexCount, borderHexes.length);
    if (actualCount < hexCount) {
      const ui = (globalThis as any).ui;
      ui?.notifications?.warn(`Only ${actualCount} border hexes available (requested ${hexCount})`);
    }

    // 3. Open hex selector dialog during prepare phase
    const { hexSelectorService } = await import('../../../services/hex-selector');
    
    const selectedHexes = await hexSelectorService.selectHexes({
      title: `Remove ${actualCount} Border Hex${actualCount !== 1 ? 'es' : ''}`,
      count: actualCount,
      colorType: 'unclaim',
      validationFn: (hexId) => borderHexes.includes(hexId)
    });

    if (!selectedHexes || selectedHexes.length === 0) {
      logger.warn('[RemoveBorderHexesHandler] Hex selection cancelled by user');
      return null;
    }
    
    // Create badge text
    const hexList = selectedHexes.join(', ');
    const badgeText = `Removing ${selectedHexes.length} border hex${selectedHexes.length !== 1 ? 'es' : ''}: ${hexList}`;
    
    logger.info(`[RemoveBorderHexesHandler] Preview: ${badgeText}`);
    
    return {
      outcomeBadge: {
        icon: 'fa-map',
        template: badgeText,
        variant: 'negative'
      },
      commit: async () => {
        logger.info(`[RemoveBorderHexesHandler] Removing ${selectedHexes.length} border hex(es)`);
        
        const actor = getKingdomActor();
        if (!actor) {
          logger.error('[RemoveBorderHexesHandler] No kingdom actor available during commit');
          return;
        }
        
        await actor.updateKingdomData((kingdom: any) => {
          for (const hexId of selectedHexes) {
            const hex = kingdom.hexes.find((h: any) => h.id === hexId);
            if (hex) {
              hex.claimedBy = null;
              logger.info(`  🏴 Removed hex ${hexId} from kingdom`);
            }
          }
        });
        
        // Log to chat
        const hexList = selectedHexes.join(', ');
        const message = `<p><strong>Territory Lost:</strong> Removed ${selectedHexes.length} border hex${selectedHexes.length !== 1 ? 'es' : ''} from kingdom: ${hexList}</p>`;
        
        ChatMessage.create({
          content: message,
          speaker: { alias: 'Kingdom Management' }
        });
        
        logger.info(`[RemoveBorderHexesHandler] Successfully removed ${selectedHexes.length} border hex(es)`);
      }
    };
  }
}

