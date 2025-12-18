/**
 * AdjustFaction Command Handler
 *
 * Handles faction attitude adjustments for both actions and events.
 *
 * Usage:
 * - For actions with specific faction: Pass factionId in command or context
 * - For events with random faction: Pass factionId: 'random' in command
 * - For user selection: Pass factionId: null in command
 */

import { BaseGameCommandHandler } from '../GameCommandHandler';
import type { GameCommandContext } from '../GameCommandHandler';
import type { PreparedCommand } from '../../../types/game-commands';

export class AdjustFactionHandler extends BaseGameCommandHandler {
  canHandle(command: any): boolean {
    return command.type === 'adjustFactionAttitude' ||
           command.type === 'requestMilitaryAidFactionAttitude';
  }

  async prepare(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null> {
    const { adjustFactionAttitude } = await import('../../commands/factions/attitudeCommands');

    // Get factionId from command OR from explicit context OR from metadata
    // Default to 'random' if not specified (for events)
    const factionId = command.factionId !== undefined 
      ? command.factionId 
      : (ctx.pendingState?.factionId || ctx.metadata?.factionId || 'random');

    const steps = command.steps || -1;

    // Call command to prepare
    const result = await adjustFactionAttitude(
      factionId,
      steps,
      {
        maxLevel: command.maxLevel,
        minLevel: command.minLevel,
        count: command.count
      }
    );

    // If result is a PreparedCommand, wrap its commit to preserve faction context
    if (result && 'commit' in result) {
      const originalCommit = result.commit;
      return {
        ...result,
        commit: async () => {
          // Execute with captured faction context
          await originalCommit();
        }
      };
    }

    return this.normalizeResult(result, `Faction attitude adjusted`);
  }
}
