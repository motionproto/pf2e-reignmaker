/**
 * GameCommandHelpers - Shared utilities for executing game commands
 * 
 * Used by EventPhaseController, UnrestPhaseController, and potentially ActionPhaseController
 * to execute gameCommands and convert results to specialEffects format for OutcomeDisplay.
 */

import type { GameCommand } from '../../types/modifiers';

/**
 * Execute game commands from outcome data and convert results to specialEffects
 * 
 * @param gameCommands - Array of game commands to execute
 * @returns Array of specialEffects strings for OutcomeDisplay
 */
export async function executeGameCommands(gameCommands: GameCommand[]): Promise<string[]> {
  const specialEffects: string[] = [];
  
  if (!gameCommands || gameCommands.length === 0) {
    return specialEffects;
  }
  
  const { createGameCommandsResolver } = await import('../../services/GameCommandsResolver');
  const resolver = await createGameCommandsResolver();
  
  for (const command of gameCommands) {
    if (command.type === 'damageStructure') {
      const result = await resolver.damageStructure(
        (command as any).targetStructure,
        (command as any).settlementId,
        (command as any).count
      );
      
      // Convert damage results to specialEffects format
      if (result.success && result.data?.damagedStructures) {
        for (const damaged of result.data.damagedStructures) {
          // OutcomeDisplay expects: structure_damaged:structureId:settlementId
          // IDs are used for lookup, names are for logging only
          specialEffects.push(
            `structure_damaged:${damaged.structureId}:${damaged.settlementId}`
          );
        }
      }
    }
    // Future command types will be handled here (claimHex, recruitArmy, etc.)
  }
  
  return specialEffects;
}
