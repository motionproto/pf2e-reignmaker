/**
 * Remarkable Treasure Event Pipeline (CHOICE-BASED)
 *
 * Explorers discover valuable resources or ancient treasure.
 *
 * Approaches:
 * - Share with All (Virtuous) - Distribute wealth to citizens
 * - Add to Treasury (Practical) - Use for kingdom projects
 * - Keep for Leadership (Ruthless) - Leadership benefits
 *
 * Based on EVENT_MIGRATION_STATUS.md specifications
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { AdjustFactionHandler } from '../../services/gameCommands/handlers/AdjustFactionHandler';
import { valueBadge, diceBadge, textBadge } from '../../types/OutcomeBadge';

export const remarkableTreasurePipeline: CheckPipeline = {
  id: 'remarkable-treasure',
  name: 'Remarkable Treasure',
  description: 'Explorers discover valuable resources or ancient treasure.',
  checkType: 'event',
  tier: 1,

  strategicChoice: {
    label: 'How will you use this treasure?',
    required: true,
    options: [
      {
        id: 'idealist',
        label: 'Share with All',
        description: 'Distribute wealth to all citizens',
        icon: 'fas fa-hand-holding-heart',
        skills: ['diplomacy', 'society', 'religion', 'applicable lore'],
        personality: { idealist: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Selfless sharing unites hearts; grateful factions celebrate generous leaders.',
          success: 'Fair distribution eases burdens; grateful citizens praise compassion.',
          failure: 'Noble gestures squander wealth inefficiently; waste overshadows kindness.',
          criticalFailure: 'Chaotic handouts spark riots over unfair shares; good intentions burn.'
        },
        outcomeBadges: {
          criticalSuccess: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
          ],
          success: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative'),
            diceBadge('Lose {{value}} random resource', 'fas fa-box', '1d3', 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Add to Treasury',
        description: 'Invest in kingdom infrastructure and projects',
        icon: 'fas fa-coins',
        skills: ['society', 'crafting', 'thievery', 'applicable lore'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Methodical investment multiplies treasure; wise planning yields lasting prosperity.',
          success: 'Pragmatic allocation strengthens coffers; measured approach builds reserves.',
          failure: 'Bureaucratic hoarding frustrates citizens watching wealth locked away.',
          criticalFailure: 'Greedy stockpiling breeds anger; resentment costs more than treasure gains.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d4', 'positive'),
            diceBadge('Gain {{value}} random resource', 'fas fa-box', '2d3', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive'),
            diceBadge('Gain {{value}} random resource', 'fas fa-box', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Keep for Leadership',
        description: 'Reserve benefits for kingdom leaders',
        icon: 'fas fa-crown',
        skills: ['thievery', 'diplomacy', 'deception', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Ruthless elite claim spoils; enriched leaders ignore public grumbling.',
          success: 'Greedy leaders pocket treasure; simmering anger shadows ill-gotten gains.',
          failure: 'Blatant theft outrages citizens; stolen wealth cannot buy lost trust.',
          criticalFailure: 'Shameless plunder sparks rebellion; paralyzed leadership faces consequences.'
        },
        outcomeBadges: {
          criticalSuccess: [
            textBadge('Gain 1 action', 'fas fa-bolt', 'positive'),
            valueBadge('Gain {{value}} Gold', 'fas fa-coins', 1, 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d3', 'positive')
          ],
          failure: [
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
      { skill: 'society', description: 'appraise value' },
      { skill: 'thievery', description: 'secure it safely' },
      { skill: 'diplomacy', description: 'negotiate claims' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'Treasure maximizes benefits.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    success: {
      description: 'Treasure provides wealth.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    failure: {
      description: 'Treasure causes complications.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'Treasure causes problems.',
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

      const selectedOption = remarkableTreasurePipeline.strategicChoice?.options.find(opt => opt.id === approach);
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      const commandContext: GameCommandContext = {
        actionId: 'remarkable-treasure',
        outcome: ctx.outcome,
        kingdom: ctx.kingdom,
        metadata: ctx.metadata || {}
      };

      if (approach === 'idealist') {
        if (outcome === 'criticalSuccess') {
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
        }
      } else if (approach === 'ruthless') {
        if (outcome === 'criticalSuccess') {
          ctx.metadata._claimStipend = true;
        } else if (outcome === 'criticalFailure') {
          ctx.metadata._loseAction = true;
        }
      }

      return { resources: [], outcomeBadges };
    }
  },

  execute: async (ctx) => {
    const factionCommand = ctx.metadata?._preparedFactionAdjust;
    if (factionCommand?.commit) {
      await factionCommand.commit();
    }

    if (ctx.metadata?._claimStipend) {
      // TODO: Implement claim stipend for all leaders
      console.log('Remarkable Treasure: Claim Stipend needs implementation');
    }

    if (ctx.metadata?._loseAction) {
      // TODO: Implement lose leader action
      console.log('Remarkable Treasure: Lose leader action needs implementation');
    }

    return { success: true };
  },

  traits: ["beneficial"],
};
