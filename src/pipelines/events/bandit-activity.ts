/**
 * Bandit Activity Event Pipeline (CHOICE-BASED)
 *
 * Bandits raid caravans and settlements in your territory.
 *
 * Approaches:
 * - Negotiate Safe Passage (Virtuous) - Peaceful resolution and employment
 * - Drive Them Off (Practical) - Militia defense and recovered goods
 * - Hunt Without Mercy (Ruthless) - Brutal elimination and plunder
 *
 * Based on EVENT_MIGRATION_STATUS.md specifications
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { AdjustFactionHandler } from '../../services/gameCommands/handlers/AdjustFactionHandler';
import { ConvertUnrestToImprisonedHandler } from '../../services/gameCommands/handlers/ConvertUnrestToImprisonedHandler';
import { AddImprisonedHandler } from '../../services/gameCommands/handlers/AddImprisonedHandler';
import { DamageStructureHandler } from '../../services/gameCommands/handlers/DamageStructureHandler';
import { DestroyWorksiteHandler } from '../../services/gameCommands/handlers/DestroyWorksiteHandler';
import { ApplyArmyConditionHandler } from '../../services/gameCommands/handlers/ApplyArmyConditionHandler';
import { valueBadge, diceBadge } from '../../types/OutcomeBadge';
import WorksiteTypeSelector from '../../services/hex-selector/WorksiteTypeSelector.svelte';
import {
  validateClaimed,
  validateNoSettlement,
  safeValidation,
  getFreshKingdomData,
  type ValidationResult
} from '../shared/hexValidators';

export const banditActivityPipeline: CheckPipeline = {
  id: 'bandit-activity',
  name: 'Bandit Activity',
  description: 'Bandits raid caravans and settlements in your territory.',
  checkType: 'event',
  tier: 1,

  // Strategic choice - triggers voting system
  // Options ordered: Virtuous (left) → Practical (center) → Ruthless (right)
  strategicChoice: {
    label: 'How will you respond to bandit activity?',
    required: true,
    options: [
      {
        id: 'idealist',
        label: 'Negotiate',
        description: 'Offer bandits employment and peaceful resolution',
        icon: 'fas fa-handshake',
        skills: ['diplomacy', 'society', 'religion', 'applicable lore'],
        personality: { idealist: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Reformed outlaws become loyal workers; compassion builds prosperity.',
          success: 'Diplomatic resolution spares bloodshed; bandits depart peacefully.',
          failure: 'Failed talks force costly bribes to avoid violence.',
          criticalFailure: 'Bandits mock weakness and ransack worksites for tribute.'
        },
        outcomeBadges: {
          criticalSuccess: [
            valueBadge('Gain {{value}} worksite', 'fas fa-industry', 1, 'positive')
          ],
          success: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative'),
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ],
          criticalFailure: [
            valueBadge('Lose {{value}} Gold', 'fas fa-coins', 1, 'negative'),
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Drive Them Off',
        description: 'Use militia to defend and recover stolen goods',
        icon: 'fas fa-shield',
        skills: ['nature', 'crafting', 'society', 'applicable lore'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Stalwart militia routs thieves and recovers stolen wealth.',
          success: 'Efficient defense reclaims plunder and restores order.',
          failure: 'Bandits strike swiftly; guards arrive to find empty coffers.',
          criticalFailure: 'Raiders torch worksite before fleeing into wilderness.'
        },
        outcomeBadges: {
          criticalSuccess: [
            valueBadge('Gain {{value}} Gold', 'fas fa-coins', 1, 'positive'),
            valueBadge('Gain {{value}} worksite', 'fas fa-industry', 1, 'positive'),
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive'),
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative'),
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d2', 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Hunt Mercilessly',
        description: 'Eliminate bandits brutally and take their plunder',
        icon: 'fas fa-crosshairs',
        skills: ['intimidation', 'stealth', 'survival', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Ruthless hunt annihilates bandits; plunder and prisoners seized.',
          success: 'Merciless pursuit captures survivors and reclaims stolen goods.',
          failure: 'Savage tactics turn locals against you; innocents caught in crossfire.',
          criticalFailure: 'Brutal carnage destroys property and horrifies witnesses.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive'),
            diceBadge('Gain {{value}} random resource', 'fas fa-box', '1d3', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          failure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ],
          criticalFailure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ]
        }
      }
    ]
  },

  skills: [
    { skill: 'diplomacy', description: 'negotiate' },
    { skill: 'society', description: 'find employment' },
    { skill: 'intimidation', description: 'show of force' },
    { skill: 'stealth', description: 'track to hideout' },
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
      endsEvent: false,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'Your handling backfires badly.',
      endsEvent: false,
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
      const selectedOption = banditActivityPipeline.strategicChoice?.options.find(opt => opt.id === approach);

      // Get outcome badges from the selected approach
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      const commandContext: GameCommandContext = {
        actionId: 'bandit-activity',
        outcome: ctx.outcome,
        kingdom: ctx.kingdom,
        metadata: ctx.metadata || {}
      };

      if (approach === 'idealist') {
        // Negotiate Safe Passage (Virtuous)
        if (outcome === 'criticalSuccess') {
          // +1 Fame, -1d3 Unrest, +1 new worksite, +1 faction
          // Worksite creation handled in execute()
          ctx.metadata._createWorksite = true;
          // Adjust 1 faction +1
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: 1, count: 1 },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFactionVirtuous = factionCommand;
            if (factionCommand.outcomeBadges) {
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
            }
          }
        } else if (outcome === 'criticalFailure') {
          // Lose 1 worksite
          const destroyHandler = new DestroyWorksiteHandler();
          const destroyCommand = await destroyHandler.prepare(
            { type: 'destroyWorksite', count: 1 },
            commandContext
          );
          if (destroyCommand) {
            ctx.metadata._preparedDestroyWorksiteVirtuous = destroyCommand;
            if (destroyCommand.metadata) {
              Object.assign(ctx.metadata, destroyCommand.metadata);
            }
            if (destroyCommand.outcomeBadges) {
              outcomeBadges.push(...destroyCommand.outcomeBadges);
            } else if (destroyCommand.outcomeBadge) {
              outcomeBadges.push(destroyCommand.outcomeBadge);
            }
          }
        }
      } else if (approach === 'practical') {
        // Drive Them Off (Practical)
        if (outcome === 'criticalSuccess') {
          // +1 Gold, +1 worksite, -1 Unrest
          // Worksite creation handled in execute()
          ctx.metadata._createWorksite = true;
        } else if (outcome === 'criticalFailure') {
          // +1d3 Unrest, -1d3 Gold, destroy 1 worksite, army becomes fatigued
          const destroyHandler = new DestroyWorksiteHandler();
          const destroyCommand = await destroyHandler.prepare(
            { type: 'destroyWorksite', count: 1 },
            commandContext
          );
          if (destroyCommand) {
            ctx.metadata._preparedDestroyWorksite = destroyCommand;
            if (destroyCommand.metadata) {
              Object.assign(ctx.metadata, destroyCommand.metadata);
            }
            if (destroyCommand.outcomeBadges) {
              outcomeBadges.push(...destroyCommand.outcomeBadges);
            } else if (destroyCommand.outcomeBadge) {
              outcomeBadges.push(destroyCommand.outcomeBadge);
            }
          }
          
          // Army becomes fatigued
          const armyHandler = new ApplyArmyConditionHandler();
          const armyCommand = await armyHandler.prepare(
            { type: 'applyArmyCondition', condition: 'fatigued', value: 1, armyId: 'random' },
            commandContext
          );
          if (armyCommand) {
            ctx.metadata._preparedArmyCondition = armyCommand;
            if (armyCommand.outcomeBadges) {
              // Remove static army badge and add dynamic one
              const filteredBadges = outcomeBadges.filter(b => !b.template?.includes('army becomes Fatigued'));
              outcomeBadges.length = 0;
              outcomeBadges.push(...filteredBadges, ...armyCommand.outcomeBadges);
            }
          }
        }
        // Other outcomes handled by standard badges
      } else if (approach === 'ruthless') {
        // Hunt Without Mercy (Ruthless)
        if (outcome === 'criticalSuccess') {
          // -1d3 Unrest, +1d3 Gold (plunder), imprison 1d3 captives
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
          // -1 Unrest, imprison 1d2 captives
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
          // Imprison innocents (increase imprisoned WITHOUT reducing unrest)
          const addImprisonedHandler = new AddImprisonedHandler();
          const imprisonCommand = await addImprisonedHandler.prepare(
            { type: 'addImprisoned', amount: 1 },
            commandContext
          );
          if (imprisonCommand) {
            ctx.metadata._preparedAddImprisoned = imprisonCommand;
            if (imprisonCommand.outcomeBadges) {
              // Remove static "innocents harmed" badge
              const filteredBadges = outcomeBadges.filter(b => !b.template?.includes('innocents harmed'));
              outcomeBadges.length = 0;
              outcomeBadges.push(...filteredBadges, ...imprisonCommand.outcomeBadges);
            }
          }
        } else if (outcome === 'criticalFailure') {
          // +1d3 Unrest, -1 Fame, damage 1 structure, army becomes fatigued
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
          
          // Imprison innocents (increase imprisoned WITHOUT reducing unrest)
          const addImprisonedHandler = new AddImprisonedHandler();
          const imprisonCommand = await addImprisonedHandler.prepare(
            { type: 'addImprisoned', amount: 2, diceFormula: '1d2' },
            commandContext
          );
          if (imprisonCommand) {
            ctx.metadata._preparedAddImprisoned = imprisonCommand;
            if (imprisonCommand.outcomeBadges) {
              // Remove static "innocents harmed" badge
              const filteredBadges = outcomeBadges.filter(b => !b.template?.includes('innocents harmed'));
              outcomeBadges.length = 0;
              outcomeBadges.push(...filteredBadges, ...imprisonCommand.outcomeBadges);
            }
          }
          
          // Army becomes fatigued
          const armyHandler2 = new ApplyArmyConditionHandler();
          const armyCommand2 = await armyHandler2.prepare(
            { type: 'applyArmyCondition', condition: 'fatigued', value: 1, armyId: 'random' },
            commandContext
          );
          if (armyCommand2) {
            ctx.metadata._preparedArmyCondition = armyCommand2;
            if (armyCommand2.outcomeBadges) {
              // Remove static army badge and add dynamic one
              const filteredBadges = outcomeBadges.filter(b => !b.template?.includes('army becomes Fatigued'));
              outcomeBadges.length = 0;
              outcomeBadges.push(...filteredBadges, ...armyCommand2.outcomeBadges);
            }
          }
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
      count: 1,
      title: 'Select a hex for the new worksite',
      colorType: 'worksite',
      required: true,
      condition: (ctx) => {
        return ctx.metadata?._createWorksite === true;
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
        }, hexId, 'bandit-activity worksite validation');
      },
      customSelector: {
        component: WorksiteTypeSelector
      }
    },
    DestroyWorksiteHandler.getMapDisplayInteraction('Worksite Destroyed by Bandits')
  ],

  execute: async (ctx) => {
    // NOTE: Standard modifiers (unrest, gold, fame) are applied automatically by
    // ResolutionDataBuilder + GameCommandsService via outcomeBadges.
    // This execute() only handles special game commands.

    // Apply army condition (practical CF / ruthless CF)
    const armyCommand = ctx.metadata?._preparedArmyCondition;
    if (armyCommand?.commit) {
      await armyCommand.commit();
    }

    // Create worksite (idealist CS)
    if (ctx.metadata?._createWorksite) {
      const selectedHexData = ctx.resolutionData?.compoundData?.selectedHex;
      
      if (!selectedHexData) {
        return { success: false, error: 'No hex selected for worksite' };
      }
      
      let hexId: string | undefined;
      let worksiteType: string | undefined;
      
      if (selectedHexData?.hexIds) {
        hexId = selectedHexData.hexIds[0];
        if (hexId && selectedHexData.metadata) {
          worksiteType = selectedHexData.metadata[hexId]?.worksiteType;
        }
      }

      if (!hexId || !worksiteType) {
        return { success: false, error: 'Worksite selection incomplete' };
      }

      const { createWorksiteExecution } = await import('../../execution/territory/createWorksite');
      await createWorksiteExecution(hexId, worksiteType);
      ui.notifications?.info(`Bandits integrated as workers - ${worksiteType} created on hex ${hexId}`);
    }

    // Execute faction adjustment (idealist CS)
    const factionCommand = ctx.metadata?._preparedFactionVirtuous;
    if (factionCommand?.commit) {
      await factionCommand.commit();
    }

    // Execute worksite destruction (idealist CF)
    const destroyVirtuous = ctx.metadata?._preparedDestroyWorksiteVirtuous;
    if (destroyVirtuous?.commit) {
      await destroyVirtuous.commit();
    }

    // Execute worksite destruction (practical CF)
    const destroyCommand = ctx.metadata?._preparedDestroyWorksite;
    if (destroyCommand?.commit) {
      await destroyCommand.commit();
    }

    // Execute imprisonment (ruthless approach - success/critical success)
    const imprisonCommand = ctx.metadata?._preparedImprison;
    if (imprisonCommand?.commit) {
      await imprisonCommand.commit();
    }

    // Execute structure damage (ruthless CF)
    const damageCommand = ctx.metadata?._preparedDamage;
    if (damageCommand?.commit) {
      await damageCommand.commit();
    }

    // Execute innocent imprisonment (ruthless F/CF - adds imprisoned without reducing unrest)
    const addImprisonedCommand = ctx.metadata?._preparedAddImprisoned;
    if (addImprisonedCommand?.commit) {
      await addImprisonedCommand.commit();
    }

    return { success: true };
  },

  traits: ["dangerous"]
};
