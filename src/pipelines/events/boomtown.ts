/**
 * Boomtown Event Pipeline (CHOICE-BASED)
 *
 * A settlement experiences sudden, dramatic growth.
 *
 * Approaches:
 * - Fair Housing (Virtuous) - Ensure fair housing and worker rights
 * - Regulate Growth (Practical) - Sustainable and orderly development
 * - Exploit Boom (Ruthless) - Maximum revenue extraction
 *
 * Based on EVENT_MIGRATION_STATUS.md specifications
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { IncreaseSettlementLevelHandler } from '../../services/gameCommands/handlers/IncreaseSettlementLevelHandler';
import { GrantStructureHandler } from '../../services/gameCommands/handlers/GrantStructureHandler';
import { valueBadge, diceBadge, genericGrantStructure, genericSettlementLevelUp } from '../../types/OutcomeBadge';
import { updateKingdom } from '../../stores/KingdomStore';

export const boomtownPipeline: CheckPipeline = {
  id: 'boomtown',
  name: 'Boomtown',
  description: 'A settlement experiences sudden, dramatic growth.',
  checkType: 'event',
  tier: 1,

  // Strategic choice - triggers voting system
  // Options ordered: Virtuous (left) → Practical (center) → Ruthless (right)
  strategicChoice: {
    label: 'How will you manage rapid growth?',
    required: true,
    options: [
      {
        id: 'virtuous',
        label: 'Community Planning',
        description: 'Ensure fair housing and protect worker rights',
        icon: 'fas fa-home',
        skills: ['diplomacy', 'society', 'medicine', 'applicable lore'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Equitable growth inspires loyalty; grateful workers build freely.',
          success: 'Fair housing stabilizes boom; settlement expands peacefully.',
          failure: 'Generous promises drain coffers faster than revenue arrives.',
          criticalFailure: 'Chaotic planning collapses infrastructure and breeds chaos.'
        },
        outcomeBadges: {
          criticalSuccess: [
            genericGrantStructure(1),
            genericSettlementLevelUp()
          ],
          success: [
            genericSettlementLevelUp()
          ],
          failure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '2d3', 'negative')
          ],
          criticalFailure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '2d4', 'negative'),
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Managed Expansion',
        description: 'Manage growth sustainably with permits',
        icon: 'fas fa-clipboard-check',
        skills: ['society', 'crafting', 'nature', 'applicable lore'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Perfect regulations channel boom into wealth and infrastructure.',
          success: 'Measured permits guide sustainable expansion without waste.',
          failure: 'Endless paperwork strangles growth; frustrated builders flee.',
          criticalFailure: 'Suffocating bureaucracy kills momentum and enrages citizens.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} random resource', 'fas fa-box', '1d4', 'positive'),
            diceBadge('Gain {{value}} Food', 'fas fa-drumstick-bite', '1d4', 'positive'),
            genericGrantStructure(1)
          ],
          success: [
            genericGrantStructure(1)
          ],
          failure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative'),
            diceBadge('Lose {{value}} random resource', 'fas fa-box', '1d3', 'negative')
          ],
          criticalFailure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d4', 'negative'),
            diceBadge('Lose {{value}} random resource', 'fas fa-box', '1d4', 'negative'),
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Exploit Markets',
        description: 'Extract maximum revenue while boom lasts',
        icon: 'fas fa-coins',
        skills: ['intimidation', 'society', 'athletics', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Ruthless fees bleed boom dry; gold flows endlessly into vaults.',
          success: 'Extortionate rents extract wealth from resentful newcomers.',
          failure: 'Greedy fees spark anger; profit drowns in rising unrest.',
          criticalFailure: 'Naked exploitation outrages all; reputation crumbles.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d4', 'positive'),
            genericGrantStructure(1)
          ],
          success: [
            genericGrantStructure(1)
          ],
          failure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d2', 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d4', 'negative'),
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative')
          ]
        }
      }
    ]
  },

  skills: [
    { skill: 'society', description: 'manage growth' },
    { skill: 'crafting', description: 'expand infrastructure' },
    { skill: 'diplomacy', description: 'maintain order' },
    { skill: 'intimidation', description: 'enforce fees' },
    { skill: 'athletics', description: 'forced labor' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your approach maximizes the boom.',
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
      description: 'Growth stalls despite efforts.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'Mismanagement wastes opportunity.',
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
      const selectedOption = boomtownPipeline.strategicChoice?.options.find(opt => opt.id === approach);

      // Get outcome badges from the selected approach
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      const commandContext: GameCommandContext = {
        actionId: 'boomtown',
        outcome: ctx.outcome,
        kingdom: ctx.kingdom,
        metadata: ctx.metadata || {}
      };

      if (approach === 'virtuous') {
        // Fair Housing (Virtuous)
        if (outcome === 'criticalSuccess' || outcome === 'success') {
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
        }
        if (outcome === 'criticalSuccess') {
          // +1 Fame, -1d3 Unrest, gain a new structure
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
        }
        // Other outcomes handled by standard badges
      } else if (approach === 'practical') {
        // Regulate Growth (Practical)
        if (outcome === 'criticalSuccess' || outcome === 'success') {
          // Gain a new structure
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
        }
        if (outcome === 'criticalSuccess') {
          ctx.metadata._choiceResource = true;
        }
        // Other outcomes handled by standard badges
      } else if (approach === 'ruthless') {
        // Exploit Boom (Ruthless)
        if (outcome === 'criticalSuccess' || outcome === 'success') {
          // Gain a new structure
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
        }
        if (outcome === 'criticalSuccess') {
          // +2d3 Gold, gain 1d3 Gold per turn for next 2 turns (ongoing modifier)
          ctx.metadata._ongoingGold = { duration: 2, formula: '1d3' };
        }
        // Other outcomes handled by standard badges
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

    // Commit settlement level increase
    const settlementCommand = ctx.metadata?._preparedSettlementIncrease;
    if (settlementCommand?.commit) {
      await settlementCommand.commit();
    }

    // Commit structure grant (virtuous CS, practical CS/S, ruthless CS/S)
    const structureCommand = ctx.metadata?._preparedStructure;
    if (structureCommand?.commit) {
      await structureCommand.commit();
    }

    // Add ongoing gold modifier (ruthless CS)
    if (ctx.metadata?._ongoingGold && approach === 'ruthless') {
      const ongoing = ctx.metadata._ongoingGold;

      await updateKingdom(k => {
        if (!k.activeModifiers) k.activeModifiers = [];
        k.activeModifiers.push({
          id: `boomtown-${Date.now()}`,
          name: 'Boomtown Profits',
          description: `Ongoing boom profits provide ${ongoing.formula} gold per turn.`,
          icon: 'fas fa-city',
          tier: 1,
          sourceType: 'custom',
          sourceId: ctx.instanceId || 'boomtown',
          sourceName: 'Boomtown',
          startTurn: k.currentTurn || 1,
          modifiers: [
            { type: 'dice', resource: 'gold', formula: ongoing.formula, duration: ongoing.duration }
          ]
        });
      });
    }

    return { success: true };
  },

  traits: ["beneficial"],
};
