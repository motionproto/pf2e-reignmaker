/**
 * Utility to inspect the PF2e party actor and log all its properties
 * This helps identify if PF2e already tracks party level
 */

import { getKingdomActor } from '../stores/KingdomStore';

/**
 * Inspect the party actor and log all its properties
 * Useful for discovering PF2e's built-in party tracking
 */
export function inspectPartyActor(): void {
  const actor = getKingdomActor();
  
  if (!actor) {
    console.warn('[inspectPartyActor] No party actor found');
    return;
  }
  
  console.group('🔍 [inspectPartyActor] Party Actor Properties');
  console.log('Actor ID:', actor.id);
  console.log('Actor Name:', actor.name);
  console.log('Actor Type:', actor.type);
  
  // Log all top-level properties
  console.group('📋 Top-level Properties:');
  const topLevelProps = Object.keys(actor).filter(key => !key.startsWith('_'));
  console.log(topLevelProps);
  topLevelProps.forEach(key => {
    try {
      const value = (actor as any)[key];
      const type = typeof value;
      if (type === 'function') {
        console.log(`  ${key}: [Function]`);
      } else if (type === 'object' && value !== null) {
        console.log(`  ${key}: [Object]`, value);
      } else {
        console.log(`  ${key}:`, value);
      }
    } catch (e) {
      console.log(`  ${key}: [Error accessing]`);
    }
  });
  console.groupEnd();
  
  // Log system data (PF2e-specific)
  console.group('📦 System Data:');
  if ((actor as any).system) {
    console.log('system:', (actor as any).system);
    console.log('system keys:', Object.keys((actor as any).system || {}));
    
    // Check for level-related properties
    const system = (actor as any).system;
    if (system.details) {
      console.log('system.details:', system.details);
      console.log('system.details keys:', Object.keys(system.details || {}));
    }
    if (system.level) {
      console.log('system.level:', system.level);
    }
  } else {
    console.log('No system data found');
  }
  console.groupEnd();
  
  // Log flags (where we store kingdom data)
  console.group('🏴 Flags:');
  if ((actor as any).flags) {
    console.log('flags:', (actor as any).flags);
    console.log('flags keys:', Object.keys((actor as any).flags || {}));
  }
  console.groupEnd();
  
  // Log members/characters if available
  console.group('👥 Members/Characters:');
  if ((actor as any).members) {
    console.log('members:', (actor as any).members);
  }
  if ((actor as any).characters) {
    console.log('characters:', (actor as any).characters);
  }
  if ((actor as any).getMembers) {
    try {
      const members = (actor as any).getMembers();
      console.log('getMembers():', members);
    } catch (e) {
      console.log('getMembers() error:', e);
    }
  }
  console.groupEnd();
  
  // Check for level property directly
  console.group('📊 Level-related Properties:');
  console.log('actor.level:', (actor as any).level);
  console.log('actor.system?.details?.level:', (actor as any).system?.details?.level);
  console.log('actor.system?.level:', (actor as any).system?.level);
  console.log('actor.system?.partyLevel:', (actor as any).system?.partyLevel);
  console.log('actor.system?.details?.partyLevel:', (actor as any).system?.details?.partyLevel);
  console.groupEnd();
  
  // Full JSON dump (be careful with circular references)
  console.group('📄 Full Actor Object (JSON):');
  try {
    const json = JSON.stringify(actor, (key, value) => {
      // Skip functions and circular references
      if (typeof value === 'function') return '[Function]';
      if (key === '_source' || key === 'data') return '[Source Data]';
      return value;
    }, 2);
    console.log(json.substring(0, 5000)); // Limit output
  } catch (e) {
    console.log('JSON stringify error:', e);
  }
  console.groupEnd();
  
  console.groupEnd();
}



