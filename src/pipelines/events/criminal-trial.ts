/**
 * Criminal Trial Event Pipeline (CHOICE-BASED)
 *
 * Authorities catch a notorious criminal - how will you administer justice?
 * 
 * Approaches:
 * - Fair Trial (Society/Diplomacy) - Just and transparent
 * - Harsh Punishment (Intimidation/Performance) - Deter future crime
 * - Show Mercy (Religion/Diplomacy) - Compassion and forgiveness
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const criminalTrialPipeline: CheckPipeline = {
  id: 'criminal-trial',
  name: 'Criminal Trial',
  description: 'Authorities catch a notorious criminal or resolve a major injustice.',
  checkType: 'event',
  tier: 1,

  // Event strategic choice: How will you administer justice?
  strategicChoice: {
    label: 'How will you administer justice?',
    required: true,
    options: [
      {
        id: 'fair',
        label: 'Fair Trial',
        description: 'Ensure justice is served fairly and transparently',
        icon: 'fas fa-balance-scale',
        skills: ['society', 'diplomacy'],
        personality: { practical: 3 }
      },
      {
        id: 'harsh',
        label: 'Harsh Punishment',
        description: 'Make an example to deter future crime',
        icon: 'fas fa-gavel',
        skills: ['intimidation', 'performance'],
        personality: { ruthless: 3 }
      },
      {
        id: 'mercy',
        label: 'Show Mercy',
        description: 'Demonstrate compassion and forgiveness',
        icon: 'fas fa-dove',
        skills: ['religion', 'diplomacy'],
        personality: { virtuous: 3 }
      }
    ]
  },

  skills: [
    { skill: 'society', description: 'legal proceedings' },
    { skill: 'diplomacy', description: 'public ceremony' },
    { skill: 'intimidation', description: 'show of force' },
    { skill: 'performance', description: 'public demonstration' },
    { skill: 'religion', description: 'moral guidance' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Justice triumphs.',
      endsEvent: true,
      modifiers: [] // Modified by choice
    },
    success: {
      description: 'Justice is served.',
      endsEvent: true,
      modifiers: [] // Modified by choice
    },
    failure: {
      description: 'Complications arise from the trial.',
      endsEvent: true,
      modifiers: [] // Modified by choice
    },
    criticalFailure: {
      description: 'Justice is miscarried.',
      endsEvent: true,
      modifiers: [] // Modified by choice
    },
  },

  preview: {
    calculate: async (ctx) => {
      const approach = ctx.metadata?.approach;
      const outcome = ctx.outcome;
      let modifiers: any[] = [];

      if (approach === 'fair') {
        // Fair Trial approach
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'static', resource: 'fame', value: 2, duration: 'immediate' },
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
          ];
        } else if (outcome === 'success') {
          modifiers = [
            { type: 'static', resource: 'fame', value: 1, duration: 'immediate' },
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
          ];
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
          ];
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
          ];
        }
      } else if (approach === 'harsh') {
        // Harsh Punishment approach
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: -3, duration: 'immediate' }
          ];
        } else if (outcome === 'success') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: -2, duration: 'immediate' }
          ];
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
          ];
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' },
            { type: 'static', resource: 'fame', value: -1, duration: 'immediate' }
          ];
        }
      } else if (approach === 'mercy') {
        // Show Mercy approach
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'static', resource: 'fame', value: 2, duration: 'immediate' },
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
          ];
        } else if (outcome === 'success') {
          modifiers = [
            { type: 'static', resource: 'fame', value: 1, duration: 'immediate' }
          ];
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
          ];
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 3, duration: 'immediate' }
          ];
        }
      }

      // Store modifiers in context for execute step
      ctx.metadata._outcomeModifiers = modifiers;

      return { resources: [], outcomeBadges: [] };
    }
  },

  execute: async (ctx) => {
    // Apply modifiers calculated in preview
    const modifiers = ctx.metadata?._outcomeModifiers || [];
    if (modifiers.length > 0) {
      const { updateKingdom } = await import('../../stores/KingdomStore');
      await updateKingdom((kingdom) => {
        for (const mod of modifiers) {
          if (mod.resource === 'unrest') {
            kingdom.unrest = Math.max(0, kingdom.unrest + mod.value);
          } else if (mod.resource === 'fame') {
            kingdom.fame = Math.max(0, kingdom.fame + mod.value);
          }
        }
      });
    }

    // TODO: Track personality choice (Phase 4)
    // await personalityTracker.recordChoice(approach, personality);

    return { success: true };
  },

  traits: ["beneficial"],
};
