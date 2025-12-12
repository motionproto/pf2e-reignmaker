/**
 * Magical Discovery Event Pipeline (CHOICE-BASED)
 *
 * A powerful magical site or artifact is discovered in your kingdom.
 *
 * Approaches:
 * - Share Freely (Virtuous) - Open knowledge to all
 * - Controlled Study (Practical) - Regulation and research
 * - Monopolize (Ruthless) - Kingdom-exclusive advantage
 *
 * Based on EVENT_MIGRATION_STATUS.md specifications
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { AdjustFactionHandler } from '../../services/gameCommands/handlers/AdjustFactionHandler';
import { DestroyWorksiteHandler } from '../../services/gameCommands/handlers/DestroyWorksiteHandler';
import { DamageStructureHandler } from '../../services/gameCommands/handlers/DamageStructureHandler';
import { valueBadge, diceBadge } from '../../types/OutcomeBadge';
import { updateKingdom } from '../../stores/KingdomStore';

export const magicalDiscoveryPipeline: CheckPipeline = {
  id: 'magical-discovery',
  name: 'Magical Discovery',
  description: 'A powerful magical site or artifact is discovered in your kingdom.',
  checkType: 'event',
  tier: 1,

  strategicChoice: {
    label: 'How will you handle this magical discovery?',
    required: true,
    options: [
      {
        id: 'virtuous',
        label: 'Share Freely',
        description: 'Make knowledge available to all',
        icon: 'fas fa-book-open',
        skills: ['arcana', 'diplomacy'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Openness sparks innovation and improves relations.',
          success: 'Shared knowledge reduces tensions and gains gold.',
          failure: 'Open access causes unrest.',
          criticalFailure: 'Chaos damages property and angers citizens.'
        },
        outcomeBadges: {
          criticalSuccess: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          success: [
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive'),
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
        id: 'practical',
        label: 'Controlled Study',
        description: 'Regulate and research systematically',
        icon: 'fas fa-flask',
        skills: ['arcana', 'society'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Research yields lasting revenue.',
          success: 'Controlled research generates profit.',
          failure: 'Research creates unrest.',
          criticalFailure: 'Failed study wastes resources.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d3', 'positive')
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
        label: 'Monopolize',
        description: 'Exclusive kingdom advantage',
        icon: 'fas fa-lock',
        skills: ['intimidation', 'arcana'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Monopoly secures wealth.',
          success: 'Exclusive control generates gold.',
          failure: 'Secrecy damages reputation despite profit.',
          criticalFailure: 'Hoarding angers citizens and harms reputation.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d3', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive'),
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative')
          ],
          criticalFailure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative')
          ]
        }
      }
    ]
  },

  skills: [
    { skill: 'arcana', description: 'understand the magic' },
    { skill: 'religion', description: 'divine its purpose' },
    { skill: 'occultism', description: 'unlock its secrets' },
    { skill: 'diplomacy', description: 'share knowledge' },
    { skill: 'society', description: 'organize research' },
    { skill: 'intimidation', description: 'enforce secrecy' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your approach proves highly effective.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    success: {
      description: 'Discovery handled well.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    failure: {
      description: 'Discovery causes complications.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'Magical disaster erupts.',
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

      const selectedOption = magicalDiscoveryPipeline.strategicChoice?.options.find(opt => opt.id === approach);
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      const commandContext: GameCommandContext = {
        actionId: 'magical-discovery',
        outcome: ctx.outcome,
        kingdom: ctx.kingdom,
        metadata: ctx.metadata || {}
      };

      if (approach === 'virtuous') {
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
        } else if (outcome === 'criticalFailure') {
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
      } else if (approach === 'practical') {
        if (outcome === 'criticalSuccess') {
          ctx.metadata._ongoingResearch = { formula: '2d3', duration: 2 };
        }
      } else if (approach === 'ruthless') {
        if (outcome === 'failure') {
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
        } else if (outcome === 'criticalFailure') {
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
    const { get } = await import('svelte/store');
    const { kingdomData } = await import('../../stores/KingdomStore');
    const kingdom = get(kingdomData);
    const approach = kingdom.turnState?.eventsPhase?.selectedApproach;

    const factionCommand = ctx.metadata?._preparedFactionAdjust;
    if (factionCommand?.commit) {
      await factionCommand.commit();
    }

    const damageCommand = ctx.metadata?._preparedDamage;
    if (damageCommand?.commit) {
      await damageCommand.commit();
    }

    // Add ongoing research modifier (practical CS)
    if (ctx.metadata?._ongoingResearch && approach === 'practical') {
      const research = ctx.metadata._ongoingResearch;
      await updateKingdom(k => {
        if (!k.activeModifiers) k.activeModifiers = [];
        k.activeModifiers.push({
          id: `magical-research-${Date.now()}`,
          name: 'Magical Research',
          description: `Controlled magical research provides ${research.formula} gold per turn.`,
          icon: 'fas fa-flask',
          tier: 1,
          sourceType: 'custom',
          sourceId: ctx.instanceId || 'magical-discovery',
          sourceName: 'Magical Discovery',
          startTurn: k.turn || 1,
          modifiers: [
            { type: 'dice', resource: 'gold', formula: research.formula, duration: research.duration }
          ]
        });
      });
    }

    return { success: true };
  },

  traits: ["dangerous"],
};
