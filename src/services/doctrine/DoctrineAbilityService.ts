/**
 * DoctrineAbilityService
 *
 * Manages automatic granting and removal of abilities on army actors
 * based on current doctrine state. Abilities are synced whenever
 * doctrine values change.
 */

import { get } from 'svelte/store';
import { kingdomData, getKingdomActor } from '../../stores/KingdomStore';
import { doctrineService } from './DoctrineService';
import { armyService } from '../army/index';
import {
  DOCTRINE_ABILITY_MAPPINGS,
  getActiveAbilities,
  getDoctrineAbilitySlug,
  DOCTRINE_ABILITY_SLUG_PREFIX,
  type DoctrineAbilityConfig
} from '../../constants/doctrineAbilityMappings';
import type { DoctrineType } from '../../types/Doctrine';
import type { Army } from '../../models/Army';
import { logger } from '../../utils/Logger';
import { DOCTRINE_ABILITIES } from '../../data/abilities';

/**
 * DoctrineAbilityService class - singleton pattern
 */
class DoctrineAbilityService {
  private static instance: DoctrineAbilityService;

  static getInstance(): DoctrineAbilityService {
    if (!DoctrineAbilityService.instance) {
      DoctrineAbilityService.instance = new DoctrineAbilityService();
    }
    return DoctrineAbilityService.instance;
  }

  /**
   * Sync doctrine abilities to all player kingdom armies
   * Called after doctrine values change
   */
  async syncAbilitiesToAllArmies(): Promise<void> {
    const kingdom = get(kingdomData);
    if (!kingdom?.armies) {
      logger.info('[DoctrineAbilityService] No armies to sync');
      return;
    }

    // Get current active abilities based on doctrine state
    const state = doctrineService.getDoctrineState();
    const activeAbilities = getActiveAbilities(
      state.values,
      state.dominant,
      doctrineService.getTierForValue.bind(doctrineService),
      doctrineService.tierMeetsMinimum.bind(doctrineService)
    );

    logger.info(`[DoctrineAbilityService] Active abilities: ${activeAbilities.map(a => a.name).join(', ') || 'none'}`);

    // Get player kingdom armies only
    const playerArmies = kingdom.armies.filter((army: Army) =>
      army.ledBy === 'player' || army.ledBy === 'PLAYER_KINGDOM'
    );

    if (playerArmies.length === 0) {
      logger.info('[DoctrineAbilityService] No player armies to sync');
      return;
    }

    // Sync each army
    for (const army of playerArmies) {
      if (!army.actorId) {
        logger.warn(`[DoctrineAbilityService] Army ${army.name} has no linked actor, skipping`);
        continue;
      }

      try {
        await this.syncAbilitiesToArmy(army.actorId, activeAbilities);
      } catch (error) {
        logger.error(`[DoctrineAbilityService] Failed to sync abilities to ${army.name}:`, error);
      }
    }
  }

  /**
   * Sync doctrine abilities to a specific army actor
   */
  async syncAbilitiesToArmy(actorId: string, activeAbilities?: DoctrineAbilityConfig[]): Promise<void> {
    const game = (globalThis as any).game;
    const actor = game?.actors?.get(actorId);

    if (!actor) {
      logger.warn(`[DoctrineAbilityService] Actor not found: ${actorId}`);
      return;
    }

    // Get active abilities if not provided
    if (!activeAbilities) {
      const state = doctrineService.getDoctrineState();
      activeAbilities = getActiveAbilities(
        state.values,
        state.dominant,
        doctrineService.getTierForValue.bind(doctrineService),
        doctrineService.tierMeetsMinimum.bind(doctrineService)
      );
    }

    // Get current doctrine abilities on the actor
    const currentDoctrineItems = actor.items.filter((item: any) =>
      item.system?.slug?.startsWith(DOCTRINE_ABILITY_SLUG_PREFIX)
    );

    const currentSlugs = new Set(currentDoctrineItems.map((item: any) => item.system.slug));
    const targetSlugs = new Set(activeAbilities.map(a => getDoctrineAbilitySlug(a.id)));

    // Remove abilities that should no longer be present
    const toRemove = currentDoctrineItems.filter((item: any) =>
      !targetSlugs.has(item.system.slug)
    );

    for (const item of toRemove) {
      logger.info(`[DoctrineAbilityService] Removing ${item.name} from ${actor.name}`);
      await armyService.removeItemFromArmy(actorId, item.id);
    }

    // Add abilities that should be present but aren't
    const toAdd = activeAbilities.filter(ability =>
      !currentSlugs.has(getDoctrineAbilitySlug(ability.id))
    );

    for (const ability of toAdd) {
      try {
        const itemData = await this.getAbilityItemData(ability);
        if (itemData) {
          logger.info(`[DoctrineAbilityService] Adding ${ability.name} to ${actor.name}`);
          await armyService.addItemToArmy(actorId, itemData);
        }
      } catch (error) {
        logger.error(`[DoctrineAbilityService] Failed to add ${ability.name} to ${actor.name}:`, error);
      }
    }
  }

  /**
   * Get the item data for an ability from local TypeScript definitions
   */
  private getAbilityItemData(ability: DoctrineAbilityConfig): any | null {
    const data = DOCTRINE_ABILITIES[ability.sourceId];
    if (!data) {
      logger.error(`[DoctrineAbilityService] Ability not found: ${ability.sourceId}`);
      return null;
    }

    // Clone and modify for doctrine tracking
    const itemData = JSON.parse(JSON.stringify(data));
    itemData.system.slug = getDoctrineAbilitySlug(ability.id);

    // Add doctrine source to description
    const doctrineLabel = ability.doctrine.charAt(0).toUpperCase() + ability.doctrine.slice(1);
    const sourceNote = `<p><em>Granted by ${doctrineLabel} doctrine</em></p>`;
    itemData.system.description.value = sourceNote + itemData.system.description.value;

    return itemData;
  }

  /**
   * Get all abilities that would be active for a given doctrine state
   * Useful for previewing what abilities an army would receive
   */
  getActiveAbilitiesForState(
    doctrineValues: Record<DoctrineType, number>,
    dominant: DoctrineType | null
  ): DoctrineAbilityConfig[] {
    return getActiveAbilities(
      doctrineValues,
      dominant,
      doctrineService.getTierForValue.bind(doctrineService),
      doctrineService.tierMeetsMinimum.bind(doctrineService)
    );
  }

  /**
   * Get all available doctrine abilities (for UI display)
   */
  getAllAbilities(): DoctrineAbilityConfig[] {
    return [...DOCTRINE_ABILITY_MAPPINGS];
  }
}

// Export singleton instance
export const doctrineAbilityService = DoctrineAbilityService.getInstance();

// Export class for testing
export { DoctrineAbilityService };
