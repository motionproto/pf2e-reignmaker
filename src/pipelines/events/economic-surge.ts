/**
 * Economic Surge Event Pipeline (CHOICE-BASED)
 *
 * Trade and productivity boom throughout your kingdom.
 *
 * Approaches:
 * - Raise Wages (Virtuous) - Improve worker conditions
 * - Invest in Infrastructure (Practical) - Growth and resources
 * - Maximize Taxes (Ruthless) - Extract maximum profit
 *
 * Based on EVENT_MIGRATION_STATUS.md specifications
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { DamageStructureHandler } from '../../services/gameCommands/handlers/DamageStructureHandler';
import { AdjustFactionHandler } from '../../services/gameCommands/handlers/AdjustFactionHandler';
import { valueBadge, diceBadge, textBadge } from '../../types/OutcomeBadge';

export const economicSurgePipeline: CheckPipeline = {
  id: 'economic-surge',
  name: 'Economic Surge',
  description: 'Trade and productivity boom throughout your kingdom.',
  checkType: 'event',
  tier: 1,

  // Strategic choice - triggers voting system
  // Options ordered: Virtuous (left) → Practical (center) → Ruthless (right)
  strategicChoice: {
    label: 'How will you capitalize on the economic boom?',
    required: true,
    options: [
      {
        id: 'virtuous',
        label: 'Share Prosperity',
        description: 'Improve worker conditions and share prosperity',
        icon: 'fas fa-heart',
        skills: ['diplomacy', 'society', 'crafting', 'applicable lore'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Generous wages inspire loyalty; thriving workers fuel even greater prosperity.',
          success: 'Fair compensation eases tensions and sustains economic momentum.',
          failure: 'Well-intentioned spending outpaces economic gains.',
          criticalFailure: 'Lavish promises bankrupt treasury while achieving nothing lasting.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          success: [
            valueBadge('Gain {{value}} Gold', 'fas fa-coins', 1, 'positive')
          ],
          failure: [
            valueBadge('Lose {{value}} Gold', 'fas fa-coins', 1, 'negative')
          ],
          criticalFailure: [
            diceBadge('Lose {{value}} random resource', 'fas fa-box', '2d3', 'negative'),
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Stockpile Surplus',
        description: 'Use prosperity for sustainable growth',
        icon: 'fas fa-industry',
        skills: ['society', 'crafting', 'medicine', 'applicable lore'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Strategic investments multiply wealth; warehouses overflow with bounty.',
          success: 'Prudent planning stockpiles resources for future needs.',
          failure: 'Conservative approach captures only meager surplus.',
          criticalFailure: 'Mismanaged investments squander the windfall entirely.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d4', 'positive'),
            diceBadge('Gain {{value}} random resource', 'fas fa-box', '2d3', 'positive'),
            diceBadge('Gain {{value}} Food', 'fas fa-drumstick-bite', '1d4', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} random resource', 'fas fa-box', '1d3', 'positive'),
            diceBadge('Gain {{value}} Food', 'fas fa-drumstick-bite', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} random resource', 'fas fa-box', '1d3', 'negative'),
            diceBadge('Lose {{value}} Food', 'fas fa-drumstick-bite', '1d3', 'negative')
          ],
          criticalFailure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '2d3', 'negative'),
            diceBadge('Lose {{value}} random resource', 'fas fa-box', '1d4', 'negative'),
            diceBadge('Lose {{value}} Food', 'fas fa-drumstick-bite', '1d4', 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Exploit for Profit',
        description: 'Extract maximum profit from the boom',
        icon: 'fas fa-coins',
        skills: ['intimidation', 'society', 'thievery', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Ruthless extraction drains every coin; intimidation silences dissent.',
          success: 'Heavy-handed taxes seize wealth while citizens grumble bitterly.',
          failure: 'Greedy demands alienate merchants and drain goodwill.',
          criticalFailure: 'Crushing taxation ignites violent riots; buildings burn in protest.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} random resource', 'fas fa-box', '2d3', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d4', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d3', 'positive')
          ],
          failure: [
            valueBadge('Lose {{value}} Gold', 'fas fa-coins', 1, 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative')
          ]
        }
      }
    ]
  },

  skills: [
    { skill: 'society', description: 'manage growth' },
    { skill: 'diplomacy', description: 'attract traders' },
    { skill: 'crafting', description: 'increase production' },
    { skill: 'intimidation', description: 'enforce taxes' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your approach maximizes the economic boom.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    success: {
      description: 'Your approach succeeds.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    failure: {
      description: 'The boom benefits your kingdom modestly.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'The economic opportunity is squandered.',
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
      const selectedOption = economicSurgePipeline.strategicChoice?.options.find(opt => opt.id === approach);

      // Get outcome badges from the selected approach
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      const commandContext: GameCommandContext = {
        actionId: 'economic-surge',
        outcome: ctx.outcome,
        kingdom: ctx.kingdom,
        metadata: ctx.metadata || {}
      };

      if (approach === 'virtuous') {
        // Raise Wages (Virtuous)
        if (outcome === 'criticalSuccess' || outcome === 'success') {
          // Adjust 1 faction +1
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: 1, count: 1 },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFactionVirtuousPositive = factionCommand;
            if (factionCommand.outcomeBadges) {
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
            }
          }
        } else if (outcome === 'failure') {
          // Adjust 1 faction -1
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: -1, count: 1 },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFactionVirtuousNegative = factionCommand;
            if (factionCommand.outcomeBadges) {
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
            }
          }
        }
      } else if (approach === 'practical') {
        // Invest in Infrastructure (Practical)
        // All outcomes handled by standard badges
        // NOTE: Resource choice will need UI implementation - for now defaulting to Lumber
        if (outcome === 'criticalSuccess' || outcome === 'success') {
          ctx.metadata._choiceResource = true;
        }
      } else if (approach === 'ruthless') {
        // Maximize Taxes (Ruthless)
        if (outcome === 'failure') {
          // Adjust 1 faction -1
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: -1, count: 1 },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFactionRuthlessNegative = factionCommand;
            if (factionCommand.outcomeBadges) {
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
            }
          }
        } else if (outcome === 'criticalSuccess') {
          // +2d3 Gold, -1d3 Unrest (intimidation), 1 settlement gains a structure
          // Structure gain handled in execute()
          ctx.metadata._gainStructure = true;
        } else if (outcome === 'criticalFailure') {
          // +1d3 Unrest, -1 Fame, damage 1 structure (riot)
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
    // NOTE: Standard modifiers (unrest, gold, fame) are applied automatically by
    // ResolutionDataBuilder + GameCommandsService via outcomeBadges.
    // This execute() only handles special game commands.

    const { get } = await import('svelte/store');
    const { kingdomData } = await import('../../stores/KingdomStore');
    const kingdom = get(kingdomData);
    const approach = kingdom.turnState?.eventsPhase?.selectedApproach;
    const outcome = ctx.outcome;

    // Execute faction adjustments
    if (approach === 'virtuous') {
      if (outcome === 'criticalSuccess' || outcome === 'success') {
        const factionCommand = ctx.metadata?._preparedFactionVirtuousPositive;
        if (factionCommand?.commit) {
          await factionCommand.commit();
        }
      } else if (outcome === 'failure') {
        const factionCommand = ctx.metadata?._preparedFactionVirtuousNegative;
        if (factionCommand?.commit) {
          await factionCommand.commit();
        }
      }
    } else if (approach === 'ruthless') {
      if (outcome === 'failure') {
        const factionCommand = ctx.metadata?._preparedFactionRuthlessNegative;
        if (factionCommand?.commit) {
          await factionCommand.commit();
        }
      }
    }

    // Execute structure damage (ruthless CF)
    const damageCommand = ctx.metadata?._preparedDamage;
    if (damageCommand?.commit) {
      await damageCommand.commit();
    }

    // Gain random structure (ruthless CS)
    if (ctx.metadata?._gainStructure && approach === 'ruthless') {
      // TODO: Implement structure gain logic
      // For now, log that this needs implementation
      console.log('Economic Surge: Structure gain needs implementation');
    }

    return { success: true };
  },

  traits: ['beneficial'],
};
