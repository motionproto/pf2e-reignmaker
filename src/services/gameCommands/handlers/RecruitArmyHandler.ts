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
    
    // ⚠️ VALIDATION: Recruitment data must be in context
    const recruitmentData = ctx.pendingState.recruitmentData;
    if (!recruitmentData) {
      console.error('[RecruitArmyHandler] No recruitment data in context');
      throw new Error('Army recruitment requires recruitment data - ensure army details are provided');
    }
    
    // ⚠️ VALIDATION: For allied armies, faction ID must be in context
    if (exemptFromUpkeep && !ctx.pendingState.factionId) {
      console.error('[RecruitArmyHandler] Allied army recruitment requires factionId in context');
      throw new Error('Allied army recruitment requires faction context - ensure faction is selected before recruitment');
    }
    
    // Pass recruitment data directly to resolver - no global state needed
    const result = await resolver.recruitArmy(level, {
      name: recruitmentData.name,
      armyType: recruitmentData.armyType,
      settlementId: recruitmentData.settlementId || null,
      supportedBy: exemptFromUpkeep ? ctx.pendingState.factionName : undefined
    }, exemptFromUpkeep);
    
    return this.normalizeResult(result, 'Army recruited');
  }
}
