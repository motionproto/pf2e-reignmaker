/**
 * DisbandArmy Command Handler
 * 
 * Handles army disbanding
 */

import { BaseGameCommandHandler } from '../GameCommandHandler';
import type { GameCommandContext } from '../GameCommandHandler';
import type { PreparedCommand } from '../../../types/game-commands';

export class DisbandArmyHandler extends BaseGameCommandHandler {
  canHandle(command: any): boolean {
    return command.type === 'disbandArmy';
  }
  
  async prepare(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null> {
    const { disbandArmy } = await import('../../commands/armies/armyCommands');
    
    // Get armyId from explicit context
    const armyId = ctx.pendingState?.armyId;
    if (!armyId) {
      console.error('[DisbandArmyHandler] No army selected for disbanding');
      throw new Error('Army disbanding requires army selection - ensure army context is provided');
    }
    
    const deleteActor = command.deleteActor !== false; // Default to true
    
    // Delegate to command
    const result = await disbandArmy(armyId, deleteActor);
    
    return this.normalizeResult(result, 'Army disbanded');
  }
}
