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
import { valueBadge, textBadge } from '../../types/OutcomeBadge';

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
      modifiers: [], // Modified by choice
      outcomeBadges: [] // Dynamically populated by EventsPhase
    },
    success: {
      description: 'The scandal is contained.',
      endsEvent: true,
      modifiers: [], // Modified by choice
      outcomeBadges: [] // Dynamically populated by EventsPhase
    },
    failure: {
      description: 'The scandal damages your reputation.',
      endsEvent: true,
      modifiers: [], // Modified by choice
      outcomeBadges: [] // Dynamically populated by EventsPhase
    },
    criticalFailure: {
      description: 'The scandal spirals out of control.',
      endsEvent: true,
      modifiers: [], // Modified by choice
      outcomeBadges: [] // Dynamically populated by EventsPhase
    },
  },

  preview: {
    calculate: async (ctx) => {
      // Read approach from kingdom store (set by PreRollChoiceSelector voting)
      const { get } = await import('svelte/store');
      const { kingdomData } = await import('../../stores/KingdomStore');
      const kingdom = get(kingdomData);
      const approach = kingdom.turnState?.eventsPhase?.selectedApproach;
      const outcome = ctx.outcome;
      let modifiers: any[] = [];
      const outcomeBadges: any[] = [];

      if (approach === 'transparent') {
        // Transparent Investigation approach - Honest and open
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'static', resource: 'fame', value: 2, duration: 'immediate' },
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
          ];
          outcomeBadges.push(
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 2, 'positive'),
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive'),
            textBadge('Transparency earns public trust', 'fas fa-search', 'info')
          );
        } else if (outcome === 'success') {
          modifiers = [
            { type: 'static', resource: 'fame', value: 1, duration: 'immediate' }
          ];
          outcomeBadges.push(
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive'),
            textBadge('Truth is revealed and accepted', 'fas fa-search', 'info')
          );
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'static', resource: 'fame', value: -1, duration: 'immediate' },
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
          ];
          outcomeBadges.push(
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative'),
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
            textBadge('Investigation reveals embarrassing details', 'fas fa-scroll', 'info')
          );
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'static', resource: 'fame', value: -2, duration: 'immediate' },
            { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
          ];
          outcomeBadges.push(
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 2, 'negative'),
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 2, 'negative'),
            textBadge('Scandal spirals completely out of control', 'fas fa-fire', 'negative')
          );
        }
      } else if (approach === 'coverup') {
        // Cover It Up approach - Suppress quietly
        if (outcome === 'criticalSuccess') {
          modifiers = [];
          outcomeBadges.push(
            textBadge('Scandal completely suppressed', 'fas fa-user-secret', 'info')
          );
        } else if (outcome === 'success') {
          modifiers = [];
          outcomeBadges.push(
            textBadge('Cover-up succeeds with no consequences', 'fas fa-user-secret', 'info')
          );
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'static', resource: 'fame', value: -2, duration: 'immediate' },
            { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
          ];
          outcomeBadges.push(
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 2, 'negative'),
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 2, 'negative'),
            textBadge('Cover-up exposed - worse than original scandal', 'fas fa-eye', 'negative')
          );
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'static', resource: 'fame', value: -3, duration: 'immediate' },
            { type: 'static', resource: 'unrest', value: 3, duration: 'immediate' }
          ];
          outcomeBadges.push(
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 3, 'negative'),
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 3, 'negative'),
            textBadge('Massive cover-up scandal erupts', 'fas fa-fire', 'negative')
          );
        }
      } else if (approach === 'scapegoat') {
        // Scapegoat Official approach - Blame subordinate
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
          ];
          outcomeBadges.push(
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive'),
            textBadge('Scapegoat accepted, leader cleared', 'fas fa-user-slash', 'info')
          );
        } else if (outcome === 'success') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
          ];
          outcomeBadges.push(
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive'),
            textBadge('Blame successfully shifted', 'fas fa-user-slash', 'info')
          );
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'static', resource: 'fame', value: -1, duration: 'immediate' },
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
          ];
          outcomeBadges.push(
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative'),
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
            textBadge('Scapegoating is transparent and cruel', 'fas fa-angry', 'info')
          );
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'static', resource: 'fame', value: -2, duration: 'immediate' },
            { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
          ];
          outcomeBadges.push(
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 2, 'negative'),
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 2, 'negative'),
            textBadge('Scapegoat reveals the truth publicly', 'fas fa-bullhorn', 'negative')
          );
        }
      }

      // Store modifiers in context for execute step
      ctx.metadata._outcomeModifiers = modifiers;

      return { resources: [], outcomeBadges };
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
