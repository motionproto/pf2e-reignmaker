import type { DoctrineEffectData } from './types';

export const inspiringAura: DoctrineEffectData = {
  _id: 'ReignmakerInspiringAura',
  name: 'Inspiring Aura',
  img: 'icons/magic/light/orb-rays-yellow.webp',
  type: 'effect',
  system: {
    actionType: { value: 'passive' },
    actions: { value: null },
    category: 'defensive',
    description: {
      value: '<p>The army inspires allies through unwavering conviction and righteous purpose.</p>\n<p><strong>Effect:</strong> This army and all allied armies within 60 feet gain a +1 status bonus to initiative rolls and saving throws against fear effects.</p>'
    },
    publication: {
      license: 'Custom',
      remaster: true,
      title: 'ReignMaker'
    },
    rules: [
      {
        key: 'FlatModifier',
        selector: 'initiative',
        value: 1,
        type: 'status',
        slug: 'inspiring-aura-initiative'
      },
      {
        key: 'FlatModifier',
        selector: 'saving-throw',
        value: 1,
        type: 'status',
        predicate: ['fear'],
        slug: 'inspiring-aura-fear-save'
      }
    ],
    traits: {
      rarity: 'common',
      value: ['aura', 'emotion', 'mental']
    },
    aura: {
      radius: 60,
      effects: ['inspiring-aura'],
      appearance: {
        border: { color: '#FFD700' },
        highlight: { color: '#FFD70033' }
      }
    }
  }
};
