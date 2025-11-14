/**
 * Unrest Commands - Imprisoned Unrest Management
 * 
 * Handles:
 * - Reducing imprisoned unrest from settlements (Execute/Pardon Prisoners)
 * - Releasing imprisoned unrest back to regular unrest (prison breaks, riots)
 */

import { updateKingdom, getKingdomActor } from '../../../stores/KingdomStore';
import { logger } from '../../../utils/Logger';
import type { ResolveResult } from '../types';

/**
 * Reduce Imprisoned - Remove imprisoned unrest from a settlement
 * Used by Execute or Pardon Prisoners action
 * 
 * @param settlementId - Settlement ID containing prisoners
 * @param amount - Amount to reduce ('all', dice formula like '1d4', or numeric value)
 * @returns ResolveResult with amount reduced
 */
export async function reduceImprisoned(settlementId: string, amount: string | number): Promise<ResolveResult> {
  logger.info(`⚖️ [reduceImprisoned] Reducing imprisoned unrest in settlement ${settlementId} by ${amount}`);
  
  try {
    const actor = getKingdomActor();
    if (!actor) {
      return { success: false, error: 'No kingdom actor available' };
    }

    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      return { success: false, error: 'No kingdom data available' };
    }

    // Find the settlement
    const settlement = kingdom.settlements?.find((s: any) => s.id === settlementId);
    if (!settlement) {
      return { success: false, error: `Settlement ${settlementId} not found` };
    }

    const currentImprisoned = settlement.imprisonedUnrest || 0;
    if (currentImprisoned === 0) {
      return { success: false, error: `${settlement.name} has no imprisoned unrest` };
    }

    let amountToReduce = 0;

    // Handle different amount types
    if (amount === 'all') {
      amountToReduce = currentImprisoned;
    } else if (typeof amount === 'number') {
      // Already rolled - use the value directly
      amountToReduce = Math.min(amount, currentImprisoned);
    } else if (amount.includes('d')) {
      // Dice formula (e.g., '1d4') - should not happen with new system, but kept for compatibility
      const roll = new Roll(amount);
      await roll.evaluate();
      amountToReduce = Math.min(roll.total || 0, currentImprisoned);
      
      // Show dice roll in chat
      await roll.toMessage({
        flavor: `Imprisoned Unrest Reduced in ${settlement.name}`,
        speaker: { alias: 'Kingdom' }
      });
    } else {
      // Numeric string
      amountToReduce = Math.min(parseInt(amount, 10), currentImprisoned);
    }

    // Update settlement imprisoned unrest
    await updateKingdom(kingdom => {
      const settlement = kingdom.settlements?.find(s => s.id === settlementId);
      if (settlement) {
        settlement.imprisonedUnrest = Math.max(0, (settlement.imprisonedUnrest || 0) - amountToReduce);
      }
    });

    logger.info(`✅ [reduceImprisoned] Reduced ${amountToReduce} imprisoned unrest in ${settlement.name}`);

    return {
      success: true,
      data: {
        settlementName: settlement.name,
        amountReduced: amountToReduce,
        remainingImprisoned: Math.max(0, currentImprisoned - amountToReduce),
        message: `Reduced ${amountToReduce} imprisoned unrest in ${settlement.name}`
      }
    };

  } catch (error) {
    logger.error('❌ [reduceImprisoned] Failed to reduce imprisoned unrest:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Release Imprisoned Unrest - Convert imprisoned unrest back to regular unrest
 * Used by incidents like prison breaks
 * 
 * @param percentage - Percentage to release (0.5 = half, 1 or 'all' = all)
 * @returns ResolveResult with release details
 */
export async function releaseImprisoned(percentage: number | 'all'): Promise<ResolveResult> {
  logger.info(`🔓 [releaseImprisoned] Releasing ${percentage === 'all' ? 'all' : percentage * 100 + '%'} imprisoned unrest`);
  
  try {
    const actor = getKingdomActor();
    if (!actor) {
      return { success: false, error: 'No kingdom actor available' };
    }

    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      return { success: false, error: 'No kingdom data available' };
    }

    // Calculate total imprisoned unrest across all settlements
    let totalImprisoned = 0;
    for (const settlement of kingdom.settlements || []) {
      totalImprisoned += settlement.imprisonedUnrest || 0;
    }

    if (totalImprisoned === 0) {
      return { 
        success: true, 
        data: { 
          message: 'No imprisoned unrest to release',
          released: 0
        } 
      };
    }

    // Calculate amount to release
    const releasePercentage = percentage === 'all' ? 1 : percentage;
    const amountToRelease = Math.floor(totalImprisoned * releasePercentage);

    if (amountToRelease === 0) {
      return { 
        success: true, 
        data: { 
          message: 'No imprisoned unrest to release (rounded down to 0)',
          released: 0
        } 
      };
    }

    // Release imprisoned unrest from settlements and convert to regular unrest
    await updateKingdom(k => {
      let remaining = amountToRelease;
      
      // Release from each settlement proportionally
      for (const settlement of k.settlements || []) {
        if (remaining <= 0) break;
        
        const currentImprisoned = settlement.imprisonedUnrest || 0;
        if (currentImprisoned === 0) continue;
        
        const toRelease = Math.min(remaining, Math.ceil(currentImprisoned * releasePercentage));
        settlement.imprisonedUnrest = Math.max(0, currentImprisoned - toRelease);
        remaining -= toRelease;
        
        logger.info(`  🔓 Released ${toRelease} imprisoned unrest from ${settlement.name}`);
      }
      
      // Add released unrest to kingdom unrest
      k.unrest = (k.unrest || 0) + amountToRelease;
      logger.info(`  ⚠️ Added ${amountToRelease} to kingdom unrest (now ${k.unrest})`);
    });

    return {
      success: true,
      data: {
        released: amountToRelease,
        message: `Released ${amountToRelease} imprisoned unrest (${Math.round(releasePercentage * 100)}% of ${totalImprisoned})`
      }
    };

  } catch (error) {
    logger.error('❌ [releaseImprisoned] Failed to release imprisoned unrest:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
