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
import { valueBadge, diceBadge } from '../../types/OutcomeBadge';
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
        label: 'Fair Housing',
        description: 'Ensure fair housing and protect worker rights',
        icon: 'fas fa-home',
        skills: ['diplomacy', 'society'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Fair policies inspire hope and attract new infrastructure.',
          success: 'Worker protections reduce unrest and provide modest income.',
          failure: 'Costs of fair housing exceed revenue.',
          criticalFailure: 'Mismanagement creates chaos and unrest.'
        },
        outcomeBadges: {
          criticalSuccess: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
            // Note: Structure gain handled in execute()
          ],
          success: [
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Regulate Growth',
        description: 'Manage growth sustainably with permits',
        icon: 'fas fa-clipboard-check',
        skills: ['society', 'crafting'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Orderly growth brings wealth, resources, and infrastructure.',
          success: 'Regulated expansion provides steady income.',
          failure: 'Bureaucracy slows growth and frustrates citizens.',
          criticalFailure: 'Red tape causes chaos and unrest.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d3', 'positive'),
            diceBadge('Gain {{value}} Lumber/Stone', 'fas fa-cube', '2d4', 'positive')
            // Note: Structure gain handled in execute()
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          failure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Exploit Boom',
        description: 'Extract maximum revenue while boom lasts',
        icon: 'fas fa-coins',
        skills: ['intimidation', 'society'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Aggressive extraction yields massive ongoing profits.',
          success: 'Heavy fees extract wealth despite grumbling.',
          failure: 'Profit comes at the cost of significant unrest.',
          criticalFailure: 'Excessive exploitation damages reputation.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d3', 'positive')
            // Note: Ongoing modifier added in execute()
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d3', 'positive'),
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ],
          failure: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive'),
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative')
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
    { skill: 'crafting', description: 'expand infrastructure' },
    { skill: 'diplomacy', description: 'maintain order' },
    { skill: 'intimidation', description: 'enforce fees' },
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

      if (approach === 'virtuous') {
        // Fair Housing (Virtuous)
        if (outcome === 'criticalSuccess') {
          // +1 Fame, -1d3 Unrest, gain a new structure
          ctx.metadata._gainStructure = true;
        }
        // Other outcomes handled by standard badges
      } else if (approach === 'practical') {
        // Regulate Growth (Practical)
        if (outcome === 'criticalSuccess') {
          // +2d3 Gold, gain 2d4 choice of Lumber/Stone, gain a new structure
          ctx.metadata._gainStructure = true;
          ctx.metadata._choiceResource = true;
        }
        // Other outcomes handled by standard badges
      } else if (approach === 'ruthless') {
        // Exploit Boom (Ruthless)
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

    // Gain random structure (virtuous CS, practical CS)
    if (ctx.metadata?._gainStructure) {
      // TODO: Implement structure gain logic
      console.log('Boomtown: Structure gain needs implementation');
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
          startTurn: k.turn || 1,
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
