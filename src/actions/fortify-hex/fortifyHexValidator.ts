/**
 * Fortify Hex Validator
 * Validates that a hex can be fortified
 */

import { get } from 'svelte/store';
import { kingdomData } from '../../stores/KingdomStore';

/**
 * Validate if a hex can be fortified
 * @param hexId - The hex ID to validate
 * @returns Object with valid flag and optional message
 */
export async function validateFortifyHex(hexId: string): Promise<{ valid: boolean; message?: string }> {
  const kingdom = get(kingdomData);
  
  // Find the hex
  const hex = kingdom.hexes.find((h: any) => h.id === hexId);
  
  if (!hex) {
    return { valid: false, message: 'Hex not found' };
  }
  
  // Must be claimed territory
  if (hex.claimedBy !== 1) {
    return { valid: false, message: 'Must be in claimed territory' };
  }
  
  // Check current tier
  const currentTier = hex.fortification?.tier || 0;
  
  if (currentTier >= 4) {
    return { valid: false, message: 'Already at maximum tier (Fortress)' };
  }
  
  // Load fortification data to show next tier info
  const fortificationDataModule = await import('../../../data/player-actions/fortify-hex.json');
  const fortificationData = fortificationDataModule.default || fortificationDataModule;
  const nextTier = currentTier + 1;
  const tierConfig = fortificationData.tiers[nextTier - 1];
  
  // Build cost summary
  const costSummary = Object.entries(tierConfig.cost)
    .map(([r, a]) => `${a} ${r}`)
    .join(', ');
  
  const action = currentTier === 0 ? 'Build' : 'Upgrade to';
  const message = `${action} ${tierConfig.name} (cost: ${costSummary})`;
  
  return { valid: true, message };
}
