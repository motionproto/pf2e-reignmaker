/**
 * Immigration Event Pipeline (CHOICE-BASED)
 *
 * New settlers arrive seeking homes in your kingdom.
 * How will you handle the population influx?
 *
 * Approaches:
 * - Welcome All Freely (V) - Open borders and generous integration
 * - Controlled Integration (P) - Vetting and systematic settlement
 * - Exploit as Labor (R) - Relocate and use as cheap workforce
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { valueBadge, textBadge, diceBadge } from '../../types/OutcomeBadge';

export const immigrationPipeline: CheckPipeline = {
  id: 'immigration',
  name: 'Immigration',
  description: 'New settlers arrive seeking homes in your kingdom.',
  checkType: 'event',
  tier: 1,

  // Strategic choice - triggers voting system
  // Options ordered: Virtuous (left) → Practical (center) → Ruthless (right)
  strategicChoice: {
    label: 'How will you handle the new arrivals?',
    required: true,
    options: [
      {
        id: 'welcome-all',
        label: 'Welcome All Freely',
        description: 'Open borders and generous integration support',
        icon: 'fas fa-door-open',
        skills: ['diplomacy', 'society'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Generous welcome inspires skilled workers. Farmsteads established, reputation strengthened.',
          success: 'Open-door policy integrates settlers smoothly. New farmsteads spring up.',
          failure: 'Integration programs drain treasury. Tensions rise as resources stretch thin.',
          criticalFailure: 'Overwhelming influx depletes gold reserves. Resentment builds between natives and newcomers.'
        },
        outcomeBadges: {
          criticalSuccess: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive'),
            textBadge('Gain 1 new worksite', 'fas fa-industry', 'positive')
          ],
          success: [
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive'),
            textBadge('Gain 1 new worksite', 'fas fa-industry', 'positive')
          ],
          failure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative'),
            textBadge('Gain 1 new worksite', 'fas fa-industry', 'positive')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '2d3', 'negative'),
            textBadge('Gain 1 new worksite', 'fas fa-industry', 'positive')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Controlled Integration',
        description: 'Systematic vetting and settlement program',
        icon: 'fas fa-clipboard-check',
        skills: ['society', 'survival'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Vetting identifies skilled immigrants. Settlement generates revenue, prevents overcrowding.',
          success: 'Systematic integration works well. Newcomers generate modest tax revenue.',
          failure: 'Bureaucratic gridlock frustrates everyone. Few settlers make it through.',
          criticalFailure: 'Screening collapses under volume. Corruption and favoritism breed chaos.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive'),
            diceBadge('Gain {{value}} Gold (skilled workers)', 'fas fa-coins', '1d3', 'positive')
          ],
          success: [
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive'),
            valueBadge('Gain {{value}} Gold', 'fas fa-coins', 1, 'positive')
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
        label: 'Exploit as Labor',
        description: 'Relocate and use as cheap workforce',
        icon: 'fas fa-hammer',
        skills: ['intimidation'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Forced labor yields immediate profits. Multiple worksites established despite resentment.',
          success: 'Labor assignments extract value. Gold flows in while discontent simmers.',
          failure: 'Harsh treatment sparks resistance. Reputation suffers from cruelty stories.',
          criticalFailure: 'Brutal approach triggers outrage. Neighboring kingdoms condemn forced labor.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d3', 'positive'),
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
            textBadge('Gain 2 new worksites', 'fas fa-industry', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive'),
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
            textBadge('Gain 2 new worksites', 'fas fa-industry', 'positive')
          ],
          failure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative'),
            textBadge('Gain 1 new worksite', 'fas fa-industry', 'positive')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative'),
            textBadge('-1 faction relation', 'fas fa-users-slash', 'negative'),
            textBadge('Gain 1 new worksite', 'fas fa-industry', 'positive')
          ]
        }
      }
    ]
  },

  skills: [
    { skill: 'diplomacy', description: 'welcome newcomers' },
    { skill: 'society', description: 'integrate settlers' },
    { skill: 'survival', description: 'find them land' },
    { skill: 'intimidation', description: 'enforce labor assignments' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your immigration policy succeeds brilliantly.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    success: {
      description: 'The newcomers are integrated successfully.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    failure: {
      description: 'Your approach encounters challenges.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'Your policy creates serious problems.',
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
      const selectedOption = immigrationPipeline.strategicChoice?.options.find(opt => opt.id === approach);

      // Get outcome badges from the selected approach
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      // Calculate modifiers and prepare game commands based on approach
      let modifiers: any[] = [];
      const commandContext: GameCommandContext = {
        actionId: 'immigration',
        outcome: ctx.outcome,
        kingdom: ctx.kingdom,
        metadata: ctx.metadata || {}
      };

      if (approach === 'welcome-all') {
        // Welcome All Freely (Virtuous) - all outcomes grant 1 new worksite
        // Find a valid hex for farmstead
        const validHexes = (kingdom.hexes || []).filter((hex: any) =>
          hex.claimed && !hex.settlement && !hex.worksite
        );
        // Prefer plains/hills/grassland terrain for farmsteads
        const preferredTerrains = ['plains', 'hills', 'grassland'];
        const sortedHexes = validHexes.sort((a: any, b: any) => {
          const aPreferred = preferredTerrains.includes(a.terrain?.toLowerCase());
          const bPreferred = preferredTerrains.includes(b.terrain?.toLowerCase());
          if (aPreferred && !bPreferred) return -1;
          if (!aPreferred && bPreferred) return 1;
          return 0;
        });
        if (sortedHexes.length > 0) {
          ctx.metadata._worksiteHexId = sortedHexes[0].id;
          ctx.metadata._worksiteType = 'farmstead';
        }

        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'static', resource: 'fame', value: 1, duration: 'immediate' },
            { type: 'dice', resource: 'unrest', formula: '1d3', negative: true, duration: 'immediate' }
          ];
        } else if (outcome === 'success') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
          ];
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
            { type: 'dice', resource: 'gold', formula: '1d3', negative: true, duration: 'immediate' }
          ];
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '1d3', duration: 'immediate' },
            { type: 'dice', resource: 'gold', formula: '2d3', negative: true, duration: 'immediate' }
          ];
        }
      } else if (approach === 'practical') {
        // Controlled Integration (Practical)
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '1d3', negative: true, duration: 'immediate' },
            { type: 'dice', resource: 'gold', formula: '1d3', duration: 'immediate' }
          ];
        } else if (outcome === 'success') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' },
            { type: 'static', resource: 'gold', value: 1, duration: 'immediate' }
          ];
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
          ];
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '1d3', duration: 'immediate' }
          ];
        }
      } else if (approach === 'ruthless') {
        // Exploit as Labor (Ruthless)
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'dice', resource: 'gold', formula: '2d3', duration: 'immediate' },
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
          ];
          ctx.metadata._newWorksites = 2;
        } else if (outcome === 'success') {
          modifiers = [
            { type: 'dice', resource: 'gold', formula: '1d3', duration: 'immediate' },
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
          ];
          ctx.metadata._newWorksites = 2;
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '1d3', duration: 'immediate' },
            { type: 'static', resource: 'fame', value: -1, duration: 'immediate' }
          ];
          ctx.metadata._newWorksites = 1;
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '1d3', duration: 'immediate' },
            { type: 'static', resource: 'fame', value: -1, duration: 'immediate' }
          ];
          ctx.metadata._newWorksites = 1;
          // Adjust 1 random faction -1
          const { adjustAttitudeBySteps } = await import('../../utils/faction-attitude-adjuster');
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
              const specificBadge = {
                icon: 'fas fa-handshake-slash',
                template: `Relations with ${randomFaction.name} worsen: ${randomFaction.attitude} → ${newAttitude}`,
                variant: 'negative'
              };
              
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

    const { get } = await import('svelte/store');
    const { kingdomData } = await import('../../stores/KingdomStore');
    const kingdom = get(kingdomData);
    const approach = kingdom.turnState?.eventsPhase?.selectedApproach;
    const outcome = ctx.outcome;

    // Execute faction adjustment for ruthless critical failure
    if (approach === 'ruthless' && outcome === 'criticalFailure') {
      const factionAdjustment = ctx.metadata?._factionAdjustment;
      if (factionAdjustment?.factionId && factionAdjustment?.newAttitude) {
        const { factionService } = await import('../../services/factions');
        await factionService.adjustAttitude(
          factionAdjustment.factionId,
          factionAdjustment.steps
        );
      }
    }

    // Execute worksite creation for welcome-all approach
    if (approach === 'welcome-all') {
      const hexId = ctx.metadata?._worksiteHexId;
      const worksiteType = ctx.metadata?._worksiteType;
      if (hexId && worksiteType) {
        const { createWorksiteExecution } = await import('../../execution/territory/createWorksite');
        await createWorksiteExecution(hexId, worksiteType);
      }
    }

    return { success: true };
  },

  traits: ["beneficial"],
};
