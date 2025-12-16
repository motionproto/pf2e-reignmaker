/**
 * Good Weather Event Pipeline (CHOICE-BASED)
 *
 * Perfect weather conditions boost morale and productivity.
 *
 * Approaches:
 * - Declare Holidays (Virtuous) - Celebrate and rest
 * - Work Hard (Practical) - Gather extra resources
 * - Military Exercises (Ruthless) - Train troops
 *
 * Based on EVENT_MIGRATION_STATUS.md specifications
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { valueBadge, diceBadge, textBadge } from '../../types/OutcomeBadge';

export const goodWeatherPipeline: CheckPipeline = {
  id: 'good-weather',
  name: 'Good Weather',
  description: 'Perfect weather conditions boost morale and productivity.',
  checkType: 'event',
  tier: 1,

  strategicChoice: {
    label: 'How will you capitalize on good weather?',
    required: true,
    options: [
      {
        id: 'virtuous',
        label: 'Celebrate',
        description: 'Celebrate and let people rest',
        icon: 'fas fa-sun',
        skills: ['performance', 'diplomacy', 'applicable lore'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Joyful celebration attracts new citizens.',
          success: 'Holiday reduces unrest and boosts morale.',
          failure: 'Celebration breeds resentment among workers.',
          criticalFailure: 'Excessive leisure causes unrest.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d4', 'positive')
          ],
          success: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d2', 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3+1', 'negative')
          ],
          criticalFailure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '2d4', 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Work Hard',
        description: 'Gather extra resources while weather holds',
        icon: 'fas fa-hammer',
        skills: ['nature', 'society', 'applicable lore'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Exceptional productivity yields abundant resources.',
          success: 'Hard work provides food, gold, and materials.',
          failure: 'Overwork breeds resentment.',
          criticalFailure: 'Excessive demands cause unrest and costs.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} random resource', 'fas fa-box', '1d4', 'positive'),
            diceBadge('Gain {{value}} Food', 'fas fa-drumstick-bite', '1d4', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Food', 'fas fa-drumstick-bite', '1d3+1', 'positive')
          ],
          failure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d2', 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d4', 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Military Exercises',
        description: 'Train troops for combat readiness',
        icon: 'fas fa-shield',
        skills: ['intimidation', 'performance', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Troops gain elite training and plunder.',
          success: 'One army gains valuable training.',
          failure: 'Costly exercises drain resources.',
          criticalFailure: 'Failed exercises waste resources.'
        },
        outcomeBadges: {
          criticalSuccess: [
            textBadge('Random army becomes Well Trained (+1 saves)', 'fas fa-star', 'positive')
          ],
          success: [
            textBadge('Heal 1 random army', 'fas fa-heart', 'positive')
          ],
          failure: [
            textBadge('Random army becomes Fatigued', 'fas fa-tired', 'negative')
          ],
          criticalFailure: [
            textBadge('Random army becomes Enfeebled', 'fas fa-exclamation-triangle', 'negative')
          ]
        }
      }
    ]
  },

  skills: [
      { skill: 'nature', description: 'predict weather patterns' },
      { skill: 'society', description: 'organize activities' },
      { skill: 'performance', description: 'celebrate the weather' },
      { skill: 'diplomacy', description: 'manage expectations' },
      { skill: 'intimidation', description: 'enforce discipline' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'Perfect weather maximizes your approach.',
      endsEvent: false,
      modifiers: [],
      outcomeBadges: []
    },
    success: {
      description: 'Good weather supports your plans.',
      endsEvent: false,
      modifiers: [],
      outcomeBadges: []
    },
    failure: {
      description: 'Weather benefits are limited.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'Weather turns bad.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
  },

  preview: {
    calculate: async (ctx) => {
      const { get } = await import('svelte/store');
      const { kingdomData } = await import('../../stores/KingdomStore');
      const kingdom = get(kingdomData);
      const approach = kingdom.turnState?.eventsPhase?.selectedApproach;
      const outcome = ctx.outcome;
      const PLAYER_KINGDOM = 'player';

      const selectedOption = goodWeatherPipeline.strategicChoice?.options.find(opt => opt.id === approach);
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      if (approach === 'ruthless') {
        if (outcome === 'criticalSuccess' || outcome === 'success') {
          ctx.metadata._trainArmy = outcome === 'criticalSuccess' ? 2 : 1;
        } else if (outcome === 'failure' || outcome === 'criticalFailure') {
          // Select random army and apply condition
          const playerArmies = kingdom.armies?.filter((a: any) => a.ledBy === PLAYER_KINGDOM && a.actorId) || [];
          if (playerArmies.length > 0) {
            const randomArmy = playerArmies[Math.floor(Math.random() * playerArmies.length)];
            const condition = outcome === 'failure' ? 'fatigued' : 'enfeebled';
            
            // Store in metadata for execute
            ctx.metadata._armyCondition = { actorId: randomArmy.actorId, condition, value: 1 };
            
            // Update badge with army name
            const armyBadgeIndex = outcomeBadges.findIndex(b => 
              b.template?.includes('army becomes Fatigued') || b.template?.includes('army becomes Enfeebled')
            );
            if (armyBadgeIndex >= 0) {
              const conditionName = condition === 'fatigued' ? 'Fatigued' : 'Enfeebled';
              outcomeBadges[armyBadgeIndex] = textBadge(
                `${randomArmy.name} becomes ${conditionName}`, 
                condition === 'fatigued' ? 'fas fa-tired' : 'fas fa-exclamation-triangle', 
                'negative'
              );
            }
          }
        }
      }

      return { resources: [], outcomeBadges };
    }
  },

  execute: async (ctx) => {
    const { get } = await import('svelte/store');
    const { kingdomData } = await import('../../stores/KingdomStore');
    const kingdom = get(kingdomData);
    const approach = kingdom.turnState?.eventsPhase?.selectedApproach;

    if (ctx.metadata?._trainArmy && approach === 'ruthless') {
      const armies = ctx.kingdom.armies || [];
      const count = ctx.metadata._trainArmy;
      if (armies.length > 0) {
        const { applyArmyConditionExecution } = await import('../../execution/armies/applyArmyCondition');
        for (let i = 0; i < Math.min(count, armies.length); i++) {
          const randomArmy = armies[Math.floor(Math.random() * armies.length)];
          await applyArmyConditionExecution(randomArmy.actorId, 'welltrained', 1);
        }
      }
    }

    // Apply army condition (failure/critical failure)
    const armyCondition = ctx.metadata?._armyCondition;
    if (armyCondition?.actorId) {
      const { applyArmyConditionExecution } = await import('../../execution/armies/applyArmyCondition');
      await applyArmyConditionExecution(armyCondition.actorId, armyCondition.condition, armyCondition.value);
    }

    return { success: true };
  },

  traits: ["beneficial", "ongoing"],
};
