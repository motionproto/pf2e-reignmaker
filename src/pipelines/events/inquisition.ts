/**
 * Inquisition Event Pipeline (CHOICE-BASED)
 *
 * Zealots mobilize against a minority group - how will you respond?
 * 
 * Approaches:
 * - Support Inquisitors (Religion/Intimidation) - Theocratic authority
 * - Protect the Accused (Diplomacy/Society) - Tolerant defense
 * - Stay Neutral (Society/Deception) - Pragmatic avoidance
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const inquisitionPipeline: CheckPipeline = {
  id: 'inquisition',
  name: 'Inquisition',
  description: 'Zealots mobilize against a minority group or belief.',
  checkType: 'event',
  tier: 1,

  // Event strategic choice: How will you respond to the inquisition?
  strategicChoice: {
    label: 'How will you respond to the inquisition?',
    required: true,
    options: [
      {
        id: 'support',
        label: 'Support Inquisitors',
        description: 'Endorse the hunt for heresy',
        icon: 'fas fa-fire',
        skills: ['religion', 'intimidation'],
        personality: { ruthless: 4 }
      },
      {
        id: 'protect',
        label: 'Protect the Accused',
        description: 'Stand against persecution',
        icon: 'fas fa-shield-alt',
        skills: ['diplomacy', 'society'],
        personality: { virtuous: 4 }
      },
      {
        id: 'neutral',
        label: 'Stay Neutral',
        description: 'Let the church and people work it out',
        icon: 'fas fa-balance-scale',
        skills: ['society', 'deception'],
        personality: { practical: 3 }
      }
    ]
  },

  skills: [
    { skill: 'religion', description: 'theological debate' },
    { skill: 'intimidation', description: 'suppress dissent' },
    { skill: 'diplomacy', description: 'protect victims' },
    { skill: 'society', description: 'mediate conflict' },
    { skill: 'deception', description: 'avoid commitment' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your response is highly effective.',
      endsEvent: true,
      modifiers: [] // Modified by choice
    },
    success: {
      description: 'The situation is resolved.',
      endsEvent: true,
      modifiers: [] // Modified by choice
    },
    failure: {
      description: 'The persecution continues.',
      endsEvent: false,
      modifiers: [] // Modified by choice
    },
    criticalFailure: {
      description: 'Violence erupts.',
      endsEvent: false,
      modifiers: [] // Modified by choice
    },
  },

  preview: {
    calculate: async (ctx) => {
      const approach = ctx.metadata?.approach;
      const outcome = ctx.outcome;
      let modifiers: any[] = [];

      if (approach === 'support') {
        // Support Inquisitors approach
        if (outcome === 'success' || outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
          ];
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' },
            { type: 'static', resource: 'fame', value: -1, duration: 'immediate' }
          ];
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 3, duration: 'immediate' },
            { type: 'static', resource: 'fame', value: -2, duration: 'immediate' }
          ];
        }
      } else if (approach === 'protect') {
        // Protect the Accused approach
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'static', resource: 'fame', value: 2, duration: 'immediate' }
          ];
        } else if (outcome === 'success') {
          modifiers = [
            { type: 'static', resource: 'fame', value: 1, duration: 'immediate' }
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
      } else if (approach === 'neutral') {
        // Stay Neutral approach
        if (outcome === 'success') {
          modifiers = [
            { type: 'static', resource: 'gold', value: 1, duration: 'immediate' } // Both sides bribe you
          ];
        } else if (outcome === 'failure' || outcome === 'criticalFailure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' } // Everyone angry
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
          } else if (mod.resource === 'gold') {
            kingdom.resources.gold += mod.value;
          }
        }
      });
    }

    // TODO: Track personality choice (Phase 4)
    // await personalityTracker.recordChoice(approach, personality);

    return { success: true };
  },

  traits: ["dangerous", "ongoing"],
};
