/**
 * ApplyArmyCondition Command Handler
 *
 * Handles applying conditions and effects to armies.
 * Supports both PF2e conditions (sickened, enfeebled, etc.) and custom effects (well-trained, poorly-trained).
 *
 * Usage:
 * - For random army: Pass armyId: 'random' in command
 * - For specific army: Pass armyId in command
 * - Condition can be: sickened, enfeebled, frightened, clumsy, fatigued, well-trained, poorly-trained
 */

import { BaseGameCommandHandler } from '../GameCommandHandler';
import type { GameCommandContext } from '../GameCommandHandler';
import type { PreparedCommand } from '../../../types/game-commands';
import type { UnifiedOutcomeBadge } from '../../../types/OutcomeBadge';
import { PLAYER_KINGDOM } from '../../../types/ownership';

// Condition display configuration
const CONDITION_CONFIG: Record<string, {
  displayName: string;
  icon: string;
  variant: 'positive' | 'negative';
  description: string;
}> = {
  sickened: {
    displayName: 'Sickened',
    icon: 'fas fa-biohazard',
    variant: 'negative',
    description: 'gains sickened'
  },
  enfeebled: {
    displayName: 'Enfeebled',
    icon: 'fas fa-person-falling',
    variant: 'negative',
    description: 'gains enfeebled'
  },
  frightened: {
    displayName: 'Frightened',
    icon: 'fas fa-ghost',
    variant: 'negative',
    description: 'becomes frightened'
  },
  clumsy: {
    displayName: 'Clumsy',
    icon: 'fas fa-shoe-prints',
    variant: 'negative',
    description: 'becomes clumsy'
  },
  fatigued: {
    displayName: 'Fatigued',
    icon: 'fas fa-tired',
    variant: 'negative',
    description: 'becomes fatigued'
  },
  'well-trained': {
    displayName: 'Well Trained',
    icon: 'fas fa-medal',
    variant: 'positive',
    description: 'becomes Well Trained (+1 saves)'
  },
  'poorly-trained': {
    displayName: 'Poorly Trained',
    icon: 'fas fa-thumbs-down',
    variant: 'negative',
    description: 'becomes Poorly Trained (-1 saves)'
  }
};

export class ApplyArmyConditionHandler extends BaseGameCommandHandler {
  canHandle(command: any): boolean {
    return command.type === 'applyArmyCondition';
  }

  async prepare(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null> {
    const condition = command.condition;
    const value = command.value ?? 1;
    const armyId = command.armyId ?? 'random';

    // Validate condition
    const config = CONDITION_CONFIG[condition];
    if (!config) {
      console.warn(`[ApplyArmyConditionHandler] Unknown condition: ${condition}`);
      return null;
    }

    // Get player armies
    const playerArmies = ctx.kingdom.armies?.filter((a: any) =>
      a.actorId && a.ledBy === PLAYER_KINGDOM
    ) || [];

    if (playerArmies.length === 0) {
      console.warn('[ApplyArmyConditionHandler] No player armies available');
      return null;
    }

    // Select army
    let selectedArmy: any;
    if (armyId === 'random') {
      selectedArmy = playerArmies[Math.floor(Math.random() * playerArmies.length)];
    } else {
      selectedArmy = playerArmies.find((a: any) => a.actorId === armyId || a.id === armyId);
      if (!selectedArmy) {
        console.warn(`[ApplyArmyConditionHandler] Army not found: ${armyId}`);
        return null;
      }
    }

    // Generate badge
    const badge: UnifiedOutcomeBadge = {
      icon: config.icon,
      template: `${selectedArmy.name} ${config.description}`,
      variant: config.variant
    };

    // Return prepared command
    return {
      outcomeBadges: [badge],
      commit: async () => {
        const { applyArmyConditionExecution } = await import('../../../execution/armies/applyArmyCondition');
        await applyArmyConditionExecution(selectedArmy.actorId, condition, value);
      },
      metadata: {
        armyId: selectedArmy.actorId,
        armyName: selectedArmy.name,
        condition,
        value
      }
    };
  }
}
