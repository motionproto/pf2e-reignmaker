/**
 * Public Scandal Event Pipeline (CHOICE-BASED)
 *
 * A leader is implicated in an embarrassing or criminal situation.
 * How will you handle it?
 *
 * Approaches:
 * - Transparent Investigation (Society/Diplomacy) - Honest and open (Virtuous)
 * - Cover It Up (Deception/Stealth) - Suppress quietly (Practical)
 * - Scapegoat Official (Intimidation/Deception) - Blame subordinate (Ruthless)
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { ConvertUnrestToImprisonedHandler } from '../../services/gameCommands/handlers/ConvertUnrestToImprisonedHandler';
import { valueBadge, textBadge, diceBadge } from '../../types/OutcomeBadge';
import { factionService } from '../../services/factions';
import { adjustAttitudeBySteps } from '../../utils/faction-attitude-adjuster';

export const publicScandalPipeline: CheckPipeline = {
  id: 'public-scandal',
  name: 'Public Scandal',
  description: 'A leader is implicated in an embarrassing or criminal situation.',
  checkType: 'event',
  tier: 1,

  // Event strategic choice: How will you handle the scandal?
  strategicChoice: {
    label: 'How will you handle the scandal?',
    required: true,
    options: [
      {
        id: 'virtuous',
        label: 'Transparent Response',
        description: 'Publicly investigate and reveal the truth',
        icon: 'fas fa-search',
        skills: ['society', 'diplomacy', 'applicable lore'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'The investigation reveals truth. Your integrity becomes a testament to justice.',
          success: 'The investigation contains the scandal. Respect is earned.',
          failure: 'The investigation drags on. Costs mount and unrest increases.',
          criticalFailure: 'The investigation backfires. Deeper corruption is revealed.'
        },
        outcomeBadges: {
          criticalSuccess: [
            textBadge('Gain 1 kingdom action', 'fas fa-plus-circle', 'positive')
          ],
          success: [
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          failure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d4', 'negative'),
            textBadge('Adjust 1 faction -1', 'fas fa-users-slash', 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Manage Narrative',
        description: 'Suppress the scandal quietly',
        icon: 'fas fa-user-secret',
        skills: ['deception', 'stealth', 'applicable lore'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'The cover-up succeeds. Evidence disappears and the story dies.',
          success: 'Your suppression contains the damage. The story fades.',
          failure: 'The cover-up is exposed. Deception damages reputation.',
          criticalFailure: 'The cover-up collapses. Bribes fail and the story breaks wider.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d3', 'positive')
          ],
          success: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative')
          ],
          criticalFailure: [
            textBadge('Adjust 1 faction -1', 'fas fa-users-slash', 'negative'),
            textBadge('Adjust 1 faction -1', 'fas fa-users-slash', 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Suppress Story',
        description: 'Blame a subordinate to protect the crown',
        icon: 'fas fa-user-slash',
        skills: ['intimidation', 'deception', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'The scapegoating succeeds. Subordinates are imprisoned.',
          success: 'A subordinate takes the fall. An official is imprisoned, matter closed.',
          failure: 'The scapegoating is transparent. The maneuver backfires.',
          criticalFailure: 'The scapegoating triggers outrage. Factions are horrified.'
        },
        outcomeBadges: {
          criticalSuccess: [
            textBadge('Random army becomes Well Trained (+1 saves)', 'fas fa-star', 'positive'),
            textBadge('Adjust 1 faction +1', 'fas fa-users', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive'),
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')
          ],
          failure: [
            diceBadge('{{value}} innocents harmed', 'fas fa-user-injured', '1d3', 'negative')
          ],
          criticalFailure: [
            diceBadge('{{value}} innocents harmed', 'fas fa-user-injured', '1d4', 'negative'),
            textBadge('Adjust 1 faction -1', 'fas fa-users-slash', 'negative')
          ]
        }
      }
    ]
  },

  skills: [
    { skill: 'society', description: 'investigate publicly' },
    { skill: 'diplomacy', description: 'public apology' },
    { skill: 'deception', description: 'cover up' },
    { skill: 'stealth', description: 'work in secret' },
    { skill: 'intimidation', description: 'silence critics' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your handling of the scandal is masterful.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    success: {
      description: 'The scandal is contained effectively.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    failure: {
      description: 'The scandal damages your reputation.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'Your approach makes the scandal worse.',
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
      const selectedOption = publicScandalPipeline.strategicChoice?.options.find(opt => opt.id === approach);

      // Get outcome badges from the selected approach
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      // Calculate modifiers based on approach
      let modifiers: any[] = [];

      if (approach === 'virtuous') {
        // Transparent Investigation approach - Honest and open (Virtuous)
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'static', resource: 'fame', value: 1, duration: 'immediate' },
            { type: 'dice', resource: 'unrest', formula: '-1d3', negative: true, duration: 'immediate' }
          ];
        } else if (outcome === 'success') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
          ];
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
            { type: 'dice', resource: 'gold', formula: '-1d3', negative: true, duration: 'immediate' }
          ];
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '1d3', duration: 'immediate' },
            { type: 'static', resource: 'fame', value: -1, duration: 'immediate' }
          ];
        }
      } else if (approach === 'practical') {
        // Cover It Up approach - Suppress quietly (Practical)
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '-1d3', negative: true, duration: 'immediate' }
          ];
        } else if (outcome === 'success') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
          ];
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
            { type: 'static', resource: 'fame', value: -1, duration: 'immediate' }
          ];
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '1d3', duration: 'immediate' },
            { type: 'static', resource: 'fame', value: -1, duration: 'immediate' },
            { type: 'dice', resource: 'gold', formula: '-1d3', negative: true, duration: 'immediate' }
          ];
        }
      } else if (approach === 'ruthless') {
        // Scapegoat Official approach - Blame subordinate (Ruthless)
        const commandContext: GameCommandContext = {
          actionId: 'public-scandal',
          outcome: ctx.outcome,
          kingdom: ctx.kingdom,
          metadata: ctx.metadata || {}
        };

        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '-1d3', negative: true, duration: 'immediate' }
          ];
          // Imprison 1d2 scapegoats (convert unrest to imprisoned)
          const imprisonHandler = new ConvertUnrestToImprisonedHandler();
          const roll = new Roll('1d2');
          await roll.evaluate();
          const imprisonCount = roll.total || 1;
          const imprisonCommand = await imprisonHandler.prepare(
            { type: 'convertUnrestToImprisoned', amount: imprisonCount },
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
          modifiers = [
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
          ];
          // Imprison 1 scapegoat
          const imprisonHandler = new ConvertUnrestToImprisonedHandler();
          const imprisonCommand = await imprisonHandler.prepare(
            { type: 'convertUnrestToImprisoned', amount: 1 },
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
          modifiers = [
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
            { type: 'static', resource: 'fame', value: -1, duration: 'immediate' }
          ];
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '1d3', duration: 'immediate' },
            { type: 'static', resource: 'fame', value: -1, duration: 'immediate' }
          ];
          // Adjust 1 random faction -1
          const eligibleFactions = (kingdom.factions || []).filter((f: any) =>
            f.attitude && f.attitude !== 'Hostile'
          );
          if (eligibleFactions.length > 0) {
            const randomFaction = eligibleFactions[Math.floor(Math.random() * eligibleFactions.length)];
            const newAttitude = adjustAttitudeBySteps(randomFaction.attitude, -1);
            ctx.metadata._factionAdjustment = {
              factionId: randomFaction.id,
              factionName: randomFaction.name,
              oldAttitude: randomFaction.attitude,
              newAttitude: newAttitude,
              steps: -1
            };
            if (newAttitude) {
              const specificBadge = textBadge(
                `Relations with ${randomFaction.name} worsen: ${randomFaction.attitude} → ${newAttitude}`,
                'fas fa-handshake-slash',
                'negative'
              );
              
              // Replace generic badge with specific one
              const { replaceGenericFactionBadge } = await import('../../utils/badge-helpers');
              const updatedBadges = replaceGenericFactionBadge(outcomeBadges, specificBadge);
              outcomeBadges.length = 0;
              outcomeBadges.push(...updatedBadges);
            }
          }
        }
      }

      // Store modifiers in context for execute step
      ctx.metadata._outcomeModifiers = modifiers;

      return { resources: [], outcomeBadges };
    }
  },

  execute: async (ctx) => {
    // NOTE: Standard modifiers (unrest, gold, fame) are applied automatically by
    // ResolutionDataBuilder + GameCommandsService via outcomeBadges.
    // This execute() only handles special game commands.

    // Execute imprisonment (scapegoat approach - success/critical success)
    const imprisonCommand = ctx.metadata?._preparedImprison;
    if (imprisonCommand?.commit) {
      await imprisonCommand.commit();
    }

    // Execute faction adjustment (scapegoat approach - critical failure)
    const factionAdjustment = ctx.metadata?._factionAdjustment;
    if (factionAdjustment?.factionId && factionAdjustment?.newAttitude) {
      await factionService.adjustAttitude(
        factionAdjustment.factionId,
        factionAdjustment.steps
      );
    }

    return { success: true };
  },

  traits: ["dangerous"],
};
