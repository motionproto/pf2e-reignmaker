/**
 * SpendPlayerAction Command Handler
 * 
 * Marks a character as having already acted without taking an action
 * Used by incidents that cause characters to lose their action for the turn
 * (e.g., assassination attempt, noble conspiracy)
 */

import { BaseGameCommandHandler } from '../GameCommandHandler';
import type { GameCommandContext } from '../GameCommandHandler';
import type { PreparedCommand } from '../../../types/game-commands';
import { logger } from '../../../utils/Logger';
import { getKingdomActor } from '../../../stores/KingdomStore';
import type { ActionLogEntry } from '../../../models/TurnState';
import { TurnPhase } from '../../../actors/KingdomActor';

export class SpendPlayerActionHandler extends BaseGameCommandHandler {
  canHandle(command: any): boolean {
    return command.type === 'spendPlayerAction';
  }
  
  async prepare(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null> {
    const characterSelection = command.characterSelection || 'random';
    const characterId = command.characterId;
    
    logger.info(`[SpendPlayerActionHandler] Preparing to spend player action: selection=${characterSelection}`);
    
    // Get current kingdom data
    const actor = getKingdomActor();
    if (!actor) {
      logger.error('[SpendPlayerActionHandler] No kingdom actor available');
      return null;
    }
    
    const kingdom = actor.getKingdomData();
    if (!kingdom || !kingdom.turnState) {
      logger.error('[SpendPlayerActionHandler] No kingdom data or turn state available');
      return null;
    }
    
    // Get all logged-in players (excluding GM)
    const players = Array.from(game.users).filter(user => !user.isGM && user.active);
    if (players.length === 0) {
      logger.warn('[SpendPlayerActionHandler] No logged-in players available');
      return {
        outcomeBadge: {
          icon: 'fa-exclamation-triangle',
          template: 'No logged-in players available to spend action',
          variant: 'neutral'
        },
        commit: async () => {
          logger.info('[SpendPlayerActionHandler] No logged-in players to affect - skipping');
        }
      };
    }
    
    // Filter to players who haven't acted yet this turn
    const actionLog = kingdom.turnState.actionLog || [];
    const playersWhoHaventActed = players.filter(player => {
      return !actionLog.some((entry: ActionLogEntry) => 
        entry.playerId === player.id && 
        (entry.phase === TurnPhase.ACTIONS || entry.phase === TurnPhase.EVENTS)
      );
    });
    
    if (playersWhoHaventActed.length === 0) {
      logger.warn('[SpendPlayerActionHandler] All players have already acted');
      return {
        outcomeBadge: {
          icon: 'fa-exclamation-triangle',
          template: 'All players have already acted this turn',
          variant: 'neutral'
        },
        commit: async () => {
          logger.info('[SpendPlayerActionHandler] All players acted - skipping');
        }
      };
    }
    
    // Select target player
    let targetPlayer: User | null = null;
    let targetCharacter: any = null;
    
    if (characterSelection === 'player-choice' || characterSelection === 'random') {
      // For now, use random selection (player-choice would need a dialog)
      const randomIndex = Math.floor(Math.random() * playersWhoHaventActed.length);
      targetPlayer = playersWhoHaventActed[randomIndex];
      
      // Get the player's assigned character
      // Foundry stores the character as user.character (Actor object)
      targetCharacter = targetPlayer.character;
      
      if (!targetCharacter) {
        logger.warn(`[SpendPlayerActionHandler] Player ${targetPlayer.name} has no assigned character`);
        // Fall back to using player name
        targetCharacter = { name: targetPlayer.name, id: targetPlayer.id };
      }
    }
    
    if (!targetPlayer || !targetCharacter) {
      logger.error('[SpendPlayerActionHandler] Could not select target player/character');
      return null;
    }
    
    // Try to get character name from multiple sources
    // Priority: character.name (Actor name) > character.data?.name > player.name
    let characterName = 'Unknown Character';
    if (targetCharacter.name) {
      characterName = targetCharacter.name;
    } else if ((targetCharacter as any).data?.name) {
      characterName = (targetCharacter as any).data.name;
    } else if (targetPlayer.name) {
      characterName = `${targetPlayer.name}'s Character`;
    }
    
    const message = `${characterName} cannot take a Kingdom Action this turn (recovering from wounds)`;
    
    logger.info(`[SpendPlayerActionHandler] Preview: ${message}`);
    logger.info(`[SpendPlayerActionHandler] Selected character: ${characterName} (Player: ${targetPlayer.name})`);
    
    // Capture values for commit closure
    const playerId = targetPlayer.id;
    const playerName = targetPlayer.name || 'Unknown Player';
    const finalCharacterName = characterName;  // Capture for closure
    
    return {
      outcomeBadge: {
        icon: 'fa-user-injured',
        template: message,
        variant: 'negative'
      },
      commit: async () => {
        logger.info(`[SpendPlayerActionHandler] Spending action for ${finalCharacterName}`);
        
        // Add entry to action log to mark character as having acted
        const actor = getKingdomActor();
        if (!actor) {
          logger.error('[SpendPlayerActionHandler] No kingdom actor available during commit');
          return;
        }
        
        await actor.updateKingdomData((kingdom: any) => {
          if (!kingdom.turnState) {
            logger.warn('[SpendPlayerActionHandler] No turnState during commit');
            return;
          }
          
          if (!kingdom.turnState.actionLog) {
            kingdom.turnState.actionLog = [];
          }
          
          const entry: ActionLogEntry = {
            playerId: playerId,
            playerName: playerName,
            characterName: finalCharacterName,
            actionName: 'spent-action-incident',  // Special marker for spent actions
            phase: kingdom.currentPhase as TurnPhase,
            timestamp: Date.now()
          };
          
          // Add to action log (immutable pattern for Svelte reactivity)
          kingdom.turnState.actionLog = [...kingdom.turnState.actionLog, entry];
        });
        
        // Show chat message
        const chatMessage = `<p><strong>Character Cannot Act:</strong></p><p>${finalCharacterName} cannot take a Kingdom Action this turn (recovering from wounds).</p>`;
        
        ChatMessage.create({
          content: chatMessage,
          speaker: ChatMessage.getSpeaker()
        });
        
        logger.info(`[SpendPlayerActionHandler] Successfully spent action for ${finalCharacterName}`);
      }
    };
  }
}

