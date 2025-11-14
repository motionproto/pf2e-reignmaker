/**
 * Fortify Hex Action Pipeline
 *
 * Strengthen defensive positions in claimed territory.
 * Converted from data/player-actions/fortify-hex.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const fortifyHexPipeline: CheckPipeline = {
  id: 'fortify-hex',
  name: 'Fortify Hex',
  description: 'Construct or upgrade defensive fortifications in claimed territory to improve resistance against invasion',
  checkType: 'action',
  category: 'expand-borders',

  skills: [
    { skill: 'crafting', description: 'build fortifications' },
    { skill: 'athletics', description: 'manual construction' },
    { skill: 'intimidation', description: 'defensive displays' },
    { skill: 'survival', description: 'wilderness defenses' }
  ],

  // Pre-roll: Select hex and fortification tier
  preRollInteractions: [
    {
      type: 'map-selection',
      id: 'fortificationHex',
      mode: 'hex-selection',
      count: 1,
      colorType: 'fortification'
    },
    {
      type: 'configuration',
      id: 'fortificationTier',
      label: 'Select fortification type'
    }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'The fortification is constructed swiftly.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    success: {
      description: 'The fortification is constructed.',
      modifiers: []
    },
    failure: {
      description: 'Construction accidents delay progress.',
      modifiers: []
    },
    criticalFailure: {
      description: 'Workers are injured in a construction mishap.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    }
  },

  preview: {
    providedByInteraction: true,
    calculate: (ctx) => {
      const resources = [];
      if (ctx.outcome === 'criticalSuccess') {
        resources.push({ resource: 'unrest', value: -1 });
      } else if (ctx.outcome === 'criticalFailure') {
        resources.push({ resource: 'unrest', value: 1 });
      }
      return { resources, specialEffects: [], warnings: [] };
    }
  }
};
