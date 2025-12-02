/**
 * OutfitArmy Command Handler
 * 
 * Handles army equipment (armor, weapons, runes, etc.)
 */

import { BaseGameCommandHandler } from '../GameCommandHandler';
import type { GameCommandContext } from '../GameCommandHandler';
import type { PreparedCommand } from '../../../types/game-commands';

export class OutfitArmyHandler extends BaseGameCommandHandler {
  canHandle(command: any): boolean {
    return command.type === 'outfitArmy';
  }
  
  async prepare(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null> {
    const { outfitArmy } = await import('../../commands/armies/outfitArmy');
    
    // Get parameters from command
    const armyId = command.armyId;
    const equipmentType = command.equipmentType || 'armor';
    const fallbackToGold = command.fallbackToGold === true;
    
    // Convert outcome to appropriate format
    const outcome = ctx.outcome === 'criticalSuccess' ? 'criticalSuccess' 
      : ctx.outcome === 'success' ? 'success'
      : ctx.outcome === 'failure' ? 'failure'
      : 'criticalFailure';
    
    // Delegate to command
    const result = await outfitArmy(armyId, equipmentType, outcome, fallbackToGold);
    
    return this.normalizeResult(result, 'Army outfitted');
  }
}
