/**
 * Game Command Utilities
 * 
 * Pure utility functions used across the game command system.
 * These are helper functions that don't require service context.
 */

import { getKingdomActor } from '../../stores/KingdomStore';

/**
 * Get the party's current level
 * @returns Party level (1-20)
 */
export function getPartyLevel(): number {
  const game = (globalThis as any).game;
  
  // Get all player characters
  const playerCharacters = game.actors.filter((actor: any) => 
    actor.type === 'character' && 
    actor.hasPlayerOwner &&
    !actor.isGM
  );
  
  if (playerCharacters.length === 0) {
    return 1; // Default to level 1 if no PCs found
  }
  
  // Calculate average level
  const totalLevel = playerCharacters.reduce((sum: number, actor: any) => {
    return sum + (actor.level || 1);
  }, 0);
  
  return Math.round(totalLevel / playerCharacters.length);
}

/**
 * Get kingdom taxation tier based on settlements
 * @returns Taxation tier (0-3)
 */
export function getKingdomTaxationTier(): number {
  const actor = getKingdomActor();
  const kingdom = actor?.getKingdomData();
  
  if (!kingdom?.settlements) return 0;
  
  // Count settlements with economy-related structures
  // This is a placeholder - actual logic may vary
  const economySettlements = kingdom.settlements.filter((s: any) => 
    s.structureIds?.some((id: string) => {
      // TODO: Check if structure provides taxation bonuses
      return true;
    })
  );
  
  return Math.min(3, economySettlements.length);
}

/**
 * Calculate kingdom income from settlements
 * @returns Income amount
 */
export function calculateIncome(): number {
  const actor = getKingdomActor();
  const kingdom = actor?.getKingdomData();
  
  if (!kingdom) return 0;
  
  // Base income calculation (placeholder)
  const baseIncome = kingdom.settlements?.length || 0;
  const taxationBonus = getKingdomTaxationTier();
  
  return baseIncome + taxationBonus;
}

/**
 * Calculate a random hex within range of a target hex
 * Used for critical failures that redirect movement
 * 
 * @param hexId - Center hex ID
 * @param maxDistance - Maximum distance in hexes (1-2 = nearby, 3-4 = far)
 * @returns Random hex ID within range
 */
export function calculateRandomNearbyHex(hexId: string, maxDistance: number = 2): string {
  // Parse hex coordinates (format: "x,y")
  const [x, y] = hexId.split(',').map(Number);
  
  // Generate random offset within range
  const distance = Math.floor(Math.random() * maxDistance) + 1;
  const angle = Math.random() * Math.PI * 2;
  
  const offsetX = Math.round(Math.cos(angle) * distance);
  const offsetY = Math.round(Math.sin(angle) * distance);
  
  return `${x + offsetX},${y + offsetY}`;
}

/**
 * Apply a PF2e condition to an actor
 * 
 * @param actor - Foundry actor to apply condition to
 * @param conditionString - Condition string (e.g., "fatigued", "+1 initiative (status bonus)")
 */
export async function applyConditionToActor(actor: any, conditionString: string): Promise<void> {
  // Parse condition string to determine if it's a condition or modifier
  // This is a simplified implementation - actual PF2e integration may vary
  
  if (conditionString.includes('(status bonus)') || conditionString.includes('(status penalty)')) {
    // This is a modifier, not a condition
    // Would need to create a custom effect on the actor
    // For now, just log it
    console.log(`[GameCommandUtils] Would apply modifier: ${conditionString} to ${actor.name}`);
  } else {
    // This is a condition like "fatigued", "enfeebled 1"
    // Would use PF2e's condition system
    console.log(`[GameCommandUtils] Would apply condition: ${conditionString} to ${actor.name}`);
  }
  
  // TODO: Implement actual PF2e condition/effect application
  // This requires PF2e system API which may vary by version
}

/**
 * Create equipment effect data for army outfitting
 * 
 * @param equipmentType - Type of equipment (armor, runes, weapons, equipment)
 * @param bonus - Bonus amount (1 or 2)
 * @returns PF2e effect data
 */
export function createEquipmentEffect(equipmentType: string, bonus: number): any {
  const equipmentNames = {
    armor: 'Armor Upgrade',
    runes: 'Weapon Runes',
    weapons: 'Weapon Upgrade',
    equipment: 'Enhanced Equipment'
  };
  
  return {
    name: equipmentNames[equipmentType as keyof typeof equipmentNames] || 'Equipment',
    type: 'effect',
    system: {
      slug: `army-${equipmentType}`,
      level: { value: 1 },
      duration: { value: -1, unit: 'unlimited', sustained: false, expiry: 'turn-start' },
      rules: [
        // PF2e Rule Elements would go here
        // This is a placeholder
      ]
    }
  };
}

/**
 * Get display name for equipment type
 * 
 * @param equipmentType - Equipment type key
 * @returns Human-readable name
 */
export function getEquipmentDisplayName(equipmentType: string): string {
  const names: Record<string, string> = {
    armor: 'Armor (+1 AC)',
    runes: 'Runes (+1 to hit)',
    weapons: 'Weapons (+1 damage dice)',
    equipment: 'Enhanced Gear (+1 saves)'
  };
  
  return names[equipmentType] || equipmentType;
}


