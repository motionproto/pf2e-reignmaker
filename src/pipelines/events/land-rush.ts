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
import { validateClaimHex } from '../shared/claimHexValidator';
import { claimHexesExecution } from '../../execution/territory/claimHexes';
import { valueBadge, diceBadge, textBadge } from '../../types/OutcomeBadge';

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
        label: 'Free Settlement',
        description: 'Grant free land to all settlers',
        icon: 'fas fa-handshake',
        skills: ['diplomacy', 'survival'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Free land inspires prosperity. Settlement and infrastructure flourish.',
          success: 'Free settlement reduces unrest and creates new worksite.',
          failure: 'Chaotic settlement wastes some resources.',
          criticalFailure: 'Disorganized rush depletes kingdom resources.'
        },
        outcomeBadges: {
          criticalSuccess: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive'),
            textBadge('Gain 1 new worksite', 'fas fa-hammer', 'positive')
            // Note: Structure gain handled in execute()
          ],
          success: [
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive'),
            textBadge('Gain 1 new worksite', 'fas fa-hammer', 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} random resource', 'fas fa-cube', '1d3', 'negative')
          ],
          criticalFailure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '2d3', 'negative'),
            diceBadge('Lose {{value}} random resource', 'fas fa-cube', '1d3', 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Controlled Development',
        description: 'Manage expansion with permits and planning',
        icon: 'fas fa-clipboard-check',
        skills: ['society', 'survival'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Orderly expansion generates revenue and infrastructure.',
          success: 'Permit fees provide steady income and reduce unrest.',
          failure: 'Bureaucracy frustrates settlers.',
          criticalFailure: 'Red tape breeds corruption and unrest.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d3', 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
            // Note: Structure gain handled in execute()
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive'),
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')
          ],
          failure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Auction Land',
        description: 'Sell land to the highest bidders',
        icon: 'fas fa-gavel',
        skills: ['intimidation', 'society'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Land auctions generate massive profits and new worksites.',
          success: 'Auctions bring wealth and create new worksites.',
          failure: 'Profits breed resentment among common settlers.',
          criticalFailure: 'Excessive profiteering damages reputation.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d3', 'positive'),
            textBadge('Gain 1 new worksite', 'fas fa-hammer', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive'),
            textBadge('Gain 1 new worksite', 'fas fa-hammer', 'positive')
          ],
          failure: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive'),
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
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

  // Use postApplyInteractions for hex selection (optional - only for claiming hexes)
  // Note: This is commented out for now since the spec doesn't mention hex claiming
  // postApplyInteractions: [
  //   {
  //     type: 'map-selection',
  //     id: 'selectedHexes',
  //     mode: 'hex-selection',
  //     colorType: 'claim',
  //     condition: (ctx) => ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess',
  //     validateHex: validateClaimHex,
  //     outcomeAdjustment: {
  //       criticalSuccess: { count: 1, title: 'Select 1 hex for new settlement' },
  //       success: { count: 1, title: 'Select 1 hex for new settlement' },
  //       failure: { count: 0 },
  //       criticalFailure: { count: 0 }
  //     }
  //   }
  // ],

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
      const { createWorksiteExecution } = await import('../../execution/territory/createWorksite');
      await createWorksiteExecution();
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
