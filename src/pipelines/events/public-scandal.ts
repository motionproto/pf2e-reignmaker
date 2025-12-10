/**
 * Public Scandal Event Pipeline (CHOICE-BASED)
 *
 * A leader is implicated in an embarrassing or criminal situation.
 * How will you handle it?
 * 
 * Approaches:
 * - Transparent Investigation (Society/Diplomacy) - Honest and open
 * - Cover It Up (Deception/Stealth) - Suppress quietly
 * - Scapegoat Official (Intimidation/Deception) - Blame subordinate
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { textBadge } from '../../types/OutcomeBadge';

export const publicScandalPipeline: CheckPipeline = {
  id: 'public-scandal',
  name: 'Public Scandal',
  description: 'A leader is implicated in an embarrassing or criminal situation.',
  checkType: 'event',
  tier: 1,

  // Event strategic choice: How will you handle the scandal?
  strategicChoice: {
    label: 'How will you handle the scandal?',
    required: true,
    options: [
      {
        id: 'transparent',
        label: 'Transparent Investigation',
        description: 'Publicly investigate and reveal the truth',
        icon: 'fas fa-search',
        skills: ['society', 'diplomacy'],
        personality: { virtuous: 3 }
      },
      {
        id: 'coverup',
        label: 'Cover It Up',
        description: 'Suppress the scandal quietly',
        icon: 'fas fa-user-secret',
        skills: ['deception', 'stealth'],
        personality: { practical: 2, ruthless: 1 }
      },
      {
        id: 'scapegoat',
        label: 'Scapegoat Official',
        description: 'Blame a subordinate to protect the crown',
        icon: 'fas fa-user-slash',
        skills: ['intimidation', 'deception'],
        personality: { ruthless: 3 }
      }
    ]
  },

  skills: [
    { skill: 'society', description: 'investigate publicly' },
    { skill: 'diplomacy', description: 'public apology' },
    { skill: 'deception', description: 'cover up' },
    { skill: 'stealth', description: 'work in secret' },
    { skill: 'intimidation', description: 'silence critics' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your handling of the scandal is exemplary.',
      endsEvent: true,
      modifiers: [] // Modified by choice
    },
    success: {
      description: 'The scandal is contained.',
      endsEvent: true,
      modifiers: [] // Modified by choice
    },
    failure: {
      description: 'The scandal damages your reputation.',
      endsEvent: true,
      modifiers: [] // Modified by choice
    },
    criticalFailure: {
      description: 'The scandal spirals out of control.',
      endsEvent: true,
      modifiers: [] // Modified by choice
    },
  },

  preview: {
    calculate: async (ctx) => {
      const approach = ctx.metadata?.approach;
      const outcome = ctx.outcome;
      let modifiers: any[] = [];

      if (approach === 'transparent') {
        // Transparent Investigation approach
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
            { type: 'static', resource: 'fame', value: -1, duration: 'immediate' },
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
          ];
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'static', resource: 'fame', value: -2, duration: 'immediate' },
            { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
          ];
        }
      } else if (approach === 'coverup') {
        // Cover It Up approach
        if (outcome === 'success') {
          // Successfully covered up - no penalties
          modifiers = [];
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'static', resource: 'fame', value: -2, duration: 'immediate' },
            { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
          ];
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'static', resource: 'fame', value: -3, duration: 'immediate' },
            { type: 'static', resource: 'unrest', value: 3, duration: 'immediate' }
          ];
        }
      } else if (approach === 'scapegoat') {
        // Scapegoat Official approach
        if (outcome === 'success' || outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
          ];
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'static', resource: 'fame', value: -1, duration: 'immediate' },
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
          ];
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'static', resource: 'fame', value: -2, duration: 'immediate' },
            { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
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

  traits: ["dangerous"],
};
