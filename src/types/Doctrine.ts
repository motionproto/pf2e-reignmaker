/**
 * Doctrine.ts
 *
 * Type definitions for the Doctrine Series system.
 * Doctrines represent the philosophical approach a kingdom takes in governance:
 * - Idealist: Compassionate, principled, community-focused leadership
 * - Practical: Balanced, efficient, lawful leadership
 * - Ruthless: Expedient, fear-based, self-serving leadership
 */

/**
 * The three doctrine types
 */
export type DoctrineType = 'idealist' | 'practical' | 'ruthless';

/**
 * Doctrine tier levels based on accumulated points
 */
export type DoctrineTier = 'none' | 'minor' | 'moderate' | 'major' | 'absolute';

/**
 * Configuration for a specific doctrine tier
 */
export interface DoctrineTierConfig {
  /** The tier level */
  tier: DoctrineTier;
  /** Points needed to reach this tier */
  threshold: number;
  /** Display label (e.g., "Major Virtuous") */
  label: string;
  /** CSS color variable for the tier */
  color: string;
  /** Bonus to aligned skill checks */
  skillBonus: number;
}

/**
 * Current doctrine state including all three doctrines and which is dominant
 */
export interface DoctrineState {
  /** The doctrine with the highest points (null if tied or all zero) */
  dominant: DoctrineType | null;
  /** The tier of the dominant doctrine */
  dominantTier: DoctrineTier;
  /** Current point values for each doctrine */
  values: Record<DoctrineType, number>;
  /** Tier configuration for each doctrine */
  tierInfo: Record<DoctrineType, DoctrineTierConfig>;
}

/**
 * A milestone achievement for reaching a new doctrine tier
 */
export interface DoctrineMilestone {
  /** Unique ID for the milestone */
  id: string;
  /** Which doctrine reached the tier */
  doctrine: DoctrineType;
  /** The tier that was achieved */
  tier: DoctrineTier;
  /** The turn number when achieved */
  achievedTurn: number;
  /** Timestamp when achieved */
  timestamp: number;
}

/**
 * Penalty type for extreme doctrines
 */
export type DoctrinePenaltyType = 'unrest' | 'gold' | 'skill';

/**
 * A penalty effect from an extreme doctrine
 */
export interface DoctrinePenalty {
  /** Type of penalty */
  type: DoctrinePenaltyType;
  /** Human-readable description */
  description: string;
  /** Numeric value of the penalty */
  value: number;
  /** For skill penalties, which skills are affected */
  affectedSkills?: 'non-aligned';
}

/**
 * All current effects from the dominant doctrine
 */
export interface DoctrineEffects {
  /** Skill bonuses granted by the doctrine */
  skillBonuses: Array<{
    /** Skills that receive the bonus */
    skills: string[];
    /** Bonus value */
    bonus: number;
    /** Source description (e.g., "Major Virtuous Doctrine") */
    source: string;
  }>;
  /** Features unlocked by the doctrine */
  unlockedFeatures: string[];
  /** Penalties from extreme doctrine levels */
  penalties: DoctrinePenalty[];
}
