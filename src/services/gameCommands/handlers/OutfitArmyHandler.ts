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
    const { createGameCommandsResolver } = await import('../../GameCommandsResolver');
    const resolver = await createGameCommandsResolver();
    
    // Get armyId from command (optional - can auto-select)
    const armyId = command.armyId;
    const equipmentType = command.equipmentType || 'armor';
    const fallbackToGold = command.fallbackToGold === true;
    
    // Convert outcome to appropriate format for resolver
    const resolverOutcome = ctx.outcome === 'criticalSuccess' ? 'criticalSuccess' 
      : ctx.outcome === 'success' ? 'success'
      : ctx.outcome === 'failure' ? 'failure'
      : 'criticalFailure';
    
    // outfitArmy returns PreparedCommand | ResolveResult (hybrid during migration)
    const result = await resolver.outfitArmy(armyId, equipmentType, resolverOutcome, fallbackToGold);
    
    // Check if result is ResolveResult (legacy) and convert to PreparedCommand
    if (result && 'success' in result && !('outcomeBadge' in result)) {
      // Legacy ResolveResult - convert to PreparedCommand format with outcomeBadge
      if (result.success) {
        const message = result.data?.message || 'Army outfitted';
        const isNegative = result.data?.grantedGold === true;
        
        return {
          outcomeBadge: {
            icon: isNegative ? 'fa-coins' : 'fa-shield-alt'
            value: { type: 'static', amount: 0 },
            suffix: message,
            variant: isNegative ? 'info' : 'positive'
          },
          commit: async () => {
            // Already executed by resolver (legacy pattern)
            console.log('[OutfitArmyHandler] Equipment already applied (legacy)');
          }
        };
      }
      return null;
    }
    
    // If result is already PreparedCommand, use it as-is
    return result as PreparedCommand;
  }
}
