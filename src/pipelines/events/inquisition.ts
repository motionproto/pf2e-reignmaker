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
import { valueBadge, textBadge } from '../../types/OutcomeBadge';

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
      modifiers: [], // Modified by choice
      outcomeBadges: [] // Dynamically populated by EventsPhase
    },
    success: {
      description: 'The situation is resolved.',
      endsEvent: true,
      modifiers: [], // Modified by choice
      outcomeBadges: [] // Dynamically populated by EventsPhase
    },
    failure: {
      description: 'The persecution continues.',
      endsEvent: false,
      modifiers: [], // Modified by choice
      outcomeBadges: [] // Dynamically populated by EventsPhase
    },
    criticalFailure: {
      description: 'Violence erupts.',
      endsEvent: false,
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

      if (approach === 'support') {
        // Support Inquisitors approach - Theocratic authority
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
          ];
          outcomeBadges.push(
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive'),
            textBadge('The inquisition succeeds without incident', 'fas fa-fire', 'info')
          );
        } else if (outcome === 'success') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
          ];
          outcomeBadges.push(
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive'),
            textBadge('Religious authority is affirmed', 'fas fa-fire', 'info')
          );
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' },
            { type: 'static', resource: 'fame', value: -1, duration: 'immediate' }
          ];
          outcomeBadges.push(
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 2, 'negative'),
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative'),
            textBadge('Persecution causes backlash', 'fas fa-angry', 'info')
          );
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 3, duration: 'immediate' },
            { type: 'static', resource: 'fame', value: -2, duration: 'immediate' }
          ];
          outcomeBadges.push(
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 3, 'negative'),
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 2, 'negative'),
            textBadge('Violent persecution sparks riots', 'fas fa-fire', 'negative')
          );
        }
      } else if (approach === 'protect') {
        // Protect the Accused approach - Tolerant defense
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'static', resource: 'fame', value: 2, duration: 'immediate' }
          ];
          outcomeBadges.push(
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 2, 'positive'),
            textBadge('Courageous stand inspires the kingdom', 'fas fa-shield-alt', 'info')
          );
        } else if (outcome === 'success') {
          modifiers = [
            { type: 'static', resource: 'fame', value: 1, duration: 'immediate' }
          ];
          outcomeBadges.push(
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive'),
            textBadge('The accused are protected', 'fas fa-shield-alt', 'info')
          );
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
          ];
          outcomeBadges.push(
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
            textBadge('Zealots grow more determined', 'fas fa-fire', 'info')
          );
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
          ];
          outcomeBadges.push(
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 2, 'negative'),
            textBadge('Violence erupts between factions', 'fas fa-fire', 'negative')
          );
        }
      } else if (approach === 'neutral') {
        // Stay Neutral approach - Pragmatic avoidance
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'static', resource: 'gold', value: 1, duration: 'immediate' }
          ];
          outcomeBadges.push(
            valueBadge('Gain {{value}} Gold', 'fas fa-coins', 1, 'positive'),
            textBadge('Both sides try to win your favor', 'fas fa-balance-scale', 'info')
          );
        } else if (outcome === 'success') {
          modifiers = [
            { type: 'static', resource: 'gold', value: 1, duration: 'immediate' }
          ];
          outcomeBadges.push(
            valueBadge('Gain {{value}} Gold', 'fas fa-coins', 1, 'positive'),
            textBadge('Both sides offer bribes', 'fas fa-balance-scale', 'info')
          );
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
          ];
          outcomeBadges.push(
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 2, 'negative'),
            textBadge('Everyone is angered by your inaction', 'fas fa-angry', 'info')
          );
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
          ];
          outcomeBadges.push(
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 2, 'negative'),
            textBadge('Neutrality seen as cowardice', 'fas fa-users-slash', 'negative')
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
