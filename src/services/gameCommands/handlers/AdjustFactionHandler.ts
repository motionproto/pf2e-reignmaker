/**
 * AdjustFaction Command Handler
 *
 * Handles faction attitude adjustments for actions that target a specific faction
 * (diplomatic missions, request aid, etc.)
 *
 * NOTE: For events that adjust a random faction, use the pattern in preview.calculate():
 *   1. Select random eligible faction
 *   2. Use adjustAttitudeBySteps() to calculate new attitude
 *   3. Store in ctx.metadata._factionAdjustment
 *   4. Create textBadge with faction name and attitude change
 *   5. In execute(), call factionService.adjustAttitude()
 *
 * See diplomaticMission.ts or feud.ts for examples.
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
    const factionId = command.factionId ||
                      ctx.pendingState?.factionId ||
                      ctx.metadata?.factionId;

    if (!factionId) {
      console.error('[AdjustFactionHandler] No faction selected for attitude adjustment');
      throw new Error('Faction attitude adjustment requires faction selection - ensure faction context is provided');
    }

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
