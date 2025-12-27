/**
 * Doctrine Abilities
 *
 * Self-contained ability definitions for doctrine-granted army effects.
 * These are independent from the PF2e system's bestiary-effects and
 * can be extended without risk of upstream changes breaking functionality.
 */

import type { DoctrineEffectData } from './types';

// Individual ability exports
import { inspiringAura } from './inspiring-aura';
import { auraOfRighteousness } from './aura-of-righteousness';
import { noQuarter } from './no-quarter';
import { despair } from './despair';
import { rally } from './rally';
import { rigorousDiscipline } from './rigorous-discipline';

// Re-export types
export * from './types';

// Re-export individual abilities for direct access
export {
  inspiringAura,
  auraOfRighteousness,
  noQuarter,
  despair,
  rally,
  rigorousDiscipline
};

/**
 * All doctrine abilities keyed by their sourceId
 * (matches the sourceId in doctrineAbilityMappings.ts)
 */
export const DOCTRINE_ABILITIES: Record<string, DoctrineEffectData> = {
  'inspiring-aura': inspiringAura,
  'aura-of-righteousness': auraOfRighteousness,
  'no-quarter': noQuarter,
  'despair': despair,
  'rally': rally,
  'rigorous-discipline': rigorousDiscipline,
};
