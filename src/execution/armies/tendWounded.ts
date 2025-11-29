/**
 * tendWounded execution function
 *
 * Heals wounded armies or removes negative conditions.
 */

import { logger } from '../../utils/Logger';
import { getKingdomActor } from '../../stores/KingdomStore';
import { armyService } from '../../services/army';

/**
 * Execute army healing/recovery
 *
 * @param armyId - ID of army to heal
 * @param outcome - Action outcome for determining healing effect
 * @param selectedOption - Player's choice: 'heal' or 'remove-condition' (only for success)
 * @param conditionToRemove - Condition slug to remove (only if selectedOption is 'remove-condition')
 */
export async function tendWoundedExecution(
  armyId: string,
  outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
  selectedOption?: 'heal' | 'remove-condition',
  conditionToRemove?: string
): Promise<void> {
  logger.info(`🏥 [tendWoundedExecution] Tending wounded army ${armyId} (${outcome})`);

  const actor = getKingdomActor();
  if (!actor) {
    throw new Error('No kingdom actor available');
  }

  const kingdom = actor.getKingdomData();
  if (!kingdom) {
    throw new Error('No kingdom data available');
  }

  // Get army for accessing NPC actor
  const army = kingdom.armies?.find((a: any) => a.id === armyId);
  if (!army?.actorId) {
    logger.warn(`⚠️ [tendWoundedExecution] Army ${armyId} has no linked actor`);
    return;
  }

  const game = (globalThis as any).game;
  const npcActor = game?.actors?.get(army.actorId);
  if (!npcActor) {
    logger.warn(`⚠️ [tendWoundedExecution] NPC actor not found: ${army.actorId}`);
    return;
  }

  // ✅ DEBUG: Log full actor structure to understand conditions vs effects
  console.log('🔍 [tendWoundedExecution] Full actor structure:', {
    actorId: army.actorId,
    actorName: npcActor.name,
    actorType: npcActor.type,
    system: npcActor.system,
    items: Array.from(npcActor.items.values()).map((item: any) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      slug: item.system?.slug || item.slug,
      badge: item.system?.badge?.value || null,
      system: item.system
    })),
    allItems: Array.from(npcActor.items.values())
  });

  // Helper function to remove condition/effect by slug (routes through GM)
  async function removeConditionBySlug(actorId: string, slug: string): Promise<boolean> {
    const actor = game?.actors?.get(actorId) as any;
    if (!actor) {
      logger.warn(`⚠️ [tendWoundedExecution] Actor not found: ${actorId}`);
      return false;
    }

    console.log('🔍 [tendWoundedExecution] Full actor object:', actor);
    
    const items = Array.from(actor.items.values()) as any[];
    
    // Debug: Log all items to see structure
    logger.info(`🔍 [tendWoundedExecution] Searching for slug "${slug}" in ${items.length} items`);
    console.log('🔍 [tendWoundedExecution] All actor items:', items);
    
    items.forEach((i: any, idx: number) => {
      if (i.type === 'condition' || i.type === 'effect') {
        logger.info(`  Item ${idx}: name="${i.name}", type="${i.type}", slug="${i.system?.slug || 'NONE'}", id="${i.id}"`);
        console.log(`  Full item ${idx}:`, i);
      }
    });
    
    // Find item by slug
    const item = items.find((i: any) => {
      // Check both direct slug and system.slug
      const itemSlug = i.slug || i.system?.slug;
      return itemSlug === slug;
    });
    
    if (item) {
      logger.info(`🗑️ [tendWoundedExecution] Found condition to remove: "${item.name}" (slug: ${slug}, id: ${item.id})`);
      console.log('🗑️ [tendWoundedExecution] Full item to remove:', item);
      
      // ✅ Route through GM via ArmyService
      await armyService.removeItemFromArmy(actorId, item.id);
      logger.info(`✅ [tendWoundedExecution] Successfully removed condition "${item.name}"`);
      return true;
    } else {
      logger.warn(`❌ [tendWoundedExecution] No condition found with slug "${slug}"`);
      return false;
    }
  }

  // Helper function to remove all negative conditions (routes through GM)
  async function removeAllNegativeConditions(actorId: string): Promise<number> {
    const actor = game?.actors?.get(actorId) as any;
    if (!actor) {
      logger.warn(`⚠️ [tendWoundedExecution] Actor not found: ${actorId}`);
      return 0;
    }

    const items = Array.from(actor.items.values()) as any[];
    // Find all conditions/effects (items with type 'condition' or 'effect')
    const conditions = items.filter((i: any) => 
      i.type === 'condition' || i.type === 'effect'
    );

    if (conditions.length > 0) {
      // ✅ Route through GM via ArmyService (one at a time)
      for (const condition of conditions) {
        await armyService.removeItemFromArmy(actorId, condition.id);
      }
      logger.info(`🗑️ [tendWoundedExecution] Removed ${conditions.length} conditions`);
      return conditions.length;
    }

    return 0;
  }

  // Helper function to heal to full HP (routes through GM)
  async function healToFull(actorId: string): Promise<void> {
    const actor = game?.actors?.get(actorId) as any;
    if (!actor) {
      logger.warn(`⚠️ [tendWoundedExecution] Actor not found: ${actorId}`);
      return;
    }

    const maxHP = actor.system?.attributes?.hp?.max || 0;
    const currentHP = actor.system?.attributes?.hp?.value || 0;
    
    if (currentHP >= maxHP) {
      logger.info(`ℹ️ [tendWoundedExecution] Army already at full HP (${currentHP}/${maxHP})`);
      return;
    }

    logger.info(`💚 [tendWoundedExecution] Healing from ${currentHP} to ${maxHP} HP`);
    
    // ✅ Route through GM via ArmyService
    await armyService.updateArmyActor(actorId, {
      hp: {
        value: maxHP,
        max: maxHP  // Preserve max HP
      }
    });
    
    logger.info(`✅ [tendWoundedExecution] Healed army to full HP`);
  }

  // Helper function to increase enfeebled condition (routes through GM)
  async function increaseEnfeebled(actorId: string): Promise<void> {
    const actor = game?.actors?.get(actorId) as any;
    if (!actor) {
      logger.warn(`⚠️ [tendWoundedExecution] Actor not found: ${actorId}`);
      return;
    }

    // Check if enfeebled already exists
    const items = Array.from(actor.items.values()) as any[];
    const enfeebledEffect = items.find((i: any) => i.system?.slug === 'enfeebled');
    
    if (enfeebledEffect) {
      // Increase existing enfeebled value
      const currentValue = enfeebledEffect.system?.badge?.value || 1;
      const newValue = currentValue + 1;
      
      // ✅ Route through GM via ArmyService
      await armyService.updateItemOnArmy(actorId, enfeebledEffect.id, {
        'system.badge.value': newValue
      });
      
      logger.info(`⚠️ [tendWoundedExecution] Increased enfeebled from ${currentValue} to ${newValue}`);
    } else {
      // Add enfeebled 1 - ✅ Route through GM via ArmyService
      const enfeebledCondition = {
        name: 'Enfeebled',
        type: 'condition',
        img: 'systems/pf2e/icons/conditions/enfeebled.webp',
        system: {
          slug: 'enfeebled',
          badge: { value: 1 },
          description: {
            value: '<p>You\'re physically weakened.</p>'
          },
          duration: {
            value: -1,
            unit: 'unlimited',
            sustained: false,
            expiry: null
          }
        }
      };
      
      await armyService.addItemToArmy(actorId, enfeebledCondition as any);
      logger.info(`⚠️ [tendWoundedExecution] Applied enfeebled 1 condition`);
    }
  }

  // Execute based on outcome
  if (outcome === 'criticalSuccess') {
    // Full heal + remove all negative conditions
    await healToFull(army.actorId);
    const removedCount = await removeAllNegativeConditions(army.actorId);
    logger.info(`✨ [tendWoundedExecution] Critical success - healed to full and removed ${removedCount} conditions`);
    
  } else if (outcome === 'success') {
    // Player chooses: heal to full OR remove one condition
    if (selectedOption === 'heal') {
      await healToFull(army.actorId);
      logger.info(`✨ [tendWoundedExecution] Success - healed to full HP`);
    } else if (selectedOption === 'remove-condition' && conditionToRemove) {
      const removed = await removeConditionBySlug(army.actorId, conditionToRemove);
      if (removed) {
        logger.info(`✨ [tendWoundedExecution] Success - removed condition: ${conditionToRemove}`);
      } else {
        logger.warn(`⚠️ [tendWoundedExecution] Failed to remove condition: ${conditionToRemove}`);
      }
    } else {
      logger.warn(`⚠️ [tendWoundedExecution] Invalid selection for success outcome`);
    }
    
  } else if (outcome === 'failure') {
    // Nothing happens
    logger.info(`ℹ️ [tendWoundedExecution] Failure - no effect`);
    
  } else if (outcome === 'criticalFailure') {
    // Increase enfeebled by 1
    await increaseEnfeebled(army.actorId);
    logger.info(`⚠️ [tendWoundedExecution] Critical failure - increased enfeebled`);
  }

  logger.info(`✅ [tendWoundedExecution] Tend wounded complete`);
}
