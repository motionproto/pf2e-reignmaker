/**
 * Monster Attack Event Pipeline (CHOICE-BASED)
 *
 * A dangerous creature threatens the kingdom's territory.
 *
 * Approaches:
 * - Relocate Peacefully (Virtuous) - Try to resolve without violence
 * - Hire Hunters (Practical) - Professional solution
 * - Mobilize Army (Ruthless) - Use overwhelming force
 *
 * Based on EVENT_MIGRATION_STATUS.md specifications
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { DamageStructureHandler } from '../../services/gameCommands/handlers/DamageStructureHandler';
import { AdjustFactionHandler } from '../../services/gameCommands/handlers/AdjustFactionHandler';
import { ApplyArmyConditionHandler } from '../../services/gameCommands/handlers/ApplyArmyConditionHandler';
import { valueBadge, diceBadge, genericStructureDamaged, genericArmyConditionPositive, genericArmyConditionNegative } from '../../types/OutcomeBadge';

export const monsterAttackPipeline: CheckPipeline = {
  id: 'monster-attack',
  name: 'Monster Attack',
  description: 'A dangerous creature threatens the kingdom\'s territory.',
  checkType: 'event',
  tier: 1,

  // Strategic choice - triggers voting system
  // Options ordered: Virtuous (left) → Practical (center) → Ruthless (right)
  strategicChoice: {
    label: 'How will you deal with the monster threat?',
    required: true,
    options: [
      {
        id: 'idealist',
        label: 'Relocate Peacefully',
        description: 'Try to relocate the creature without violence',
        icon: 'fas fa-dove',
        skills: ['nature', 'diplomacy', 'medicine', 'applicable lore'],
        personality: { idealist: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Harmony restored; the grateful beast becomes a local guardian.',
          success: 'Peaceful relocation succeeds; creature departs safely.',
          failure: 'Stubborn beast refuses; diplomatic efforts exhausted.',
          criticalFailure: 'Enraged creature rampages through nearby structures.'
        },
        outcomeBadges: {
          criticalSuccess: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive')
          ],
          success: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive')
          ],
          failure: [
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative')
          ],
          criticalFailure: [
            genericStructureDamaged(1)
          ]
        }
      },
      {
        id: 'practical',
        label: 'Hire Hunters',
        description: 'Hire professional hunters to deal with the threat',
        icon: 'fas fa-crosshairs',
        skills: ['stealth', 'intimidation', 'survival', 'applicable lore'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Expert hunters claim trophy parts worth a fortune.',
          success: 'Professional kill yields valuable materials for sale.',
          failure: 'Costly hunt ends in failure; gold wasted on fruitless pursuit.',
          criticalFailure: 'Fleeing hunters leave carnage and broken buildings behind.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d4', 'positive'),
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3+1', 'positive'),
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')
          ],
          failure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3+1', 'negative')
          ],
          criticalFailure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '2d4', 'negative'),
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d4', 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Mobilize Army',
        description: 'Use military force to destroy the creature',
        icon: 'fas fa-shield-alt',
        skills: ['intimidation', 'athletics', 'stealth', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Decisive victory forges battle-hardened veterans from raw troops.',
          success: 'Coordinated assault trains soldiers in live combat.',
          failure: 'Beast outmaneuvers weary troops; collateral damage spreads.',
          criticalFailure: 'Humiliating rout leaves soldiers wounded and demoralized.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3+1', 'positive'),
            genericArmyConditionPositive('Well Trained')
          ],
          success: [
            genericArmyConditionPositive('Well Trained')
          ],
          failure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative'),
            genericStructureDamaged(1)
          ],
          criticalFailure: [
            genericArmyConditionNegative('Enfeebled')
          ]
        }
      }
    ]
  },

  skills: [
    { skill: 'nature', description: 'understand creature behavior' },
    { skill: 'diplomacy', description: 'negotiate peacefully' },
    { skill: 'medicine', description: 'treat injured creature' },
    { skill: 'stealth', description: 'coordinate with hunters' },
    { skill: 'intimidation', description: 'mobilize military forces' },
    { skill: 'athletics', description: 'physical combat' }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your approach handles the monster threat effectively.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    success: {
      description: 'The monster threat is resolved.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    failure: {
      description: 'The monster causes damage.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'The monster attack has devastating consequences.',
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

      const selectedOption = monsterAttackPipeline.strategicChoice?.options.find(opt => opt.id === approach);
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];
      const commandContext: GameCommandContext = { kingdom, outcome: outcome || 'success' };

      // Handle faction adjustment for idealist critical success
      if (approach === 'idealist' && outcome === 'criticalSuccess') {
        const factionHandler = new AdjustFactionHandler();
        const factionCommand = await factionHandler.prepare(
          { type: 'adjustFactionAttitude', steps: 1, count: 1 },
          commandContext
        );
        if (factionCommand) {
          ctx.metadata._preparedFaction = factionCommand;
          if (factionCommand.outcomeBadges) {
            outcomeBadges.push(...factionCommand.outcomeBadges);
          } else if (factionCommand.outcomeBadge) {
            outcomeBadges.push(factionCommand.outcomeBadge);
          }
        }
      }

      // Handle structure damage for failure outcomes
      if (approach === 'idealist' && outcome === 'criticalFailure') {
        // +1d3 Unrest, damage 1 structure
        outcomeBadges.push(diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'));
        
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
      } else if (approach === 'practical' && outcome === 'criticalFailure') {
        // +1d3 Unrest, -2d3 Gold, damage 1 structure
        outcomeBadges.push(
          diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
          diceBadge('Lose {{value}} Gold', 'fas fa-coins', '2d3', 'negative')
        );
        
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
      } else if (approach === 'ruthless' && outcome === 'failure') {
        // +1 Unrest, -1d3 Gold, damage 1 structure
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

      // Handle army effects for ruthless approach
      if (approach === 'ruthless') {
        const armyHandler = new ApplyArmyConditionHandler();

        if (outcome === 'criticalSuccess' || outcome === 'success') {
          // Well Trained bonus
          const armyCommand = await armyHandler.prepare(
            { type: 'applyArmyCondition', condition: 'well-trained', value: 1, armyId: 'random' },
            commandContext
          );
          if (armyCommand) {
            ctx.metadata._preparedArmyCondition = armyCommand;
            if (armyCommand.outcomeBadges) {
              outcomeBadges.push(...armyCommand.outcomeBadges);
            }
          }
        } else if (outcome === 'failure') {
          // Fatigued condition
          const armyCommand = await armyHandler.prepare(
            { type: 'applyArmyCondition', condition: 'fatigued', value: 1, armyId: 'random' },
            commandContext
          );
          if (armyCommand) {
            ctx.metadata._preparedArmyCondition = armyCommand;
            if (armyCommand.outcomeBadges) {
              outcomeBadges.push(...armyCommand.outcomeBadges);
            }
          }
        } else if (outcome === 'criticalFailure') {
          // Enfeebled condition
          const armyCommand = await armyHandler.prepare(
            { type: 'applyArmyCondition', condition: 'enfeebled', value: 1, armyId: 'random' },
            commandContext
          );
          if (armyCommand) {
            ctx.metadata._preparedArmyCondition = armyCommand;
            if (armyCommand.outcomeBadges) {
              outcomeBadges.push(...armyCommand.outcomeBadges);
            }
          }
        }
      }

      return { resources: [], outcomeBadges };
    }
  },

  execute: async (ctx) => {
    // NOTE: Standard modifiers (unrest, gold, fame, food) are applied automatically by
    // ResolutionDataBuilder + GameCommandsService via outcomeBadges.
    // This execute() only handles special game commands.

    // Execute faction adjustment
    const factionCommand = ctx.metadata?._preparedFaction;
    if (factionCommand?.commit) {
      await factionCommand.commit();
    }

    // Execute structure damage
    const damageCommand = ctx.metadata?._preparedDamage;
    if (damageCommand?.commit) {
      await damageCommand.commit();
    }

    // Execute army condition (prepared in preview.calculate)
    const armyCommand = ctx.metadata?._preparedArmyCondition;
    if (armyCommand?.commit) {
      await armyCommand.commit();
    }

    return { success: true };
  },

  traits: ["dangerous"],
};
