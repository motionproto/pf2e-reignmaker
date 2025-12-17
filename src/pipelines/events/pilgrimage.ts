/**
 * Pilgrimage Event Pipeline (CHOICE-BASED)
 *
 * Religious pilgrims seek passage or sanctuary in your kingdom.
 *
 * Approaches:
 * - Welcome All Freely (Virtuous) - Open hospitality for all pilgrims
 * - Organize and Profit (Practical) - Organized event with entry fees
 * - Tax Heavily (Ruthless) - Restrict access and extract maximum profit
 *
 * Based on EVENT_MIGRATION_STATUS.md specifications
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { AdjustFactionHandler } from '../../services/gameCommands/handlers/AdjustFactionHandler';
import { AddImprisonedHandler } from '../../services/gameCommands/handlers/AddImprisonedHandler';
import { valueBadge, diceBadge, textBadge } from '../../types/OutcomeBadge';

export const pilgrimagePipeline: CheckPipeline = {
  id: 'pilgrimage',
  name: 'Pilgrimage',
  description: 'Religious pilgrims seek passage or sanctuary in your kingdom.',
  checkType: 'event',
  tier: 1,

  strategicChoice: {
    label: 'How will you handle the pilgrimage?',
    required: true,
    options: [
      {
        id: 'virtuous',
        label: 'Free Passage',
        description: 'Open hospitality for all pilgrims',
        icon: 'fas fa-praying-hands',
        skills: ['religion', 'diplomacy', 'medicine', 'applicable lore'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Divine blessings rain upon generous hosts.',
          success: 'Grateful pilgrims leave offerings and prayers.',
          failure: 'Overwhelmed towns struggle with endless visitors.',
          criticalFailure: 'Chaos breeds resentment; sacred journey sours.'
        },
        outcomeBadges: {
          criticalSuccess: [
            textBadge('Adjust 1 faction +1', 'fas fa-users', 'positive'),
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive'),
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')
          ],
          success: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative')
          ],
          criticalFailure: [
            textBadge('Adjust 1 faction -1', 'fas fa-users-slash', 'negative'),
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative'),
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Protect the Pilgrims',
        description: 'Organized pilgrimage with fees and services',
        icon: 'fas fa-landmark',
        skills: ['society', 'religion', 'survival', 'applicable lore'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Perfect organization earns praise and trains guards.',
          success: 'Fees fund smooth passage for all.',
          failure: 'Bureaucracy frustrates faithful travelers.',
          criticalFailure: 'Greed offends pilgrims; guards overwhelmed.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d4', 'positive'),
            textBadge('Random army becomes Well Trained (+1 saves)', 'fas fa-star', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive'),
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative'),
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ],
          criticalFailure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative'),
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d4', 'negative'),
            textBadge('Random army becomes Fatigued', 'fas fa-tired', 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Pay or be Persecuted',
        description: 'Restrict access and extract maximum profit',
        icon: 'fas fa-coins',
        skills: ['intimidation', 'society', 'thievery', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Wealthy devotees pay lavishly for sacred access.',
          success: 'Heavy tolls extract maximum profit.',
          failure: 'Cruel fees turn away the faithful.',
          criticalFailure: 'Multiple faiths condemn your naked avarice.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d4', 'positive'),
            diceBadge('Gain {{value}} random resource', 'fas fa-box', '2d4', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d3', 'positive')
          ],
          failure: [
            diceBadge('{{value}} innocents harmed', 'fas fa-user-injured', '1d3', 'negative')
          ],
          criticalFailure: [
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative'),
            textBadge('Adjust 1 faction -1', 'fas fa-users-slash', 'negative'),
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ]
        }
      }
    ]
  },

  skills: [
    { skill: 'religion', description: 'provide sanctuary' },
    { skill: 'diplomacy', description: 'welcome pilgrims' },
    { skill: 'society', description: 'organize accommodations' },
    { skill: 'intimidation', description: 'enforce strict rules' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your approach proves highly effective.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    success: {
      description: 'Pilgrimage concludes successfully.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    failure: {
      description: 'Pilgrimage creates minor complications.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'Your handling damages relations.',
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

      const selectedOption = pilgrimagePipeline.strategicChoice?.options.find(opt => opt.id === approach);
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      const commandContext: GameCommandContext = {
        actionId: 'pilgrimage',
        outcome: ctx.outcome,
        kingdom: ctx.kingdom,
        metadata: ctx.metadata || {}
      };

      const PLAYER_KINGDOM = 'player';

      if (approach === 'virtuous') {
        if (outcome === 'criticalSuccess') {
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', amount: 1, count: 2 },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFactionAdjust = factionCommand;
            if (factionCommand.outcomeBadges) {
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
            }
          }
        } else if (outcome === 'success') {
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', amount: 1, count: 1 },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFactionAdjust = factionCommand;
            if (factionCommand.outcomeBadges) {
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
            }
          }
        }
      } else if (approach === 'practical') {
        if (outcome === 'criticalSuccess') {
          // Well Trained bonus
          const playerArmies = kingdom.armies?.filter((a: any) => a.ledBy === PLAYER_KINGDOM && a.actorId) || [];
          if (playerArmies.length > 0) {
            const randomArmy = playerArmies[Math.floor(Math.random() * playerArmies.length)];
            ctx.metadata._armyWellTrained = { actorId: randomArmy.actorId };
            
            const armyBadgeIndex = outcomeBadges.findIndex(b => b.template?.includes('army becomes Well Trained'));
            if (armyBadgeIndex >= 0) {
              outcomeBadges[armyBadgeIndex] = textBadge(
                `${randomArmy.name} becomes Well Trained (+1 saves)`,
                'fas fa-star',
                'positive'
              );
            }
          }
        } else if (outcome === 'criticalFailure') {
          // Fatigued condition
          const playerArmies = kingdom.armies?.filter((a: any) => a.ledBy === PLAYER_KINGDOM && a.actorId) || [];
          if (playerArmies.length > 0) {
            const randomArmy = playerArmies[Math.floor(Math.random() * playerArmies.length)];
            ctx.metadata._armyCondition = { actorId: randomArmy.actorId, condition: 'fatigued', value: 1 };
            
            const armyBadgeIndex = outcomeBadges.findIndex(b => b.template?.includes('army becomes Fatigued'));
            if (armyBadgeIndex >= 0) {
              outcomeBadges[armyBadgeIndex] = textBadge(
                `${randomArmy.name} becomes Fatigued`,
                'fas fa-tired',
                'negative'
              );
            }
          }

          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', amount: -1, count: 1 },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFactionAdjust = factionCommand;
            if (factionCommand.outcomeBadges) {
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
            }
          }
        }
      } else if (approach === 'ruthless') {
        if (outcome === 'criticalSuccess') {
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', amount: 1, count: 1 },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFactionAdjust = factionCommand;
            if (factionCommand.outcomeBadges) {
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
            }
          }
        } else if (outcome === 'failure') {
          // Innocents harmed (add imprisoned without reducing unrest)
          const addImprisonedHandler = new AddImprisonedHandler();
          const imprisonCommand = await addImprisonedHandler.prepare(
            { type: 'addImprisoned', diceFormula: '1d3' },
            commandContext
          );
          if (imprisonCommand) {
            ctx.metadata._preparedAddImprisoned = imprisonCommand;
            if (imprisonCommand.outcomeBadges) {
              outcomeBadges.push(...imprisonCommand.outcomeBadges);
            } else if (imprisonCommand.outcomeBadge) {
              outcomeBadges.push(imprisonCommand.outcomeBadge);
            }
          }
        } else if (outcome === 'criticalFailure') {
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', amount: -1, count: 2 },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFactionAdjust = factionCommand;
            if (factionCommand.outcomeBadges) {
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
            }
          }
        }
      }

      return { resources: [], outcomeBadges };
    }
  },

  execute: async (ctx) => {
    const factionCommand = ctx.metadata?._preparedFactionAdjust;
    if (factionCommand?.commit) {
      await factionCommand.commit();
    }

    // Execute innocent imprisonment (ruthless F - adds imprisoned without reducing unrest)
    const addImprisonedCommand = ctx.metadata?._preparedAddImprisoned;
    if (addImprisonedCommand?.commit) {
      await addImprisonedCommand.commit();
    }

    // Apply army condition (Fatigued)
    const armyCondition = ctx.metadata?._armyCondition;
    if (armyCondition?.actorId) {
      const { applyArmyConditionExecution } = await import('../../execution/armies/applyArmyCondition');
      await applyArmyConditionExecution(armyCondition.actorId, armyCondition.condition, armyCondition.value);
    }

    // Apply Well Trained bonus
    const wellTrained = ctx.metadata?._armyWellTrained;
    if (wellTrained?.actorId) {
      const actor = game.actors?.get(wellTrained.actorId);
      if (actor) {
        const currentBonus = (actor.getFlag('pf2e-reignmaker', 'wellTrainedBonus') as number) || 0;
        await actor.setFlag('pf2e-reignmaker', 'wellTrainedBonus', currentBonus + 1);
        ui.notifications?.info(`${actor.name} gains +1 to saves (Well Trained bonus)`);
      }
    }

    return { success: true };
  },

  traits: ["beneficial"],
};
