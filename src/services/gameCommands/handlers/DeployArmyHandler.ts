/**
 * DeployArmy Command Handler
 * 
 * Handles army deployment with token animation and condition application.
 * - Moves army token along path on map
 * - Applies outcome-based conditions to army actor
 * - Critical failure: redirects to random hex near destination
 * - Marks army as deployed this turn
 */

import { BaseGameCommandHandler } from '../GameCommandHandler';
import type { GameCommandContext } from '../GameCommandHandler';
import type { PreparedCommand } from '../../../types/game-commands';
import { logger } from '../../../utils/Logger';
import { getKingdomActor } from '../../../stores/KingdomStore';

export class DeployArmyHandler extends BaseGameCommandHandler {
  canHandle(command: any): boolean {
    return command.type === 'deployArmy';
  }
  
  async prepare(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null> {
    const armyId = command.armyId;
    const path = command.path || [];
    const outcome = command.outcome || ctx.outcome;
    const conditionsToApply = command.conditionsToApply || [];
    
    logger.info(`[DeployArmyHandler] Preparing to deploy army ${armyId}`);
    
    // Validate inputs
    if (!armyId) {
      logger.error('[DeployArmyHandler] No army ID provided');
      return null;
    }
    
    if (!path || path.length < 2) {
      logger.error('[DeployArmyHandler] Invalid path - must have at least 2 hexes');
      return null;
    }
    
    // Get current kingdom data
    const actor = getKingdomActor();
    if (!actor) {
      logger.error('[DeployArmyHandler] No kingdom actor available');
      return null;
    }
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      logger.error('[DeployArmyHandler] No kingdom data available');
      return null;
    }

    // Find the army
    const army = kingdom.armies?.find((a: any) => a.id === armyId);
    if (!army) {
      logger.error(`[DeployArmyHandler] Army ${armyId} not found`);
      return null;
    }

    if (!army.actorId) {
      logger.error(`[DeployArmyHandler] ${army.name} has no linked NPC actor`);
      return null;
    }

    let finalPath = path;
    let redirectMessage = '';

    // Critical failure: Calculate random nearby hex (1-2 hexes from DESTINATION)
    if (outcome === 'criticalFailure') {
      const destinationHex = path[path.length - 1];
      const { calculateRandomNearbyHex } = await import('../../commands/combat/conditionHelpers');
      const randomHex = calculateRandomNearbyHex(destinationHex, 2); // 1-2 hexes from destination
      
      // Build path to random hex instead of intended destination
      finalPath = [...path.slice(0, -1), randomHex];
      redirectMessage = ` (got lost, arrived at ${randomHex} instead of ${destinationHex})`;
      logger.info(`[DeployArmyHandler] Critical failure - redirecting to random hex ${randomHex} near destination ${destinationHex}`);
    }

    const finalHex = finalPath[finalPath.length - 1];
    const movementCost = finalPath.length - 1;

    // Create preview badge
    let badgeText = `${army.name} will deploy to ${finalHex} (${movementCost} movement)${redirectMessage}`;
    
    if (conditionsToApply.length > 0) {
      const conditionsList = conditionsToApply.join(', ');
      badgeText += ` with conditions: ${conditionsList}`;
    }
    
    logger.info(`[DeployArmyHandler] Preview: ${badgeText}`);
    
    return {
      outcomeBadge: {
        icon: 'fa-flag',
        template: badgeText,
        variant: outcome === 'criticalFailure' ? 'negative' : 'positive'
      },
      commit: async () => {
        logger.info(`[DeployArmyHandler] Deploying ${army.name}`);
        
        // Use the existing execution function
        const { deployArmyExecution } = await import('../../../execution/armies/deployArmy');
        
        await deployArmyExecution({
          armyId: armyId,
          path: finalPath,
          conditionsToApply: conditionsToApply,
          animationSpeed: 100
        });
        
        // Show chat message
        const message = `<p><strong>Army Deployed:</strong> ${army.name} deployed to ${finalHex} (${movementCost} movement)${redirectMessage}</p>`;
        
        ChatMessage.create({
          content: message,
          speaker: { alias: 'Kingdom Management' }
        });
        
        logger.info(`[DeployArmyHandler] Successfully deployed ${army.name}`);
      }
    };
  }
}







