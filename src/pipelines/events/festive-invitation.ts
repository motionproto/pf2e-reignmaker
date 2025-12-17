/**
 * Festive Invitation Event Pipeline (CHOICE-BASED)
 *
 * Your leaders are invited to a grand festival.
 *
 * Approaches:
 * - Attend Humbly (Virtuous) - Join festivities as equals
 * - Attend with Diplomacy (Practical) - Appropriate gifts and networking
 * - Display Power (Ruthless) - Show military might at event
 *
 * Based on EVENT_MIGRATION_STATUS.md specifications
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { AdjustFactionHandler } from '../../services/gameCommands/handlers/AdjustFactionHandler';
import { valueBadge, diceBadge, textBadge } from '../../types/OutcomeBadge';

export const festiveInvitationPipeline: CheckPipeline = {
  id: 'festive-invitation',
  name: 'Festive Invitation',
  description: 'Your leaders are invited to a grand festival.',
  checkType: 'event',
  tier: 1,

  strategicChoice: {
    label: 'How will you engage with the celebration?',
    required: true,
    options: [
      {
        id: 'virtuous',
        label: 'Attend Humbly',
        description: 'Join festivities as equals, no pretense',
        icon: 'fas fa-glass-cheers',
        skills: ['diplomacy', 'performance', 'acrobatics', 'applicable lore'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Your down-to-earth warmth inspires joy and lasting friendships.',
          success: 'Sincere camaraderie earns respect among common folk.',
          failure: 'Your quiet presence fades into the crowded festivities.',
          criticalFailure: 'Enemies mistake humility for fear; insults fly openly.'
        },
        outcomeBadges: {
          criticalSuccess: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive'),
            textBadge('Adjust 1 faction +1', 'fas fa-users', 'positive'),
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')
          ],
          success: [
            textBadge('Adjust 1 faction +1', 'fas fa-users', 'positive'),
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')
          ],
          failure: [
            textBadge('Adjust 1 faction -1', 'fas fa-users-slash', 'negative'),
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
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
        label: 'Diplomatic Gifts',
        description: 'Appropriate gifts and strategic networking',
        icon: 'fas fa-gift',
        skills: ['diplomacy', 'society', 'crafting', 'applicable lore'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Lavish gifts spark bidding war; nobles shower you with riches.',
          success: 'Thoughtful offerings open doors to new trade partners.',
          failure: 'Guests accept gifts politely but offer nothing in return.',
          criticalFailure: 'Offended host publicly refuses; allies distance themselves.'
        },
        outcomeBadges: {
          criticalSuccess: [
            textBadge('Adjust 1 faction +1', 'fas fa-users', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d4', 'positive'),
            diceBadge('Gain {{value}} random resource', 'fas fa-box', '1d3', 'positive')
          ],
          success: [
            textBadge('Adjust 1 faction +1', 'fas fa-users', 'positive'),
            diceBadge('Gain {{value}} random resource', 'fas fa-box', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative'),
            textBadge('Adjust 1 faction -1', 'fas fa-users-slash', 'negative')
          ],
          criticalFailure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '2d3', 'negative'),
            textBadge('Adjust 1 faction -1', 'fas fa-users-slash', 'negative'),
            textBadge('Adjust 1 faction -1', 'fas fa-users-slash', 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Display Power',
        description: 'Show military might and intimidate rivals',
        icon: 'fas fa-shield',
        skills: ['intimidation', 'performance', 'athletics', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Stunning martial parade earns fear and plundered war trophies.',
          success: 'Intimidating show of force trains soldiers but alienates guests.',
          failure: 'Aggressive posturing exhausts troops without impressing anyone.',
          criticalFailure: 'Brutal display horrifies all; tired soldiers slump in disgrace.'
        },
        outcomeBadges: {
          criticalSuccess: [
            textBadge('Random army gains equipment', 'fas fa-shield', 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d4', 'positive')
          ],
          success: [
            textBadge('Random army becomes Well Trained (+1 saves)', 'fas fa-star', 'positive')
          ],
          failure: [
            textBadge('Random army becomes Fatigued', 'fas fa-tired', 'negative'),
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ],
          criticalFailure: [
            textBadge('Random army becomes Enfeebled', 'fas fa-exclamation-triangle', 'negative'),
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d4', 'negative')
          ]
        }
      }
    ]
  },

  skills: [
    { skill: 'diplomacy', description: 'formal attendance' },
    { skill: 'performance', description: 'entertain hosts' },
    { skill: 'society', description: 'navigate customs' },
    { skill: 'intimidation', description: 'display power' },
    { skill: 'acrobatics', description: 'festival performances' },
    { skill: 'crafting', description: 'create artisan gifts' },
    { skill: 'athletics', description: 'martial competitions' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your approach proves highly effective.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    success: {
      description: 'Festival concludes successfully.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    failure: {
      description: 'Festival passes without major incident.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'Festival causes complications.',
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

      const selectedOption = festiveInvitationPipeline.strategicChoice?.options.find(opt => opt.id === approach);
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      const commandContext: GameCommandContext = {
        actionId: 'festive-invitation',
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
        } else if (outcome === 'failure') {
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
        } else if (outcome === 'criticalFailure') {
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
      } else if (approach === 'practical') {
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
        } else if (outcome === 'failure') {
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
        } else if (outcome === 'criticalFailure') {
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
        // Handle army conditions first
        if (outcome === 'success') {
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
        } else if (outcome === 'failure') {
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
        } else if (outcome === 'criticalFailure') {
          // Enfeebled condition
          const playerArmies = kingdom.armies?.filter((a: any) => a.ledBy === PLAYER_KINGDOM && a.actorId) || [];
          if (playerArmies.length > 0) {
            const randomArmy = playerArmies[Math.floor(Math.random() * playerArmies.length)];
            ctx.metadata._armyCondition = { actorId: randomArmy.actorId, condition: 'enfeebled', value: 1 };
            
            const armyBadgeIndex = outcomeBadges.findIndex(b => b.template?.includes('army becomes Enfeebled'));
            if (armyBadgeIndex >= 0) {
              outcomeBadges[armyBadgeIndex] = textBadge(
                `${randomArmy.name} becomes Enfeebled`,
                'fas fa-exclamation-triangle',
                'negative'
              );
            }
          }
        }

        // Handle faction adjustments
        if (outcome === 'criticalSuccess') {
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
          ctx.metadata._equipArmies = 2;
        } else if (outcome === 'success') {
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
          ctx.metadata._equipArmies = 1;
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

    const factionCommand = ctx.metadata?._preparedFactionAdjust;
    if (factionCommand?.commit) {
      await factionCommand.commit();
    }

    // Equip armies (ruthless CS/S)
    if (ctx.metadata?._equipArmies && approach === 'ruthless') {
      const armies = ctx.kingdom.armies || [];
      const count = ctx.metadata._equipArmies;
      if (armies.length > 0) {
        for (let i = 0; i < Math.min(count, armies.length); i++) {
          const randomArmy = armies[Math.floor(Math.random() * armies.length)];
          // TODO: Implement random equipment upgrade
          console.log(`Festive Invitation: Random equipment upgrade needed for army ${randomArmy.actorId}`);
        }
      }
    }

    // Apply army condition (selected in preview.calculate)
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
