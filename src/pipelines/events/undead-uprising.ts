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
import { DamageStructureHandler } from '../../services/gameCommands/handlers/DamageStructureHandler';
import { ConvertUnrestToImprisonedHandler } from '../../services/gameCommands/handlers/ConvertUnrestToImprisonedHandler';
import { valueBadge, diceBadge, textBadge } from '../../types/OutcomeBadge';

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
        skills: ['occultism', 'diplomacy', 'applicable lore'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Spirits rest peacefully, blessed harvest follows.',
          success: 'The land is consecrated and spirits laid to rest.',
          failure: 'Consecration fails, rituals cost resources.',
          criticalFailure: 'Rituals backfire, undead damage property.'
        },
        outcomeBadges: {
          criticalSuccess: [
            textBadge('Adjust 1 faction +1', 'fas fa-users', 'positive'),
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive')
          ],
          success: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d4', 'negative')
          ],
          criticalFailure: [
            textBadge('Damage 1 structure', 'fas fa-house-crack', 'negative'),
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d4', 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Mobilize Troops',
        description: 'Professional clergy to seal the area',
        icon: 'fas fa-user-shield',
        skills: ['occultism', 'stealth', 'applicable lore'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Clerics seal the threat, boundary markers provided.',
          success: 'The area is sealed by professional clerics.',
          failure: 'Clerics struggle, resources depleted.',
          criticalFailure: 'Clerics fail, undead spread further.'
        },
        outcomeBadges: {
          criticalSuccess: [
            textBadge('Adjust 1 faction +1', 'fas fa-users', 'positive'),
            textBadge('Random army becomes Well Trained (+1 saves)', 'fas fa-star', 'positive')
          ],
          success: [
            textBadge('Adjust 1 faction +1', 'fas fa-users', 'positive'),
            valueBadge('Gain {{value}} Gold', 'fas fa-coins', 1, 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative'),
            textBadge('Adjust 1 faction -1', 'fas fa-users-slash', 'negative')
          ],
          criticalFailure: [
            textBadge('Damage 1 structure', 'fas fa-house-crack', 'negative'),
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Burn Everything',
        description: 'Destroy everything in the affected area',
        icon: 'fas fa-fire',
        skills: ['intimidation', 'stealth', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Fire purges the threat, necromancers captured.',
          success: 'The scorched earth tactic eliminates the undead.',
          failure: 'Fire spreads uncontrollably, damaging structures.',
          criticalFailure: 'Catastrophic destruction, widespread damage.'
        },
        outcomeBadges: {
          criticalSuccess: [
            textBadge('Convert {{value}} Unrest to Imprisoned (necromancers)', 'fas fa-lock', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d3', 'positive')
          ],
          success: [
            textBadge('Convert {{value}} Unrest to Imprisoned', 'fas fa-lock', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          failure: [
            textBadge('Lose 1 hex', 'fas fa-map', 'negative')
          ],
          criticalFailure: [
            textBadge('Damage 1 structure', 'fas fa-house-crack', 'negative'),
            textBadge('Lose 1 hex', 'fas fa-map', 'negative')
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

      const outcomeBadges = [];
      const commandContext: GameCommandContext = { kingdom, outcome: outcome || 'success' };

      // Handle special outcomes based on approach
      if (approach === 'virtuous' && outcome === 'criticalFailure') {
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
      } else if (approach === 'ruthless' && outcome === 'criticalSuccess') {
        // Imprison 1d4 necromancers (convert unrest to imprisoned if available)
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
      } else if (approach === 'ruthless' && outcome === 'failure') {
        // +1 Unrest, damage 1 structure
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
      } else if (approach === 'ruthless' && outcome === 'criticalFailure') {
        // +1d3 Unrest, damage 1d2 structures, -1 Fame
        outcomeBadges.push(
          diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
          valueBadge('Lose {{value}} Fame', 'fas fa-star', -1, 'negative')
        );
        
        const damageHandler = new DamageStructureHandler();
        const damageCommand = await damageHandler.prepare(
          { type: 'damageStructure', count: 2, diceFormula: '1d2' },
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

      return { resources: [], outcomeBadges };
    }
  },

  execute: async (ctx) => {
    // NOTE: Standard modifiers (unrest, gold, fame, food, lumber) are applied automatically by
    // ResolutionDataBuilder + GameCommandsService via outcomeBadges.
    // This execute() only handles special game commands.

    // Execute structure damage
    const damageCommand = ctx.metadata?._preparedDamage;
    if (damageCommand?.commit) {
      await damageCommand.commit();
    }

    // Execute imprisonment (ruthless CS - necromancers)
    const imprisonCommand = ctx.metadata?._preparedImprison;
    if (imprisonCommand?.commit) {
      await imprisonCommand.commit();
    }

    return { success: true };
  },

  traits: ["dangerous"],
};
