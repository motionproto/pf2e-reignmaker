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
import { valueBadge, diceBadge, textBadge } from '../../types/OutcomeBadge';
import WorksiteTypeSelector from '../../services/hex-selector/WorksiteTypeSelector.svelte';
import {
  validateClaimed,
  validateNoSettlement,
  safeValidation,
  getFreshKingdomData,
  type ValidationResult
} from '../shared/hexValidators';
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
        skills: ['diplomacy', 'survival', 'applicable lore'],
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
        skills: ['society', 'survival', 'applicable lore'],
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
        skills: ['intimidation', 'society', 'applicable lore'],
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
            textBadge('Adjust 1 faction +1', 'fas fa-users', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          success: [
            textBadge('Claim 1 hex', 'fas fa-map', 'positive')
          ],
          failure: [
            textBadge('Adjust 1 faction -1', 'fas fa-users-slash', 'negative'),
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ],
          criticalFailure: [
            textBadge('Adjust 1 faction -1', 'fas fa-users-slash', 'negative'),
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

      if (approach === 'virtuous') {
        // Free Settlement (Virtuous)
        if (outcome === 'criticalSuccess') {
          // +1 Fame, -1d3 Unrest, gain new worksite and a new structure
          ctx.metadata._gainStructure = true;
          ctx.metadata._gainWorksite = true;
        } else if (outcome === 'success') {
          // -1 Unrest, gain new worksite
          ctx.metadata._gainWorksite = true;
        } else if (outcome === 'failure' || outcome === 'criticalFailure') {
          // Lose random resource
          ctx.metadata._loseRandomResource = true;
        }
      } else if (approach === 'practical') {
        // Controlled Development (Practical)
        if (outcome === 'criticalSuccess') {
          // +2d3 Gold, -1d3 Unrest, gain a new structure
          ctx.metadata._gainStructure = true;
        }
        // Other outcomes handled by standard badges
      } else if (approach === 'ruthless') {
        // Auction Land (Ruthless)
        if (outcome === 'criticalSuccess' || outcome === 'success') {
          // +Gold, gain new worksite
          ctx.metadata._gainWorksite = true;
        }
        // Other outcomes handled by standard badges
      }

      return { resources: [], outcomeBadges };
    }
  },

  traits: ["dangerous"],

  postApplyInteractions: [
    {
      id: 'selectedHex',
      type: 'map-selection',
      mode: 'hex-selection',
      count: 1,
      title: 'Select a hex for the new worksite',
      colorType: 'worksite',
      required: true,
      condition: (ctx) => {
        return ctx.metadata?._gainWorksite === true;
      },
      validateHex: (hexId: string): ValidationResult => {
        return safeValidation(() => {
          const kingdom = getFreshKingdomData();
          const hex = kingdom.hexes?.find((h: any) => h.id === hexId);
          
          if (!hex) {
            return { valid: false, message: 'Hex not found' };
          }
          
          const claimedResult = validateClaimed(hexId, kingdom);
          if (!claimedResult.valid) return claimedResult;
          
          const settlementResult = validateNoSettlement(hexId, kingdom);
          if (!settlementResult.valid) return settlementResult;
          
          if (hex.worksite) {
            return { valid: false, message: `Hex already has a ${hex.worksite.type}` };
          }
          
          return { valid: true, message: 'Valid location for worksite' };
        }, hexId, 'land-rush worksite validation');
      },
      customSelector: {
        component: WorksiteTypeSelector
      }
    }
  ],

  execute: async (ctx) => {
    // NOTE: Standard modifiers (unrest, gold, fame) are applied automatically by
    // ResolutionDataBuilder + GameCommandsService via outcomeBadges.
    // This execute() only handles special game commands.

    const { get } = await import('svelte/store');
    const { kingdomData } = await import('../../stores/KingdomStore');
    const kingdom = get(kingdomData);
    const approach = kingdom.turnState?.eventsPhase?.selectedApproach;

    // Create worksite (virtuous CS/S, ruthless CS/S)
    if (ctx.metadata?._gainWorksite) {
      const selectedHexData = ctx.resolutionData?.compoundData?.selectedHex;
      
      if (!selectedHexData) {
        return { success: false, error: 'No hex selected for worksite' };
      }
      
      let hexId: string | undefined;
      let worksiteType: string | undefined;
      
      if (selectedHexData?.hexIds) {
        hexId = selectedHexData.hexIds[0];
        if (hexId && selectedHexData.metadata) {
          worksiteType = selectedHexData.metadata[hexId]?.worksiteType;
        }
      }

      if (!hexId || !worksiteType) {
        return { success: false, error: 'Worksite selection incomplete' };
      }

      const { createWorksiteExecution } = await import('../../execution/territory/createWorksite');
      await createWorksiteExecution(hexId, worksiteType);
      ui.notifications?.info(`Land rush settlers established ${worksiteType} on hex ${hexId}`);
    }

    // Gain random structure (virtuous CS, practical CS)
    if (ctx.metadata?._gainStructure) {
      // TODO: Implement structure gain logic
      console.log('Land Rush: Structure gain needs implementation');
    }

    // Lose random resource (virtuous F/CF)
    if (ctx.metadata?._loseRandomResource) {
      // TODO: Implement random resource loss
      console.log('Land Rush: Random resource loss needs implementation');
    }

    return { success: true };
  }
};
