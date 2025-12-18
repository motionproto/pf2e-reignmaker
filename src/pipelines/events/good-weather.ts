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
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { ApplyArmyConditionHandler } from '../../services/gameCommands/handlers/ApplyArmyConditionHandler';
import { diceBadge, genericArmyConditionPositive, genericArmyConditionNegative } from '../../types/OutcomeBadge';

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
        skills: ['performance', 'diplomacy', 'religion', 'applicable lore'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Joyous festivals unite hearts; tales of revelry spread far and wide.',
          success: 'Grateful citizens rest beneath blue skies; harmony fills the realm.',
          failure: 'Idle hands while others toil; workers grumble at unfairness.',
          criticalFailure: 'Prolonged revelry empties coffers; indulgence breeds contempt.'
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
        skills: ['nature', 'society', 'crafting', 'applicable lore'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Tireless labor under perfect skies fills barns and coffers alike.',
          success: 'Steady hands gather bounty; pragmatic planning yields prosperity.',
          failure: 'Relentless demands exhaust willing workers; discontent simmers.',
          criticalFailure: 'Brutal schedules break spirits; exhausted laborers rebel.'
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
        skills: ['intimidation', 'performance', 'survival', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Brutal drills forge elite warriors; ruthless discipline inspires fear.',
          success: 'Merciless training hardens soldiers; armies grow battle-ready.',
          failure: 'Harsh exercises push troops too far; weary soldiers stumble.',
          criticalFailure: 'Ruthless demands break bodies and morale; training backfires.'
        },
        outcomeBadges: {
          criticalSuccess: [genericArmyConditionPositive('Well Trained')],
          success: [genericArmyConditionPositive('Well Trained')],
          failure: [genericArmyConditionNegative('Fatigued')],
          criticalFailure: [genericArmyConditionNegative('Enfeebled')]
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

      const selectedOption = goodWeatherPipeline.strategicChoice?.options.find(opt => opt.id === approach);
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      if (approach === 'ruthless') {
        const commandContext: GameCommandContext = {
          actionId: 'good-weather',
          outcome: ctx.outcome,
          kingdom: ctx.kingdom,
          metadata: ctx.metadata || {}
        };

        if (outcome === 'criticalSuccess' || outcome === 'success') {
          // Well trained army
          const armyHandler = new ApplyArmyConditionHandler();
          const armyCmd = await armyHandler.prepare(
            { type: 'applyArmyCondition', condition: 'well-trained', value: 1, armyId: 'random' },
            commandContext
          );
          if (armyCmd) {
            ctx.metadata._preparedArmyCondition = armyCmd;
            const filtered = outcomeBadges.filter(b => !b.template?.includes('army becomes Well Trained'));
            outcomeBadges.length = 0;
            outcomeBadges.push(...filtered, ...(armyCmd.outcomeBadges || []));
          }
        } else if (outcome === 'failure' || outcome === 'criticalFailure') {
          // Fatigued or enfeebled army
          const condition = outcome === 'failure' ? 'fatigued' : 'enfeebled';
          const armyHandler = new ApplyArmyConditionHandler();
          const armyCmd = await armyHandler.prepare(
            { type: 'applyArmyCondition', condition, value: 1, armyId: 'random' },
            commandContext
          );
          if (armyCmd) {
            ctx.metadata._preparedArmyCondition = armyCmd;
            const filtered = outcomeBadges.filter(b =>
              !b.template?.includes('army becomes Fatigued') && !b.template?.includes('army becomes Enfeebled')
            );
            outcomeBadges.length = 0;
            outcomeBadges.push(...filtered, ...(armyCmd.outcomeBadges || []));
          }
        }
      }

      return { resources: [], outcomeBadges };
    }
  },

  execute: async (ctx) => {
    // Apply army condition (well-trained, fatigued, or enfeebled based on outcome)
    const armyCommand = ctx.metadata?._preparedArmyCondition;
    if (armyCommand?.commit) {
      await armyCommand.commit();
    }

    return { success: true };
  },

  traits: ["beneficial", "ongoing"],
};
