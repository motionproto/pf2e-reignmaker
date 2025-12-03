/**
 * SpawnEnemyArmy Command Handler
 * 
 * Handles spawning enemy armies for hostile factions.
 * Used by guerrilla-movement incident (critical failure).
 * 
 * Creates an army with:
 * - Level = kingdom level - 1 (minimum 1)
 * - Randomly selected type (infantry, cavalry, etc.)
 * - Placed on one of the seized hexes
 * - ledBy = specified faction ID
 * - supportedBy = specified faction ID
 * - exemptFromUpkeep = true (enemy armies don't cost player upkeep)
 */

import { BaseGameCommandHandler } from '../GameCommandHandler';
import type { GameCommandContext } from '../GameCommandHandler';
import type { PreparedCommand } from '../../../types/game-commands';
import { logger } from '../../../utils/Logger';
import { getKingdomActor } from '../../../stores/KingdomStore';
import { armyService } from '../../army/index';
import { ARMY_TYPES, type ArmyType } from '../../../utils/armyHelpers';
import { getPartyLevel } from '../GameCommandUtils';

// Rebel army types (subset of ARMY_TYPES - infantry and cavalry only)
const REBEL_ARMY_TYPES: ArmyType[] = ['infantry', 'cavalry'];

function pickRandomArmyType(): ArmyType {
  return REBEL_ARMY_TYPES[Math.floor(Math.random() * REBEL_ARMY_TYPES.length)];
}

export class SpawnEnemyArmyHandler extends BaseGameCommandHandler {
  canHandle(command: any): boolean {
    return command.type === 'spawnEnemyArmy';
  }
  
  async prepare(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null> {
    const factionId = command.factionId || ctx.metadata?.rebelsFactionId || 'rebels';
    const factionName = command.factionName || 'Rebels';
    
    logger.info(`[SpawnEnemyArmyHandler] Preparing to spawn enemy army for faction: ${factionId}`);
    
    // Get current kingdom data to calculate level
    const actor = getKingdomActor();
    if (!actor) {
      logger.error('[SpawnEnemyArmyHandler] No kingdom actor available');
      return null;
    }
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      logger.error('[SpawnEnemyArmyHandler] No kingdom data available');
      return null;
    }
    
    // Calculate army level: party level - 1, minimum 1
    const partyLevel = getPartyLevel();
    const armyLevel = Math.max(1, partyLevel - 1);
    
    // Pick random army type using shared ARMY_TYPES
    const armyType = pickRandomArmyType();
    const armyConfig = ARMY_TYPES[armyType];
    const armyName = `Rebel ${armyConfig.name}`;
    
    // Get placement hex from seized hexes (if available)
    const seizedHexIds = ctx.metadata?.seizedHexIds || [];
    const placementHexId = seizedHexIds.length > 0 
      ? seizedHexIds[Math.floor(Math.random() * seizedHexIds.length)]
      : null;
    
    logger.info(`[SpawnEnemyArmyHandler] Party level: ${partyLevel}, Army level: ${armyLevel}, Type: ${armyType}`);
    if (placementHexId) {
      logger.info(`[SpawnEnemyArmyHandler] Will place army on hex: ${placementHexId}`);
    }
    
    // Build preview message
    const message = `Enemy army spawned: ${armyName} (Level ${armyLevel})`;
    
    logger.info(`[SpawnEnemyArmyHandler] Preview: ${message}`);
    
    return {
      outcomeBadge: {
        icon: 'fa-shield',
        template: message,
        variant: 'negative'
      },
      commit: async () => {
        // Recalculate level from fresh party data to ensure accuracy
        const freshActor = getKingdomActor();
        const freshKingdom = freshActor?.getKingdomData();
        const freshPartyLevel = getPartyLevel();
        const freshArmyLevel = Math.max(1, freshPartyLevel - 1);
        
        logger.info(`[SpawnEnemyArmyHandler] Creating enemy army: ${armyName}, Level ${freshArmyLevel}`);
        
        try {
          // Create the enemy army with proper image
          const army = await armyService.createArmy(armyName, freshArmyLevel, {
            type: armyType,
            image: armyConfig.image,  // Use army type image for portrait and token
            ledBy: factionId,
            supportedBy: factionId,
            exemptFromUpkeep: true,  // Enemy armies don't cost player upkeep
            settlementId: null  // No settlement support for enemy armies
          });
          
          logger.info(`[SpawnEnemyArmyHandler] Successfully created enemy army: ${army.id}`);
          
          // Place army token on seized hex if available
          if (placementHexId && army.actorId) {
            await this.placeArmyOnHex(army.actorId, placementHexId, armyName, freshKingdom);
          }
          
          // Show chat message
          const placementHex = freshKingdom?.hexes?.find((h: any) => h.id === placementHexId);
          const locationName = placementHex?.name || placementHexId || 'Unknown';
          
          const chatMessage = `
            <p><strong>Enemy Army Spawned!</strong></p>
            <ul>
              <li><strong>Name:</strong> ${armyName}</li>
              <li><strong>Level:</strong> ${freshArmyLevel}</li>
              <li><strong>Type:</strong> ${armyConfig.name}</li>
              <li><strong>Faction:</strong> ${factionName}</li>
              ${placementHexId ? `<li><strong>Location:</strong> ${locationName}</li>` : ''}
            </ul>
            <p><em>This army is hostile and must be dealt with.</em></p>
          `;
          
          ChatMessage.create({
            content: chatMessage,
            speaker: ChatMessage.getSpeaker()
          });
          
        } catch (error) {
          logger.error(`[SpawnEnemyArmyHandler] Failed to create enemy army:`, error);
          
          // Show error in chat
          ChatMessage.create({
            content: `<p><strong>Error:</strong> Failed to spawn enemy army. Please create manually: ${armyName} (Level ${armyLevel})</p>`,
            speaker: ChatMessage.getSpeaker()
          });
        }
      },
      // Store army info in metadata
      metadata: {
        enemyArmy: {
          name: armyName,
          level: armyLevel,
          type: armyType,
          factionId,
          factionName,
          placementHexId
        }
      }
    };
  }
  
  /**
   * Place army token on a hex
   */
  private async placeArmyOnHex(actorId: string, hexId: string, armyName: string, kingdom: any): Promise<void> {
    try {
      // Parse hex coordinates from hex ID (format: "row.col")
      const [row, col] = hexId.split('.').map(Number);
      if (isNaN(row) || isNaN(col)) {
        logger.warn(`[SpawnEnemyArmyHandler] Invalid hex ID format: ${hexId}`);
        return;
      }
      
      // Get hex center position from Foundry canvas
      const canvas = (globalThis as any).canvas;
      if (!canvas?.grid) {
        logger.warn(`[SpawnEnemyArmyHandler] Canvas not available for token placement`);
        return;
      }
      
      // Get center point of hex
      const center = canvas.grid.getCenterPoint({ i: row, j: col });
      if (!center) {
        logger.warn(`[SpawnEnemyArmyHandler] Could not get center point for hex ${hexId}`);
        return;
      }
      
      // Get the scene
      const scene = canvas.scene;
      if (!scene) {
        logger.warn(`[SpawnEnemyArmyHandler] No active scene for token placement`);
        return;
      }
      
      // Place the token using army service
      const { actionDispatcher } = await import('../../ActionDispatcher');
      if (actionDispatcher.isAvailable()) {
        await actionDispatcher.dispatch('placeArmyToken', {
          actorId,
          sceneId: scene.id,
          x: center.x,
          y: center.y
        });
        logger.info(`[SpawnEnemyArmyHandler] Placed ${armyName} token at hex ${hexId} (${center.x}, ${center.y})`);
      }
    } catch (error) {
      logger.error(`[SpawnEnemyArmyHandler] Failed to place army token:`, error);
      // Don't throw - token placement failure shouldn't block army creation
    }
  }
}
