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
 * Remove generic structure/worksite badges when specific badges are provided
 *
 * Use this after calling DamageStructureHandler.prepare() or DestroyStructureHandler.prepare()
 * which add specific badges with structure names. This removes the generic badge to avoid duplication.
 *
 * @param badges - Array of outcome badges
 * @returns Modified badges array with generic structure/worksite badges removed
 *
 * @example
 * ```typescript
 * const cmd = await handler.prepare({ type: 'damageStructure', count: 1 }, ctx);
 * if (cmd) {
 *   if (cmd.outcomeBadges) outcomeBadges.push(...cmd.outcomeBadges);
 *   outcomeBadges = removeGenericStructureBadges(outcomeBadges);
 * }
 * ```
 */
export function removeGenericStructureBadges(badges: any[]): any[] {
  // Remove generic structure/worksite badges
  // Matches: "1 structure damaged", "2 structures damaged", "1 structure destroyed", etc.
  return badges.filter(badge => {
    const template = badge.template || '';
    return !(
      template.match(/^\d+ structures? (damaged|destroyed)$/) ||
      template.match(/^\d+ worksites? (damaged|destroyed)$/)
    );
  });
}

/**
 * Remove generic imprisonment badges when specific badges are provided
 *
 * Use this after calling ConvertUnrestToImprisonedHandler.prepare() or AddImprisonedHandler.prepare()
 * which add specific badges with settlement names. This removes the generic badge to avoid duplication.
 *
 * NOTE: This is also handled automatically by OutcomeBadges.svelte's deduplicateBadges function,
 * but this helper can be used explicitly in pipelines if needed.
 *
 * @param badges - Array of outcome badges
 * @returns Modified badges array with generic imprisonment badges removed
 *
 * @example
 * ```typescript
 * const cmd = await imprisonHandler.prepare({ type: 'convertUnrestToImprisoned', amount: 3 }, ctx);
 * if (cmd) {
 *   if (cmd.outcomeBadges) outcomeBadges.push(...cmd.outcomeBadges);
 *   outcomeBadges = removeGenericImprisonBadges(outcomeBadges);
 * }
 * ```
 */
export function removeGenericImprisonBadges(badges: any[]): any[] {
  // Check if we have specific imprisonment badges (with settlement names)
  const hasSpecificBadge = badges.some(badge => {
    const template = badge.template || '';
    return template.match(/[Ii]mprison .+ in \w+/i) || template.match(/[Ii]nnocents .+ in \w+/i);
  });

  if (!hasSpecificBadge) {
    return badges;
  }

  // Remove generic imprisonment badges
  // Generic badges: "Imprison {{value}} dissidents", "{{value}} innocents harmed/imprisoned"
  return badges.filter(badge => {
    const template = badge.template || '';
    const isGenericImprison = template.match(/^[Ii]mprison \{\{value\}\} dissidents$/i);
    const isGenericInnocents = template.match(/^\{\{value\}\} innocents (harmed|imprisoned)$/i);
    return !isGenericImprison && !isGenericInnocents;
  });
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
  
  // Extract verb and object from action string (e.g., "Imprison innocents" -> "Imprison" + "innocents")
  const actionParts = action.split(' ');
  const verb = actionParts[0];
  const object = actionParts.slice(1).join(' ');
  
  const template = object 
    ? `${verb} {{value}} ${object} in ${selectedTarget.name}`
    : `${action} {{value}} in ${selectedTarget.name}`;
  
  return {
    badge: {
      icon,
      template,
      variant,
      value: { type: 'dice' as const, formula }
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
  
  // Extract verb and object from action string (e.g., "Imprison innocents" -> "Imprison" + "innocents")
  const actionParts = action.split(' ');
  const verb = actionParts[0];
  const object = actionParts.slice(1).join(' ');
  
  const template = object 
    ? `${verb} ${actualAmount} ${object} in ${selectedTarget.name}`
    : `${action} ${actualAmount} in ${selectedTarget.name}`;
  
  return {
    badge: {
      icon,
      template,
      variant
    },
    targetId: selectedTarget.id,
    targetName: selectedTarget.name,
    maxCapacity: selectedTarget.capacity
  };
}
