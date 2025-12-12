/**
 * Food Surplus Event Pipeline (CHOICE-BASED)
 *
 * Exceptional harvests provide abundant food.
 *
 * Approaches:
 * - Distribute Freely (Virtuous) - Share with poor and needy
 * - Store Reserves (Practical) - Stabilize prices and store
 * - Export for Profit (Ruthless) - Maximize profit from surplus
 *
 * Based on EVENT_MIGRATION_STATUS.md specifications
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { AdjustFactionHandler } from '../../services/gameCommands/handlers/AdjustFactionHandler';
import { valueBadge, diceBadge } from '../../types/OutcomeBadge';

export const foodSurplusPipeline: CheckPipeline = {
  id: 'food-surplus',
  name: 'Food Surplus',
  description: 'Exceptional harvests provide abundant food.',
  checkType: 'event',
  tier: 1,

  // Strategic choice - triggers voting system
  // Options ordered: Virtuous (left) → Practical (center) → Ruthless (right)
  strategicChoice: {
    label: 'How will you use the food surplus?',
    required: true,
    options: [
      {
        id: 'virtuous',
        label: 'Distribute Freely',
        description: 'Share abundance with the poor and needy',
        icon: 'fas fa-bread-slice',
        skills: ['nature', 'diplomacy'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Generosity inspires hope and a settlement gains new infrastructure.',
          success: 'Free distribution reduces unrest significantly.',
          failure: 'Distribution reduces some unrest.',
          criticalFailure: 'Poor distribution causes confusion and unrest.'
        },
        outcomeBadges: {
          criticalSuccess: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
            // Note: Structure gain handled in execute()
          ],
          success: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
          ],
          failure: [
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Store Reserves',
        description: 'Stabilize prices and preserve for future',
        icon: 'fas fa-warehouse',
        skills: ['society', 'crafting'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Excellent storage maximizes reserves and calms fears.',
          success: 'Food is safely stored for lean times.',
          failure: 'Storage costs eat into surplus.',
          criticalFailure: 'Poor storage wastes food and money.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive'),
            diceBadge('Gain {{value}} Food', 'fas fa-bread-slice', '2d4', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Food', 'fas fa-bread-slice', '1d4', 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ],
          criticalFailure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Export for Profit',
        description: 'Maximize profit by selling surplus abroad',
        icon: 'fas fa-coins',
        skills: ['society', 'diplomacy'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Exports bring wealth and strengthen trade relations.',
          success: 'Export profits fill the treasury.',
          failure: 'Profitable but breeds resentment among hungry citizens.',
          criticalFailure: 'Exports during scarcity damage reputation and faction relations.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d3', 'positive')
            // Note: Faction adjustment handled in preview
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          failure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative')
            // Note: Faction adjustment handled in preview
          ]
        }
      }
    ]
  },

  skills: [
    { skill: 'nature', description: 'maximize the bounty' },
    { skill: 'society', description: 'organize distribution' },
    { skill: 'crafting', description: 'preserve excess' },
    { skill: 'diplomacy', description: 'manage expectations' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your approach maximizes the benefit.',
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
      description: 'Your approach has mixed results.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'Your handling wastes the opportunity.',
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
      const selectedOption = foodSurplusPipeline.strategicChoice?.options.find(opt => opt.id === approach);

      // Get outcome badges from the selected approach
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      const commandContext: GameCommandContext = {
        actionId: 'food-surplus',
        outcome: ctx.outcome,
        kingdom: ctx.kingdom,
        metadata: ctx.metadata || {}
      };

      if (approach === 'virtuous') {
        // Distribute Freely (Virtuous)
        if (outcome === 'criticalSuccess') {
          // +1 Fame, -1d3 Unrest, 1 settlement gains a structure
          // Structure gain handled in execute()
          ctx.metadata._gainStructure = true;
        }
        // Other outcomes handled by standard badges
      } else if (approach === 'practical') {
        // Store Reserves (Practical)
        // All outcomes handled by standard badges
      } else if (approach === 'ruthless') {
        // Export for Profit (Ruthless)
        if (outcome === 'criticalSuccess') {
          // +2d3 Gold, adjust 1 faction +1
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
          // +1d3 Unrest, -1 Fame, adjust 1 faction -1
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

    // Execute faction adjustments (ruthless approach)
    const factionCommand = ctx.metadata?._preparedFactionAdjust;
    if (factionCommand?.commit) {
      await factionCommand.commit();
    }

    // Gain random structure (virtuous CS)
    if (ctx.metadata?._gainStructure && approach === 'virtuous') {
      // TODO: Implement structure gain logic
      // For now, log that this needs implementation
      console.log('Food Surplus: Structure gain needs implementation');
    }

    return { success: true };
  },

  traits: ["beneficial"],
};
