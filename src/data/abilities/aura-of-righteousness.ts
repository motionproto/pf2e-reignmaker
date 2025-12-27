import type { DoctrineEffectData } from './types';

export const auraOfRighteousness: DoctrineEffectData = {
  _id: 'ReignmakerAuraOfRighteousness',
  name: 'Aura of Righteousness',
  img: 'icons/magic/holy/angel-wings-white.webp',
  type: 'effect',
  system: {
    actionType: { value: 'passive' },
    actions: { value: null },
    category: 'defensive',
    description: {
      value: '<p>The army radiates an aura of holy righteousness that shields allies against unholy forces.</p>\n<p><strong>Effect:</strong> This army and all allied armies within 20 feet gain a +2 status bonus to AC against unholy creatures and deal an additional 2 damage against unholy creatures.</p>'
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
        value: 2,
        type: 'status',
        predicate: ['target:trait:unholy'],
        slug: 'righteousness-ac-vs-unholy'
      },
      {
        key: 'FlatModifier',
        selector: 'strike-damage',
        value: 2,
        type: 'status',
        predicate: ['target:trait:unholy'],
        slug: 'righteousness-damage-vs-unholy'
      }
    ],
    traits: {
      rarity: 'common',
      value: ['aura', 'holy']
    },
    aura: {
      radius: 20,
      effects: ['aura-of-righteousness'],
      appearance: {
        border: { color: '#FFFFFF' },
        highlight: { color: '#FFFFFF33' }
      }
    }
  }
};
