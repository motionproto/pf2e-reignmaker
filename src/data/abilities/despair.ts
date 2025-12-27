import type { DoctrineEffectData } from './types';

export const despair: DoctrineEffectData = {
  _id: 'ReignmakerDespair',
  name: 'Despair',
  img: 'icons/magic/unholy/silhouette-evil-horned-giant.webp',
  type: 'effect',
  system: {
    actionType: { value: 'passive' },
    actions: { value: null },
    category: 'offensive',
    description: {
      value: '<p>The army radiates an aura of dread and hopelessness that breaks the will of enemies.</p>\n<p><strong>Effect:</strong> Enemy armies within 60 feet become frightened 1 and cannot reduce their frightened condition below 1 while they remain in the aura.</p>\n<p><strong>Immunity:</strong> Creatures immune to fear are unaffected.</p>'
    },
    publication: {
      license: 'Custom',
      remaster: true,
      title: 'ReignMaker'
    },
    rules: [
      {
        key: 'FlatModifier',
        selector: 'all',
        value: -1,
        type: 'status',
        predicate: ['self:condition:frightened'],
        slug: 'despair-frightened'
      }
    ],
    traits: {
      rarity: 'common',
      value: ['aura', 'emotion', 'fear', 'mental']
    },
    aura: {
      radius: 60,
      effects: ['despair'],
      traits: ['emotion', 'fear', 'mental'],
      hostile: true,
      appearance: {
        border: { color: '#4B0082' },
        highlight: { color: '#4B008233' }
      }
    }
  }
};
