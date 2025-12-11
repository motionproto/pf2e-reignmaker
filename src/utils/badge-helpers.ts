/**
 * Badge Helpers
 * 
 * Utilities for manipulating outcome badges
 */

/**
 * Action target for settlement-specific operations
 */
export interface ActionTarget {
  id: string;
  name: string;
  capacity: number;
}

/**
 * Replace generic faction adjustment badges with specific faction badges
 * 
 * Use this when a faction is randomly selected during preview.calculate and you need to
 * replace the generic badge (e.g., "Adjust 1 faction -1") with a specific badge that
 * includes the actual faction name.
 * 
 * @param badges - Array of outcome badges
 * @param specificBadge - The specific badge to add (with faction name)
 * @returns Modified badges array with generic badge removed and specific badge added
 * 
 * @example
 * ```typescript
 * const specificBadge = textBadge(
 *   `Relations with ${faction.name} worsen: ${oldAttitude} → ${newAttitude}`,
 *   'fas fa-handshake-slash',
 *   'negative'
 * );
 * outcomeBadges = replaceGenericFactionBadge(outcomeBadges, specificBadge);
 * ```
 */
export function replaceGenericFactionBadge(
  badges: any[], 
  specificBadge: any
): any[] {
  // Remove any generic faction adjustment badges
  // Matches patterns like: "Adjust 1 faction -1", "Adjust 1 faction +1", etc.
  const filtered = badges.filter(badge => 
    !badge.template?.match(/^Adjust \d+ faction [+-]\d+$/)
  );
  
  // Add the specific badge
  filtered.push(specificBadge);
  
  return filtered;
}

/**
 * Create a targeted dice badge with auto-selected settlement
 * 
 * @param options - Badge creation options
 * @returns Badge and selected target info
 */
export function createTargetedDiceBadge(options: {
  formula: string;
  action: string;
  targets: ActionTarget[];
  icon: string;
  variant: 'positive' | 'negative' | 'neutral' | 'info';
  noTargetMessage: string;
}): {
  badge: any;
  targetId: string | null;
  targetName: string | null;
  maxCapacity: number;
} {
  const { formula, action, targets, icon, variant, noTargetMessage } = options;
  
  // Find settlement with highest capacity
  const validTargets = targets.filter(t => t.capacity > 0);
  const selectedTarget = validTargets.length > 0
    ? validTargets.reduce((max, t) => t.capacity > max.capacity ? t : max)
    : null;
  
  if (!selectedTarget) {
    return {
      badge: {
        icon,
        template: noTargetMessage,
        variant: 'neutral'
      },
      targetId: null,
      targetName: null,
      maxCapacity: 0
    };
  }
  
  return {
    badge: {
      icon,
      template: `${action} {{value}} in ${selectedTarget.name}`,
      variant,
      diceFormula: formula
    },
    targetId: selectedTarget.id,
    targetName: selectedTarget.name,
    maxCapacity: selectedTarget.capacity
  };
}

/**
 * Create a targeted static badge with auto-selected settlement
 * 
 * @param options - Badge creation options
 * @returns Badge and selected target info
 */
export function createTargetedStaticBadge(options: {
  amount: number;
  action: string;
  targets: ActionTarget[];
  icon: string;
  variant: 'positive' | 'negative' | 'neutral' | 'info';
  noTargetMessage: string;
}): {
  badge: any;
  targetId: string | null;
  targetName: string | null;
  maxCapacity: number;
} {
  const { amount, action, targets, icon, variant, noTargetMessage } = options;
  
  // Find settlement with highest capacity
  const validTargets = targets.filter(t => t.capacity > 0);
  const selectedTarget = validTargets.length > 0
    ? validTargets.reduce((max, t) => t.capacity > max.capacity ? t : max)
    : null;
  
  if (!selectedTarget) {
    return {
      badge: {
        icon,
        template: noTargetMessage,
        variant: 'neutral'
      },
      targetId: null,
      targetName: null,
      maxCapacity: 0
    };
  }
  
  const actualAmount = Math.min(amount, selectedTarget.capacity);
  
  return {
    badge: {
      icon,
      template: `${action} ${actualAmount} in ${selectedTarget.name}`,
      variant
    },
    targetId: selectedTarget.id,
    targetName: selectedTarget.name,
    maxCapacity: selectedTarget.capacity
  };
}
