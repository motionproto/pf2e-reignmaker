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
    const { foundSettlement } = await import('../../commands/settlements/foundSettlement');
    
    // For critical success on Establish Settlement, grant free structure
    const grantFreeStructure = (ctx.outcome === 'criticalSuccess');
    
    // Delegate to command
    const result = await foundSettlement(
      command.name || 'New Settlement',
      command.location || { x: 0, y: 0 },
      grantFreeStructure
    );
    
    return this.normalizeResult(result, 'Settlement founded');
  }
}
