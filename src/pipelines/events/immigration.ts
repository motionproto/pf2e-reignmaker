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
import { AdjustFactionHandler } from '../../services/gameCommands/handlers/AdjustFactionHandler';
import { IncreaseSettlementLevelHandler } from '../../services/gameCommands/handlers/IncreaseSettlementLevelHandler';
import { valueBadge, textBadge, diceBadge } from '../../types/OutcomeBadge';
import WorksiteTypeSelector from '../../services/hex-selector/WorksiteTypeSelector.svelte';
import {
  validateClaimed,
  validateNoSettlement,
  safeValidation,
  getFreshKingdomData,
  type ValidationResult
} from '../shared/hexValidators';

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
        id: 'idealist',
        label: 'Welcome Citizens',
        description: 'Open borders and generous integration support',
        icon: 'fas fa-door-open',
        skills: ['diplomacy', 'society', 'medicine', 'applicable lore'],
        personality: { idealist: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Newcomers thrive; their success inspires others to join.',
          success: 'Grateful settlers share their skills and resources.',
          failure: 'Overwhelmed infrastructure breeds resentment.',
          criticalFailure: 'Desperate migrants strain resources; tensions erupt.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive'),
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          failure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
            diceBadge('Lose {{value}} Food', 'fas fa-drumstick-bite', '1d3+1', 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Selective Entry',
        description: 'Systematic vetting and settlement program',
        icon: 'fas fa-clipboard-check',
        skills: ['society', 'survival', 'nature', 'applicable lore'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Skilled workers establish productive settlements.',
          success: 'Orderly arrival eases transition for all.',
          failure: 'Bureaucratic delays frustrate everyone involved.',
          criticalFailure: 'Mismanagement wastes opportunities and resources.'
        },
        outcomeBadges: {
          criticalSuccess: [
            textBadge('Gain 1 worksite', 'fas fa-industry', 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d4', 'positive')
          ],
          success: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d4', 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3+1', 'negative'),
            diceBadge('Lose {{value}} Food', 'fas fa-drumstick-bite', '1d3', 'negative')
          ],
          criticalFailure: [
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '2d3', 'negative'),
            diceBadge('Lose {{value}} Food', 'fas fa-drumstick-bite', '1d3', 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Forced Labour',
        description: 'Relocate and use as cheap workforce',
        icon: 'fas fa-hammer',
        skills: ['intimidation', 'arcana', 'occultism', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Forced labor rapidly expands your holdings.',
          success: 'Exploitation yields swift construction.',
          failure: 'Cruelty sparks whispered rebellion.',
          criticalFailure: 'Brutal conditions horrify neighboring kingdoms.'
        },
        outcomeBadges: {
          criticalSuccess: [
            textBadge('Gain 1 worksite', 'fas fa-industry', 'positive'),
            textBadge('1 settlement gains level', 'fas fa-city', 'positive')
          ],
          success: [
            textBadge('Gain 1 worksite', 'fas fa-industry', 'positive')
          ],
          failure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d4', 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d4', 'negative'),
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative')
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

      const commandContext: GameCommandContext = {
        actionId: 'immigration',
        outcome: ctx.outcome,
        kingdom: ctx.kingdom,
        metadata: ctx.metadata || {}
      };

      if (approach === 'idealist') {
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
          // Faction adjustment +1
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
        } else if (outcome === 'success') {
          // Faction adjustment +1
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: 1, count: 1 },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFactionVirtuousSuccess = factionCommand;
            if (factionCommand.outcomeBadges) {
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
            }
          }
        } else if (outcome === 'failure') {
          // Faction adjustment -1
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: -1, count: 1 },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFactionVirtuousFailure = factionCommand;
            if (factionCommand.outcomeBadges) {
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
            }
          }
        } else if (outcome === 'criticalFailure') {
          // Faction adjustment -1
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: -1, count: 1 },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFactionVirtuousCF = factionCommand;
            if (factionCommand.outcomeBadges) {
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
            }
          }
        }
      } else if (approach === 'practical') {
        // Selective Entry (Practical)
        if (outcome === 'criticalSuccess') {
          // Gain 1 worksite on critical success
          ctx.metadata._newWorksites = 1;
        }
      } else if (approach === 'ruthless') {
        // Exploit as Labor (Ruthless)
        if (outcome === 'criticalSuccess') {
          ctx.metadata._newWorksites = 2;

          // Settlement level increase
          const increaseHandler = new IncreaseSettlementLevelHandler();
          const increaseCommand = await increaseHandler.prepare(
            { type: 'increaseSettlementLevel', increase: 1 },
            commandContext
          );
          if (increaseCommand) {
            ctx.metadata._preparedSettlementIncrease = increaseCommand;
            if (increaseCommand.outcomeBadges) {
              outcomeBadges.push(...increaseCommand.outcomeBadges);
            } else if (increaseCommand.outcomeBadge) {
              outcomeBadges.push(increaseCommand.outcomeBadge);
            }
          }
        } else if (outcome === 'success') {
          ctx.metadata._newWorksites = 2;
        } else if (outcome === 'failure') {
          ctx.metadata._newWorksites = 1;
        } else if (outcome === 'criticalFailure') {
          ctx.metadata._newWorksites = 1;
        }
      }

      return { resources: [], outcomeBadges };
    }
  },

  postApplyInteractions: [
    {
      id: 'selectedHex',
      type: 'map-selection',
      mode: 'hex-selection',
      count: (ctx: any) => {
        const approach = ctx.kingdom?.turnState?.eventsPhase?.selectedApproach;
        const outcome = ctx.outcome;

        // Return number of worksites to create based on approach and outcome
        if (approach === 'idealist') {
          return 1; // All outcomes grant 1 worksite
        } else if (approach === 'practical') {
          if (outcome === 'criticalSuccess') {
            return 1; // 1 worksite on critical success
          }
          return 0;
        } else if (approach === 'ruthless') {
          if (outcome === 'criticalSuccess' || outcome === 'success') {
            return 1; // 1 worksite
          }
          return 0;
        }
        return 0;
      },
      title: 'Select hex(es) for new worksite(s)',
      colorType: 'worksite',
      required: true,
      condition: (ctx: any) => {
        const approach = ctx.kingdom?.turnState?.eventsPhase?.selectedApproach;
        const outcome = ctx.outcome;

        // Virtuous: all outcomes grant worksites
        // Practical: only critical success
        // Ruthless: critical success and success
        if (approach === 'idealist') return true;
        if (approach === 'practical' && outcome === 'criticalSuccess') return true;
        if (approach === 'ruthless' && (outcome === 'criticalSuccess' || outcome === 'success')) return true;
        return false;
      },
      validateHex: (hexId: string): ValidationResult => {
        return safeValidation(() => {
          const kingdom = getFreshKingdomData();
          const hex = kingdom.hexes?.find((h: any) => h.id === hexId);
          
          if (!hex) {
            return { valid: false, message: 'Hex not found' };
          }
          
          const claimedResult = validateClaimed(hexId, kingdom);
          if (!claimedResult.valid) return claimedResult;
          
          const settlementResult = validateNoSettlement(hexId, kingdom);
          if (!settlementResult.valid) return settlementResult;
          
          if (hex.worksite) {
            return { valid: false, message: `Hex already has a ${hex.worksite.type}` };
          }
          
          return { valid: true, message: 'Valid location for worksite' };
        }, hexId, 'immigration worksite validation');
      },
      customSelector: {
        component: WorksiteTypeSelector
      }
    }
  ],

  execute: async (ctx) => {
    // NOTE: Standard modifiers (unrest, gold, fame) are applied automatically by
    // ResolutionDataBuilder + GameCommandsService via outcomeBadges.
    // This execute() only handles special game commands.

    const { get } = await import('svelte/store');
    const { kingdomData } = await import('../../stores/KingdomStore');
    const kingdom = get(kingdomData);
    const approach = kingdom.turnState?.eventsPhase?.selectedApproach;
    const outcome = ctx.outcome;

    // Execute settlement level increase (ruthless CS)
    const increaseCommand = ctx.metadata?._preparedSettlementIncrease;
    if (increaseCommand?.commit) {
      await increaseCommand.commit();
    }

    // Execute faction adjustments (idealist approach)
    const factionVirtuousCS = ctx.metadata?._preparedFactionVirtuousCS;
    if (factionVirtuousCS?.commit) {
      await factionVirtuousCS.commit();
    }

    const factionVirtuousSuccess = ctx.metadata?._preparedFactionVirtuousSuccess;
    if (factionVirtuousSuccess?.commit) {
      await factionVirtuousSuccess.commit();
    }

    const factionVirtuousFailure = ctx.metadata?._preparedFactionVirtuousFailure;
    if (factionVirtuousFailure?.commit) {
      await factionVirtuousFailure.commit();
    }

    const factionVirtuousCF = ctx.metadata?._preparedFactionVirtuousCF;
    if (factionVirtuousCF?.commit) {
      await factionVirtuousCF.commit();
    }

    // Execute worksite creation from selected hex(es)
    const selectedHexData = ctx.resolutionData?.compoundData?.selectedHex;
    
    if (selectedHexData) {
      const { createWorksiteExecution } = await import('../../execution/territory/createWorksite');
      
      // Check if we have per-hex metadata (from WorksiteTypeSelector)
      if (selectedHexData?.hexIds && Array.isArray(selectedHexData.hexIds)) {
        const hexIds = selectedHexData.hexIds;
        const perHexMetadata = selectedHexData.metadata || {}; // FIX: Changed from perHexMetadata to metadata
        
        // Create each worksite with its specific type
        for (const hexId of hexIds) {
          const hexMetadata = perHexMetadata[hexId];
          const worksiteType = hexMetadata?.worksiteType || (approach === 'idealist' ? 'farmstead' : undefined);
          
          await createWorksiteExecution(hexId, worksiteType);
          
          ui.notifications?.info(`New settlers established a ${worksiteType || 'worksite'} on hex ${hexId}`);
        }
      } else if (Array.isArray(selectedHexData)) {
        // Fallback: Simple array of hex IDs (no custom selector data)
        for (const hexId of selectedHexData) {
          const worksiteType = approach === 'idealist' ? 'farmstead' : 'worksite';
          await createWorksiteExecution(hexId, worksiteType);
          ui.notifications?.info(`New settlers established a ${worksiteType} on hex ${hexId}`);
        }
      }
    }

    return { success: true };
  },

  traits: ["beneficial"],
};
