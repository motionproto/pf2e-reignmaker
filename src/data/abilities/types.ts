/**
 * PF2e-compatible type definitions for doctrine abilities
 *
 * These types model the structure of PF2e effect items that can be
 * added to army actors. They are self-contained and independent
 * from the PF2e system's own type definitions.
 */

// === Bonus Types ===

export type BonusType = 'status' | 'circumstance' | 'item' | 'untyped';

// === Rule Elements ===

export interface FlatModifierRule {
  key: 'FlatModifier';
  selector: string;  // 'initiative', 'saving-throw', 'ac', 'attack', 'damage', 'strike-damage', etc.
  value: number;
  type: BonusType;
  slug: string;
  predicate?: string[];
}

// Union type for all supported rule elements
// Extend as needed for other RuleElement types (DamageDice, GrantItem, etc.)
export type RuleElement = FlatModifierRule;

// === Aura Configuration ===

export interface AuraAppearance {
  border: { color: string };
  highlight: { color: string };
}

export interface AuraConfig {
  radius: number;
  effects: string[];
  traits?: string[];
  hostile?: boolean;
  appearance: AuraAppearance;
}

// === Action Types ===

export type ActionType = 'passive' | 'reaction' | 'free' | 'one' | 'two' | 'three';
export type ItemType = 'effect' | 'action';
export type ItemCategory = 'offensive' | 'defensive';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'unique';

// === Main Effect Data Structure ===

export interface DoctrineEffectData {
  _id: string;
  name: string;
  img: string;
  type: ItemType;
  system: {
    actionType: { value: ActionType };
    actions: { value: number | null };
    category: ItemCategory;
    description: { value: string };
    publication: {
      license: string;
      remaster: boolean;
      title: string;
    };
    rules: RuleElement[];
    traits: {
      rarity: Rarity;
      value: string[];
    };
    aura?: AuraConfig;
  };
}
