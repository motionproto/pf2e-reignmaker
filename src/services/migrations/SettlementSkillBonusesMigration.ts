/**
 * Migration: Add skillBonuses to existing settlements
 * 
 * This migration ensures all settlements have their skillBonuses calculated
 * based on their existing structures.
 */

import { getKingdomActor, updateKingdom } from '../../stores/KingdomStore';
import { settlementService } from '../settlements';
import { logger } from '../../utils/Logger';

/**
 * Check if migration is needed
 */
export function needsSkillBonusesMigration(): boolean {
  const actor = getKingdomActor();
  if (!actor) return false;
  
  const kingdom = actor.getKingdomData();
  if (!kingdom) return false;
  
  // Check if any settlement is missing skillBonuses
  return kingdom.settlements.some(s => !s.skillBonuses);
}

/**
 * Migrate all settlements to have skillBonuses
 */
export async function migrateSettlementSkillBonuses(): Promise<void> {
  const actor = getKingdomActor();
  if (!actor) {
    logger.warn('[Migration] No kingdom actor found');
    return;
  }
  
  const kingdom = actor.getKingdomData();
  if (!kingdom) {
    logger.warn('[Migration] No kingdom data found');
    return;
  }
  
  const settlementsToMigrate = kingdom.settlements.filter(s => !s.skillBonuses);
  
  if (settlementsToMigrate.length === 0) {

    return;
  }

  await updateKingdom(k => {
    for (const settlement of k.settlements) {
      if (!settlement.skillBonuses) {
        // Calculate skill bonuses from structures
        settlement.skillBonuses = settlementService.calculateSkillBonuses(settlement);

      }
    }
  });

}

/**
 * Auto-run migration if needed
 */
export async function autoMigrateSettlements(): Promise<void> {
  if (needsSkillBonusesMigration()) {

    await migrateSettlementSkillBonuses();
  }
}
