/**
 * DefectArmies Command Handler
 * 
 * Transfers ownership of armies located in specified hexes to a target faction.
 * Used by secession-crisis incident.
 * 
 * Command format:
 * {
 *   type: 'defectArmies',
 *   hexIds: string[],      // Hexes to check for armies
 *   toFaction: string      // Target faction ID
 * }
 * 
 * For each army with a token in the specified hexes:
 * - Set army.ledBy = toFaction
 * - Set army.supportedBy = toFaction
 * - Set army.isSupported = true
 */

import { BaseGameCommandHandler } from '../GameCommandHandler';
import type { GameCommandContext } from '../GameCommandHandler';
import type { PreparedCommand } from '../../../types/game-commands';
import { logger } from '../../../utils/Logger';
import { updateKingdom } from '../../../stores/KingdomStore';
import { PLAYER_KINGDOM } from '../../../types/ownership';
import { armyService } from '../../army';
import type { Army } from '../../../models/Army';

export class DefectArmiesHandler extends BaseGameCommandHandler {
  canHandle(command: any): boolean {
    return command.type === 'defectArmies';
  }
  
  async prepare(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null> {
    const { hexIds, toFaction } = command;
    
    if (!hexIds || !Array.isArray(hexIds) || hexIds.length === 0) {
      logger.error('[DefectArmiesHandler] Missing or empty hexIds');
      return null;
    }
    
    if (!toFaction) {
      logger.error('[DefectArmiesHandler] Missing toFaction');
      return null;
    }
    
    // Use ArmyService to get all army locations on the scene
    const allArmyLocations = armyService.getArmyLocationsOnScene();
    logger.info(`[DefectArmiesHandler] Found ${allArmyLocations.length} armies on scene`);
    
    // Filter to player armies in the specified hexes
    const armiesInHexes = allArmyLocations.filter(loc => 
      (loc.ledBy === PLAYER_KINGDOM || loc.ledBy === 'player') &&
      hexIds.includes(loc.hexId)
    );
    
    for (const loc of armiesInHexes) {
      logger.info(`[DefectArmiesHandler] Found army ${loc.name} in hex ${loc.hexId}`);
    }
    
    // If no armies in the area, return a neutral badge
    if (armiesInHexes.length === 0) {
      logger.info('[DefectArmiesHandler] No player armies found in specified hexes');
      return {
        outcomeBadges: [{
          icon: 'fa-check',
          template: 'No armies in area',
          variant: 'neutral'
        }],
        commit: async () => {
          logger.info('[DefectArmiesHandler] No armies to defect - skipping');
        },
        metadata: {
          defectedArmies: []
        }
      };
    }
    
    const factionName = command.factionName || toFaction;
    const armyNames = armiesInHexes.map(loc => loc.name);
    
    const message = armiesInHexes.length === 1
      ? `${armyNames[0]} defects to ${factionName}`
      : `${armiesInHexes.length} armies defect to ${factionName}: ${armyNames.join(', ')}`;
    
    logger.info(`[DefectArmiesHandler] Will defect: ${message}`);
    
    // Capture army info for closure
    const capturedArmies = armiesInHexes.map(loc => ({
      armyId: loc.armyId,
      name: loc.name,
      hexId: loc.hexId
    }));
    
    return {
      outcomeBadges: [{
        icon: 'fa-people-group',
        template: message,
        variant: 'negative'
      }],
      commit: async () => {
        logger.info(`[DefectArmiesHandler] Defecting ${capturedArmies.length} armies to ${toFaction}`);
        
        await updateKingdom((kingdom) => {
          for (const armyInfo of capturedArmies) {
            const army = kingdom.armies?.find((a: Army) => a.id === armyInfo.armyId);
            if (army) {
              logger.info(`[DefectArmiesHandler] Army ${army.name} defecting from ${army.ledBy} to ${toFaction}`);
              
              // Remove army from its supporting settlement's supportedUnits array
              if (army.supportedBySettlementId) {
                const supportingSettlement = kingdom.settlements?.find(
                  (s: any) => s.id === army.supportedBySettlementId
                );
                if (supportingSettlement?.supportedUnits) {
                  const armyIndex = supportingSettlement.supportedUnits.indexOf(army.id);
                  if (armyIndex > -1) {
                    supportingSettlement.supportedUnits.splice(armyIndex, 1);
                    logger.info(`[DefectArmiesHandler] Removed ${army.name} from ${supportingSettlement.name}'s supported units`);
                  }
                }
              }
              
              // Transfer ownership to new faction
              army.ledBy = toFaction;
              army.supportedBy = toFaction;
              army.isSupported = true; // New faction supports their own
              army.supportedBySettlementId = null; // Clear player settlement support
              logger.info(`[DefectArmiesHandler] Army ${army.name} now led by ${toFaction}`);
            }
          }
        });
        
        // Chat message
        const armyList = capturedArmies.map(a => `<li><strong>${a.name}</strong></li>`).join('');
        
        ChatMessage.create({
          content: `<p><strong>Armies Defect!</strong></p><p>The following armies have joined the ${factionName} faction:</p><ul>${armyList}</ul>`,
          speaker: ChatMessage.getSpeaker()
        });
        
        logger.info(`[DefectArmiesHandler] Successfully defected ${capturedArmies.length} armies`);
      },
      metadata: {
        defectedArmies: capturedArmies,
        toFaction,
        factionName
      }
    };
  }
}

