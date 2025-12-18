/**
 * Archaeological Find Event Pipeline (CHOICE-BASED)
 *
 * Ancient ruins or artifacts are discovered in your territory.
 *
 * Approaches:
 * - Preserve as Heritage (Virtuous) - Free public access
 * - Scholarly Study (Practical) - Museum and research
 * - Sell Artifacts (Ruthless) - Maximum profit
 *
 * Based on EVENT_MIGRATION_STATUS.md specifications
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { AdjustFactionHandler } from '../../services/gameCommands/handlers/AdjustFactionHandler';
import { IncreaseSettlementLevelHandler } from '../../services/gameCommands/handlers/IncreaseSettlementLevelHandler';
import { ReduceSettlementLevelHandler } from '../../services/gameCommands/handlers/ReduceSettlementLevelHandler';
import { BuildKnowledgeStructureHandler } from '../../services/gameCommands/handlers/BuildKnowledgeStructureHandler';
import { valueBadge, diceBadge } from '../../types/OutcomeBadge';
import { updateKingdom } from '../../stores/KingdomStore';

export const archaeologicalFindPipeline: CheckPipeline = {
  id: 'archaeological-find',
  name: 'Archaeological Find',
  description: 'Ancient ruins or artifacts are discovered in your territory.',
  checkType: 'event',
  tier: 1,

  strategicChoice: {
    label: 'How will you handle this discovery?',
    required: true,
    options: [
      {
        id: 'virtuous',
        label: 'Preserve Heritage',
        description: 'Free public access to cultural treasure',
        icon: 'fas fa-monument',
        skills: ['society', 'religion', 'crafting', 'applicable lore'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Citizens flock to the heritage site; the settlement thrives.',
          success: 'Cultural pride strengthens community bonds.',
          failure: 'Poorly managed site becomes burden on the settlement.',
          criticalFailure: 'Neglected ruins anger historians and locals alike.'
        },
        outcomeBadges: {
          criticalSuccess: [],
          success: [],
          failure: [],
          criticalFailure: []
        }
      },
      {
        id: 'practical',
        label: 'Scholarly Study',
        description: 'Museum and research institution',
        icon: 'fas fa-book',
        skills: ['society', 'occultism', 'arcana', 'applicable lore'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Museum draws scholars and tourists from distant lands.',
          success: 'Academic interest brings modest revenue.',
          failure: 'Research costs spiral beyond initial estimates.',
          criticalFailure: 'Failed exhibition embarrasses royal patrons.'
        },
        outcomeBadges: {
          criticalSuccess: [],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ],
          criticalFailure: [
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Sell Artifacts',
        description: 'Maximize profit through private sales',
        icon: 'fas fa-coins',
        skills: ['diplomacy', 'society', 'thievery', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Wealthy collectors compete for prized relics.',
          success: 'Private auctions yield substantial profit.',
          failure: 'Rushed sales fumble valuable artifacts.',
          criticalFailure: 'Greed angers scholars; treasures sold for pittance.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d4', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d4', 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '2d4', 'negative')
          ],
          criticalFailure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '2d4', 'negative')
          ]
        }
      }
    ]
  },

  skills: [
    { skill: 'society', description: 'historical research' },
    { skill: 'religion', description: 'divine significance' },
    { skill: 'occultism', description: 'arcane investigation' },
    { skill: 'diplomacy', description: 'negotiate sales' },
    { skill: 'crafting', description: 'artifact restoration' },
    { skill: 'arcana', description: 'study magical artifacts' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your approach proves highly effective.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    success: {
      description: 'Discovery handled successfully.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    failure: {
      description: 'Discovery has mixed results.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'Handling causes complications.',
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

      const selectedOption = archaeologicalFindPipeline.strategicChoice?.options.find(opt => opt.id === approach);
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      const commandContext: GameCommandContext = {
        actionId: 'archaeological-find',
        outcome: ctx.outcome,
        kingdom: ctx.kingdom,
        metadata: ctx.metadata || {}
      };

      // Virtuous approach: Settlement level changes + faction adjustments
      if (approach === 'virtuous') {
        if (outcome === 'criticalSuccess') {
          // Settlement gains level + faction +1
          const increaseHandler = new IncreaseSettlementLevelHandler();
          const increaseCommand = await increaseHandler.prepare(
            { type: 'increaseSettlementLevel', increase: 1 },
            commandContext
          );
          if (increaseCommand) {
            ctx.metadata._preparedSettlementIncrease = increaseCommand;
            if (increaseCommand.outcomeBadges) {
              outcomeBadges.push(...increaseCommand.outcomeBadges);
            } else if (increaseCommand.outcomeBadge) {
              outcomeBadges.push(increaseCommand.outcomeBadge);
            }
          }
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: 1, count: 1 },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFactionVirtuous = factionCommand;
            if (factionCommand.outcomeBadges) {
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
            }
          }
        } else if (outcome === 'success') {
          // Settlement gains level only
          const increaseHandler = new IncreaseSettlementLevelHandler();
          const increaseCommand = await increaseHandler.prepare(
            { type: 'increaseSettlementLevel', increase: 1 },
            commandContext
          );
          if (increaseCommand) {
            ctx.metadata._preparedSettlementIncrease = increaseCommand;
            if (increaseCommand.outcomeBadges) {
              outcomeBadges.push(...increaseCommand.outcomeBadges);
            } else if (increaseCommand.outcomeBadge) {
              outcomeBadges.push(increaseCommand.outcomeBadge);
            }
          }
        } else if (outcome === 'failure') {
          // Settlement loses level only
          const reduceHandler = new ReduceSettlementLevelHandler();
          const reduceCommand = await reduceHandler.prepare(
            { type: 'reduceSettlementLevel', reduction: 1 },
            commandContext
          );
          if (reduceCommand) {
            ctx.metadata._preparedSettlementReduce = reduceCommand;
            if (reduceCommand.outcomeBadges) {
              outcomeBadges.push(...reduceCommand.outcomeBadges);
            } else if (reduceCommand.outcomeBadge) {
              outcomeBadges.push(reduceCommand.outcomeBadge);
            }
          }
        } else if (outcome === 'criticalFailure') {
          // Settlement loses level + faction -1
          const reduceHandler = new ReduceSettlementLevelHandler();
          const reduceCommand = await reduceHandler.prepare(
            { type: 'reduceSettlementLevel', reduction: 1 },
            commandContext
          );
          if (reduceCommand) {
            ctx.metadata._preparedSettlementReduce = reduceCommand;
            if (reduceCommand.outcomeBadges) {
              outcomeBadges.push(...reduceCommand.outcomeBadges);
            } else if (reduceCommand.outcomeBadge) {
              outcomeBadges.push(reduceCommand.outcomeBadge);
            }
          }
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: -1, count: 1 },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFactionVirtuous = factionCommand;
            if (factionCommand.outcomeBadges) {
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
            }
          }
        }
      }

      // Practical approach: Build Knowledge structure, tourism, and faction adjustments
      if (approach === 'practical') {
        if (outcome === 'criticalSuccess') {
          // Build Knowledge & Magic structure + faction +1
          const buildHandler = new BuildKnowledgeStructureHandler();
          const buildCommand = await buildHandler.prepare(
            { type: 'buildKnowledgeStructure' },
            commandContext
          );
          if (buildCommand) {
            ctx.metadata._preparedBuildStructure = buildCommand;
            if (buildCommand.outcomeBadges) {
              outcomeBadges.push(...buildCommand.outcomeBadges);
            } else if (buildCommand.outcomeBadge) {
              outcomeBadges.push(buildCommand.outcomeBadge);
            }
          }
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: 1, count: 1 },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFactionPractical = factionCommand;
            if (factionCommand.outcomeBadges) {
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
            }
          }
          // Ongoing tourism gold
          ctx.metadata._ongoingTourism = { formula: '2d3', duration: 2 };
        } else if (outcome === 'success') {
          // Faction +1
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: 1, count: 1 },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFactionPractical = factionCommand;
            if (factionCommand.outcomeBadges) {
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
            }
          }
        } else if (outcome === 'failure') {
          // Faction -1
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: -1, count: 1 },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFactionPractical = factionCommand;
            if (factionCommand.outcomeBadges) {
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
            }
          }
        } else if (outcome === 'criticalFailure') {
          // Faction -1
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: -1, count: 1 },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFactionPractical = factionCommand;
            if (factionCommand.outcomeBadges) {
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
            }
          }
        }
      }

      // Ruthless approach: Faction adjustments
      if (approach === 'ruthless') {
        if (outcome === 'criticalSuccess') {
          // Faction +1
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: 1, count: 1 },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFactionRuthless = factionCommand;
            if (factionCommand.outcomeBadges) {
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
            }
          }
        } else if (outcome === 'criticalFailure') {
          // Faction -1
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: -1, count: 1 },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFactionRuthless = factionCommand;
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
    const { get } = await import('svelte/store');
    const { kingdomData } = await import('../../stores/KingdomStore');
    const kingdom = get(kingdomData);
    const approach = kingdom.turnState?.eventsPhase?.selectedApproach;

    // Execute settlement level increase (virtuous CS/S)
    const increaseCommand = ctx.metadata?._preparedSettlementIncrease;
    if (increaseCommand?.commit) {
      await increaseCommand.commit();
    }

    // Execute settlement level reduction (virtuous F/CF)
    const reduceCommand = ctx.metadata?._preparedSettlementReduce;
    if (reduceCommand?.commit) {
      await reduceCommand.commit();
    }

    // Execute build structure (practical CS)
    const buildCommand = ctx.metadata?._preparedBuildStructure;
    if (buildCommand?.commit) {
      await buildCommand.commit();
    }

    // Execute faction adjustments (virtuous)
    const factionVirtuous = ctx.metadata?._preparedFactionVirtuous;
    if (factionVirtuous?.commit) {
      await factionVirtuous.commit();
    }

    // Execute faction adjustments (practical)
    const factionPractical = ctx.metadata?._preparedFactionPractical;
    if (factionPractical?.commit) {
      await factionPractical.commit();
    }

    // Execute faction adjustments (ruthless)
    const factionRuthless = ctx.metadata?._preparedFactionRuthless;
    if (factionRuthless?.commit) {
      await factionRuthless.commit();
    }

    // Add ongoing tourism modifier (practical CS)
    if (ctx.metadata?._ongoingTourism && approach === 'practical') {
      const tourism = ctx.metadata._ongoingTourism;
      await updateKingdom(k => {
        if (!k.activeModifiers) k.activeModifiers = [];
        k.activeModifiers.push({
          id: `archaeological-tourism-${Date.now()}`,
          name: 'Archaeological Tourism',
          description: `Museum and research draws tourists, providing ${tourism.formula} gold per turn.`,
          icon: 'fas fa-monument',
          tier: 1,
          sourceType: 'custom',
          sourceId: ctx.instanceId || 'archaeological-find',
          sourceName: 'Archaeological Find',
          startTurn: k.currentTurn || 1,
          modifiers: [
            { type: 'dice', resource: 'gold', formula: tourism.formula, duration: tourism.duration }
          ]
        });
      });
    }

    return { success: true };
  },

  traits: ['beneficial'],
};
