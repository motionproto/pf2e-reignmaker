import type { DoctrineEffectData } from './types';

export const rally: DoctrineEffectData = {
  _id: 'ReignmakerRally',
  name: 'Rally',
  img: 'icons/environment/people/group.webp',
  type: 'effect',
  system: {
    actionType: { value: 'passive' },
    actions: { value: null },
    category: 'defensive',
    description: {
      value: '<p>The army rallies its allies with disciplined coordination and tactical support.</p>\n<p><strong>Effect:</strong> This army and all allied armies within 60 feet gain a +1 circumstance bonus to AC and saving throws.</p>'
    },
    publication: {
      license: 'Custom',
      remaster: true,
      title: 'ReignMaker'
    },
    rules: [
      {
        key: 'FlatModifier',
        selector: 'ac',
        value: 1,
        type: 'circumstance',
        slug: 'rally-ac'
      },
      {
        key: 'FlatModifier',
        selector: 'saving-throw',
        value: 1,
        type: 'circumstance',
        slug: 'rally-saves'
      }
    ],
    traits: {
      rarity: 'common',
      value: ['aura', 'auditory', 'linguistic']
    },
    aura: {
      radius: 60,
      effects: ['rally'],
      appearance: {
        border: { color: '#4169E1' },
        highlight: { color: '#4169E133' }
      }
    }
  }
};
