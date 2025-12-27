/**
 * doctrineAbilityMappings.ts
 *
 * Defines which abilities are granted to armies based on doctrine tier.
 * Abilities are automatically applied when doctrine thresholds are reached.
 */

import type { DoctrineType, DoctrineTier } from '../types/Doctrine';

/**
 * Configuration for a doctrine ability
 */
export interface DoctrineAbilityConfig {
  /** Unique identifier for this ability mapping */
  id: string;
  /** Display name */
  name: string;
  /** Which doctrine grants this ability */
  doctrine: DoctrineType;
  /** Minimum tier required */
  tier: DoctrineTier;
  /** Whether doctrine must be dominant to grant this ability */
  requiresDominant: boolean;
  /**
   * The filename in src/data/abilities (without .json)
   * All abilities are now stored as custom JSON files.
   */
  sourceId: string;
  /** Brief description of the effect */
  description: string;
  /** Full description/rules text for standalone viewer */
  fullDescription?: string;
}

/**
 * All doctrine ability mappings
 *
 * Application Rules:
 * All doctrine benefits require dominance - you cannot double-dip across trees.
 * - Tier 2 (Moderate) abilities: Applied when doctrine is dominant AND at 40 pts
 * - Tier 3 (Major) abilities: Applied when doctrine is dominant AND at 80 pts
 */
export const DOCTRINE_ABILITY_MAPPINGS: DoctrineAbilityConfig[] = [
  // === IDEALIST ===
  {
    id: 'idealist-inspiring-aura',
    name: 'Inspiring Aura',
    doctrine: 'idealist',
    tier: 'moderate',
    requiresDominant: true,
    sourceId: 'inspiring-aura',
    description: '+1 status to initiative and saves vs fear',
    fullDescription: 'The army inspires nearby allies. This army and all allied armies within 60 feet gain a +1 status bonus to initiative rolls and saving throws against fear effects.'
  },
  {
    id: 'idealist-aura-of-righteousness',
    name: 'Aura of Righteousness',
    doctrine: 'idealist',
    tier: 'major',
    requiresDominant: true,
    sourceId: 'aura-of-righteousness',
    description: '+2 status AC vs unholy, +2 status damage vs unholy',
    fullDescription: 'The army radiates an aura of holy righteousness. This army and all allied armies within 20 feet gain a +2 status bonus to AC against unholy creatures and deal an additional 2 damage against unholy creatures.'
  },

  // === RUTHLESS ===
  {
    id: 'ruthless-no-quarter',
    name: 'No Quarter!',
    doctrine: 'ruthless',
    tier: 'moderate',
    requiresDominant: true,
    sourceId: 'no-quarter',
    description: '+1 status to attack and damage rolls',
    fullDescription: 'The army fights with ruthless aggression. This army and all allied armies within 60 feet gain a +1 status bonus to attack rolls and damage rolls.'
  },
  {
    id: 'ruthless-despair',
    name: 'Despair',
    doctrine: 'ruthless',
    tier: 'major',
    requiresDominant: true,
    sourceId: 'despair',
    description: 'Frightened 1 aura (can\'t naturally recover while in area)',
    fullDescription: 'The army radiates an aura of despair. Enemy armies within 60 feet become frightened 1 and cannot reduce their frightened condition below 1 while they remain in the aura.'
  },

  // === PRACTICAL ===
  {
    id: 'practical-rally',
    name: 'Rally',
    doctrine: 'practical',
    tier: 'moderate',
    requiresDominant: true,
    sourceId: 'rally',
    description: '+1 circumstance to AC and saving throws',
    fullDescription: 'The army rallies its allies with disciplined coordination. This army and all allied armies within 60 feet gain a +1 circumstance bonus to AC and saving throws.'
  },
  {
    id: 'practical-rigorous-discipline',
    name: 'Rigorous Discipline',
    doctrine: 'practical',
    tier: 'major',
    requiresDominant: true,
    sourceId: 'rigorous-discipline',
    description: 'Reaction: DC 17 flat check to downgrade critical hit to normal hit',
    fullDescription: 'The army\'s rigorous training allows them to resist devastating blows. When an enemy scores a critical hit against the army, the army can use a reaction to attempt a DC 17 flat check. On a success, the critical hit becomes a normal hit instead.'
  }
];

/**
 * Get abilities for a specific doctrine
 */
export function getAbilitiesForDoctrine(doctrine: DoctrineType): DoctrineAbilityConfig[] {
  return DOCTRINE_ABILITY_MAPPINGS.filter(a => a.doctrine === doctrine);
}

/**
 * Get all abilities that should be active given current doctrine state
 */
export function getActiveAbilities(
  doctrineValues: Record<DoctrineType, number>,
  dominant: DoctrineType | null,
  getTierForValue: (value: number) => DoctrineTier,
  tierMeetsMinimum: (current: DoctrineTier, minimum: DoctrineTier) => boolean
): DoctrineAbilityConfig[] {
  return DOCTRINE_ABILITY_MAPPINGS.filter(ability => {
    const doctrineValue = doctrineValues[ability.doctrine] || 0;
    const currentTier = getTierForValue(doctrineValue);

    // Check if tier requirement is met
    if (!tierMeetsMinimum(currentTier, ability.tier)) {
      return false;
    }

    // Check if dominant requirement is met
    if (ability.requiresDominant && dominant !== ability.doctrine) {
      return false;
    }

    return true;
  });
}

/**
 * Slug used to identify doctrine-granted abilities on actors
 */
export const DOCTRINE_ABILITY_SLUG_PREFIX = 'doctrine-ability-';

/**
 * Generate the slug for a doctrine ability
 */
export function getDoctrineAbilitySlug(abilityId: string): string {
  return `${DOCTRINE_ABILITY_SLUG_PREFIX}${abilityId}`;
}
