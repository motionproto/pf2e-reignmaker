/**
 * deployArmy execution function
 *
 * Extracted from immediate-execute pattern - pure execution logic only.
 * Preview logic has been moved to pipeline configuration.
 */

import { updateKingdom, getKingdomActor } from '../../stores/KingdomStore';
import { logger } from '../../utils/Logger';

/**
 * Execute army deployment
 *
 * @param deployment - Deployment configuration
 */
export async function deployArmyExecution(deployment: {
  armyId: string;
  path: string[];
  conditionsToApply?: string[];
  animationSpeed?: number;
  finalNavCell?: { x: number; y: number }; // Final nav-grid position for pathfinding
}): Promise<void> {
  logger.info(`🚀 [deployArmyExecution] Deploying army ${deployment.armyId}`);

  const actor = getKingdomActor();
  if (!actor) {
    throw new Error('No kingdom actor available');
  }

  const kingdom = actor.getKingdomData();
  if (!kingdom) {
    throw new Error('No kingdom data available');
  }

  // Find the army
  const army = kingdom.armies?.find((a: any) => a.id === deployment.armyId);
  if (!army) {
    throw new Error(`Army ${deployment.armyId} not found`);
  }

  if (!army.actorId) {
    throw new Error(`${army.name} has no linked NPC actor`);
  }

  // Animate token along path
  try {
    const { getArmyToken, animateTokenAlongPath } = await import('../../services/army/tokenAnimation');
    const tokenDoc = await getArmyToken(deployment.armyId);

    if (tokenDoc) {
      logger.info(`🎬 [deployArmyExecution] Animating ${army.name} along ${deployment.path.length} hexes`);
      await animateTokenAlongPath(tokenDoc, deployment.path, deployment.animationSpeed || 100);
    } else {
      logger.warn(`⚠️ [deployArmyExecution] No token found for ${army.name} - skipping animation`);
    }
  } catch (error) {
    logger.error('❌ [deployArmyExecution] Animation failed:', error);
    // Continue even if animation fails
  }

  // Apply conditions to army actor
  if (deployment.conditionsToApply && deployment.conditionsToApply.length > 0) {
    try {
      const game = (globalThis as any).game;
      const armyActor = game.actors.get(army.actorId);

      if (armyActor) {
        const { applyConditionToActor } = await import('../../services/commands/combat/conditionHelpers');

        for (const conditionString of deployment.conditionsToApply) {
          await applyConditionToActor(armyActor, conditionString);
        }
        logger.info(`✅ [deployArmyExecution] Applied ${deployment.conditionsToApply.length} conditions to ${army.name}`);
      } else {
        logger.warn(`⚠️ [deployArmyExecution] Could not find actor for ${army.name}`);
      }
    } catch (error) {
      logger.error('❌ [deployArmyExecution] Failed to apply conditions:', error);
      // Continue even if conditions fail
    }
  }

  // Mark army as deployed this turn and save final nav cell position
  await updateKingdom(k => {
    // Ensure turnState exists
    if (!k.turnState) {
      const { createDefaultTurnState } = require('../../models/TurnState');
      k.turnState = createDefaultTurnState(k.currentTurn);
    }

    // Ensure actionsPhase exists
    if (!k.turnState!.actionsPhase) {
      k.turnState!.actionsPhase = {
        completed: false,
        activeAids: [],
        deployedArmyIds: [],
        factionsAidedThisTurn: []
      };
    }

    // Ensure deployedArmyIds array exists
    if (!k.turnState!.actionsPhase.deployedArmyIds) {
      k.turnState!.actionsPhase.deployedArmyIds = [];
    }

    // Add army to deployed list if not already there
    if (!k.turnState!.actionsPhase.deployedArmyIds.includes(deployment.armyId)) {
      k.turnState!.actionsPhase.deployedArmyIds.push(deployment.armyId);
    }

    // Save the final nav cell position to the army (for future pathfinding)
    if (deployment.finalNavCell && k.armies) {
      const armyIndex = k.armies.findIndex((a: any) => a.id === deployment.armyId);
      if (armyIndex !== -1) {
        k.armies[armyIndex].navCellX = deployment.finalNavCell.x;
        k.armies[armyIndex].navCellY = deployment.finalNavCell.y;
        logger.info(`📍 [deployArmyExecution] Saved navCell (${deployment.finalNavCell.x}, ${deployment.finalNavCell.y}) for ${k.armies[armyIndex].name}`);
      }
    }
  });

  logger.info(`✅ [deployArmyExecution] Marked ${army.name} as deployed this turn`);
  logger.info(`✅ [deployArmyExecution] Successfully deployed ${army.name} to ${deployment.path[deployment.path.length - 1]}`);
}
