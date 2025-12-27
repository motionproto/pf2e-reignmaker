import type { DoctrineEffectData } from './types';

export const rigorousDiscipline: DoctrineEffectData = {
  _id: 'ReignmakerRigorousDiscipline',
  name: 'Rigorous Discipline',
  img: 'icons/skills/melee/shield-block-gray-orange.webp',
  type: 'action',
  system: {
    actionType: { value: 'reaction' },
    actions: { value: null },
    category: 'defensive',
    description: {
      value: '<p><strong>Trigger</strong> The army is struck by a critical hit that deals physical damage.</p>\n<hr />\n<p>Through relentless drilling and tactical conditioning, this army can shrug off even grievous injuries. Attempt a @Check[flat|dc:17|showDC:all]. If successful, the attack becomes a normal hit.</p>'
    },
    publication: {
      license: 'Custom',
      remaster: true,
      title: 'ReignMaker'
    },
    rules: [],
    traits: {
      rarity: 'common',
      value: []
    }
  }
};
