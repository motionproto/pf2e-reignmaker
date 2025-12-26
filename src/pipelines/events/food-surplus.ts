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
import { GrantStructureHandler } from '../../services/gameCommands/handlers/GrantStructureHandler';
import { valueBadge, diceBadge, textBadge } from '../../types/OutcomeBadge';

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
        id: 'idealist',
        label: 'Feed the Poor',
        description: 'Share abundance with the poor and needy',
        icon: 'fas fa-bread-slice',
        skills: ['nature', 'diplomacy', 'medicine', 'applicable lore'],
        personality: { idealist: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Selfless sharing inspires hope; grateful communities build new structures.',
          success: 'Generous hearts feed hungry mouths; loyalty blooms amid plenty.',
          failure: 'Well-meaning charity attracts opportunists; resentment brews.',
          criticalFailure: 'Naive generosity creates chaos; spoiled food breeds discontent.'
        },
        outcomeBadges: {
          criticalSuccess: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive')
          ],
          success: [
            valueBadge('Gain {{value}} Food', 'fas fa-drumstick-bite', 1, 'positive')
          ],
          failure: [
            valueBadge('Lose {{value}} Food', 'fas fa-drumstick-bite', 1, 'negative'),
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d2', 'negative')
          ],
          criticalFailure: [
            diceBadge('Lose {{value}} Food', 'fas fa-drumstick-bite', '2d4', 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Store & Trade',
        description: 'Stabilize prices and preserve for future',
        icon: 'fas fa-warehouse',
        skills: ['society', 'crafting', 'diplomacy', 'applicable lore'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Expert preservation secures future; markets stabilize as prices drop.',
          success: 'Methodical storage fills granaries; fears of scarcity vanish.',
          failure: 'Bureaucratic delays spoil perishables; profits shrink.',
          criticalFailure: 'Mismanaged warehouses rot; wasted bounty mocks planning.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Food', 'fas fa-drumstick-bite', '2d3', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d3', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Food', 'fas fa-drumstick-bite', '1d3', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Food', 'fas fa-drumstick-bite', '1d3', 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ],
          criticalFailure: [
            diceBadge('Lose {{value}} Food', 'fas fa-drumstick-bite', '2d3', 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '2d3', 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Tax the Farmers',
        description: 'Maximize profit by selling surplus abroad',
        icon: 'fas fa-coins',
        skills: ['society', 'diplomacy', 'deception', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Ruthless trade secures foreign wealth; new markets open eagerly.',
          success: 'Shrewd merchants exploit demand; coffers overflow with gold.',
          failure: 'Greed blinds leaders; hungry citizens watch exports sail away.',
          criticalFailure: 'Callous profiteering sparks outrage; people remember this betrayal.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '3d3', 'positive'),
            diceBadge('Gain {{value}} Food', 'fas fa-drumstick-bite', '1d3', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d3', 'positive')
          ],
          failure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d4', 'negative')
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

      if (approach === 'idealist') {
        // Distribute Freely (Virtuous)
        if (outcome === 'criticalSuccess') {
          // +1 Fame, adjust 1 faction +1, 1 settlement gains a structure
          const structureHandler = new GrantStructureHandler();
          const structureCommand = await structureHandler.prepare(
            { type: 'grantStructure' }, // Random structure to random settlement
            commandContext
          );
          if (structureCommand) {
            ctx.metadata._preparedStructure = structureCommand;
            // Replace static badge with dynamic one
            const filtered = outcomeBadges.filter(b => !b.template?.includes('Gain 1 structure'));
            outcomeBadges.length = 0;
            outcomeBadges.push(...filtered, ...(structureCommand.outcomeBadges || []));
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
          // +1 Food, adjust 1 faction +1
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
        } else if (outcome === 'criticalFailure') {
          // Lose food, adjust 1 faction -1
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
      } else if (approach === 'practical') {
        // Store Reserves (Practical)
        // All outcomes handled by standard badges
      } else if (approach === 'ruthless') {
        // Export for Profit (Ruthless)
        if (outcome === 'criticalSuccess') {
          // +2d3 Gold, adjust 1 faction +1
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: 1, count: 1 },
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
            { type: 'adjustFactionAttitude', steps: -1, count: 1 },
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

    // Execute faction adjustments (idealist approach)
    const factionCommandVirtuous = ctx.metadata?._preparedFactionVirtuous;
    if (factionCommandVirtuous?.commit) {
      await factionCommandVirtuous.commit();
    }

    // Execute faction adjustments (ruthless approach)
    const factionCommand = ctx.metadata?._preparedFactionAdjust;
    if (factionCommand?.commit) {
      await factionCommand.commit();
    }

    // Commit structure grant (idealist CS)
    const structureCommand = ctx.metadata?._preparedStructure;
    if (structureCommand?.commit) {
      await structureCommand.commit();
    }

    return { success: true };
  },

  traits: ["beneficial"],
};
