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
import { AddImprisonedHandler } from '../../services/gameCommands/handlers/AddImprisonedHandler';
import { valueBadge, diceBadge, textBadge } from '../../types/OutcomeBadge';
import { updateKingdom } from '../../stores/KingdomStore';

export const cultActivityPipeline: CheckPipeline = {
  id: 'cult-activity',
  name: 'Cult Activity',
  description: 'A mysterious cult operates within the kingdom\'s borders.',
  checkType: 'event',
  tier: 1,

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
        skills: ['society', 'diplomacy', 'religion', 'applicable lore'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Respectful inquiry reveals benign practices; relations bloom.',
          success: 'Understanding dispels fear and mistrust.',
          failure: 'Half-hearted investigation satisfies no one.',
          criticalFailure: 'Offended cultists vandalize property in retaliation.'
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
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative')
          ],
          criticalFailure: [
            textBadge('Adjust 1 faction -1', 'fas fa-users-slash', 'negative'),
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d4', 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Monitor and Contain',
        description: 'Surveillance to prevent spread of influence',
        icon: 'fas fa-eye',
        skills: ['stealth', 'society', 'occultism', 'applicable lore'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Surveillance exposes schemes; trained agents prevent spread.',
          success: 'Vigilant watch contains cult influence.',
          failure: 'Wasted resources buy no useful intelligence.',
          criticalFailure: 'Cult slips past watchers; influence festers.'
        },
        outcomeBadges: {
          criticalSuccess: [
            textBadge('Adjust 1 faction +1', 'fas fa-users', 'positive'),
            textBadge('Random army becomes Well Trained (+1 saves)', 'fas fa-star', 'positive')
          ],
          success: [
            valueBadge('Gain {{value}} Gold', 'fas fa-coins', 1, 'positive'),
            textBadge('Adjust 1 faction +1', 'fas fa-users', 'positive')
          ],
          failure: [
            textBadge('Adjust 1 faction -1', 'fas fa-users-slash', 'negative'),
            valueBadge('Lose {{value}} Gold', 'fas fa-coins', 1, 'negative')
          ],
          criticalFailure: [
            textBadge('+1 Unrest per turn (ongoing)', 'fas fa-exclamation-triangle', 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '2d3', 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Heretics Burn',
        description: 'Eliminate the cult through force',
        icon: 'fas fa-fist-raised',
        skills: ['intimidation', 'athletics', 'stealth', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Ruthless purge crushes cult; seized treasures enrich coffers.',
          success: 'Swift arrests dismantle the organization.',
          failure: 'Brutal tactics sweep up innocents with cultists.',
          criticalFailure: 'Violent suppression sparks riots; buildings burn.'
        },
        outcomeBadges: {
          criticalSuccess: [
            textBadge('Convert {{value}} Unrest to Imprisoned (cultists)', 'fas fa-lock', 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          success: [
            textBadge('Convert {{value}} Unrest to Imprisoned', 'fas fa-lock', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          failure: [
            diceBadge('{{value}} innocents harmed', 'fas fa-user-injured', '1d3', 'negative')
          ],
          criticalFailure: [
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative'),
            textBadge('Damage 1 structure', 'fas fa-house-crack', 'negative')
          ]
        }
      }
    ]
  },

  skills: [
    { skill: 'society', description: 'understand cult motivations' },
    { skill: 'diplomacy', description: 'respectful engagement' },
    { skill: 'stealth', description: 'surveillance operations' },
    { skill: 'occultism', description: 'understand cult magic' },
    { skill: 'intimidation', description: 'forceful suppression' },
    { skill: 'athletics', description: 'physical enforcement' }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your approach manages the cult effectively.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    success: {
      description: 'The cult activity is handled appropriately.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    failure: {
      description: 'The cult situation worsens.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'Your approach backfires dramatically.',
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
          // Innocents harmed - add imprisoned without reducing unrest
          const imprisonHandler = new AddImprisonedHandler();
          const imprisonCommand = await imprisonHandler.prepare(
            { type: 'addImprisoned', amount: 3, diceFormula: '1d3' },
            commandContext
          );
          if (imprisonCommand) {
            ctx.metadata._preparedInnocentsHarmed = imprisonCommand;
            if (imprisonCommand.outcomeBadges) {
              outcomeBadges.push(...imprisonCommand.outcomeBadges);
            } else if (imprisonCommand.outcomeBadge) {
              outcomeBadges.push(imprisonCommand.outcomeBadge);
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

    // Execute imprisonment (cultists - CS/S)
    const imprisonCommand = ctx.metadata?._preparedImprison;
    if (imprisonCommand?.commit) {
      await imprisonCommand.commit();
    }

    // Execute innocents harmed (failure)
    const innocentsHarmedCommand = ctx.metadata?._preparedInnocentsHarmed;
    if (innocentsHarmedCommand?.commit) {
      await innocentsHarmedCommand.commit();
    }

    // Handle ongoing cult influence (practical CF)
    if (approach === 'practical' && outcome === 'criticalFailure') {
      await updateKingdom(k => {
        if (!k.activeModifiers) k.activeModifiers = [];
        
        k.activeModifiers.push({
          id: `cult-influence-${Date.now()}`,
          name: 'Cult Influence',
          sourceType: 'custom',
          sourceId: 'cult-activity',
          sourceName: 'Cult Activity Event',
          modifiers: [
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
          ],
          startTurn: k.currentTurn || 0,
          tier: 1,
          icon: 'fas fa-moon',
          description: 'Cult influence spreads unrest (2 turns)'
        });
      });
    }

    return { success: true };
  },

  traits: ["dangerous"],
};
