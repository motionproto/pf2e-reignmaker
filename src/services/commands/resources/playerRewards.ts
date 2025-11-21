/**
 * Player Reward Commands
 * 
 * Handles player resource selection and personal stipend calculations:
 * - chooseAndGainResource: Player selects a resource to gain
 * - giveActorGold: Add personal stipend to player character inventory
 * - Helper functions for taxation tier and income calculations
 */

import { updateKingdom, getKingdomActor } from '../../../stores/KingdomStore';
import { logger } from '../../../utils/Logger';
import type { ResolveResult } from '../types';
import type { PreparedCommand } from '../../../types/game-commands';

/**
 * Choose And Gain Resource - Prompt player to select a resource and add it to kingdom
 * 
 * @param resources - Available resource types to choose from
 * @param amount - Amount of chosen resource to gain
 * @returns ResolveResult with resource gain details
 */
export async function chooseAndGainResource(resources: string[], amount: number): Promise<ResolveResult> {
  logger.info(`🎁 [chooseAndGainResource] Choosing resource to gain (amount: ${amount})`);
  
  try {
    const actor = getKingdomActor();
    if (!actor) {
      return { success: false, error: 'No kingdom actor available' };
    }

    // Prompt player to select resource
    const selectedResource = await new Promise<string | null>((resolve) => {
      const Dialog = (globalThis as any).Dialog;
      new Dialog({
        title: `Choose Resource to Gain`,
        content: `
          <form>
            <div class="form-group">
              <label>Select a resource to gain ${amount}:</label>
              <select name="resourceType" style="width: 100%; padding: 5px;">
                ${resources.map(r => `<option value="${r}">${r.charAt(0).toUpperCase() + r.slice(1)}</option>`).join('')}
              </select>
            </div>
          </form>
        `,
        buttons: {
          ok: {
            label: 'Confirm',
            callback: (html: any) => {
              const resourceType = html.find('[name="resourceType"]').val();
              resolve(resourceType);
            }
          },
          cancel: {
            label: 'Cancel',
            callback: () => resolve(null)
          }
        },
        default: 'ok'
      }).render(true);
    });

    if (!selectedResource) {
      return { success: false, error: 'Resource selection cancelled' };
    }

    // Add resource to kingdom
    await updateKingdom(kingdom => {
      if (!kingdom.resources) {
        kingdom.resources = {};
      }
      kingdom.resources[selectedResource] = (kingdom.resources[selectedResource] || 0) + amount;
    });

    logger.info(`✅ [chooseAndGainResource] Added ${amount} ${selectedResource} to kingdom`);

    return {
      success: true,
      data: {
        resource: selectedResource,
        amount,
        message: `Gained ${amount} ${selectedResource.charAt(0).toUpperCase() + selectedResource.slice(1)}`
      }
    };

  } catch (error) {
    logger.error('❌ [chooseAndGainResource] Failed to choose and gain resource:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Give Actor Gold - Add personal stipend to player character inventory
 * REFACTORED: Uses prepare/commit pattern
 * 
 * @param multiplier - Income multiplier (2 = double, 1 = normal, 0.5 = half)
 * @param settlementId - Settlement to calculate income from
 * @returns PreparedCommand with preview + commit function
 */
export async function giveActorGold(multiplier: number, settlementId: string): Promise<PreparedCommand> {
  logger.info(`💰 [giveActorGold] PREPARING with multiplier ${multiplier} for settlement ${settlementId}`);
  
  // PHASE 1: PREPARE - Calculate everything needed for preview (NO state changes)
  const actor = getKingdomActor();
  if (!actor) {
    throw new Error('No kingdom actor available');
  }

  const kingdom = actor.getKingdomData();
  if (!kingdom) {
    throw new Error('No kingdom data available');
  }

  // Find the settlement
  const settlement = kingdom.settlements?.find((s: any) => s.id === settlementId);
  if (!settlement) {
    throw new Error(`Settlement ${settlementId} not found`);
  }

  // Get current player's character
  const game = (globalThis as any).game;
  const currentUser = game?.user;
  if (!currentUser) {
    throw new Error('No current user found');
  }

  const character = currentUser.character;
  if (!character) {
    throw new Error('No character assigned to current user');
  }

  // Get kingdom taxation tier
  const taxationInfo = getKingdomTaxationTier(kingdom);
  if (!taxationInfo) {
    throw new Error('No taxation structures found in kingdom');
  }

  // Calculate base income from table
  const baseIncome = calculateIncome(settlement.level, taxationInfo.tier);
  if (baseIncome === 0) {
    throw new Error(`${settlement.name} (Level ${settlement.level}) is not eligible for stipends with T${taxationInfo.tier} taxation`);
  }

  // Apply multiplier and round to nearest gold
  const goldAmount = Math.round(baseIncome * multiplier);

  // Capture values in closure for commit phase
  const characterName = character.name;
  const settlementName = settlement.name;

  logger.info(`💰 [giveActorGold] PREPARED: ${characterName} will collect ${goldAmount} gp from ${settlementName}`);

  // PHASE 2: RETURN - Preview data + commit function
  return {
    outcomeBadge: {
      icon: 'fa-coins',
      template: `Collected {{value}} gp (${characterName} from ${settlementName})`,
      value: { type: 'static', amount: goldAmount },
      variant: 'positive'
    },
    commit: async () => {
      // Commit function executes when "Apply Result" is clicked
      logger.info(`💰 [giveActorGold] COMMITTING: Adding ${goldAmount} gp to ${characterName}'s inventory`);
      
      if (goldAmount > 0) {
        try {
          await character.inventory.addCoins({ gp: goldAmount });
          logger.info(`✅ [giveActorGold] Successfully added ${goldAmount} gp to ${characterName}`);
        } catch (coinError) {
          logger.error(`❌ [giveActorGold] Failed to add coins to inventory:`, coinError);
          throw new Error(`Failed to add ${goldAmount} gp to ${characterName}'s inventory: ${coinError instanceof Error ? coinError.message : 'Unknown error'}`);
        }
      }
    }
  };
}

/**
 * Helper: Get kingdom's highest taxation tier
 */
export function getKingdomTaxationTier(kingdom: any): { tier: 2 | 3 | 4; name: string } | null {
  const REVENUE_STRUCTURES = {
    'counting-house': { tier: 2, name: 'Counting House' },
    'treasury': { tier: 3, name: 'Treasury' },
    'exchequer': { tier: 4, name: 'Exchequer' }
  };

  if (!kingdom?.settlements) return null;

  let highestTier: 2 | 3 | 4 = 2;
  let highestStructureName = '';

  for (const settlement of kingdom.settlements) {
    for (const structureId of (settlement.structureIds || [])) {
      const revenueInfo = REVENUE_STRUCTURES[structureId as keyof typeof REVENUE_STRUCTURES];
      if (revenueInfo && revenueInfo.tier >= highestTier) {
        highestTier = revenueInfo.tier as 2 | 3 | 4;
        highestStructureName = revenueInfo.name;
      }
    }
  }

  return highestStructureName ? { tier: highestTier, name: highestStructureName } : null;
}

/**
 * Helper: Calculate income from settlement level and taxation tier
 */
export function calculateIncome(level: number, tier: 2 | 3 | 4): number {
  const INCOME_TABLE: { [level: number]: { t2?: number; t3?: number; t4?: number } } = {
    1: {},
    2: { t2: 3 },
    3: { t2: 5 },
    4: { t2: 7 },
    5: { t2: 9, t3: 18 },
    6: { t2: 15, t3: 30 },
    7: { t2: 20, t3: 40 },
    8: { t2: 25, t3: 50, t4: 100 },
    9: { t2: 30, t3: 60, t4: 120 },
    10: { t2: 40, t3: 80, t4: 160 },
    11: { t2: 50, t3: 100, t4: 200 },
    12: { t2: 60, t3: 120, t4: 240 },
    13: { t2: 70, t3: 140, t4: 280 },
    14: { t2: 80, t3: 160, t4: 320 },
    15: { t2: 100, t3: 200, t4: 400 },
    16: { t2: 130, t3: 260, t4: 520 },
    17: { t2: 150, t3: 300, t4: 600 },
    18: { t2: 200, t3: 400, t4: 800 },
    19: { t2: 300, t3: 600, t4: 1200 },
    20: { t2: 400, t3: 800, t4: 1600 },
  };

  const incomeRow = INCOME_TABLE[level];
  if (!incomeRow) return 0;

  const tierKey = `t${tier}` as 't2' | 't3' | 't4';
  return incomeRow[tierKey] || 0;
}
