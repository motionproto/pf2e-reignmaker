/**
 * GiveActorGold Command Handler
 * 
 * Handles gold distribution from settlements (e.g., Collect Stipend action)
 */

import { BaseGameCommandHandler } from '../GameCommandHandler';
import type { GameCommandContext } from '../GameCommandHandler';
import type { PreparedCommand } from '../../../types/game-commands';

export class GiveActorGoldHandler extends BaseGameCommandHandler {
  canHandle(command: any): boolean {
    return command.type === 'giveActorGold';
  }
  
  async prepare(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null> {
    const { createGameCommandsResolver } = await import('../../GameCommandsResolver');
    const resolver = await createGameCommandsResolver();
    
    // Get settlementId from command OR from explicit context
    const settlementId = command.settlementId || ctx.pendingState.settlementId;
    
    if (!settlementId) {
      console.error('[GiveActorGoldHandler] No settlement selected for gold distribution');
      throw new Error('Gold distribution requires settlement selection - ensure settlement context is provided');
    }
    
    const multiplier = parseFloat(command.multiplier) || 1;
    
    // Delegate to resolver
    const result = await resolver.giveActorGold(multiplier, settlementId);
    
    return this.normalizeResult(result, 'Gold distributed to actor');
  }
}
