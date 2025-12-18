/**
 * Land Rush Event Pipeline (CHOICE-BASED)
 *
 * Settlers attempt to claim wilderness at the kingdom's border.
 *
 * Approaches:
 * - Free Settlement (Virtuous) - Free land grants for settlers
 * - Controlled Development (Practical) - Organized permits system
 * - Auction Land (Ruthless) - Sell to highest bidders
 *
 * Based on EVENT_MIGRATION_STATUS.md specifications
 * Uses postApplyInteractions for hex selection (same as claim-hexes action).
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { AdjustFactionHandler } from '../../services/gameCommands/handlers/AdjustFactionHandler';
import { GrantStructureHandler } from '../../services/gameCommands/handlers/GrantStructureHandler';
import { valueBadge, diceBadge, textBadge } from '../../types/OutcomeBadge';
import {
  validateExplored,
  validateAdjacentToClaimed,
  safeValidation,
  getFreshKingdomData,
  type ValidationResult
} from '../shared/hexValidators';
import { PLAYER_KINGDOM } from '../../types/ownership';
import { claimHexesExecution } from '../../execution/territory/claimHexes';

export const landRushPipeline: CheckPipeline = {
  id: 'land-rush',
  name: 'Land Rush',
  description: 'Settlers attempt to claim wilderness at the kingdom\'s border.',
  checkType: 'event',
  tier: 1,

  // Strategic choice - triggers voting system
  // Options ordered: Virtuous (left) → Practical (center) → Ruthless (right)
  strategicChoice: {
    label: 'How will you manage the land rush?',
    required: true,
    options: [
      {
        id: 'virtuous',
        label: 'Fair Distribution',
        description: 'Grant free land to all settlers',
        icon: 'fas fa-handshake',
        skills: ['diplomacy', 'survival', 'society', 'applicable lore'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Generous grants unite pioneers; thriving settlements spring forth.',
          success: 'Fair distribution earns loyalty; grateful settlers claim their plots.',
          failure: 'Noble ideals meet harsh reality; chaos drains coffers.',
          criticalFailure: 'Naive charity empowers land-grabbers; disorder reigns unchecked.'
        },
        outcomeBadges: {
          criticalSuccess: [
            textBadge('Claim 1 hex', 'fas fa-map', 'positive'),
            textBadge('Claim 1 hex', 'fas fa-map', 'positive')
          ],
          success: [
            textBadge('Claim 1 hex', 'fas fa-map', 'positive')
          ],
          failure: [
            valueBadge('Lose {{value}} Gold', 'fas fa-coins', 1, 'negative'),
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative')
          ],
          criticalFailure: [
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative'),
            textBadge('Lose 1 worksite', 'fas fa-industry', 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Auction',
        description: 'Manage expansion with permits and planning',
        icon: 'fas fa-clipboard-check',
        skills: ['society', 'survival', 'performance', 'applicable lore'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Methodical planning yields prosperous settlements and steady revenue.',
          success: 'Efficient permits channel settlers wisely; order prevails.',
          failure: 'Rigid bureaucracy stifles pioneer spirit; delays frustrate all.',
          criticalFailure: 'Tangled regulations spawn corruption; chaos erupts anyway.'
        },
        outcomeBadges: {
          criticalSuccess: [
            textBadge('Claim 1 hex', 'fas fa-map', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d4', 'positive')
          ],
          success: [
            textBadge('Claim 1 hex', 'fas fa-map', 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative'),
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d2', 'negative')
          ],
          criticalFailure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '2d3', 'negative'),
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
            diceBadge('Lose {{value}} random resource', 'fas fa-box', '1d3', 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Favor Allies',
        description: 'Sell land to the highest bidders',
        icon: 'fas fa-gavel',
        skills: ['intimidation', 'society', 'thievery', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Ruthless auctions enrich allies; favored settlers build lucrative ventures.',
          success: 'Shrewd bidding fills coffers; well-connected pioneers claim prime land.',
          failure: 'Blatant favoritism breeds anger; common folk denounce corruption.',
          criticalFailure: 'Greedy schemes backfire; outraged settlers abandon kingdom entirely.'
        },
        outcomeBadges: {
          criticalSuccess: [
            textBadge('Claim 1 hex', 'fas fa-map', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          success: [
            textBadge('Claim 1 hex', 'fas fa-map', 'positive')
          ],
          failure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ],
          criticalFailure: [
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ]
        }
      }
    ]
  },

  skills: [
    { skill: 'diplomacy', description: 'negotiate with settlers' },
    { skill: 'survival', description: 'guide their efforts' },
    { skill: 'intimidation', description: 'assert control' },
    { skill: 'society', description: 'organize permits' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your approach proves highly successful.',
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
      description: 'Expansion encounters problems.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'The land rush fails badly.',
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
      const selectedOption = landRushPipeline.strategicChoice?.options.find(opt => opt.id === approach);

      // Get outcome badges from the selected approach
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      const commandContext: GameCommandContext = {
        actionId: 'land-rush',
        outcome: ctx.outcome,
        kingdom: ctx.kingdom,
        metadata: ctx.metadata || {}
      };

      if (approach === 'virtuous') {
        // Free Settlement (Virtuous) - Claim hexes on success
        if (outcome === 'criticalSuccess') {
          ctx.metadata._claimHexCount = 2; // Two "Claim 1 hex" badges
          // Grant structure
          const structureHandler = new GrantStructureHandler();
          const structureCommand = await structureHandler.prepare(
            { type: 'grantStructure' }, // Random structure to random settlement
            commandContext
          );
          if (structureCommand) {
            ctx.metadata._preparedStructure = structureCommand;
            if (structureCommand.outcomeBadges) {
              outcomeBadges.push(...structureCommand.outcomeBadges);
            }
          }
        } else if (outcome === 'success') {
          ctx.metadata._claimHexCount = 1;
        } else if (outcome === 'failure' || outcome === 'criticalFailure') {
          // Lose random resource
          ctx.metadata._loseRandomResource = true;
        }
      } else if (approach === 'practical') {
        // Controlled Development (Practical) - Claim hexes on success
        if (outcome === 'criticalSuccess') {
          ctx.metadata._claimHexCount = 1;
          // Grant structure
          const structureHandler = new GrantStructureHandler();
          const structureCommand = await structureHandler.prepare(
            { type: 'grantStructure' }, // Random structure to random settlement
            commandContext
          );
          if (structureCommand) {
            ctx.metadata._preparedStructure = structureCommand;
            if (structureCommand.outcomeBadges) {
              outcomeBadges.push(...structureCommand.outcomeBadges);
            }
          }
        } else if (outcome === 'success') {
          ctx.metadata._claimHexCount = 1;
        }
        // Failure/CF: no hex claiming
      } else if (approach === 'ruthless') {
        // Auction Land (Ruthless) - Claim hexes on success
        if (outcome === 'criticalSuccess') {
          ctx.metadata._claimHexCount = 1;

          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: 1, factionId: 'random' },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFactionCS = factionCommand;
            if (factionCommand.outcomeBadges) {
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
            }
          }
        } else if (outcome === 'success') {
          ctx.metadata._claimHexCount = 1;
        } else if (outcome === 'failure') {
          // Adjust 1 faction -1
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: -1, factionId: 'random' },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFactionF = factionCommand;
            if (factionCommand.outcomeBadges) {
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
            }
          }
        } else if (outcome === 'criticalFailure') {
          // Adjust 1 faction -1
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: -1, factionId: 'random' },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFactionCF = factionCommand;
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

  traits: ["dangerous"],

  postApplyInteractions: [
    {
      id: 'claimedHexes',
      type: 'map-selection',
      mode: 'hex-selection',
      count: (ctx: any) => ctx.metadata?._claimHexCount || 0,
      title: (ctx: any) => {
        const count = ctx.metadata?._claimHexCount || 1;
        return count > 1
          ? `Select ${count} hexes to claim for settlers`
          : 'Select a hex to claim for settlers';
      },
      colorType: 'claim',
      required: true,
      condition: (ctx: any) => {
        return (ctx.metadata?._claimHexCount || 0) > 0;
      },
      validateHex: (hexId: string, pendingClaims: string[] = []): ValidationResult => {
        return safeValidation(() => {
          const kingdom = getFreshKingdomData();
          const hex = kingdom.hexes?.find((h: any) => h.id === hexId);

          if (!hex) {
            return { valid: false, message: 'Hex not found' };
          }

          // Already claimed by player?
          if (hex.claimedBy === PLAYER_KINGDOM) {
            return { valid: false, message: 'This hex is already claimed by your kingdom' };
          }

          // Already in pending claims?
          if (pendingClaims.includes(hexId)) {
            return { valid: false, message: 'This hex is already selected' };
          }

          // Must be explored
          const exploredResult = validateExplored(hexId);
          if (!exploredResult.valid) return exploredResult;

          // Must be adjacent to claimed territory (or pending claims)
          const adjacencyResult = validateAdjacentToClaimed(hexId, pendingClaims, kingdom);
          if (!adjacencyResult.valid) return adjacencyResult;

          return { valid: true, message: 'Valid hex for settlement' };
        }, hexId, 'land-rush claim validation');
      }
    }
  ],

  execute: async (ctx) => {
    // NOTE: Standard modifiers (unrest, gold, fame) are applied automatically by
    // ResolutionDataBuilder + GameCommandsService via outcomeBadges.
    // This execute() only handles special game commands.

    // Claim hexes (all success outcomes)
    if (ctx.metadata?._claimHexCount > 0) {
      const selectedHexData = ctx.resolutionData?.compoundData?.claimedHexes;

      if (selectedHexData) {
        let hexIds: string[] = [];

        if (Array.isArray(selectedHexData)) {
          hexIds = selectedHexData;
        } else if (selectedHexData?.hexIds && Array.isArray(selectedHexData.hexIds)) {
          hexIds = selectedHexData.hexIds;
        }

        if (hexIds.length > 0) {
          await claimHexesExecution(hexIds);
          const hexList = hexIds.join(', ');
          const ui = (globalThis as any).ui;
          ui?.notifications?.info(`Land rush settlers claimed hex${hexIds.length > 1 ? 'es' : ''}: ${hexList}`);
        }
      }
    }

    // Commit structure grant (virtuous CS, practical CS)
    const structureCommand = ctx.metadata?._preparedStructure;
    if (structureCommand?.commit) {
      await structureCommand.commit();
    }

    // Lose random resource (virtuous F/CF)
    if (ctx.metadata?._loseRandomResource) {
      // TODO: Implement random resource loss
      console.log('Land Rush: Random resource loss needs implementation');
    }

    // Execute faction adjustments (ruthless approach)
    const factionCommandCS = ctx.metadata?._preparedFactionCS;
    if (factionCommandCS?.commit) {
      await factionCommandCS.commit();
    }

    const factionCommandF = ctx.metadata?._preparedFactionF;
    if (factionCommandF?.commit) {
      await factionCommandF.commit();
    }

    const factionCommandCF = ctx.metadata?._preparedFactionCF;
    if (factionCommandCF?.commit) {
      await factionCommandCF.commit();
    }

    return { success: true };
  }
};
