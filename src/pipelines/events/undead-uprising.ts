/**
 * Undead Uprising Event Pipeline (CHOICE-BASED)
 *
 * The dead rise to threaten the living in the kingdom.
 *
 * Approaches:
 * - Consecrate Land (Virtuous) - Peaceful resolution through consecration
 * - Hire Clerics (Practical) - Professional spiritual defense
 * - Burn Everything (Ruthless) - Scorched earth tactics
 *
 * Based on EVENT_MIGRATION_STATUS.md specifications
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { AdjustFactionHandler } from '../../services/gameCommands/handlers/AdjustFactionHandler';
import { DamageStructureHandler } from '../../services/gameCommands/handlers/DamageStructureHandler';
import { ConvertUnrestToImprisonedHandler } from '../../services/gameCommands/handlers/ConvertUnrestToImprisonedHandler';
import { ApplyArmyConditionHandler } from '../../services/gameCommands/handlers/ApplyArmyConditionHandler';
import { valueBadge, diceBadge, genericArmyConditionPositive } from '../../types/OutcomeBadge';

export const undeadUprisingPipeline: CheckPipeline = {
  id: 'undead-uprising',
  name: 'Undead Uprising',
  description: 'The dead rise to threaten the living in the kingdom.',
  checkType: 'event',
  tier: 1,

  // Strategic choice - triggers voting system
  // Options ordered: Virtuous (left) → Practical (center) → Ruthless (right)
  strategicChoice: {
    label: 'How will you respond to the undead uprising?',
    required: true,
    options: [
      {
        id: 'virtuous',
        label: 'Consecrate Land',
        description: 'Lay spirits to rest through consecration rituals',
        icon: 'fas fa-hands-praying',
        skills: ['occultism', 'diplomacy', 'religion', 'applicable lore'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Sacred rituals grant eternal peace; blessed ground yields abundant harvest.',
          success: 'Compassionate rites lay troubled spirits to rest; gratitude fills the air.',
          failure: 'Gentle ceremonies prove insufficient; restless dead resist prayers.',
          criticalFailure: 'Naive faith falters; enraged spirits shatter sanctuaries in fury.'
        },
        outcomeBadges: {
          criticalSuccess: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive')
          ],
          success: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d4', 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d4', 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Mobilize Troops',
        description: 'Professional clergy to seal the area',
        icon: 'fas fa-user-shield',
        skills: ['occultism', 'athletics', 'intimidation', 'applicable lore'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Disciplined troops contain outbreak; methodical response trains elite defenders.',
          success: 'Professional forces quarantine threat; systematic purge succeeds.',
          failure: 'Cautious tactics drain coffers; indecisive leadership loses ground.',
          criticalFailure: 'Hesitant response allows spread; overwhelmed forces flee in terror.'
        },
        outcomeBadges: {
          criticalSuccess: [
            genericArmyConditionPositive('Well Trained')
          ],
          success: [
            valueBadge('Gain {{value}} Gold', 'fas fa-coins', 1, 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ],
          criticalFailure: [
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Burn Everything',
        description: 'Destroy everything in the affected area',
        icon: 'fas fa-fire',
        skills: ['intimidation', 'stealth', 'thievery', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Ruthless flames purge corruption; captured necromancers face brutal justice.',
          success: 'Merciless inferno consumes undead; scorched earth marks grim victory.',
          failure: 'Reckless burning spreads chaos; indiscriminate flames devour innocent lands.',
          criticalFailure: 'Catastrophic firestorm razes everything; ashes mark shameful defeat.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d3', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          failure: [
            valueBadge('Lose {{value}} hex (border)', 'fas fa-map', 1, 'negative')
          ],
          criticalFailure: [
            valueBadge('Lose {{value}} hex (border)', 'fas fa-map', 1, 'negative')
          ]
        }
      }
    ]
  },

  skills: [
    { skill: 'occultism', description: 'understand spiritual matters' },
    { skill: 'diplomacy', description: 'negotiate with spirits' },
    { skill: 'stealth', description: 'coordinate with clerics' },
    { skill: 'intimidation', description: 'mobilize forces' }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your approach handles the undead uprising effectively.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    success: {
      description: 'The undead threat is resolved.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    failure: {
      description: 'The undead cause damage.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'The undead uprising has devastating consequences.',
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

      // Find the selected approach option
      const selectedOption = undeadUprisingPipeline.strategicChoice?.options.find(opt => opt.id === approach);

      // Get outcome badges from the selected approach
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      const commandContext: GameCommandContext = {
        actionId: 'undead-uprising',
        outcome: ctx.outcome,
        kingdom: ctx.kingdom,
        metadata: ctx.metadata || {}
      };

      // Handle faction adjustments
      if (approach === 'virtuous' && outcome === 'criticalSuccess') {
        // adjust 1 faction +1, +1 Fame
        const factionHandler = new AdjustFactionHandler();
        const factionCommand = await factionHandler.prepare(
          { type: 'adjustFactionAttitude', steps: 1, count: 1 },
          commandContext
        );
        if (factionCommand) {
          ctx.metadata._preparedFactionVirtuousCS = factionCommand;
          if (factionCommand.outcomeBadges) {
            outcomeBadges.push(...factionCommand.outcomeBadges);
          } else if (factionCommand.outcomeBadge) {
            outcomeBadges.push(factionCommand.outcomeBadge);
          }
        }
      } else if (approach === 'practical' && outcome === 'criticalSuccess') {
        // adjust 1 faction +1, random army becomes Well Trained
        const factionHandler = new AdjustFactionHandler();
        const factionCommand = await factionHandler.prepare(
          { type: 'adjustFactionAttitude', steps: 1, count: 1 },
          commandContext
        );
        if (factionCommand) {
          ctx.metadata._preparedFactionPracticalCS = factionCommand;
          if (factionCommand.outcomeBadges) {
            outcomeBadges.push(...factionCommand.outcomeBadges);
          } else if (factionCommand.outcomeBadge) {
            outcomeBadges.push(factionCommand.outcomeBadge);
          }
        }

        // Well Trained army bonus
        const armyHandler = new ApplyArmyConditionHandler();
        const armyCmd = await armyHandler.prepare(
          { type: 'applyArmyCondition', condition: 'well-trained', value: 1, armyId: 'random' },
          commandContext
        );
        if (armyCmd) {
          ctx.metadata._preparedArmyCondition = armyCmd;
          // Remove static badge and add dynamic one
          const filtered = outcomeBadges.filter(b => !b.template?.includes('army becomes Well Trained'));
          outcomeBadges.length = 0;
          outcomeBadges.push(...filtered, ...(armyCmd.outcomeBadges || []));
        }
      } else if (approach === 'practical' && outcome === 'success') {
        // adjust 1 faction +1, +1 Gold
        const factionHandler = new AdjustFactionHandler();
        const factionCommand = await factionHandler.prepare(
          { type: 'adjustFactionAttitude', steps: 1, count: 1 },
          commandContext
        );
        if (factionCommand) {
          ctx.metadata._preparedFactionPracticalS = factionCommand;
          if (factionCommand.outcomeBadges) {
            outcomeBadges.push(...factionCommand.outcomeBadges);
          } else if (factionCommand.outcomeBadge) {
            outcomeBadges.push(factionCommand.outcomeBadge);
          }
        }
      } else if (approach === 'practical' && outcome === 'failure') {
        // -1d3 Gold, adjust 1 faction -1
        const factionHandler = new AdjustFactionHandler();
        const factionCommand = await factionHandler.prepare(
          { type: 'adjustFactionAttitude', steps: -1, count: 1 },
          commandContext
        );
        if (factionCommand) {
          ctx.metadata._preparedFactionPracticalF = factionCommand;
          if (factionCommand.outcomeBadges) {
            outcomeBadges.push(...factionCommand.outcomeBadges);
          } else if (factionCommand.outcomeBadge) {
            outcomeBadges.push(factionCommand.outcomeBadge);
          }
        }
      }

      // Handle special outcomes based on approach
      if (approach === 'virtuous' && outcome === 'criticalFailure') {
        // damage 1 structure (unrest already in outcomeBadges)
        const damageHandler = new DamageStructureHandler();
        const damageCommand = await damageHandler.prepare(
          { type: 'damageStructure', count: 1 },
          commandContext
        );
        if (damageCommand) {
          ctx.metadata._preparedDamageVirtuous = damageCommand;
          if (damageCommand.outcomeBadges) {
            outcomeBadges.push(...damageCommand.outcomeBadges);
          } else if (damageCommand.outcomeBadge) {
            outcomeBadges.push(damageCommand.outcomeBadge);
          }
        }
      } else if (approach === 'practical' && outcome === 'criticalFailure') {
        // damage 1 structure (fame already in outcomeBadges)
        const damageHandler = new DamageStructureHandler();
        const damageCommand = await damageHandler.prepare(
          { type: 'damageStructure', count: 1 },
          commandContext
        );
        if (damageCommand) {
          ctx.metadata._preparedDamagePractical = damageCommand;
          if (damageCommand.outcomeBadges) {
            outcomeBadges.push(...damageCommand.outcomeBadges);
          } else if (damageCommand.outcomeBadge) {
            outcomeBadges.push(damageCommand.outcomeBadge);
          }
        }
      } else if (approach === 'ruthless' && outcome === 'criticalSuccess') {
        // Imprison 1d4 necromancers (convert unrest to imprisoned if available)
        const imprisonHandler = new ConvertUnrestToImprisonedHandler();
        const imprisonCommand = await imprisonHandler.prepare(
          { type: 'convertUnrestToImprisoned', amount: 4, diceFormula: '1d4' },
          commandContext
        );
        if (imprisonCommand) {
          ctx.metadata._preparedImprisonCS = imprisonCommand;
          if (imprisonCommand.outcomeBadges) {
            outcomeBadges.push(...imprisonCommand.outcomeBadges);
          } else if (imprisonCommand.outcomeBadge) {
            outcomeBadges.push(imprisonCommand.outcomeBadge);
          }
        }
      } else if (approach === 'ruthless' && outcome === 'success') {
        // Imprison 1d3 (convert unrest to imprisoned)
        const imprisonHandler = new ConvertUnrestToImprisonedHandler();
        const imprisonCommand = await imprisonHandler.prepare(
          { type: 'convertUnrestToImprisoned', amount: 3, diceFormula: '1d3' },
          commandContext
        );
        if (imprisonCommand) {
          ctx.metadata._preparedImprisonS = imprisonCommand;
          if (imprisonCommand.outcomeBadges) {
            outcomeBadges.push(...imprisonCommand.outcomeBadges);
          } else if (imprisonCommand.outcomeBadge) {
            outcomeBadges.push(imprisonCommand.outcomeBadge);
          }
        }
      } else if (approach === 'ruthless' && outcome === 'criticalFailure') {
        // damage 1 structure (hex loss in outcomeBadges)
        const damageHandler = new DamageStructureHandler();
        const damageCommand = await damageHandler.prepare(
          { type: 'damageStructure', count: 1 },
          commandContext
        );
        if (damageCommand) {
          ctx.metadata._preparedDamageRuthless = damageCommand;
          if (damageCommand.outcomeBadges) {
            outcomeBadges.push(...damageCommand.outcomeBadges);
          } else if (damageCommand.outcomeBadge) {
            outcomeBadges.push(damageCommand.outcomeBadge);
          }
        }
      }

      return { resources: [], outcomeBadges };
    }
  },

  execute: async (ctx) => {
    // NOTE: Standard modifiers (unrest, gold, fame, food, lumber) are applied automatically by
    // ResolutionDataBuilder + GameCommandsService via outcomeBadges.
    // This execute() only handles special game commands.

    // Execute faction adjustments
    const factionVirtuousCS = ctx.metadata?._preparedFactionVirtuousCS;
    if (factionVirtuousCS?.commit) {
      await factionVirtuousCS.commit();
    }

    const factionPracticalCS = ctx.metadata?._preparedFactionPracticalCS;
    if (factionPracticalCS?.commit) {
      await factionPracticalCS.commit();
    }

    const factionPracticalS = ctx.metadata?._preparedFactionPracticalS;
    if (factionPracticalS?.commit) {
      await factionPracticalS.commit();
    }

    const factionPracticalF = ctx.metadata?._preparedFactionPracticalF;
    if (factionPracticalF?.commit) {
      await factionPracticalF.commit();
    }

    // Execute structure damage (virtuous CF)
    const damageVirtuous = ctx.metadata?._preparedDamageVirtuous;
    if (damageVirtuous?.commit) {
      await damageVirtuous.commit();
    }

    // Execute structure damage (practical CF)
    const damagePractical = ctx.metadata?._preparedDamagePractical;
    if (damagePractical?.commit) {
      await damagePractical.commit();
    }

    // Execute structure damage (ruthless CF)
    const damageRuthless = ctx.metadata?._preparedDamageRuthless;
    if (damageRuthless?.commit) {
      await damageRuthless.commit();
    }

    // Execute imprisonment (ruthless CS - necromancers)
    const imprisonCS = ctx.metadata?._preparedImprisonCS;
    if (imprisonCS?.commit) {
      await imprisonCS.commit();
    }

    // Execute imprisonment (ruthless S)
    const imprisonS = ctx.metadata?._preparedImprisonS;
    if (imprisonS?.commit) {
      await imprisonS.commit();
    }

    // Apply Well Trained effect (practical CS)
    const armyCommand = ctx.metadata?._preparedArmyCondition;
    if (armyCommand?.commit) {
      await armyCommand.commit();
    }

    return { success: true };
  },

  traits: ["dangerous"],
};
