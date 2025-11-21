/**
 * OutcomeBadge.ts
 * 
 * Unified badge system for outcome display.
 * Supports both static values and interactive dice rolls.
 */

/**
 * Badge value can be static (number) or dice (formula + optional result)
 */
export type BadgeValue = 
  | { type: 'static'; amount: number }
  | { type: 'dice'; formula: string; result?: number };

/**
 * Unified outcome badge structure
 * 
 * Examples:
 * - Static: { icon: 'fa-coins', prefix: 'Receive', value: { type: 'static', amount: 50 }, suffix: 'gold' }
 *   Renders: "🪙 Receive 50 gold"
 * 
 * - Dice (unrolled): { icon: 'fa-gavel', prefix: 'Remove', value: { type: 'dice', formula: '1d4' }, suffix: 'imprisoned unrest' }
 *   Renders: "🔨 Remove [🎲 1d4] imprisoned unrest" (clickable)
 * 
 * - Dice (resolved): { icon: 'fa-gavel', prefix: 'Remove', value: { type: 'dice', formula: '1d4', result: 3 }, suffix: 'imprisoned unrest' }
 *   Renders: "🔨 Remove 3 imprisoned unrest" (static)
 */
export interface UnifiedOutcomeBadge {
  icon: string;           // FontAwesome icon class (e.g., 'fa-coins')
  prefix?: string;        // Text before value (e.g., 'Remove')
  value: BadgeValue;      // Static number or dice formula
  suffix?: string;        // Text after value (e.g., 'imprisoned unrest from Castle Aldori')
  variant?: 'positive' | 'negative' | 'neutral';  // Visual styling
}

/**
 * Legacy badge format (for backward compatibility)
 */
export interface LegacyOutcomeBadge {
  icon: string;
  message: string;
}

/**
 * Type guard to check if badge is legacy format
 */
export function isLegacyBadge(badge: any): badge is LegacyOutcomeBadge {
  return badge && typeof badge.icon === 'string' && typeof badge.message === 'string' && !badge.value;
}

/**
 * Type guard to check if badge is unified format
 */
export function isUnifiedBadge(badge: any): badge is UnifiedOutcomeBadge {
  return badge && typeof badge.icon === 'string' && badge.value !== undefined;
}

/**
 * Convert legacy badge to unified format (for backward compatibility)
 */
export function convertLegacyBadge(legacy: LegacyOutcomeBadge): UnifiedOutcomeBadge {
  // Try to extract a number from the message for display
  // e.g., "Receive 50 gold" -> prefix: "Receive", value: 50, suffix: "gold"
  const match = legacy.message.match(/^(.+?)\s+(\d+)\s+(.+)$/);
  
  if (match) {
    return {
      icon: legacy.icon,
      prefix: match[1],
      value: { type: 'static', amount: parseInt(match[2], 10) },
      suffix: match[3]
    };
  }
  
  // Fallback: treat entire message as suffix with no value
  return {
    icon: legacy.icon,
    value: { type: 'static', amount: 0 },
    suffix: legacy.message
  };
}
