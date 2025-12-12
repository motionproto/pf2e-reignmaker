/**
 * Trade Agreement Event Pipeline (CHOICE-BASED)
 *
 * Merchants propose a lucrative trade arrangement.
 *
 * Approaches:
 * - Generous Terms (Virtuous) - Build friendship with favorable trade
 * - Balanced Agreement (Practical) - Mutual benefit and fair exchange
 * - Extract Maximum Advantage (Ruthless) - Demand favorable terms or refuse
 *
 * Based on EVENT_MIGRATION_STATUS.md specifications
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { AdjustFactionHandler } from '../../services/gameCommands/handlers/AdjustFactionHandler';
import { valueBadge, diceBadge } from '../../types/OutcomeBadge';

export const tradeAgreementPipeline: CheckPipeline = {
  id: 'trade-agreement',
  name: 'Trade Agreement',
  description: 'Merchants propose a lucrative trade arrangement.',
  checkType: 'event',
  tier: 1,

  // Strategic choice - triggers voting system
  // Options ordered: Virtuous (left) → Practical (center) → Ruthless (right)
  strategicChoice: {
    label: 'What terms will you negotiate?',
    required: true,
    options: [
      {
        id: 'virtuous',
        label: 'Generous Terms',
        description: 'Build friendship with favorable trade terms',
        icon: 'fas fa-handshake',
        skills: ['diplomacy', 'society'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Generous terms establish profitable long-term trade partnership.',
          success: 'Fair trade builds goodwill with trading partners.',
          failure: 'Partners appreciate gesture but trade is modest.',
          criticalFailure: 'Trading partners see generosity as opportunity to exploit.'
        },
        outcomeBadges: {
          criticalSuccess: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d3', 'positive')
            // Note: Faction adjustment and ongoing resource badges generated in preview
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
            // Note: Faction adjustment and ongoing resource badges generated in preview
          ],
          failure: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
            // Note: Faction adjustment badge generated in preview
          ],
          criticalFailure: [
            // Note: Faction adjustment badge generated in preview
          ]
        }
      },
      {
        id: 'practical',
        label: 'Balanced Agreement',
        description: 'Negotiate mutual benefit for both parties',
        icon: 'fas fa-balance-scale',
        skills: ['diplomacy', 'society'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Perfect agreement creates prosperity for all.',
          success: 'Fair terms satisfy both parties.',
          failure: 'Agreement reached but without major benefits.',
          criticalFailure: 'Negotiations sour relationship despite efforts.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d3', 'positive')
            // Note: Faction adjustments and ongoing resource badges generated in preview
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
            // Note: Faction adjustment and ongoing resource badges generated in preview
          ],
          failure: [
            // Note: Faction adjustment badge generated in preview
          ],
          criticalFailure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
            // Note: Faction adjustment badge generated in preview
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Extract Maximum Advantage',
        description: 'Demand favorable terms or refuse the deal',
        icon: 'fas fa-crown',
        skills: ['deception', 'intimidation'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'You extract highly favorable terms through leverage.',
          success: 'Trading partners accept your demands reluctantly.',
          failure: 'Your hardball tactics damage reputation without gaining much.',
          criticalFailure: 'Excessive demands alienate multiple trading partners.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d3', 'positive')
            // Note: Faction adjustment and ongoing resource badges generated in preview
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
            // Note: Faction adjustment and ongoing resource badges generated in preview
          ],
          failure: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive'),
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative')
            // Note: Faction adjustments and ongoing resource badge generated in preview
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative')
            // Note: Faction adjustments badge generated in preview
          ]
        }
      }
    ]
  },

  skills: [
    { skill: 'diplomacy', description: 'negotiate terms' },
    { skill: 'society', description: 'assess markets' },
    { skill: 'deception', description: 'leverage position' },
    { skill: 'intimidation', description: 'demand advantage' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your negotiation proves highly successful.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    success: {
      description: 'Agreement is reached.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    failure: {
      description: 'Negotiations conclude with mixed results.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'Trade negotiations fail badly.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
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

      // Find the selected approach option
      const selectedOption = tradeAgreementPipeline.strategicChoice?.options.find(opt => opt.id === approach);

      // Get outcome badges from the selected approach
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      const commandContext: GameCommandContext = {
        actionId: 'trade-agreement',
        outcome: ctx.outcome,
        kingdom: ctx.kingdom,
        metadata: ctx.metadata || {}
      };

      if (approach === 'virtuous') {
        // Generous Terms (Virtuous)
        if (outcome === 'criticalSuccess') {
          // +1 Fame, +2d3 Gold, adjust 2 factions +1, choose 1 resource type to gain 1d3 per turn for 2 turns
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
          // Ongoing resource modifier will be added in execute()
          ctx.metadata._ongoingResource = { duration: 2, formula: '1d3' };
        } else if (outcome === 'success') {
          // +1d3 Gold, adjust 1 faction +1, choose 1 resource type to gain 1d3 per turn for 1 turn
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
          ctx.metadata._ongoingResource = { duration: 1, formula: '1d3' };
        } else if (outcome === 'failure') {
          // +1d3 Gold, adjust 1 faction +1
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
        } else if (outcome === 'criticalFailure') {
          // adjust 1 faction -1
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
        // Balanced Agreement (Practical)
        if (outcome === 'criticalSuccess') {
          // +2d3 Gold, adjust 2 factions +1, choose 1 resource type to gain 1d3 per turn for 2 turns
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
          ctx.metadata._ongoingResource = { duration: 2, formula: '1d3' };
        } else if (outcome === 'success') {
          // +1d3 Gold, adjust 1 faction +1, choose 1 resource type to gain 1d3 per turn for 1 turn
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
          ctx.metadata._ongoingResource = { duration: 1, formula: '1d3' };
        } else if (outcome === 'failure') {
          // adjust 1 faction +1
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
        } else if (outcome === 'criticalFailure') {
          // +1 Unrest, adjust 1 faction -1
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
        // Extract Maximum Advantage (Ruthless)
        if (outcome === 'criticalSuccess') {
          // +2d3 Gold, adjust 1 faction -1, choose 1 resource type to gain 2d3 per turn for 3 turns
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
          ctx.metadata._ongoingResource = { duration: 3, formula: '2d3' };
        } else if (outcome === 'success') {
          // +1d3 Gold, adjust 1 faction -1, choose 1 resource type to gain 1d3 per turn for 2 turns
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
          ctx.metadata._ongoingResource = { duration: 2, formula: '1d3' };
        } else if (outcome === 'failure') {
          // +1d3 Gold, -1 Fame, adjust 2 factions -1, choose 1 resource type to gain 1d3 per turn for 1 turn
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
          ctx.metadata._ongoingResource = { duration: 1, formula: '1d3' };
        } else if (outcome === 'criticalFailure') {
          // +1d3 Unrest, -1 Fame, adjust 2 factions -1
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
    // NOTE: Standard modifiers (unrest, gold, fame) are applied automatically by
    // ResolutionDataBuilder + GameCommandsService via outcomeBadges.
    // This execute() only handles special game commands.

    // Execute faction adjustments
    const factionCommand = ctx.metadata?._preparedFactionAdjust;
    if (factionCommand?.commit) {
      await factionCommand.commit();
    }

    // Add ongoing resource modifier if applicable
    // This requires user interaction to choose resource type
    // For now, we'll create a placeholder that can be filled in by a post-apply interaction
    // TODO: Implement resource choice UI in post-apply interaction
    if (ctx.metadata?._ongoingResource) {
      const { updateKingdom } = await import('../../stores/KingdomStore');
      const ongoing = ctx.metadata._ongoingResource;
      
      // For now, default to Food (most common trade good)
      // TODO: Add UI to let player choose resource type
      const resourceType = 'food';
      
      await updateKingdom(k => {
        if (!k.activeModifiers) k.activeModifiers = [];
        k.activeModifiers.push({
          id: `trade-agreement-${Date.now()}`,
          name: 'Trade Agreement',
          description: `Ongoing trade provides ${ongoing.formula} ${resourceType} per turn.`,
          icon: 'fas fa-handshake',
          tier: 1,
          sourceType: 'custom',
          sourceId: ctx.instanceId || 'trade-agreement',
          sourceName: 'Trade Agreement',
          startTurn: k.turn || 1,
          modifiers: [
            { type: 'dice', resource: resourceType, formula: ongoing.formula, duration: ongoing.duration }
          ]
        });
      });
    }

    return { success: true };
  },

  traits: ["beneficial"],
};
