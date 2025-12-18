/**
 * GrantStructure Command Handler
 *
 * Grants a structure to a settlement. Supports multiple selection modes:
 * - Specific structure by ID
 * - Random structure from a category (with optional tier progression)
 * - Random structure from any category
 *
 * Command parameters:
 * - type: 'grantStructure'
 * - structureId?: string - Specific structure ID to grant
 * - category?: string - Structure category to pick from (e.g., 'knowledge-magic', 'commerce')
 * - settlementId?: string - Specific settlement ID or 'random' (default: 'random')
 * - useProgression?: boolean - Use tier progression within category (default: true)
 * - count?: number - Number of structures to grant (default: 1)
 */

import { BaseGameCommandHandler } from '../GameCommandHandler';
import type { GameCommandContext } from '../GameCommandHandler';
import type { PreparedCommand } from '../../../types/game-commands';
import type { OutcomeBadge } from '../../../types/OutcomeBadge';
import { textBadge } from '../../../types/OutcomeBadge';
import { logger } from '../../../utils/Logger';

const PLAYER_KINGDOM = 'player';

interface StructureSelection {
  structureId: string;
  structureName: string;
  settlementId: string;
  settlementName: string;
}

export class GrantStructureHandler extends BaseGameCommandHandler {
  canHandle(command: any): boolean {
    return command.type === 'grantStructure' || command.type === 'buildKnowledgeStructure';
  }

  async prepare(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null> {
    const { get } = await import('svelte/store');
    const { kingdomData } = await import('../../../stores/KingdomStore');
    const { structuresService } = await import('../../structures');
    const kingdom = get(kingdomData);

    // Find player settlements
    const settlements = kingdom.settlements?.filter((s: any) => s.ledBy === PLAYER_KINGDOM) || [];

    if (settlements.length === 0) {
      logger.info('[GrantStructureHandler] No settlements available');
      return {
        outcomeBadges: [textBadge('No settlements available', 'fas fa-times', 'neutral')],
        commit: async () => {
          logger.info('[GrantStructureHandler] No settlements to build in');
        }
      };
    }

    const count = command.count || 1;
    const selections: StructureSelection[] = [];
    const usedSettlements = new Set<string>();

    // Handle legacy 'buildKnowledgeStructure' command type
    const category = command.type === 'buildKnowledgeStructure'
      ? 'knowledge-magic'
      : command.category;

    for (let i = 0; i < count; i++) {
      const selection = await this.selectStructureAndSettlement(
        command,
        settlements,
        usedSettlements,
        structuresService,
        category
      );

      if (selection) {
        selections.push(selection);
        // For single-structure-per-settlement mode, track used settlements
        if (!command.allowMultiplePerSettlement) {
          usedSettlements.add(selection.settlementId);
        }
      }
    }

    if (selections.length === 0) {
      return {
        outcomeBadges: [textBadge('No suitable structures available', 'fas fa-times', 'neutral')],
        commit: async () => {
          logger.info('[GrantStructureHandler] No structures could be granted');
        }
      };
    }

    // Generate outcome badges
    const outcomeBadges: OutcomeBadge[] = selections.map(({ structureName, settlementName }) =>
      textBadge(`${settlementName} gains ${structureName}`, 'fas fa-building', 'positive')
    );

    return {
      outcomeBadges,
      commit: async () => {
        const { settlementService } = await import('../../settlements');

        for (const { structureId, structureName, settlementId, settlementName } of selections) {
          await settlementService.addStructure(settlementId, structureId);
          logger.info(`[GrantStructureHandler] Added ${structureName} to ${settlementName}`);
        }

        const ui = (globalThis as any).ui;
        if (selections.length === 1) {
          ui?.notifications?.info(`${selections[0].settlementName} gains ${selections[0].structureName}`);
        } else {
          ui?.notifications?.info(`Granted ${selections.length} structures to settlements`);
        }
      }
    };
  }

  private async selectStructureAndSettlement(
    command: any,
    settlements: any[],
    usedSettlements: Set<string>,
    structuresService: any,
    category?: string
  ): Promise<StructureSelection | null> {
    // Select settlement
    let targetSettlement: any;

    if (command.settlementId && command.settlementId !== 'random') {
      targetSettlement = settlements.find((s: any) => s.id === command.settlementId);
      if (!targetSettlement) {
        logger.warn(`[GrantStructureHandler] Settlement not found: ${command.settlementId}`);
        return null;
      }
    } else {
      // Random settlement (excluding already used ones)
      const availableSettlements = settlements.filter((s: any) => !usedSettlements.has(s.id));
      if (availableSettlements.length === 0) {
        return null;
      }
      targetSettlement = availableSettlements[Math.floor(Math.random() * availableSettlements.length)];
    }

    // Select structure
    let structure: any;

    if (command.structureId) {
      // Specific structure
      structure = structuresService.getStructure(command.structureId);
      if (!structure) {
        logger.warn(`[GrantStructureHandler] Structure not found: ${command.structureId}`);
        return null;
      }

      // Check if already built in this settlement
      if (targetSettlement.structureIds?.includes(structure.id)) {
        logger.info(`[GrantStructureHandler] ${structure.name} already built in ${targetSettlement.name}`);
        return null;
      }
    } else if (category) {
      // Category-based selection with progression
      structure = this.selectFromCategory(
        category,
        targetSettlement,
        structuresService,
        command.useProgression !== false
      );
    } else {
      // Random structure from any category
      structure = this.selectRandomStructure(targetSettlement, structuresService);
    }

    if (!structure) {
      return null;
    }

    return {
      structureId: structure.id,
      structureName: structure.name,
      settlementId: targetSettlement.id,
      settlementName: targetSettlement.name
    };
  }

  private selectFromCategory(
    category: string,
    settlement: any,
    structuresService: any,
    useProgression: boolean
  ): any | null {
    // Get all structures in this category
    const categoryStructures = structuresService.getAllStructures()
      .filter((s: any) => s.category === category)
      .sort((a: any, b: any) => a.tier - b.tier);

    if (categoryStructures.length === 0) {
      logger.warn(`[GrantStructureHandler] No structures found in category: ${category}`);
      return null;
    }

    if (useProgression) {
      // Find the next unbuilt structure in the progression
      for (const structure of categoryStructures) {
        // Check level requirement
        if (structure.minLevel && settlement.level < structure.minLevel) {
          continue;
        }

        // Check if already built
        if (settlement.structureIds?.includes(structure.id)) {
          continue;
        }

        return structure;
      }

      logger.info(`[GrantStructureHandler] All ${category} structures built or settlement level too low`);
      return null;
    } else {
      // Random structure from category (not already built)
      const available = categoryStructures.filter((s: any) => {
        if (s.minLevel && settlement.level < s.minLevel) return false;
        if (settlement.structureIds?.includes(s.id)) return false;
        return true;
      });

      if (available.length === 0) {
        return null;
      }

      return available[Math.floor(Math.random() * available.length)];
    }
  }

  private selectRandomStructure(settlement: any, structuresService: any): any | null {
    // Get all base structures (tier 1) that aren't built yet
    const allStructures = structuresService.getBaseStructures()
      .filter((s: any) => {
        if (s.minLevel && settlement.level < s.minLevel) return false;
        if (settlement.structureIds?.includes(s.id)) return false;
        return true;
      });

    if (allStructures.length === 0) {
      // Try tier 2+ structures
      const higherTier = structuresService.getAllStructures()
        .filter((s: any) => {
          if (s.tier <= 1) return false;
          if (s.minLevel && settlement.level < s.minLevel) return false;
          if (settlement.structureIds?.includes(s.id)) return false;
          return true;
        });

      if (higherTier.length === 0) {
        logger.info(`[GrantStructureHandler] No available structures for ${settlement.name}`);
        return null;
      }

      return higherTier[Math.floor(Math.random() * higherTier.length)];
    }

    return allStructures[Math.floor(Math.random() * allStructures.length)];
  }
}
