/**
 * RollModifier - Standardized type for roll modifiers throughout the system
 * 
 * This type provides a consistent format for modifiers as they flow through:
 * - Kingdom modifier calculation
 * - PF2e system integration
 * - Roll state storage for rerolls
 * - UI display
 * 
 * Using a single type eliminates format conversions and maintains type safety.
 */

/**
 * Modifier types supported by the PF2e system
 * See: https://2e.aonprd.com/Rules.aspx?ID=2439
 */
export type ModifierType = 'circumstance' | 'item' | 'status' | 'untyped';

/**
 * Standardized roll modifier format
 * Used throughout the roll system for consistency
 */
export interface RollModifier {
  /** Display label for the modifier (e.g., "Town Hall", "Aid from Alice") */
  label: string;
  
  /** Numeric value of the modifier (can be positive or negative) */
  value: number;
  
  /** PF2e modifier type (affects stacking rules) */
  type: ModifierType;
  
  /** Whether the modifier is currently enabled */
  enabled: boolean;
  
  /** Whether the modifier is ignored (disabled by user or stacking rules) */
  ignored: boolean;
  
  /** Optional source identifier (e.g., 'structure', 'aid', 'custom', 'unrest') */
  source?: string;
}

/**
 * Convert from PF2e message modifier format to RollModifier
 * Used when extracting modifiers from PF2e roll messages
 */
export function fromPF2eModifier(pf2eMod: any): RollModifier {
  return {
    label: pf2eMod.label || '',
    value: pf2eMod.modifier || 0,
    type: (pf2eMod.type as ModifierType) || 'circumstance',
    enabled: pf2eMod.enabled ?? true,
    ignored: pf2eMod.ignored ?? false,
    source: pf2eMod.slug || undefined
  };
}

/**
 * Convert from kingdom modifier format to RollModifier
 * Used when preparing modifiers for PF2e rolls
 */
export function fromKingdomModifier(kingdomMod: any): RollModifier {
  return {
    label: kingdomMod.name || kingdomMod.label || '',
    value: kingdomMod.value || kingdomMod.modifier || 0,
    type: (kingdomMod.type as ModifierType) || 'circumstance',
    enabled: kingdomMod.enabled ?? !kingdomMod.ignored,
    ignored: kingdomMod.ignored ?? false,
    source: kingdomMod.source || undefined
  };
}

/**
 * Convert RollModifier to PF2e modifier format
 * Used when passing modifiers to PF2e skill.roll()
 */
export function toPF2eModifier(mod: RollModifier): any {
  return {
    label: mod.label,
    modifier: mod.value,
    type: mod.type,
    enabled: mod.enabled,
    ignored: mod.ignored,
    slug: mod.label.toLowerCase().replace(/\s+/g, '-'),
    test: () => true
  };
}

/**
 * Filter modifiers to exclude ability and proficiency (for reroll storage)
 * These are automatically recalculated by PF2e and shouldn't be stored
 */
export function filterForStorage(modifiers: RollModifier[]): RollModifier[] {
  return modifiers.filter(mod => 
    mod.type !== 'ability' && mod.type !== 'proficiency'
  );
}











