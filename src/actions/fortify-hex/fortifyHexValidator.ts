/**
 * Fortify Hex Validator
 * Validates that a hex can be fortified
 */

import { get } from 'svelte/store';
import { kingdomData } from '../../stores/KingdomStore';
import { isHexClaimedByPlayer, getHex } from '../shared/hexValidation';
import { PLAYER_KINGDOM } from '../../types/ownership';
import fortificationData from '../../../data/player-actions/fortify-hex.json';

/**
 * Validate if a hex can be fortified
 * @param hexId - The hex ID to validate
 * @returns Object with valid flag and optional message
 */
export async function validateFortifyHex(hexId: string): Promise<{ valid: boolean; message?: string }> {
  const kingdom = get(kingdomData);
  
  // Find the hex
  const hex = getHex(hexId, kingdom);
  
  if (!hex) {
    return { valid: false, message: 'Hex not found' };
  }
  
  // Must be claimed territory
  if (!isHexClaimedByPlayer(hexId, kingdom)) {
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

/**
 * Simplified validator for pipeline use
 * Returns true if hex can be fortified (claimed, not at max tier, AND affordable)
 * 
 * @param hexId - The hex ID to validate
 * @returns boolean - true if hex can be fortified
 */
export function validateFortifyHexForPipeline(hexId: string): boolean {
  const kingdom = get(kingdomData);
  
  // Find the hex
  const hex = getHex(hexId, kingdom);
  
  if (!hex) {
    return false;
  }
  
  // Must be claimed territory
  if (!isHexClaimedByPlayer(hexId, kingdom)) {
    return false;
  }
  
  // Check current tier - must not be at max (4)
  const currentTier = hex.fortification?.tier || 0;
  
  if (currentTier >= 4) {
    return false;
  }
  
  // Cannot fortify a hex with a settlement
  const hasSettlement = (kingdom.settlements || []).some(s => {
    if (!s.location || (s.location.x === 0 && s.location.y === 0)) return false;
    const settlementHexId = `${s.location.x}.${s.location.y}`;
    return settlementHexId === hexId;
  });
  
  if (hasSettlement) {
    return false;
  }
  
  // ✅ NEW: Check if we can afford the next tier upgrade
  const nextTier = currentTier + 1;
  const tierConfig = fortificationData.tiers[nextTier - 1];
  
  if (!tierConfig) {
    return false;  // Invalid tier
  }
  
  // Check affordability
  for (const [resource, amount] of Object.entries(tierConfig.cost)) {
    const available = (kingdom.resources as any)[resource] || 0;
    if (available < (amount as number)) {
      console.log(`[FortifyHex Validator] Cannot afford tier ${nextTier} - need ${amount} ${resource}, have ${available}`);
      return false;  // Cannot afford
    }
  }
  
  return true;
}
