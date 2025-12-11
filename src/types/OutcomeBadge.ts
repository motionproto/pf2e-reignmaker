/**
 * OutcomeBadge.ts
 * 
 * Unified badge system for outcome display.
 * Uses template strings with {{value}} and {{context}} placeholders.
 */

/**
 * Badge value can be static (number) or dice (formula + optional result)
 */
export type BadgeValue = 
  | { type: 'static'; amount: number }
  | { type: 'dice'; formula: string; result?: number; resolvedText?: string };

/**
 * Unified outcome badge with template string support
 * 
 * Examples:
 * - Simple: { icon: 'fa-coins', template: 'Receive {{value}} gold', value: { type: 'static', amount: 50 } }
 * - Dice: { icon: 'fa-dice', template: 'Roll {{value}} damage', value: { type: 'dice', formula: '1d4+1' } }
 * - Context: { icon: 'fa-building', template: 'Found {{name}} settlement', context: { name: 'Tuskwater' } }
 * - Mixed: { icon: 'fa-handshake', template: '{{faction}} sends {{value}} troops', value: { type: 'dice', formula: '1d6' }, context: { faction: 'Swordlords' } }
 * - Text-only: { icon: 'fa-info', template: 'GM will disclose information' }
 */
export interface UnifiedOutcomeBadge {
  icon: string;
  template: string;
  value?: BadgeValue;
  context?: Record<string, string>;
  variant?: 'default' | 'positive' | 'negative' | 'info';
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
  return badge && typeof badge.icon === 'string' && typeof badge.message === 'string' && !badge.template;
}

/**
 * Type guard to check if badge is unified format
 */
export function isUnifiedBadge(badge: any): badge is UnifiedOutcomeBadge {
  return badge && typeof badge.icon === 'string' && typeof badge.template === 'string';
}

/**
 * Convert legacy badge to unified format
 */
export function convertLegacyBadge(legacy: LegacyOutcomeBadge): UnifiedOutcomeBadge {
  return {
    icon: legacy.icon,
    template: legacy.message
  };
}

/**
 * Render a badge template to final display string
 * Returns segments for rendering (text or dice placeholder)
 */
export type TemplateSegment = 
  | { type: 'text'; content: string }
  | { type: 'value'; value: BadgeValue };

export function renderBadgeTemplate(badge: UnifiedOutcomeBadge): TemplateSegment[] {
  const segments: TemplateSegment[] = [];
  let template = badge.template;
  
  // Replace context placeholders first
  if (badge.context) {
    for (const [key, val] of Object.entries(badge.context)) {
      template = template.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
    }
  }
  
  // Split on {{value}} placeholder
  const parts = template.split(/\{\{value\}\}/);
  
  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) {
      segments.push({ type: 'text', content: parts[i] });
    }
    // Add value segment between parts (not after last)
    if (i < parts.length - 1 && badge.value) {
      // If dice badge has resolvedText, render as plain text instead of value segment
      if (badge.value.type === 'dice' && badge.value.resolvedText !== undefined) {
        segments.push({ type: 'text', content: badge.value.resolvedText });
      } else {
        segments.push({ type: 'value', value: badge.value });
      }
    }
  }
  
  return segments;
}

/**
 * Render badge to plain string (for simple display without interactivity)
 */
export function renderBadgeToString(badge: UnifiedOutcomeBadge): string {
  let result = badge.template;
  
  // Replace context
  if (badge.context) {
    for (const [key, val] of Object.entries(badge.context)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
    }
  }
  
  // Replace value
  if (badge.value) {
    const valueStr = badge.value.type === 'static'
      ? badge.value.amount.toString()
      : badge.value.resolvedText !== undefined
        ? badge.value.resolvedText
        : badge.value.result !== undefined
          ? badge.value.result.toString()
          : badge.value.formula;
    result = result.replace(/\{\{value\}\}/g, valueStr);
  }
  
  return result;
}

// ============================================
// Helper functions for creating badges
// ============================================

/**
 * Simple text-only badge (no value, no context)
 */
export function textBadge(
  message: string,
  icon: string,
  variant?: 'default' | 'positive' | 'negative' | 'info'
): UnifiedOutcomeBadge {
  return {
    icon,
    template: message,
    variant
  };
}

/**
 * Badge with static value
 */
export function valueBadge(
  template: string,
  icon: string,
  amount: number,
  variant?: 'default' | 'positive' | 'negative' | 'info'
): UnifiedOutcomeBadge {
  return {
    icon,
    template,
    value: { type: 'static', amount },
    variant
  };
}

/**
 * Badge with dice roll
 */
export function diceBadge(
  template: string,
  icon: string,
  formula: string,
  variant?: 'default' | 'positive' | 'negative' | 'info'
): UnifiedOutcomeBadge {
  return {
    icon,
    template,
    value: { type: 'dice', formula },
    variant
  };
}

/**
 * Flexible badge creation with all options
 */
export function badge(options: {
  icon: string;
  template: string;
  value?: number | { formula: string };
  context?: Record<string, string>;
  variant?: 'positive' | 'negative' | 'info';
}): UnifiedOutcomeBadge {
  const badgeValue: BadgeValue | undefined = 
    typeof options.value === 'number'
      ? { type: 'static', amount: options.value }
      : options.value?.formula
        ? { type: 'dice', formula: options.value.formula }
        : undefined;

  return {
    icon: options.icon,
    template: options.template,
    value: badgeValue,
    context: options.context,
    variant: options.variant ?? 'info'
  };
}
