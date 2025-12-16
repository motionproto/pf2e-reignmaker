/**
 * BuildKnowledgeStructure Command Handler
 * 
 * Randomly selects a settlement and builds the next available Knowledge & Magic structure tier
 */

import { BaseGameCommandHandler } from '../GameCommandHandler';
import type { GameCommandContext } from '../GameCommandHandler';
import type { PreparedCommand } from '../../../types/game-commands';
import { textBadge } from '../../../types/OutcomeBadge';

export class BuildKnowledgeStructureHandler extends BaseGameCommandHandler {
  canHandle(command: any): boolean {
    return command.type === 'buildKnowledgeStructure';
  }
  
  async prepare(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null> {
    const { get } = await import('svelte/store');
    const { kingdomData } = await import('../../../stores/KingdomStore');
    const kingdom = get(kingdomData);

    // Find player settlements
    const PLAYER_KINGDOM = 'player';
    const settlements = kingdom.settlements?.filter((s: any) => s.ledBy === PLAYER_KINGDOM) || [];
    
    if (settlements.length === 0) {
      return {
        commit: async () => {
          console.log('BuildKnowledgeStructureHandler: No settlements to build in');
        }
      };
    }

    // Randomly select a settlement
    const randomSettlement = settlements[Math.floor(Math.random() * settlements.length)];
    
    // Get all structures from data files
    const knowledgeStructures = await this.loadKnowledgeStructures();
    
    // Find next available tier that can be built in this settlement
    const availableStructure = knowledgeStructures.find((struct: any) => {
      // Check if settlement meets level requirement
      const meetsLevel = randomSettlement.level >= struct.minLevel;
      
      // Check if not already built
      const alreadyBuilt = randomSettlement.structureIds?.includes(struct.id);
      
      return meetsLevel && !alreadyBuilt;
    });

    if (!availableStructure) {
      return {
        commit: async () => {
          console.log('BuildKnowledgeStructureHandler: No available Knowledge & Magic structures to build');
        }
      };
    }

    const message = `${randomSettlement.name} gains ${availableStructure.name}`;
    const outcomeBadge = textBadge(message, 'fas fa-building', 'positive');

    return {
      outcomeBadge,
      commit: async () => {
        const { settlementService } = await import('../../settlements/index');
        await settlementService.addStructure(randomSettlement.id, availableStructure.id);
        ui.notifications?.info(message);
      }
    };
  }

  private async loadKnowledgeStructures(): Promise<any[]> {
    // Import the Knowledge & Magic structures data
    const response = await fetch('modules/pf2e-reignmaker/data/structures/skill-knowledge-magic.json');
    const data = await response.json();
    
    // Extract structures and sort by minimum level (tier)
    const structures = data.structures || [];
    return structures.sort((a: any, b: any) => {
      const aLevel = a.minLevel || 1;
      const bLevel = b.minLevel || 1;
      return aLevel - bLevel;
    });
  }
}
