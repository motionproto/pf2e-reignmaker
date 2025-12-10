/**
 * Kingdom Actor Permissions Utility
 * 
 * Ensures all players have OWNER permission on party actors with kingdom data.
 * This is required for collaborative kingdom management.
 */

import { logger } from './Logger';

declare const game: any;
declare const ui: any;
declare const CONST: any;

/**
 * Ensure all players have OWNER permission on a party actor
 * Only works when called by a GM
 * 
 * @param actor - The party actor to update permissions for
 * @returns Promise<boolean> - true if permissions were updated, false if not needed or failed
 */
export async function ensurePlayerOwnership(actor: any): Promise<boolean> {
  if (!actor) {
    logger.warn('[Permissions] No actor provided');
    return false;
  }

  // Only GMs can modify permissions
  if (!game?.user?.isGM) {
    logger.warn('[Permissions] Only GM can modify actor permissions');
    return false;
  }

  // Build target ownership object
  const targetOwnership: Record<string, number> = {};
  
  // Set all non-GM players to OWNER (level 3)
  for (const user of game.users) {
    if (!user.isGM) {
      targetOwnership[user.id] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
    }
  }
  
  // Keep default for everyone else (no access)
  targetOwnership.default = CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE;

  // Check if current ownership matches target
  const currentOwnership = actor.ownership || {};
  const needsUpdate = checkOwnershipNeedsUpdate(currentOwnership, targetOwnership);

  if (!needsUpdate) {
    logger.info('[Permissions] Party actor already has correct permissions');
    return false;
  }

  // Update the actor
  try {
    await actor.update({ ownership: targetOwnership });
    logger.info('[Permissions] ✅ Updated party actor permissions - all players now have OWNER access');
    logger.debug('[Permissions] New ownership:', targetOwnership);
    return true;
  } catch (error) {
    logger.error('[Permissions] Failed to update actor permissions:', error);
    ui?.notifications?.error('Failed to update kingdom actor permissions');
    return false;
  }
}

/**
 * Check if ownership needs to be updated
 * Compares current ownership with target ownership
 * 
 * @param current - Current ownership object
 * @param target - Target ownership object
 * @returns boolean - true if ownership needs update
 */
function checkOwnershipNeedsUpdate(
  current: Record<string, number>,
  target: Record<string, number>
): boolean {
  // Check if all target users have correct permission level
  for (const [userId, level] of Object.entries(target)) {
    if (current[userId] !== level) {
      return true;
    }
  }
  
  // Check if any users in current have permissions that shouldn't
  for (const userId of Object.keys(current)) {
    if (userId !== 'default' && !target[userId]) {
      return true;
    }
  }
  
  return false;
}

/**
 * Verify permissions on a party actor with kingdom data
 * Logs warnings if permissions are incorrect but doesn't fix them
 * 
 * @param actor - The party actor to verify
 * @returns boolean - true if permissions are correct
 */
export function verifyKingdomPermissions(actor: any): boolean {
  if (!actor) {
    return false;
  }

  const ownership = actor.ownership || {};
  const issues: string[] = [];

  // Check each non-GM player
  for (const user of game.users) {
    if (!user.isGM) {
      const userLevel = ownership[user.id];
      if (userLevel !== CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER) {
        issues.push(`Player ${user.name} does not have OWNER permission`);
      }
    }
  }

  if (issues.length > 0) {
    logger.warn('[Permissions] Kingdom actor has permission issues:', issues);
    return false;
  }

  logger.debug('[Permissions] Kingdom actor permissions verified ✓');
  return true;
}

/**
 * Check and fix permissions on a party actor with kingdom data
 * This is called on load to ensure permissions are correct
 * Only runs for GMs (players can't modify permissions)
 * 
 * @param actor - The party actor to check and fix
 * @returns Promise<boolean> - true if permissions were fixed
 */
export async function checkAndFixPermissions(actor: any): Promise<boolean> {
  if (!actor) {
    return false;
  }

  // Only GMs can fix permissions
  if (!game?.user?.isGM) {
    // Verify only (no fix attempt)
    const isCorrect = verifyKingdomPermissions(actor);
    if (!isCorrect) {
      logger.warn('[Permissions] ⚠️ Kingdom actor permissions need attention. Please ask a GM to fix them.');
      ui?.notifications?.warn('Kingdom actor permissions need attention. Please ask a GM to fix them.');
    }
    return false;
  }

  // Verify permissions
  const isCorrect = verifyKingdomPermissions(actor);
  
  if (!isCorrect) {
    logger.info('[Permissions] Fixing kingdom actor permissions...');
    return await ensurePlayerOwnership(actor);
  }

  return false;
}
