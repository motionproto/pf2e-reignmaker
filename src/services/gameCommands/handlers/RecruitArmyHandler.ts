/**
 * RecruitArmy Command Handler
 * 
 * Handles army recruitment (regular and allied armies)
 */

import { BaseGameCommandHandler } from '../GameCommandHandler';
import type { GameCommandContext } from '../GameCommandHandler';
import type { PreparedCommand } from '../../../types/game-commands';

export class RecruitArmyHandler extends BaseGameCommandHandler {
  canHandle(command: any): boolean {
    return command.type === 'recruitArmy';
  }
  
  async prepare(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null> {
    const { createGameCommandsResolver } = await import('../../GameCommandsResolver');
    const resolver = await createGameCommandsResolver();
    
    // Determine army level
    let level = 1;
    if (command.level === 'kingdom-level') {
      level = ctx.kingdom.partyLevel || 1;
    } else if (typeof command.level === 'number') {
      level = command.level;
    }
    
    const exemptFromUpkeep = command.exemptFromUpkeep === true;
    
    // ⚠️ VALIDATION: For allied armies, faction ID must be in context
    if (exemptFromUpkeep && !ctx.pendingState.factionId) {
      console.error('[RecruitArmyHandler] Allied army recruitment requires factionId in context');
      throw new Error('Allied army recruitment requires faction context - ensure faction is selected before recruitment');
    }
    
    // TODO: Update resolver to accept recruitment data and faction ID as parameters
    // For now, resolver still reads from global state (needs refactor)
    console.warn('[RecruitArmyHandler] Resolver still uses global state - needs refactor to accept parameters');
    
    // Delegate to resolver
    const result = await resolver.recruitArmy(level, undefined, exemptFromUpkeep);
    
    return this.normalizeResult(result, 'Army recruited');
  }
}
