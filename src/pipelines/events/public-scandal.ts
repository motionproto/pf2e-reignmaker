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
        label: 'Transparent Investigation',
        description: 'Publicly investigate and reveal the truth',
        icon: 'fas fa-search',
        skills: ['society', 'diplomacy'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Your transparent investigation vindicates the accused or reveals accountability. Public hearings demonstrate your commitment to justice and rule of law. Citizens praise your integrity, and the scandal becomes a testament to good governance.',
          success: 'Your honest investigation contains the scandal. Fair proceedings reveal the truth, and your willingness to face facts earns respect. The kingdom maintains trust in leadership despite the embarrassment.',
          failure: 'Your investigation drags on messily. Prolonged hearings keep the scandal in public view while legal costs mount. Though honest, the process proves expensive and the extended attention increases unrest.',
          criticalFailure: 'Your investigation backfires spectacularly. Revelations uncover deeper corruption, and your apparent naiveté damages credibility. The scandal spirals as citizens lose faith in leadership that seems incompetent.'
        },
        outcomeBadges: {
          criticalSuccess: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
          ],
          success: [
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')
          ],
          failure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Cover It Up',
        description: 'Suppress the scandal quietly',
        icon: 'fas fa-user-secret',
        skills: ['deception', 'stealth'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Your cover-up succeeds flawlessly. Evidence disappears, witnesses are persuaded to forget, and the story dies quietly. The scandal vanishes as if it never happened, and the kingdom moves on undisturbed.',
          success: 'Your suppression contains the damage. Strategic silence and careful management keep the story from spreading. The scandal fades from public attention with minimal disruption.',
          failure: 'Your cover-up is exposed. Attempts at suppression become their own scandal, and the deception damages your reputation more than the original incident. Citizens resent the dishonesty.',
          criticalFailure: 'Your cover-up collapses catastrophically. The attempted deception becomes a major scandal itself, destroying credibility. Expensive bribes fail as the story breaks wider than ever, combining corruption with incompetence.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
          ],
          success: [
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')
          ],
          failure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Scapegoat Official',
        description: 'Blame a subordinate to protect the crown',
        icon: 'fas fa-user-slash',
        skills: ['intimidation', 'deception'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Your scapegoating succeeds completely. Subordinates are publicly blamed and imprisoned while leadership remains untainted. The swift, decisive action satisfies the public demand for accountability without touching the crown.',
          success: 'Your sacrifice of a subordinate contains the scandal. One official takes the fall, is imprisoned, and the matter is declared closed. The ruthless pragmatism works, though some suspect the truth.',
          failure: 'Your scapegoating attempt is transparent. The obvious sacrifice of an innocent subordinate outrages citizens who see through the ploy. Both reputation and trust suffer as the cynical maneuver backfires.',
          criticalFailure: 'Your scapegoating triggers outrage. The blatant injustice horrifies allied factions and domestic critics alike. Diplomatic relations suffer as neighboring kingdoms condemn the corrupt sacrifice of innocents to protect the guilty.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive'),
            diceBadge('Imprison {{value}} scapegoats', 'fas fa-handcuffs', '1d2', 'info')
          ],
          success: [
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive'),
            valueBadge('Imprison {{value}} scapegoat', 'fas fa-handcuffs', 1, 'info')
          ],
          failure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative'),
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
