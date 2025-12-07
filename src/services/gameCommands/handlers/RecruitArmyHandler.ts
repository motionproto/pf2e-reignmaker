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
    const { recruitArmy } = await import('../../commands/armies/armyCommands');
    
    // Determine army level
    let level = 1;
    if (command.level === 'kingdom-level') {
      level = ctx.kingdom.partyLevel || 1;
    } else if (typeof command.level === 'number') {
      level = command.level;
    }
    
    const exemptFromUpkeep = command.exemptFromUpkeep === true;
    
    // Get recruitment data from command or context (supports both patterns)
    const recruitmentData = command.recruitmentData || ctx.pendingState?.recruitmentData;
    if (!recruitmentData) {
      console.error('[RecruitArmyHandler] No recruitment data in command or context');
      throw new Error('Army recruitment requires recruitment data - ensure army details are provided');
    }
    
    // For allied armies, faction context can come from recruitmentData.supportedBy or ctx.pendingState
    const supportedBy = recruitmentData.supportedBy || ctx.pendingState?.factionName;
    if (exemptFromUpkeep && !supportedBy && !ctx.pendingState?.factionId) {
      console.error('[RecruitArmyHandler] Allied army recruitment requires faction context');
      throw new Error('Allied army recruitment requires faction context - ensure faction is selected before recruitment');
    }
    
    // Pass recruitment data directly to command - no global state needed
    const result = await recruitArmy(level, {
      name: recruitmentData.name,
      armyType: recruitmentData.armyType,
      settlementId: recruitmentData.settlementId || null,
      supportedBy: exemptFromUpkeep ? supportedBy : undefined
    }, exemptFromUpkeep);
    
    return this.normalizeResult(result, 'Army recruited');
  }
}
