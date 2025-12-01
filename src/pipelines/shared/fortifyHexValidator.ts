/**
 * Fortify Hex Validator
 * Validates that a hex can be fortified
 */

import { get } from 'svelte/store';
import { kingdomData } from '../../stores/KingdomStore';
import { isHexClaimedByPlayer, getHex } from '../shared/hexValidation';
import { PLAYER_KINGDOM } from '../../types/ownership';
import { fortificationTiers, getFortificationTier } from '../../data/fortificationTiers';

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
  
  // Get next tier info
  const nextTier = currentTier + 1;
  const tierConfig = getFortificationTier(nextTier);
  
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
 * Returns validation result with specific error messages
 * 
 * @param hexId - The hex ID to validate
 * @returns ValidationResult - { valid: boolean, message?: string }
 */
export function validateFortifyHexForPipeline(hexId: string): { valid: boolean; message?: string } {
  const kingdom = get(kingdomData);
  
  // Find the hex
  const hex = getHex(hexId, kingdom);
  
  if (!hex) {
    return { valid: false, message: 'Hex not found' };
  }
  
  // Must be claimed territory
  if (!isHexClaimedByPlayer(hexId, kingdom)) {
    return { valid: false, message: 'This hex must be in claimed territory' };
  }
  
  // Check current tier - must not be at max (4)
  const currentTier = hex.fortification?.tier || 0;
  
  if (currentTier >= 4) {
    const currentTierConfig = getFortificationTier(currentTier);
    const currentName = currentTierConfig?.name || 'Fortress';
    return { valid: false, message: `Already a ${currentName}, cannot be upgraded further` };
  }
  
  // Cannot fortify a hex with a settlement
  const settlement = (kingdom.settlements || []).find(s => {
    if (!s.location || (s.location.x === 0 && s.location.y === 0)) return false;
    const settlementHexId = `${s.location.x}.${s.location.y}`;
    return settlementHexId === hexId;
  });
  
  if (settlement) {
    return { valid: false, message: `Cannot fortify ${settlement.name} - settlements have their own defenses` };
  }
  
  // Check next tier availability
  const nextTier = currentTier + 1;
  const tierConfig = getFortificationTier(nextTier);
  
  if (!tierConfig) {
    return { valid: false, message: 'Invalid fortification tier' };
  }
  
  // Check affordability
  const missingResources: string[] = [];
  for (const [resource, amount] of Object.entries(tierConfig.cost)) {
    const available = (kingdom.resources as any)[resource] || 0;
    if (available < (amount as number)) {
      const resourceName = resource.charAt(0).toUpperCase() + resource.slice(1);
      missingResources.push(`${amount - available} more ${resourceName}`);
    }
  }
  
  if (missingResources.length > 0) {
    const action = currentTier === 0 ? 'build' : 'upgrade to';
    const currentTierConfig = getFortificationTier(currentTier);
    const fromTo = currentTier === 0 
      ? tierConfig.name 
      : `${currentTierConfig?.name || 'current'} to ${tierConfig.name}`;
    return { 
      valid: false, 
      message: `You need at least ${missingResources.join(' and ')} to ${action} ${fromTo}` 
    };
  }
  
  return { valid: true };
}
