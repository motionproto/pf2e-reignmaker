/**
 * Combat condition helpers
 * 
 * Utilities for:
 * - Calculating random nearby hexes (critical failure randomization)
 * - Applying PF2e conditions to army actors
 */

import { logger } from '../../../utils/Logger';

/**
 * Calculate random nearby hex for critical failure
 * Uses 1d6 for direction (6 hex directions) and 1dN for distance
 * 
 * @param hexId - Starting hex ID (format: "i.j")
 * @param maxDistance - Maximum distance (default 3)
 * @returns Random nearby hex ID
 */
export function calculateRandomNearbyHex(hexId: string, maxDistance: number = 3): string {
  // Parse hex
  const [i, j] = hexId.split('.').map(Number);
  
  // Roll 1d6 for direction (0-5)
  const direction = Math.floor(Math.random() * 6);
  
  // Roll for distance (1 to maxDistance)
  const distance = Math.floor(Math.random() * maxDistance) + 1;
  
  // Hex neighbor offsets (flat-top hexagons)
  // Even rows (j % 2 === 0): NE, E, SE, SW, W, NW
  // Odd rows (j % 2 === 1): NE, E, SE, SW, W, NW (different offsets)
  const evenRowOffsets = [
    { di: 0, dj: -1 },  // NE
    { di: 1, dj: 0 },   // E
    { di: 0, dj: 1 },   // SE
    { di: -1, dj: 1 },  // SW
    { di: -1, dj: 0 },  // W
    { di: -1, dj: -1 }  // NW
  ];
  
  const oddRowOffsets = [
    { di: 1, dj: -1 },  // NE
    { di: 1, dj: 0 },   // E
    { di: 1, dj: 1 },   // SE
    { di: 0, dj: 1 },   // SW
    { di: -1, dj: 0 },  // W
    { di: 0, dj: -1 }   // NW
  ];
  
  // Apply direction offset multiple times for distance
  let currentI = i;
  let currentJ = j;
  
  for (let step = 0; step < distance; step++) {
    const offsets = currentJ % 2 === 0 ? evenRowOffsets : oddRowOffsets;
    const offset = offsets[direction];
    currentI += offset.di;
    currentJ += offset.dj;
  }
  
  return `${currentI}.${currentJ}`;
}

/**
 * Apply condition string to army actor
 * Parses condition strings like "+1 initiative (status bonus)", "fatigued", "enfeebled 1"
 * 
 * @param actor - Army actor to apply condition to
 * @param conditionString - Condition string to parse and apply
 */
export async function applyConditionToActor(actor: any, conditionString: string): Promise<void> {
  logger.info(`🎭 [applyConditionToActor] Applying "${conditionString}" to ${actor.name}`);
  
  // Parse condition string
  const lowerCondition = conditionString.toLowerCase().trim();
  
  // Handle initiative modifiers
  if (lowerCondition.includes('initiative')) {
    const isPositive = lowerCondition.includes('+');
    const match = lowerCondition.match(/([+-]?\d+)/);
    const bonus = match ? parseInt(match[1], 10) : (isPositive ? 1 : -1);
    
    // Create initiative modifier effect
    await actor.createEmbeddedDocuments('Item', [{
      type: 'effect',
      name: `Army Deployment: Initiative ${bonus > 0 ? '+' : ''}${bonus}`,
      system: {
        slug: 'army-deployment-initiative',
        rules: [{
          key: 'FlatModifier',
          selector: 'initiative',
          value: bonus,
          type: 'status'
        }],
        duration: { value: -1, unit: 'unlimited', expiry: 'turn-end' }
      }
    }]);
    
    logger.info(`✅ Applied initiative ${bonus > 0 ? '+' : ''}${bonus} to ${actor.name}`);
    return;
  }
  
  // Handle saving throw modifiers
  if (lowerCondition.includes('saving throw') || lowerCondition.includes('saves')) {
    const isPositive = lowerCondition.includes('+');
    const match = lowerCondition.match(/([+-]?\d+)/);
    const bonus = match ? parseInt(match[1], 10) : (isPositive ? 1 : -1);
    
    await actor.createEmbeddedDocuments('Item', [{
      type: 'effect',
      name: `Army Deployment: Saves ${bonus > 0 ? '+' : ''}${bonus}`,
      system: {
        slug: 'army-deployment-saves',
        rules: [{
          key: 'FlatModifier',
          selector: 'saving-throw',
          value: bonus,
          type: 'status'
        }],
        duration: { value: -1, unit: 'unlimited', expiry: 'turn-end' }
      }
    }]);
    
    logger.info(`✅ Applied saves ${bonus > 0 ? '+' : ''}${bonus} to ${actor.name}`);
    return;
  }
  
  // Handle attack modifiers
  if (lowerCondition.includes('attack')) {
    const isPositive = lowerCondition.includes('+');
    const match = lowerCondition.match(/([+-]?\d+)/);
    const bonus = match ? parseInt(match[1], 10) : (isPositive ? 1 : -1);
    
    await actor.createEmbeddedDocuments('Item', [{
      type: 'effect',
      name: `Army Deployment: Attack ${bonus > 0 ? '+' : ''}${bonus}`,
      system: {
        slug: 'army-deployment-attack',
        rules: [{
          key: 'FlatModifier',
          selector: 'strike-attack-roll',
          value: bonus,
          type: 'status'
        }],
        duration: { value: -1, unit: 'unlimited', expiry: 'turn-end' }
      }
    }]);
    
    logger.info(`✅ Applied attack ${bonus > 0 ? '+' : ''}${bonus} to ${actor.name}`);
    return;
  }
  
  // Handle PF2e conditions (fatigued, enfeebled, etc.)
  if (lowerCondition.includes('fatigued')) {
    const condition = await fromUuid('Compendium.pf2e.conditionitems.Item.HL2l2VRSaQHu9lUw');
    if (condition) {
      await actor.createEmbeddedDocuments('Item', [condition.toObject()]);
      logger.info(`✅ Applied Fatigued condition to ${actor.name}`);
    }
    return;
  }
  
  if (lowerCondition.includes('enfeebled')) {
    const match = lowerCondition.match(/enfeebled\s+(\d+)/);
    const value = match ? parseInt(match[1], 10) : 1;
    
    const condition = await fromUuid('Compendium.pf2e.conditionitems.Item.MIRkyAjyBeXivMa7');
    if (condition) {
      const conditionData = condition.toObject();
      if (conditionData.system && typeof conditionData.system === 'object') {
        (conditionData.system as any).value = { value };
      }
      await actor.createEmbeddedDocuments('Item', [conditionData]);
      logger.info(`✅ Applied Enfeebled ${value} condition to ${actor.name}`);
    }
    return;
  }
  
  logger.warn(`⚠️ Unknown condition format: "${conditionString}"`);
}
