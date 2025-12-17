/**
 * Crime Wave Event Pipeline (CHOICE-BASED)
 *
 * A wave of crime sweeps through the kingdom, demanding a response.
 *
 * Approaches:
 * - Launch Investigation (Virtuous) - Bring criminals to justice fairly
 * - Increase Patrols (Practical) - Prevent crime through vigilance
 * - Harsh Crackdown (Ruthless) - Make an example with mass arrests
 *
 * Based on EVENT_MIGRATION_STATUS.md specifications
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { ConvertUnrestToImprisonedHandler } from '../../services/gameCommands/handlers/ConvertUnrestToImprisonedHandler';
import { AddImprisonedHandler } from '../../services/gameCommands/handlers/AddImprisonedHandler';
import { valueBadge, diceBadge, textBadge } from '../../types/OutcomeBadge';

export const crimeWavePipeline: CheckPipeline = {
  id: 'crime-wave',
  name: 'Crime Wave',
  description: 'A wave of crime sweeps through the kingdom, threatening public safety.',
  checkType: 'event',
  tier: 1,

  // Strategic choice - triggers voting system
  // Options ordered: Virtuous (left) → Practical (center) → Ruthless (right)
  strategicChoice: {
    label: 'How will you respond to this crime wave?',
    required: true,
    options: [
      {
        id: 'virtuous',
        label: 'Community outreach',
        description: 'Bring criminals to justice through fair investigation',
        icon: 'fas fa-search',
        skills: ['society', 'diplomacy', 'religion', 'applicable lore'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Brilliant detective work captures criminals and vindicates innocents.',
          success: 'Methodical investigation brings real culprits to fair trial.',
          failure: 'Cold case drains coffers while criminals walk free.',
          criticalFailure: 'Botched inquiry wastes gold and sparks public fury.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d4', 'positive'),
            textBadge('Adjust 1 faction +1', 'fas fa-users', 'positive')
          ],
          success: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative'),
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d4', 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '2d4', 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Patrols',
        description: 'Prevent crime through vigilant security measures',
        icon: 'fas fa-eye',
        skills: ['intimidation', 'society', 'arcana', 'applicable lore'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Tireless guards catch thieves red-handed; trained soldiers emerge.',
          success: 'Visible patrols deter crime and reassure frightened citizens.',
          failure: 'Exhausted guards miss clues; criminals mock futile efforts.',
          criticalFailure: 'Failed patrols exhaust troops and embolden criminals.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d2', 'positive'),
            textBadge('Random army becomes Well Trained (+1 saves)', 'fas fa-star', 'positive')
          ],
          success: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative')
          ],
          criticalFailure: [
            textBadge('Random army becomes Enfeebled', 'fas fa-exclamation-triangle', 'negative'),
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d4', 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Crackdown',
        description: 'Make an example with brutal mass arrests',
        icon: 'fas fa-gavel',
        skills: ['intimidation', 'performance', 'stealth', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Terror reigns supreme; dungeons overflow with arrested suspects.',
          success: 'Ruthless sweeps imprison criminals and intimidate survivors.',
          failure: 'Brutal raids seize innocents; wrongful arrests breed resentment.',
          criticalFailure: 'Savage purge destroys property and outrages the innocent.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Imprison {{value}} dissidents', 'fas fa-user-lock', '2d4', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3+1', 'positive')
          ],
          success: [
            diceBadge('Imprison {{value}} dissidents', 'fas fa-user-lock', '1d3', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          failure: [
            diceBadge('{{value}} innocents harmed', 'fas fa-user-injured', '1d3', 'negative')
          ],
          criticalFailure: [
            diceBadge('{{value}} innocents harmed', 'fas fa-user-injured', '1d4', 'negative'),
            textBadge('1 structure damaged', 'fas fa-house-crack', 'negative')
          ]
        }
      }
    ]
  },

  skills: [
    { skill: 'society', description: 'investigation' },
    { skill: 'diplomacy', description: 'public relations' },
    { skill: 'intimidation', description: 'show of force' },
    { skill: 'performance', description: 'public demonstration' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your response proves highly effective.',
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
      description: 'Your response encounters complications.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'Your handling of the crime backfires.',
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
      const PLAYER_KINGDOM = 'player';

      // Find the selected approach option
      const selectedOption = crimeWavePipeline.strategicChoice?.options.find(opt => opt.id === approach);

      // Get outcome badges from the selected approach
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      const commandContext: GameCommandContext = {
        actionId: 'crime-wave',
        outcome: ctx.outcome,
        kingdom: ctx.kingdom,
        metadata: ctx.metadata || {}
      };

      if (approach === 'virtuous') {
        // Launch Investigation (Virtuous)
        // All outcomes handled by standard badges (unrest reduction)
        // Fair justice reduces unrest without creating prison issues
      } else if (approach === 'practical') {
        // Increase Patrols (Practical)
        if (outcome === 'criticalFailure') {
          // Army becomes enfeebled
          const playerArmies = kingdom.armies?.filter((a: any) => a.ledBy === PLAYER_KINGDOM && a.actorId) || [];
          if (playerArmies.length > 0) {
            const randomArmy = playerArmies[Math.floor(Math.random() * playerArmies.length)];
            
            // Store in metadata for execute
            ctx.metadata._armyCondition = { actorId: randomArmy.actorId, condition: 'enfeebled', value: 1 };
            
            // Update badge with army name
            const armyBadgeIndex = outcomeBadges.findIndex(b => b.template?.includes('army becomes Enfeebled'));
            if (armyBadgeIndex >= 0) {
              outcomeBadges[armyBadgeIndex] = textBadge(
                `${randomArmy.name} becomes Enfeebled`, 
                'fas fa-exclamation-triangle', 
                'negative'
              );
            }
          }
        }
      } else if (approach === 'ruthless') {
        // Harsh Crackdown (Ruthless)
        if (outcome === 'criticalSuccess') {
          // Aggressive mass arrests - convert 1d4 unrest to imprisoned
          const imprisonHandler = new ConvertUnrestToImprisonedHandler();
          const imprisonCommand = await imprisonHandler.prepare(
            { type: 'convertUnrestToImprisoned', amount: 4, diceFormula: '1d4' },
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
          // Convert 1d3 unrest to imprisoned
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
        } else if (outcome === 'failure') {
          // +1 Unrest, imprison 1d2 innocents (increase imprisoned but do not reduce unrest)
          const addImprisonedHandler = new AddImprisonedHandler();
          const imprisonCommand = await addImprisonedHandler.prepare(
            { type: 'addImprisoned', amount: 2, diceFormula: '1d2' },
            commandContext
          );
          if (imprisonCommand) {
            ctx.metadata._preparedAddImprisoned = imprisonCommand;
            if (imprisonCommand.outcomeBadges) {
              outcomeBadges.push(...imprisonCommand.outcomeBadges);
            } else if (imprisonCommand.outcomeBadge) {
              outcomeBadges.push(imprisonCommand.outcomeBadge);
            }
          }
        } else if (outcome === 'criticalFailure') {
          // +1d3 Unrest, -1 Fame, imprison 1d3 innocents (increase imprisoned but do not reduce unrest)
          const addImprisonedHandler = new AddImprisonedHandler();
          const imprisonCommand = await addImprisonedHandler.prepare(
            { type: 'addImprisoned', amount: 3, diceFormula: '1d3' },
            commandContext
          );
          if (imprisonCommand) {
            ctx.metadata._preparedAddImprisoned = imprisonCommand;
            if (imprisonCommand.outcomeBadges) {
              outcomeBadges.push(...imprisonCommand.outcomeBadges);
            } else if (imprisonCommand.outcomeBadge) {
              outcomeBadges.push(imprisonCommand.outcomeBadge);
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

    // Apply army condition (practical CF)
    const armyCondition = ctx.metadata?._armyCondition;
    if (armyCondition?.actorId) {
      const { applyArmyConditionExecution } = await import('../../execution/armies/applyArmyCondition');
      await applyArmyConditionExecution(armyCondition.actorId, armyCondition.condition, armyCondition.value);
    }

    // Execute imprisonment (ruthless CS/S - converts unrest to imprisoned)
    const imprisonCommand = ctx.metadata?._preparedImprison;
    if (imprisonCommand?.commit) {
      await imprisonCommand.commit();
    }

    // Execute innocent imprisonment (ruthless F/CF - adds imprisoned without reducing unrest)
    const addImprisonedCommand = ctx.metadata?._preparedAddImprisoned;
    if (addImprisonedCommand?.commit) {
      await addImprisonedCommand.commit();
    }

    return { success: true };
  },

  traits: ["dangerous"],
};
