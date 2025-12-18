/**
 * RandomArmyEquipment Command Handler
 *
 * Randomly selects armies with free equipment slots and applies equipment upgrades.
 * Uses the outfitArmy command for proper PF2e effect creation.
 *
 * Command parameters:
 * - type: 'randomArmyEquipment'
 * - count: number of armies to equip (default: 1)
 * - equipmentType: 'armor' | 'runes' | 'weapons' | 'equipment' | 'random' (default: 'random')
 */

import { BaseGameCommandHandler } from '../GameCommandHandler';
import type { GameCommandContext } from '../GameCommandHandler';
import type { PreparedCommand } from '../../../types/game-commands';
import type { OutcomeBadge } from '../../../types/OutcomeBadge';
import { textBadge } from '../../../types/OutcomeBadge';
import { outfitArmy } from '../../commands/armies/outfitArmy';
import { getEquipmentDisplayName } from '../../commands/armies/armyCommands';
import { logger } from '../../../utils/Logger';

const PLAYER_KINGDOM = 'player';

interface EquipmentSlots {
  armor?: boolean;
  runes?: boolean;
  weapons?: boolean;
  equipment?: boolean;
}

interface ArmyWithSlots {
  id: string;
  name: string;
  actorId: string;
  equipment?: EquipmentSlots;
  availableSlots: string[];
}

export class RandomArmyEquipmentHandler extends BaseGameCommandHandler {
  canHandle(command: any): boolean {
    return command.type === 'randomArmyEquipment';
  }

  async prepare(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null> {
    const { get } = await import('svelte/store');
    const { kingdomData } = await import('../../../stores/KingdomStore');
    const kingdom = get(kingdomData);

    const count = command.count || 1;
    const requestedType = command.equipmentType || 'random';

    // Find player armies with linked actors
    const armies = kingdom.armies?.filter((a: any) =>
      a.ledBy === PLAYER_KINGDOM && a.actorId
    ) || [];

    if (armies.length === 0) {
      logger.info('[RandomArmyEquipmentHandler] No player armies available');
      return {
        outcomeBadges: [textBadge('No armies available for equipment', 'fas fa-times', 'neutral')],
        commit: async () => {
          logger.info('[RandomArmyEquipmentHandler] No armies available - no equipment granted');
        }
      };
    }

    // Find armies with available equipment slots
    const armiesWithSlots: ArmyWithSlots[] = armies.map((army: any) => {
      const equipment: EquipmentSlots = army.equipment || {};
      const availableSlots = ['armor', 'runes', 'weapons', 'equipment'].filter(
        slot => !equipment[slot as keyof EquipmentSlots]
      );
      return {
        id: army.id,
        name: army.name,
        actorId: army.actorId,
        equipment,
        availableSlots
      };
    }).filter((a: ArmyWithSlots) => a.availableSlots.length > 0);

    if (armiesWithSlots.length === 0) {
      logger.info('[RandomArmyEquipmentHandler] All armies fully equipped');
      return {
        outcomeBadges: [textBadge('All armies fully equipped', 'fas fa-check', 'neutral')],
        commit: async () => {
          logger.info('[RandomArmyEquipmentHandler] All armies fully equipped - no equipment granted');
        }
      };
    }

    // Select random armies and equipment
    const selections: { army: ArmyWithSlots; equipmentType: string }[] = [];
    const usedArmies = new Set<string>();

    for (let i = 0; i < count && armiesWithSlots.length > usedArmies.size; i++) {
      // Filter to armies not yet selected
      const available = armiesWithSlots.filter(a => !usedArmies.has(a.id));
      if (available.length === 0) break;

      const randomArmy = available[Math.floor(Math.random() * available.length)];
      usedArmies.add(randomArmy.id);

      // Select equipment type
      let selectedType: string;
      if (requestedType === 'random') {
        selectedType = randomArmy.availableSlots[
          Math.floor(Math.random() * randomArmy.availableSlots.length)
        ];
      } else if (randomArmy.availableSlots.includes(requestedType)) {
        selectedType = requestedType;
      } else {
        // Requested type not available, pick random available slot
        selectedType = randomArmy.availableSlots[
          Math.floor(Math.random() * randomArmy.availableSlots.length)
        ];
      }

      selections.push({ army: randomArmy, equipmentType: selectedType });
    }

    if (selections.length === 0) {
      return {
        outcomeBadges: [textBadge('No suitable armies for equipment', 'fas fa-times', 'neutral')],
        commit: async () => {
          logger.info('[RandomArmyEquipmentHandler] No suitable armies found');
        }
      };
    }

    // Generate outcome badges showing what will be equipped
    const outcomeBadges: OutcomeBadge[] = selections.map(({ army, equipmentType }) => {
      const equipmentName = getEquipmentDisplayName(equipmentType);
      return textBadge(
        `${army.name} receives ${equipmentName}`,
        'fas fa-shield-alt',
        'positive'
      );
    });

    // Store prepared commands for commit
    const preparedCommands: PreparedCommand[] = [];
    for (const { army, equipmentType } of selections) {
      const prepared = await outfitArmy(army.id, equipmentType, 'success', false);
      preparedCommands.push(prepared);
    }

    return {
      outcomeBadges,
      commit: async () => {
        for (const prepared of preparedCommands) {
          if (prepared?.commit) {
            await prepared.commit();
          }
        }
        logger.info(`[RandomArmyEquipmentHandler] Equipped ${selections.length} armies with equipment`);
      }
    };
  }
}
