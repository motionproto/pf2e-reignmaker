/**
 * Drug Den Event Pipeline (CHOICE-BASED)
 *
 * An illicit drug trade threatens to corrupt your settlement.
 *
 * Approaches:
 * - Rehabilitation (Virtuous) - Offer treatment and compassion
 * - Regulate and Tax (Practical) - Control and profit from trade
 * - Crush with Force (Ruthless) - Brutal crackdown
 *
 * Based on EVENT_MIGRATION_STATUS.md specifications
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { ConvertUnrestToImprisonedHandler } from '../../services/gameCommands/handlers/ConvertUnrestToImprisonedHandler';
import { DamageStructureHandler } from '../../services/gameCommands/handlers/DamageStructureHandler';
import { valueBadge, diceBadge, textBadge } from '../../types/OutcomeBadge';
import { updateKingdom } from '../../stores/KingdomStore';

export const drugDenPipeline: CheckPipeline = {
  id: 'drug-den',
  name: 'Drug Den',
  description: 'An illicit drug trade threatens to corrupt your settlement.',
  checkType: 'event',
  tier: 1,

  strategicChoice: {
    label: 'How will you respond to the drug trade?',
    required: true,
    options: [
      {
        id: 'virtuous',
        label: 'Rehabilitation',
        description: 'Provide treatment and help addicts recover',
        icon: 'fas fa-hand-holding-medical',
        skills: ['medicine', 'diplomacy', 'religion', 'applicable lore'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Compassionate care redeems addicts; community celebrates recovery stories.',
          success: 'Treatment programs heal suffering souls and restore shattered families.',
          failure: 'Expensive programs deplete treasury with limited recovery success.',
          criticalFailure: 'Naive idealism drains coffers while trade flourishes unchecked.'
        },
        outcomeBadges: {
          criticalSuccess: [
            textBadge('Adjust 1 faction +1', 'fas fa-users', 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d4', 'positive')
          ],
          success: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '2d3', 'negative')
          ],
          criticalFailure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '2d3', 'negative'),
            textBadge('Damage 1 structure', 'fas fa-house-crack', 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Regulate and Tax',
        description: 'Control trade through regulation and taxation',
        icon: 'fas fa-balance-scale',
        skills: ['society', 'medicine', 'thievery', 'applicable lore'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Pragmatic licensing transforms vice into sustainable revenue stream.',
          success: 'Controlled trade fills coffers while maintaining public order.',
          failure: 'Underground dealers evade taxes; regulation proves toothless.',
          criticalFailure: 'Profiteering from suffering outrages citizens and damages legitimacy.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d4', 'positive'),
            textBadge('+1 Gold per turn for 3 turns', 'fas fa-coins', 'positive')
          ],
          success: [
            valueBadge('Gain {{value}} Gold', 'fas fa-coins', 1, 'positive'),
            textBadge('+1 Gold per turn (ongoing)', 'fas fa-coins', 'positive')
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
        label: 'Crush with Force',
        description: 'Brutal crackdown and mass arrests',
        icon: 'fas fa-fist-raised',
        skills: ['intimidation', 'athletics', 'stealth', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Brutal raids terrorize dealers into submission; imprisoned criminals rot in cells.',
          success: 'Savage crackdown disrupts supply; fear silences the trade.',
          failure: 'Brutal tactics spark outrage; innocents suffer alongside dealers.',
          criticalFailure: 'Violent raids ignite riots; burning buildings mark your tyranny.'
        },
        outcomeBadges: {
          criticalSuccess: [
            textBadge('Convert {{value}} Unrest to Imprisoned', 'fas fa-lock', 'positive'),
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive')
          ],
          success: [
            textBadge('Convert {{value}} Unrest to Imprisoned', 'fas fa-lock', 'positive')
          ],
          failure: [
            diceBadge('{{value}} innocents harmed', 'fas fa-user-injured', '1d3', 'negative')
          ],
          criticalFailure: [
            textBadge('Damage 1 structure', 'fas fa-house-crack', 'negative'),
            diceBadge('{{value}} innocents harmed', 'fas fa-user-injured', '1d3', 'negative')
          ]
        }
      }
    ]
  },

  skills: [
    { skill: 'stealth', description: 'undercover investigation' },
    { skill: 'medicine', description: 'treat addicts, trace source' },
    { skill: 'intimidation', description: 'crack down hard' },
    { skill: 'athletics', description: 'physically raid den' },
    { skill: 'diplomacy', description: 'community outreach' },
    { skill: 'society', description: 'regulatory framework' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your approach proves highly effective.',
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
      description: 'Drug trade persists despite efforts.',
      endsEvent: false,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'Your handling backfires badly.',
      endsEvent: false,
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

      const selectedOption = drugDenPipeline.strategicChoice?.options.find(opt => opt.id === approach);
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      const commandContext: GameCommandContext = {
        actionId: 'drug-den',
        outcome: ctx.outcome,
        kingdom: ctx.kingdom,
        metadata: ctx.metadata || {}
      };

      if (approach === 'virtuous') {
        // All outcomes handled by standard badges
      } else if (approach === 'practical') {
        if (outcome === 'criticalSuccess') {
          ctx.metadata._ongoingGold = { duration: 2, formula: '2d3' };
        } else if (outcome === 'success') {
          ctx.metadata._ongoingGold = { duration: 1, formula: '1d3' };
        }
      } else if (approach === 'ruthless') {
        if (outcome === 'criticalSuccess') {
          const imprisonHandler = new ConvertUnrestToImprisonedHandler();
          const imprisonCommand = await imprisonHandler.prepare(
            { type: 'convertUnrestToImprisoned', amount: 3, diceFormula: '1d3' },
            commandContext
          );
          if (imprisonCommand) {
            ctx.metadata._preparedImprison = imprisonCommand;
            if (imprisonCommand.outcomeBadges) {
              outcomeBadges.push(...imprisonCommand.outcomeBadges);
            } else if (imprisonCommand.outcomeBadge) {
              outcomeBadges.push(imprisonCommand.outcomeBadge);
            }
          }
        } else if (outcome === 'success') {
          const imprisonHandler = new ConvertUnrestToImprisonedHandler();
          const imprisonCommand = await imprisonHandler.prepare(
            { type: 'convertUnrestToImprisoned', amount: 2, diceFormula: '1d2' },
            commandContext
          );
          if (imprisonCommand) {
            ctx.metadata._preparedImprison = imprisonCommand;
            if (imprisonCommand.outcomeBadges) {
              outcomeBadges.push(...imprisonCommand.outcomeBadges);
            } else if (imprisonCommand.outcomeBadge) {
              outcomeBadges.push(imprisonCommand.outcomeBadge);
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
      }

      return { resources: [], outcomeBadges };
    }
  },

  execute: async (ctx) => {
    const { get } = await import('svelte/store');
    const { kingdomData } = await import('../../stores/KingdomStore');
    const kingdom = get(kingdomData);
    const approach = kingdom.turnState?.eventsPhase?.selectedApproach;

    // Add ongoing gold modifier (practical CS/S)
    if (ctx.metadata?._ongoingGold && approach === 'practical') {
      const ongoing = ctx.metadata._ongoingGold;
      await updateKingdom(k => {
        if (!k.activeModifiers) k.activeModifiers = [];
        k.activeModifiers.push({
          id: `drug-den-tax-${Date.now()}`,
          name: 'Drug Trade Regulation',
          description: `Regulated drug trade provides ${ongoing.formula} gold per turn.`,
          icon: 'fas fa-cannabis',
          tier: 1,
          sourceType: 'custom',
          sourceId: ctx.instanceId || 'drug-den',
          sourceName: 'Drug Den Event',
          startTurn: k.currentTurn || 1,
          modifiers: [
            { type: 'dice', resource: 'gold', formula: ongoing.formula, duration: ongoing.duration }
          ]
        });
      });
    }

    // Execute imprisonment (ruthless CS/S)
    const imprisonCommand = ctx.metadata?._preparedImprison;
    if (imprisonCommand?.commit) {
      await imprisonCommand.commit();
    }

    // Execute structure damage (ruthless CF)
    const damageCommand = ctx.metadata?._preparedDamage;
    if (damageCommand?.commit) {
      await damageCommand.commit();
    }

    return { success: true };
  },

  traits: ["dangerous", "ongoing"],
};
