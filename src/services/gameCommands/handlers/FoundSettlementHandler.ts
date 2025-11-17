/**
 * FoundSettlement Command Handler
 * 
 * Handles settlement founding (e.g., Establish Settlement action)
 */

import { BaseGameCommandHandler } from '../GameCommandHandler';
import type { GameCommandContext } from '../GameCommandHandler';
import type { PreparedCommand } from '../../../types/game-commands';

export class FoundSettlementHandler extends BaseGameCommandHandler {
  canHandle(command: any): boolean {
    return command.type === 'foundSettlement';
  }
  
  async prepare(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null> {
    const { createGameCommandsResolver } = await import('../../GameCommandsResolver');
    const resolver = await createGameCommandsResolver();
    
    // For critical success on Establish Settlement, grant free structure
    const grantFreeStructure = (ctx.outcome === 'criticalSuccess');
    
    // Delegate to resolver
    const result = await resolver.foundSettlement(
      command.name || 'New Settlement',
      command.location || { x: 0, y: 0 },
      grantFreeStructure
    );
    
    return this.normalizeResult(result, 'Settlement founded');
  }
}
