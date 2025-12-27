import type { DoctrineEffectData } from './types';

export const noQuarter: DoctrineEffectData = {
  _id: 'ReignmakerNoQuarter',
  name: 'No Quarter!',
  img: 'icons/skills/melee/blade-tip-blood-red.webp',
  type: 'effect',
  system: {
    actionType: { value: 'passive' },
    actions: { value: null },
    category: 'offensive',
    description: {
      value: '<p>The army fights with ruthless aggression, showing no mercy to their foes.</p>\n<p><strong>Effect:</strong> This army and all allied armies within 60 feet gain a +1 status bonus to attack rolls and damage rolls.</p>'
    },
    publication: {
      license: 'Custom',
      remaster: true,
      title: 'ReignMaker'
    },
    rules: [
      {
        key: 'FlatModifier',
        selector: 'attack',
        value: 1,
        type: 'status',
        slug: 'no-quarter-attack'
      },
      {
        key: 'FlatModifier',
        selector: 'damage',
        value: 1,
        type: 'status',
        slug: 'no-quarter-damage'
      }
    ],
    traits: {
      rarity: 'common',
      value: ['aura', 'emotion', 'mental']
    },
    aura: {
      radius: 60,
      effects: ['no-quarter'],
      appearance: {
        border: { color: '#8B0000' },
        highlight: { color: '#8B000033' }
      }
    }
  }
};
