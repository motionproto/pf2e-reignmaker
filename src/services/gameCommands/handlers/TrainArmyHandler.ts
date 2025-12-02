/**
 * TrainArmy Command Handler
 * 
 * Handles army training
 */

import { BaseGameCommandHandler } from '../GameCommandHandler';
import type { GameCommandContext } from '../GameCommandHandler';
import type { PreparedCommand } from '../../../types/game-commands';

export class TrainArmyHandler extends BaseGameCommandHandler {
  canHandle(command: any): boolean {
    return command.type === 'trainArmy';
  }
  
  async prepare(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null> {
    const { trainArmy } = await import('../../commands/armies/armyCommands');
    
    // Get armyId from explicit context
    const armyId = ctx.pendingState.armyId;
    if (!armyId) {
      console.error('[TrainArmyHandler] No army selected for training');
      throw new Error('Army training requires army selection - ensure army context is provided');
    }
    
    // Delegate to command
    const result = await trainArmy(armyId, ctx.outcome);
    
    return this.normalizeResult(result, 'Army trained');
  }
}
