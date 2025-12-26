/**
 * doctrine.ts
 *
 * Configuration constants for the Doctrine Series system.
 * Defines thresholds, tier effects, and penalty configurations.
 */

import type { DoctrineTier, DoctrineType, DoctrinePenalty } from '../types/Doctrine';

/**
 * Point thresholds for each doctrine tier
 */
export const DOCTRINE_THRESHOLDS: Record<DoctrineTier, number> = {
  none: 0,
  minor: 15,
  moderate: 30,
  major: 60,
  absolute: 120
};

/**
 * Tier order for comparison operations
 */
export const DOCTRINE_TIER_ORDER: DoctrineTier[] = ['none', 'minor', 'moderate', 'major', 'absolute'];

/**
 * Effects granted at each tier level
 */
export const DOCTRINE_TIER_EFFECTS: Record<DoctrineTier, { skillBonus: number }> = {
  none: { skillBonus: 0 },
  minor: { skillBonus: 1 },
  moderate: { skillBonus: 1 },
  major: { skillBonus: 2 },
  absolute: { skillBonus: 2 }
};

/**
 * Display colors for each doctrine type
 */
export const DOCTRINE_COLORS: Record<DoctrineType, string> = {
  idealist: 'var(--color-amber)',
  practical: 'var(--color-info)',
  ruthless: 'var(--color-danger)'
};

/**
 * Icons for each doctrine type (Font Awesome classes)
 */
export const DOCTRINE_ICONS: Record<DoctrineType, string> = {
  idealist: 'fa-heart',
  practical: 'fa-scale-balanced',
  ruthless: 'fa-skull'
};

/**
 * Centralized skill-to-doctrine mapping
 * Skills in each group receive bonuses when that doctrine is dominant
 */
export const DOCTRINE_SKILL_GROUPS: Record<DoctrineType, string[]> = {
  idealist: ['religion', 'diplomacy', 'medicine', 'nature', 'performance'],
  practical: ['crafting', 'society', 'arcana', 'lore', 'survival', 'occultism'],
  ruthless: ['thievery', 'intimidation', 'deception', 'stealth', 'athletics', 'acrobatics']
};

/**
 * Get the doctrine alignment for a given skill
 * Returns null if the skill is not aligned with any doctrine
 */
export function getSkillDoctrine(skillName: string): DoctrineType | null {
  const normalizedSkill = skillName.toLowerCase();
  for (const [doctrine, skills] of Object.entries(DOCTRINE_SKILL_GROUPS)) {
    if (skills.includes(normalizedSkill)) {
      return doctrine as DoctrineType;
    }
  }
  return null;
}

/**
 * Penalties for extreme (Major+) doctrine levels
 * Each doctrine has a unique downside to create meaningful trade-offs
 */
export const DOCTRINE_PENALTIES: Record<DoctrineType, { minTier: DoctrineTier; effects: DoctrinePenalty[] }> = {
  // Ruthless: Fear-based rule breeds discontent
  ruthless: {
    minTier: 'major',
    effects: [
      {
        type: 'unrest',
        description: 'Fear-based rule breeds discontent',
        value: 1
      }
    ]
  },
  // Idealist: Charity and compassion cost resources
  idealist: {
    minTier: 'major',
    effects: [
      {
        type: 'gold',
        description: 'Charitable obligations cost resources',
        value: 1
      }
    ]
  },
  // Practical: Over-optimization reduces flexibility
  practical: {
    minTier: 'major',
    effects: [
      {
        type: 'skill',
        description: 'Over-specialization reduces flexibility',
        value: -1,
        affectedSkills: 'non-aligned'
      }
    ]
  }
};

/**
 * Minimum DC for any check (DC adjustments can't go below this)
 */
export const MINIMUM_DC = 5;

/**
 * Default doctrine values for new kingdoms
 */
export const DEFAULT_DOCTRINE_VALUES: Record<DoctrineType, number> = {
  idealist: 0,
  practical: 0,
  ruthless: 0
};
