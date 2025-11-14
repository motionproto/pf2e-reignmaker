/**
 * Outfit Army Action Pipeline
 *
 * Equip troops with armor, weapons, runes, or equipment.
 * Converted from data/player-actions/outfit-army.json
 *
 * NOTE: Uses custom implementation (complex interactive dialogs)
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const outfitArmyPipeline: CheckPipeline = {
  id: 'outfit-army',
  name: 'Outfit Army',
  description: 'Equip your troops with superior arms, armor, and supplies to enhance their battlefield effectiveness',
  checkType: 'action',
  category: 'military-operations',

  skills: [
    { skill: 'crafting', description: 'forge equipment' },
    { skill: 'society', description: 'requisition supplies' },
    { skill: 'intimidation', description: 'commandeer resources' },
    { skill: 'thievery', description: 'acquire through subterfuge' }
  ],

  // NOTE: Army and equipment selection handled by custom implementation
  // Uses interactive dialogs mid-execution

  outcomes: {
    criticalSuccess: {
      description: 'The army is outfitted with exceptional gear.',
      modifiers: [
        { type: 'static', resource: 'ore', value: -1, duration: 'immediate' },
        { type: 'static', resource: 'gold', value: -2, duration: 'immediate' }
      ],
      manualEffects: ['+2 to the chosen equipment type']
    },
    success: {
      description: 'The army is outfitted.',
      modifiers: [
        { type: 'static', resource: 'ore', value: -1, duration: 'immediate' },
        { type: 'static', resource: 'gold', value: -2, duration: 'immediate' }
      ],
      manualEffects: ['+1 to the chosen equipment type']
    },
    failure: {
      description: 'The effort is wasted.',
      modifiers: []
    },
    criticalFailure: {
      description: 'The suppliers take the gold.',
      modifiers: [
        { type: 'static', resource: 'gold', value: -2, duration: 'immediate' }
      ]
    }
  },

  preview: {
    calculate: (ctx) => {
      const resources = [];

      if (ctx.outcome === 'criticalSuccess' || ctx.outcome === 'success') {
        resources.push({ resource: 'ore', value: -1 });
        resources.push({ resource: 'gold', value: -2 });
      } else if (ctx.outcome === 'criticalFailure') {
        resources.push({ resource: 'gold', value: -2 });
      }

      const specialEffects = [];
      if (ctx.outcome !== 'failure') {
        const bonus = ctx.outcome === 'criticalSuccess' ? '+2' : '+1';
        specialEffects.push({
          type: 'status' as const,
          message: `Army will receive ${bonus} equipment bonus`,
          variant: (ctx.outcome === 'criticalFailure' ? 'negative' : 'positive') as const
        });
      }

      return { resources, specialEffects, warnings: [] };
    }
  }

  // NOTE: Execution handled by custom implementation (GameCommandsResolver.outfitArmy)
};
