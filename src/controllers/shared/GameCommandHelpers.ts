/**
 * GameCommandHelpers - Shared utilities for executing game commands
 * 
 * Used by EventPhaseController, UnrestPhaseController, and potentially ActionPhaseController
 * to execute gameCommands and convert results to specialEffects format for OutcomeDisplay.
 */

import type { GameCommand } from '../../types/modifiers';
import type { SpecialEffect } from '../../types/special-effects';
import {
  createAttitudeEffect,
  createStructureDamageEffect,
  createHexRemovalEffect,
  createResourceGainEffect
} from '../../types/special-effects';

/**
 * Execute game commands from outcome data and convert results to structured specialEffects
 * 
 * @param gameCommands - Array of game commands to execute
 * @returns Array of structured SpecialEffect objects for OutcomeDisplay
 */
export async function executeGameCommands(gameCommands: GameCommand[]): Promise<SpecialEffect[]> {
  const specialEffects: SpecialEffect[] = [];
  
  console.log('🎮 [executeGameCommands] Received gameCommands:', gameCommands);
  
  if (!gameCommands || gameCommands.length === 0) {
    console.log('⚠️ [executeGameCommands] No game commands to execute');
    return specialEffects;
  }
  
  const { createGameCommandsResolver } = await import('../../services/GameCommandsResolver');
  const resolver = await createGameCommandsResolver();
  
  for (const command of gameCommands) {
    console.log('🎮 [executeGameCommands] Processing command:', command);
    if (command.type === 'damageStructure') {
      const result = await resolver.damageStructure(
        (command as any).targetStructure,
        (command as any).settlementId,
        (command as any).count
      );
      
      // Convert damage results to structured effects
      if (result.success && result.data?.damagedStructures) {
        for (const damaged of result.data.damagedStructures) {
          specialEffects.push(
            createStructureDamageEffect(damaged.name, damaged.settlement)
          );
        }
      }
    } else if (command.type === 'removeBorderHexes') {
      const cmd = command as any;
      const result = await resolver.removeBorderHexes(
        cmd.count,
        cmd.dice
      );
      
      // Convert removal results to structured effects
      if (result.success && result.data?.count) {
        specialEffects.push(
          createHexRemovalEffect(result.data.count)
        );
      }
    } else if (command.type === 'adjustFactionAttitude') {
      const cmd = command as any;
      const result = await resolver.adjustFactionAttitude(
        cmd.factionId || null,
        cmd.steps,
        {
          maxLevel: cmd.maxLevel,
          minLevel: cmd.minLevel,
          count: cmd.count
        }
      );
      
      // Convert attitude change results to structured effects
      if (result.success && result.data?.factions) {
        for (const faction of result.data.factions) {
          specialEffects.push(
            createAttitudeEffect(
              faction.factionName,
              faction.oldAttitude,
              faction.newAttitude,
              cmd.steps
            )
          );
        }
      }
    } else if (command.type === 'chooseAndGainResource') {
      const cmd = command as any;
      const result = await resolver.chooseAndGainResource(
        cmd.resources,
        cmd.amount
      );
      
      // Convert resource gain results to structured effects
      if (result.success && result.data?.resource && result.data?.amount) {
        specialEffects.push(
          createResourceGainEffect(result.data.resource, result.data.amount)
        );
      }
    }
    // Future command types will be handled here (claimHex, recruitArmy, etc.)
  }
  
  return specialEffects;
}
