/**
 * DoctrineService - Central service for the Doctrine Series system
 *
 * The single source of truth for doctrine state, effects, and milestones.
 * Doctrines are accumulated through event choices (+5) and action skill selections (+1).
 */

import { get } from 'svelte/store';
import { kingdomData, getKingdomActor } from '../../stores/KingdomStore';
import type {
  DoctrineType,
  DoctrineTier,
  DoctrineState,
  DoctrineEffects,
  DoctrineMilestone,
  DoctrineTierConfig,
  DoctrinePenalty
} from '../../types/Doctrine';
import {
  DOCTRINE_THRESHOLDS,
  DOCTRINE_TIER_ORDER,
  DOCTRINE_TIER_EFFECTS,
  DOCTRINE_COLORS,
  DOCTRINE_PENALTIES,
  DEFAULT_DOCTRINE_VALUES,
  getSkillDoctrine
} from '../../constants/doctrine';
import type { KingdomData } from '../../actors/KingdomActor';
import { logger } from '../../utils/Logger';

/**
 * DoctrineService class - singleton pattern
 */
class DoctrineService {
  private static instance: DoctrineService;

  static getInstance(): DoctrineService {
    if (!DoctrineService.instance) {
      DoctrineService.instance = new DoctrineService();
    }
    return DoctrineService.instance;
  }

  /**
   * Get current doctrine state from kingdom data
   */
  getDoctrineState(): DoctrineState {
    const kingdom = get(kingdomData);

    // Handle case when kingdom data is not yet loaded
    if (!kingdom) {
      const defaultValues = { ...DEFAULT_DOCTRINE_VALUES };
      return {
        dominant: null,
        dominantTier: 'none',
        values: defaultValues,
        tierInfo: {
          idealist: this.getTierConfig('idealist', 0),
          practical: this.getTierConfig('practical', 0),
          ruthless: this.getTierConfig('ruthless', 0)
        }
      };
    }

    const values = kingdom.doctrine || { ...DEFAULT_DOCTRINE_VALUES };
    const previousDominant = kingdom.dominantDoctrine || null;

    const tierInfo: Record<DoctrineType, DoctrineTierConfig> = {
      idealist: this.getTierConfig('idealist', values.idealist || 0),
      practical: this.getTierConfig('practical', values.practical || 0),
      ruthless: this.getTierConfig('ruthless', values.ruthless || 0)
    };

    const dominant = this.calculateDominant(values, previousDominant);
    const dominantTier = dominant ? tierInfo[dominant].tier : 'none';

    return {
      dominant,
      dominantTier,
      values,
      tierInfo
    };
  }

  /**
   * Calculate which doctrine is dominant
   * In case of a tie, uses previous dominant if available,
   * otherwise prefers: practical > idealist > ruthless
   */
  private calculateDominant(
    values: Record<DoctrineType, number>,
    previousDominant: DoctrineType | null
  ): DoctrineType | null {
    const i = values.idealist || 0;
    const p = values.practical || 0;
    const r = values.ruthless || 0;

    const max = Math.max(i, p, r);
    if (max === 0) return null;

    const dominants: DoctrineType[] = [];
    if (i === max) dominants.push('idealist');
    if (p === max) dominants.push('practical');
    if (r === max) dominants.push('ruthless');

    // Single dominant - clear winner
    if (dominants.length === 1) {
      return dominants[0];
    }

    // Tie - prefer previous dominant if it's one of the tied values
    if (previousDominant && dominants.includes(previousDominant)) {
      return previousDominant;
    }

    // No previous dominant or it's not in the tie - use preference order
    const preferenceOrder: DoctrineType[] = ['practical', 'idealist', 'ruthless'];
    for (const doctrine of preferenceOrder) {
      if (dominants.includes(doctrine)) {
        return doctrine;
      }
    }

    return dominants[0];
  }

  /**
   * Get tier for a given point value
   */
  getTierForValue(value: number): DoctrineTier {
    if (value >= DOCTRINE_THRESHOLDS.absolute) return 'absolute';
    if (value >= DOCTRINE_THRESHOLDS.major) return 'major';
    if (value >= DOCTRINE_THRESHOLDS.moderate) return 'moderate';
    if (value >= DOCTRINE_THRESHOLDS.minor) return 'minor';
    return 'none';
  }

  /**
   * Get the next threshold to reach from current value
   */
  getNextThreshold(value: number): number | null {
    const currentTier = this.getTierForValue(value);
    const currentIndex = DOCTRINE_TIER_ORDER.indexOf(currentTier);

    if (currentIndex >= DOCTRINE_TIER_ORDER.length - 1) {
      return null; // Already at absolute
    }

    const nextTier = DOCTRINE_TIER_ORDER[currentIndex + 1];
    return DOCTRINE_THRESHOLDS[nextTier];
  }

  /**
   * Get tier configuration for a doctrine value
   */
  private getTierConfig(doctrine: DoctrineType, value: number): DoctrineTierConfig {
    const tier = this.getTierForValue(value);
    const effects = DOCTRINE_TIER_EFFECTS[tier];

    return {
      tier,
      threshold: DOCTRINE_THRESHOLDS[tier],
      label: this.getTierLabel(doctrine, tier),
      color: this.getTierColor(doctrine, tier),
      skillBonus: effects.skillBonus
    };
  }

  /**
   * Get display label for a doctrine tier
   */
  private getTierLabel(doctrine: DoctrineType, tier: DoctrineTier): string {
    if (tier === 'none') return 'No Doctrine';
    const doctrineCapitalized = doctrine.charAt(0).toUpperCase() + doctrine.slice(1);
    const tierCapitalized = tier.charAt(0).toUpperCase() + tier.slice(1);
    return `${tierCapitalized} ${doctrineCapitalized}`;
  }

  /**
   * Get color for a doctrine tier
   */
  private getTierColor(doctrine: DoctrineType, tier: DoctrineTier): string {
    if (tier === 'none') return 'var(--text-muted)';
    return DOCTRINE_COLORS[doctrine];
  }

  /**
   * Check if a tier meets or exceeds a minimum tier
   */
  tierMeetsMinimum(current: DoctrineTier, minimum: DoctrineTier): boolean {
    return DOCTRINE_TIER_ORDER.indexOf(current) >= DOCTRINE_TIER_ORDER.indexOf(minimum);
  }

  /**
   * Get all current effects from the dominant doctrine
   */
  getDoctrineEffects(): DoctrineEffects {
    const state = this.getDoctrineState();
    const effects: DoctrineEffects = {
      skillBonuses: [],
      unlockedFeatures: [],
      penalties: []
    };

    if (!state.dominant || state.dominantTier === 'none') {
      return effects;
    }

    const tierConfig = state.tierInfo[state.dominant];

    // Skill bonuses for aligned skills
    if (tierConfig.skillBonus > 0) {
      effects.skillBonuses.push({
        skills: [], // Skills will be determined by DoctrineService based on action pipelines
        bonus: tierConfig.skillBonus,
        source: tierConfig.label
      });
    }

    // Penalties for extreme doctrines
    const penaltyConfig = DOCTRINE_PENALTIES[state.dominant];
    if (penaltyConfig && this.tierMeetsMinimum(state.dominantTier, penaltyConfig.minTier)) {
      effects.penalties.push(...penaltyConfig.effects);
    }

    return effects;
  }

  /**
   * Get skill bonus from doctrine for a specific skill
   * Uses centralized skill-to-doctrine mapping
   */
  getSkillBonus(skillName: string): number {
    const state = this.getDoctrineState();

    if (!state.dominant || state.dominantTier === 'none') {
      return 0;
    }

    // Look up the skill's doctrine alignment from centralized groups
    const skillDoctrine = getSkillDoctrine(skillName);

    // If skill aligns with dominant doctrine, apply bonus
    if (skillDoctrine && skillDoctrine === state.dominant) {
      return state.tierInfo[state.dominant].skillBonus;
    }

    return 0;
  }

  /**
   * Get skill penalty for Practical doctrine at Major+ tier
   * Returns penalty for non-aligned skills
   */
  getSkillPenalty(skillName: string): number {
    const state = this.getDoctrineState();

    // Only Practical doctrine at Major+ applies skill penalties
    if (state.dominant !== 'practical') {
      return 0;
    }

    const penaltyConfig = DOCTRINE_PENALTIES.practical;
    if (!this.tierMeetsMinimum(state.dominantTier, penaltyConfig.minTier)) {
      return 0;
    }

    // Look up the skill's doctrine alignment from centralized groups
    const skillDoctrine = getSkillDoctrine(skillName);

    // If skill is NOT aligned with practical, apply penalty
    // Skills not in any group also get the penalty (they're non-aligned)
    if (skillDoctrine !== 'practical') {
      const penalty = penaltyConfig.effects.find(e => e.type === 'skill');
      return penalty?.value || 0;
    }

    return 0;
  }

  /**
   * Check if a structure requirement is met
   */
  checkStructureRequirement(requirement: { doctrine: DoctrineType; minTier: DoctrineTier }): { met: boolean; reason?: string } {
    const state = this.getDoctrineState();
    const currentTier = state.tierInfo[requirement.doctrine].tier;

    if (this.tierMeetsMinimum(currentTier, requirement.minTier)) {
      return { met: true };
    }

    return {
      met: false,
      reason: `Requires ${requirement.minTier} ${requirement.doctrine} doctrine (current: ${currentTier})`
    };
  }

  /**
   * Check and record new milestones
   * Returns array of newly achieved milestones
   */
  async checkAndRecordMilestones(): Promise<DoctrineMilestone[]> {
    const actor = getKingdomActor();
    if (!actor) return [];

    const kingdom = actor.getKingdomData();
    const currentMilestones: DoctrineMilestone[] = kingdom.doctrineMilestones || [];
    const newMilestones: DoctrineMilestone[] = [];
    const state = this.getDoctrineState();

    for (const doctrine of ['idealist', 'practical', 'ruthless'] as DoctrineType[]) {
      const currentTier = state.tierInfo[doctrine].tier;
      if (currentTier === 'none') continue;

      // Check all tiers up to and including current tier
      for (const tier of DOCTRINE_TIER_ORDER) {
        if (tier === 'none') continue;

        // Skip tiers higher than current
        if (DOCTRINE_TIER_ORDER.indexOf(tier) > DOCTRINE_TIER_ORDER.indexOf(currentTier)) {
          break;
        }

        // Check if milestone already recorded
        const existingMilestone = currentMilestones.find(
          m => m.doctrine === doctrine && m.tier === tier
        );

        if (!existingMilestone) {
          const milestone: DoctrineMilestone = {
            id: `${doctrine}-${tier}-${Date.now()}`,
            doctrine,
            tier,
            achievedTurn: kingdom.currentTurn,
            timestamp: Date.now()
          };
          newMilestones.push(milestone);
        }
      }
    }

    if (newMilestones.length > 0) {
      await actor.updateKingdomData((k: KingdomData) => {
        if (!k.doctrineMilestones) {
          k.doctrineMilestones = [];
        }
        k.doctrineMilestones.push(...newMilestones);
      });

      logger.info(`[DoctrineService] Recorded ${newMilestones.length} new milestones:`,
        newMilestones.map(m => `${m.tier} ${m.doctrine}`).join(', ')
      );
    }

    return newMilestones;
  }

  /**
   * Get milestones achieved in the current turn
   */
  getCurrentTurnMilestones(): DoctrineMilestone[] {
    const kingdom = get(kingdomData);
    const milestones = kingdom.doctrineMilestones || [];
    return milestones.filter(m => m.achievedTurn === kingdom.currentTurn);
  }

  /**
   * Update the persisted dominant doctrine if it has changed
   * Should be called whenever doctrine values change
   */
  async updateDominantDoctrine(): Promise<void> {
    const actor = getKingdomActor();
    if (!actor) return;

    const state = this.getDoctrineState();
    const kingdom = actor.getKingdomData();
    const currentPersisted = kingdom.dominantDoctrine || null;

    // Only update if dominant has changed
    if (state.dominant !== currentPersisted) {
      await actor.updateKingdomData((k: KingdomData) => {
        k.dominantDoctrine = state.dominant;
      });

      logger.info(`[DoctrineService] Dominant doctrine changed: ${currentPersisted} -> ${state.dominant}`);
    }
  }
}

// Export singleton instance
export const doctrineService = DoctrineService.getInstance();

// Export class for testing
export { DoctrineService };
