/**
 * RandomArmyEquipment Command Handler
 * 
 * Randomly selects an army with a free equipment slot and gives them random equipment
 */

import { BaseGameCommandHandler } from '../GameCommandHandler';
import type { GameCommandContext } from '../GameCommandHandler';
import type { PreparedCommand } from '../../../types/game-commands';
import { textBadge } from '../../../types/OutcomeBadge';

export class RandomArmyEquipmentHandler extends BaseGameCommandHandler {
  canHandle(command: any): boolean {
    return command.type === 'randomArmyEquipment';
  }
  
  async prepare(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null> {
    const { get } = await import('svelte/store');
    const { kingdomData } = await import('../../../stores/KingdomStore');
    const kingdom = get(kingdomData);

    // Find player armies
    const PLAYER_KINGDOM = 'player';
    const armies = kingdom.armies?.filter((a: any) => a.ledBy === PLAYER_KINGDOM && a.actorId) || [];
    
    if (armies.length === 0) {
      return {
        commit: async () => {
          console.log('RandomArmyEquipmentHandler: No armies available');
        }
      };
    }

    // Find armies with free equipment slots
    const armiesWithFreeSlots = armies.filter((army: any) => {
      if (!army.actorId) return false;
      const actor = game.actors?.get(army.actorId);
      if (!actor) return false;
      
      // Check each equipment type for free slots
      const armor = (actor.getFlag('pf2e-reignmaker', 'armor') as number) || 0;
      const weapons = (actor.getFlag('pf2e-reignmaker', 'weapons') as number) || 0;
      const runes = (actor.getFlag('pf2e-reignmaker', 'runes') as number) || 0;
      
      // Each type can have max of 3 (approximate - adjust based on actual rules)
      const maxSlots = 3;
      return armor < maxSlots || weapons < maxSlots || runes < maxSlots;
    });

    if (armiesWithFreeSlots.length === 0) {
      return {
        commit: async () => {
          console.log('RandomArmyEquipmentHandler: No armies with free equipment slots');
        }
      };
    }

    // Randomly select an army
    const randomArmy = armiesWithFreeSlots[Math.floor(Math.random() * armiesWithFreeSlots.length)];
    if (!randomArmy.actorId) {
      return null;
    }
    const actor = game.actors?.get(randomArmy.actorId);
    
    if (!actor) {
      return null;
    }

    // Determine which equipment type to add (find first available slot)
    const armor = (actor.getFlag('pf2e-reignmaker', 'armor') as number) || 0;
    const weapons = (actor.getFlag('pf2e-reignmaker', 'weapons') as number) || 0;
    const runes = (actor.getFlag('pf2e-reignmaker', 'runes') as number) || 0;
    
    const maxSlots = 3;
    let equipmentType: string = 'armor';
    if (armor < maxSlots) {
      equipmentType = 'armor';
    } else if (weapons < maxSlots) {
      equipmentType = 'weapons';
    } else if (runes < maxSlots) {
      equipmentType = 'runes';
    }

    const message = `${randomArmy.name} receives ${equipmentType} equipment`;
    const outcomeBadge = textBadge(message, 'fas fa-shield-alt', 'positive');

    return {
      outcomeBadge,
      commit: async () => {
        // Increment the equipment counter
        const currentValue = (actor.getFlag('pf2e-reignmaker', equipmentType) as number) || 0;
        await actor.setFlag('pf2e-reignmaker', equipmentType, currentValue + 1);
        ui.notifications?.info(message);
      }
    };
  }
}
