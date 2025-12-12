/**
 * Cult Activity Event Pipeline (CHOICE-BASED)
 *
 * A mysterious cult operates within the kingdom's borders.
 *
 * Approaches:
 * - Investigate Respectfully (Virtuous) - Balance freedom with safety
 * - Monitor and Contain (Practical) - Controlled surveillance
 * - Suppress with Force (Ruthless) - Eliminate the threat
 *
 * Based on EVENT_MIGRATION_STATUS.md specifications
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { DamageStructureHandler } from '../../services/gameCommands/handlers/DamageStructureHandler';
import { AdjustFactionHandler } from '../../services/gameCommands/handlers/AdjustFactionHandler';
import { ConvertUnrestToImprisonedHandler } from '../../services/gameCommands/handlers/ConvertUnrestToImprisonedHandler';
import { valueBadge, diceBadge } from '../../types/OutcomeBadge';
import { updateKingdom } from '../../stores/KingdomStore';

export const cultActivityPipeline: CheckPipeline = {
  id: 'cult-activity',
  name: 'Cult Activity',
  description: 'A mysterious cult operates within the kingdom\'s borders.',
  checkType: 'event',
  tier: 1,

  // Base skills (filtered by choice)
  skills: [
    { skill: 'society', description: 'understand cult motivations' },
    { skill: 'diplomacy', description: 'respectful engagement' },
    { skill: 'intrigue', description: 'surveillance operations' },
    { skill: 'warfare', description: 'forceful suppression' }
  ],

  // Strategic choice - triggers voting system
  // Options ordered: Virtuous (left) → Practical (center) → Ruthless (right)
  strategicChoice: {
    label: 'How will you respond to the cult activity?',
    required: true,
    options: [
      {
        id: 'virtuous',
        label: 'Investigate Respectfully',
        description: 'Investigate while respecting religious freedom',
        icon: 'fas fa-balance-scale',
        skills: ['society', 'diplomacy'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Investigation reveals truth, relations improve.',
          success: 'Respectful inquiry resolves concerns.',
          failure: 'Investigation fails to uncover truth.',
          criticalFailure: 'Cult retaliates, damages property and relations.'
        },
        outcomeBadges: {
          criticalSuccess: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
          ],
          success: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1', 'positive')
          ],
          failure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1', 'negative')
          ],
          criticalFailure: [] // Damage structure + unrest + faction handled by preview.calculate
        }
      },
      {
        id: 'practical',
        label: 'Monitor and Contain',
        description: 'Surveillance to prevent spread of influence',
        icon: 'fas fa-eye',
        skills: ['intrigue', 'society'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Surveillance prevents any cult expansion.',
          success: 'Cult influence is successfully contained.',
          failure: 'Monitoring efforts fail, resources wasted.',
          criticalFailure: 'Cult spreads, ongoing unrest follows.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
          ],
          success: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1', 'positive')
          ],
          failure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1', 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ],
          criticalFailure: [] // Ongoing cult influence handled by execute
        }
      },
      {
        id: 'ruthless',
        label: 'Suppress with Force',
        description: 'Eliminate the cult through force',
        icon: 'fas fa-fist-raised',
        skills: ['warfare', 'intrigue'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Cult is disbanded, leaders imprisoned.',
          success: 'Forceful suppression eliminates the threat.',
          failure: 'Brutal tactics anger sympathizers.',
          criticalFailure: 'Crackdown backfires, damaging reputation and relations.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
          ],
          success: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1', 'positive')
          ],
          failure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1', 'negative')
          ],
          criticalFailure: [] // +1d3 Unrest, -1 Fame, adjust 2 factions handled by preview.calculate
        }
      }
    ]
  },

  preview: {
    calculate: async (ctx) => {
      const { get } = await import('svelte/store');
      const { kingdomData } = await import('../../stores/KingdomStore');
      const kingdom = get(kingdomData);
      const approach = kingdom.turnState?.eventsPhase?.selectedApproach;
      const outcome = ctx.outcome;

      const outcomeBadges = [];
      const commandContext: GameCommandContext = { currentKingdom: kingdom };

      // Handle faction adjustments and special effects
      if (approach === 'virtuous') {
        if (outcome === 'criticalSuccess') {
          // Adjust 2 factions +1
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFaction', adjustment: 1, count: 2 },
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
        } else if (outcome === 'success') {
          // Adjust 1 faction +1
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFaction', adjustment: 1, count: 1 },
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
        } else if (outcome === 'criticalFailure') {
          // +1d3 Unrest, damage 1 structure, adjust 1 faction -1
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

          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFaction', adjustment: -1, count: 1 },
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
      } else if (approach === 'practical' && outcome === 'criticalFailure') {
        // +1d3 Unrest, ongoing: cult influence (+1 Unrest/turn for 2 turns)
        outcomeBadges.push(diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'));
        // Ongoing modifier handled in execute
      } else if (approach === 'ruthless') {
        if (outcome === 'criticalSuccess') {
          // Imprison 1d3 cultists
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
          // Imprison 1d2 cultists
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
        } else if (outcome === 'failure') {
          // Adjust 1 faction -1
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFaction', adjustment: -1, count: 1 },
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
        } else if (outcome === 'criticalFailure') {
          // +1d3 Unrest, -1 Fame, adjust 2 factions -1
          outcomeBadges.push(
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
            valueBadge('Lose {{value}} Fame', 'fas fa-star', -1, 'negative')
          );
          
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFaction', adjustment: -1, count: 2 },
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
    const outcome = ctx.outcome;

    // Execute structure damage
    const damageCommand = ctx.metadata?._preparedDamage;
    if (damageCommand?.commit) {
      await damageCommand.commit();
    }

    // Execute faction adjustments
    const factionCommand = ctx.metadata?._preparedFaction;
    if (factionCommand?.commit) {
      await factionCommand.commit();
    }

    // Execute imprisonment
    const imprisonCommand = ctx.metadata?._preparedImprison;
    if (imprisonCommand?.commit) {
      await imprisonCommand.commit();
    }

    // Handle ongoing cult influence (practical CF)
    if (approach === 'practical' && outcome === 'criticalFailure') {
      await updateKingdom(k => {
        if (!k.activeModifiers) k.activeModifiers = [];
        
        k.activeModifiers.push({
          id: `cult-influence-${Date.now()}`,
          sourceType: 'custom',
          sourceName: 'Cult Influence',
          modifiers: [
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
          ],
          duration: { type: 'turns', count: 2 },
          icon: 'fas fa-moon',
          description: 'Cult influence spreads unrest'
        });
      });
    }

    return { success: true };
  },

  traits: ["dangerous"],
};
