/**
 * Magical Discovery Event Pipeline (CHOICE-BASED)
 *
 * A powerful magical site or artifact is discovered in your kingdom.
 *
 * Approaches:
 * - Share Freely (Virtuous) - Open knowledge to all
 * - Controlled Study (Practical) - Regulation and research
 * - Monopolize (Ruthless) - Kingdom-exclusive advantage
 *
 * Based on EVENT_MIGRATION_STATUS.md specifications
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { AdjustFactionHandler } from '../../services/gameCommands/handlers/AdjustFactionHandler';
import { DestroyWorksiteHandler } from '../../services/gameCommands/handlers/DestroyWorksiteHandler';
import { DamageStructureHandler } from '../../services/gameCommands/handlers/DamageStructureHandler';
import { valueBadge, diceBadge } from '../../types/OutcomeBadge';
import { updateKingdom } from '../../stores/KingdomStore';

export const magicalDiscoveryPipeline: CheckPipeline = {
  id: 'magical-discovery',
  name: 'Magical Discovery',
  description: 'A powerful magical site or artifact is discovered in your kingdom.',
  checkType: 'event',
  tier: 1,

  strategicChoice: {
    label: 'How will you handle this magical discovery?',
    required: true,
    options: [
      {
        id: 'virtuous',
        label: 'Share Freely',
        description: 'Make knowledge available to all',
        icon: 'fas fa-book-open',
        skills: ['arcana', 'diplomacy', 'occultism', 'applicable lore'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Selfless sharing sparks wondrous breakthroughs; nations praise generosity.',
          success: 'Open hearts share arcane secrets; grateful scholars spread your fame.',
          failure: 'Naive idealism invites reckless experimentation; accidents tarnish reputation.',
          criticalFailure: 'Unchecked access unleashes magical chaos; explosions shatter buildings and trust.'
        },
        outcomeBadges: {
          criticalSuccess: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive')
          ],
          success: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive')
          ],
          failure: [
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative')
          ],
          criticalFailure: [
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Academic Study',
        description: 'Regulate and research systematically',
        icon: 'fas fa-flask',
        skills: ['arcana', 'society', 'crafting', 'applicable lore'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Methodical study unlocks sustainable arcane innovations; steady profits flow.',
          success: 'Regulated research channels power safely; controlled gains satisfy all.',
          failure: 'Bureaucratic restrictions frustrate ambitious mages; resentment builds.',
          criticalFailure: 'Tangled regulations stifle discovery; wasted potential breeds anger.'
        },
        outcomeBadges: {
          criticalSuccess: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3+1', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ],
          criticalFailure: [
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative'),
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d2', 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Secret Knowledge',
        description: 'Exclusive kingdom advantage',
        icon: 'fas fa-lock',
        skills: ['intimidation', 'arcana', 'thievery', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Ruthless secrecy exploits arcane power; vast wealth flows from monopoly.',
          success: 'Guarded knowledge enriches only kingdom coffers; profits soar unchallenged.',
          failure: 'Jealous hoarding breeds whispers of corruption; gold cannot buy trust.',
          criticalFailure: 'Paranoid control sparks magical sabotage; explosions punish greed.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '3d3', 'positive'),
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d4', 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '2d4', 'negative')
          ],
          criticalFailure: [
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative'),
            valueBadge('Lose {{value}} Gold', 'fas fa-coins', 1, 'negative')
          ]
        }
      }
    ]
  },

  skills: [
    { skill: 'arcana', description: 'understand the magic' },
    { skill: 'religion', description: 'divine its purpose' },
    { skill: 'occultism', description: 'unlock its secrets' },
    { skill: 'diplomacy', description: 'share knowledge' },
    { skill: 'society', description: 'organize research' },
    { skill: 'intimidation', description: 'enforce secrecy' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your approach proves highly effective.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    success: {
      description: 'Discovery handled well.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    failure: {
      description: 'Discovery causes complications.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'Magical disaster erupts.',
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

      const selectedOption = magicalDiscoveryPipeline.strategicChoice?.options.find(opt => opt.id === approach);
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      const commandContext: GameCommandContext = {
        actionId: 'magical-discovery',
        outcome: ctx.outcome,
        kingdom: ctx.kingdom,
        metadata: ctx.metadata || {}
      };

      if (approach === 'virtuous') {
        if (outcome === 'criticalSuccess') {
          const factionHandler1 = new AdjustFactionHandler();
          const factionCommand1 = await factionHandler1.prepare(
            { type: 'adjustFactionAttitude', steps: 1, count: 1 },
            commandContext
          );
          if (factionCommand1) {
            ctx.metadata._preparedFactionVirtuousCS1 = factionCommand1;
            if (factionCommand1.outcomeBadges) {
              outcomeBadges.push(...factionCommand1.outcomeBadges);
            } else if (factionCommand1.outcomeBadge) {
              outcomeBadges.push(factionCommand1.outcomeBadge);
            }
          }

          const factionHandler2 = new AdjustFactionHandler();
          const factionCommand2 = await factionHandler2.prepare(
            { type: 'adjustFactionAttitude', steps: 1, count: 1 },
            commandContext
          );
          if (factionCommand2) {
            ctx.metadata._preparedFactionVirtuousCS2 = factionCommand2;
            if (factionCommand2.outcomeBadges) {
              outcomeBadges.push(...factionCommand2.outcomeBadges);
            } else if (factionCommand2.outcomeBadge) {
              outcomeBadges.push(factionCommand2.outcomeBadge);
            }
          }
        } else if (outcome === 'criticalFailure') {
          const factionHandler1 = new AdjustFactionHandler();
          const factionCommand1 = await factionHandler1.prepare(
            { type: 'adjustFactionAttitude', steps: -1, count: 1 },
            commandContext
          );
          if (factionCommand1) {
            ctx.metadata._preparedFactionVirtuousCF1 = factionCommand1;
            if (factionCommand1.outcomeBadges) {
              outcomeBadges.push(...factionCommand1.outcomeBadges);
            } else if (factionCommand1.outcomeBadge) {
              outcomeBadges.push(factionCommand1.outcomeBadge);
            }
          }

          const factionHandler2 = new AdjustFactionHandler();
          const factionCommand2 = await factionHandler2.prepare(
            { type: 'adjustFactionAttitude', steps: -1, count: 1 },
            commandContext
          );
          if (factionCommand2) {
            ctx.metadata._preparedFactionVirtuousCF2 = factionCommand2;
            if (factionCommand2.outcomeBadges) {
              outcomeBadges.push(...factionCommand2.outcomeBadges);
            } else if (factionCommand2.outcomeBadge) {
              outcomeBadges.push(factionCommand2.outcomeBadge);
            }
          }

          const damageHandler = new DamageStructureHandler();
          const damageCommand = await damageHandler.prepare(
            { type: 'damageStructure', count: 1 },
            commandContext
          );
          if (damageCommand) {
            ctx.metadata._preparedDamage = damageCommand;
            if (damageCommand.outcomeBadges) {
              outcomeBadges.push(...damageCommand.outcomeBadges);
            } else if (damageCommand.outcomeBadge) {
              outcomeBadges.push(damageCommand.outcomeBadge);
            }
          }
        }
      } else if (approach === 'practical') {
        if (outcome === 'criticalSuccess') {
          ctx.metadata._ongoingResearch = { formula: '2d3', duration: 2 };

          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: 1, count: 1 },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFactionPracticalCS = factionCommand;
            if (factionCommand.outcomeBadges) {
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
            }
          }
        } else if (outcome === 'success') {
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: 1, count: 1 },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFactionPracticalS = factionCommand;
            if (factionCommand.outcomeBadges) {
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
            }
          }
        } else if (outcome === 'failure') {
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: -1, count: 1 },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFactionPracticalF = factionCommand;
            if (factionCommand.outcomeBadges) {
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
            }
          }
        } else if (outcome === 'criticalFailure') {
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: -1, count: 1 },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFactionPracticalCF = factionCommand;
            if (factionCommand.outcomeBadges) {
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
            }
          }
        }
      } else if (approach === 'ruthless') {
        if (outcome === 'criticalFailure') {
          const damageHandler = new DamageStructureHandler();
          const damageCommand = await damageHandler.prepare(
            { type: 'damageStructure', count: 1 },
            commandContext
          );
          if (damageCommand) {
            ctx.metadata._preparedDamage = damageCommand;
            if (damageCommand.outcomeBadges) {
              outcomeBadges.push(...damageCommand.outcomeBadges);
            } else if (damageCommand.outcomeBadge) {
              outcomeBadges.push(damageCommand.outcomeBadge);
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

    // Commit all prepared faction commands
    const factionCommands = [
      ctx.metadata?._preparedFactionVirtuousCS1,
      ctx.metadata?._preparedFactionVirtuousCS2,
      ctx.metadata?._preparedFactionVirtuousCF1,
      ctx.metadata?._preparedFactionVirtuousCF2,
      ctx.metadata?._preparedFactionPracticalCS,
      ctx.metadata?._preparedFactionPracticalS,
      ctx.metadata?._preparedFactionPracticalF,
      ctx.metadata?._preparedFactionPracticalCF
    ];

    for (const factionCommand of factionCommands) {
      if (factionCommand?.commit) {
        await factionCommand.commit();
      }
    }

    const damageCommand = ctx.metadata?._preparedDamage;
    if (damageCommand?.commit) {
      await damageCommand.commit();
    }

    // Add ongoing research modifier (practical CS)
    if (ctx.metadata?._ongoingResearch && approach === 'practical') {
      const research = ctx.metadata._ongoingResearch;
      await updateKingdom(k => {
        if (!k.activeModifiers) k.activeModifiers = [];
        k.activeModifiers.push({
          id: `magical-research-${Date.now()}`,
          name: 'Magical Research',
          description: `Controlled magical research provides ${research.formula} gold per turn.`,
          icon: 'fas fa-flask',
          tier: 1,
          sourceType: 'custom',
          sourceId: ctx.instanceId || 'magical-discovery',
          sourceName: 'Magical Discovery',
          startTurn: k.turn || 1,
          modifiers: [
            { type: 'dice', resource: 'gold', formula: research.formula, duration: research.duration }
          ]
        });
      });
    }

    return { success: true };
  },

  traits: ["dangerous"],
};
