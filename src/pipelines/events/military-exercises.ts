/**
 * Military Exercises Event Pipeline (CHOICE-BASED)
 *
 * Your armies conduct training exercises.
 *
 * Approaches:
 * - Defensive Drills (Athletics/Survival) - Minimize disruption (Virtuous)
 * - Equipment Focus (Crafting/Society) - Professional planning (Practical)
 * - Aggressive Training (Intimidation/Warfare Lore) - Intimidate neighbors (Ruthless)
 *
 * Based on EVENT_BALANCE_TABLE.csv row #30
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { AdjustFactionHandler } from '../../services/gameCommands/handlers/AdjustFactionHandler';
import { ApplyArmyConditionHandler } from '../../services/gameCommands/handlers/ApplyArmyConditionHandler';
import { RandomArmyEquipmentHandler } from '../../services/gameCommands/handlers/RandomArmyEquipmentHandler';
import { valueBadge, textBadge, diceBadge } from '../../types/OutcomeBadge';
import { logger } from '../../utils/Logger';
import { PLAYER_KINGDOM } from '../../types/ownership';
import {
  validateClaimed,
  validateNoSettlement,
  safeValidation,
  getFreshKingdomData,
  type ValidationResult
} from '../shared/hexValidators';

export const militaryExercisesPipeline: CheckPipeline = {
  id: 'military-exercises',
  name: 'Military Exercises',
  description: 'Your armies conduct training exercises.',
  checkType: 'event',
  tier: 1,

  // Strategic choice - triggers voting system
  // Options ordered: Virtuous (left) → Practical (center) → Ruthless (right)
  strategicChoice: {
    label: 'How will you conduct the exercises?',
    required: true,
    options: [
      {
        id: 'virtuous',
        label: 'Defensive Drills',
        description: 'Focus on defense and minimize disruption',
        icon: 'fas fa-shield-alt',
        skills: ['athletics', 'survival', 'performance', 'applicable lore'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Inspired defenders fortify borders; citizens praise your vigilance.',
          success: 'Methodical drills secure strategic positions without incident.',
          failure: 'Overworked soldiers grumble; allies question your judgment.',
          criticalFailure: 'Training accidents cripple troops and humiliate commanders.'
        },
        outcomeBadges: {
          criticalSuccess: [
            textBadge('Fortify 1 hex', 'fas fa-fort-awesome', 'positive'),
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive')
          ],
          success: [
            textBadge('Fortify 1 hex', 'fas fa-fort-awesome', 'positive')
          ],
          failure: [
            textBadge('Random army becomes Fatigued', 'fas fa-tired', 'negative')
          ],
          criticalFailure: [
            textBadge('Random army becomes Enfeebled', 'fas fa-exclamation-triangle', 'negative'),
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Equipment Focus',
        description: 'Professional exercises with equipment upgrades',
        icon: 'fas fa-hammer',
        skills: ['crafting', 'society', 'intimidation', 'applicable lore'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Master craftsmen forge superior gear; sponsors fund more.',
          success: 'Efficient logistics upgrade armaments and save resources.',
          failure: 'Budget overruns yield exhausted troops and empty coffers.',
          criticalFailure: 'Mismanagement depletes funds and crushes troop morale.'
        },
        outcomeBadges: {
          criticalSuccess: [
            textBadge('2 armies receive equipment', 'fas fa-shield', 'positive'),
            valueBadge('Gain {{value}} Gold', 'fas fa-coins', 1, 'positive')
          ],
          success: [
            textBadge('1 army receives equipment', 'fas fa-shield', 'positive'),
            valueBadge('Gain {{value}} Gold', 'fas fa-coins', 1, 'positive')
          ],
          failure: [
            textBadge('Random army becomes Fatigued', 'fas fa-tired', 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3+1', 'negative')
          ],
          criticalFailure: [
            textBadge('Random army becomes Enfeebled', 'fas fa-exclamation-triangle', 'negative'),
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Aggressive Training',
        description: 'Intensive drills to intimidate neighbors',
        icon: 'fas fa-fist-raised',
        skills: ['intimidation', 'deception', 'athletics', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Fierce spectacle terrifies rivals; hardened warriors emerge victorious.',
          success: 'Grueling regimen forges elite soldiers and attracts mercenary coin.',
          failure: 'Ruthless drills shatter bodies and provoke neighboring outrage.',
          criticalFailure: 'Savage methods break soldiers and invite universal condemnation.'
        },
        outcomeBadges: {
          criticalSuccess: [
            textBadge('Random army becomes Well Trained (+1 saves)', 'fas fa-star', 'positive'),
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive'),
            valueBadge('Gain {{value}} Gold', 'fas fa-coins', 1, 'positive')
          ],
          success: [
            textBadge('Random army becomes Well Trained (+1 saves)', 'fas fa-star', 'positive'),
            valueBadge('Gain {{value}} Gold', 'fas fa-coins', 1, 'positive')
          ],
          failure: [
            textBadge('Random army becomes Fatigued', 'fas fa-tired', 'negative')
          ],
          criticalFailure: [
            textBadge('Random army becomes Enfeebled', 'fas fa-exclamation-triangle', 'negative'),
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative')
          ]
        }
      }
    ]
  },

  skills: [
    { skill: 'athletics', description: 'physical conditioning drills' },
    { skill: 'survival', description: 'defensive positioning' },
    { skill: 'crafting', description: 'equipment maintenance' },
    { skill: 'society', description: 'organized planning' },
    { skill: 'intimidation', description: 'aggressive discipline' },
    { skill: 'lore', description: 'tactical knowledge' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your approach succeeds brilliantly.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    success: {
      description: 'The exercises proceed effectively.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    failure: {
      description: 'The training encounters complications.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'The exercises backfire.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
  },

  requirements: (kingdom) => {
    // Need at least one army for military exercises to matter
    if (!kingdom.armies || kingdom.armies.length === 0) {
      return {
        met: true, // Still allow the event, just won't have army effects
        reason: 'No armies available for exercises'
      };
    }
    return { met: true };
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
      const selectedOption = militaryExercisesPipeline.strategicChoice?.options.find(opt => opt.id === approach);

      // Get outcome badges from the selected approach
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      // Initialize metadata
      if (!ctx.metadata) {
        ctx.metadata = {};
      }

      const playerArmies = ctx.kingdom.armies?.filter((a: any) => 
        a.actorId && a.ledBy === PLAYER_KINGDOM
      ) || [];

      const warnings: string[] = [];

      // Check if we have armies for military effects
      const needsArmy = (approach === 'virtuous' && outcome !== 'criticalSuccess' && outcome !== 'success') ||
                        (approach === 'practical') ||
                        (approach === 'ruthless');

      if (needsArmy && playerArmies.length === 0) {
        warnings.push('No armies available - military effects will not apply');
        return { resources: [], outcomeBadges: [], warnings };
      }

      // Command context for handlers
      const commandContext: GameCommandContext = {
        actionId: 'military-exercises',
        outcome: ctx.outcome,
        kingdom: ctx.kingdom,
        metadata: ctx.metadata || {}
      };

      // Prepare army condition handlers based on approach and outcome
      const conditionMap: Record<string, Record<string, string>> = {
        virtuous: { failure: 'fatigued', criticalFailure: 'enfeebled' },
        practical: { failure: 'fatigued', criticalFailure: 'enfeebled' },
        ruthless: { criticalSuccess: 'well-trained', success: 'well-trained', failure: 'fatigued', criticalFailure: 'enfeebled' }
      };

      const badgeTextMap: Record<string, string> = {
        'well-trained': 'army becomes Well Trained',
        'fatigued': 'army becomes Fatigued',
        'enfeebled': 'army becomes Enfeebled'
      };

      if (approach && conditionMap[approach]?.[outcome]) {
        const condition = conditionMap[approach][outcome];
        const armyHandler = new ApplyArmyConditionHandler();
        const armyCmd = await armyHandler.prepare(
          { type: 'applyArmyCondition', condition, value: 1, armyId: 'random' },
          commandContext
        );
        if (armyCmd) {
          ctx.metadata._preparedArmyCondition = armyCmd;
          // Remove static badge and add dynamic one
          const filtered = outcomeBadges.filter(b => !b.template?.includes(badgeTextMap[condition]));
          outcomeBadges.length = 0;
          outcomeBadges.push(...filtered, ...(armyCmd.outcomeBadges || []));
        }
      }

      // Prepare equipment handlers for practical CS/S
      if (approach === 'practical') {
        if (outcome === 'criticalSuccess') {
          const equipHandler = new RandomArmyEquipmentHandler();
          const equipCmd = await equipHandler.prepare(
            { type: 'randomArmyEquipment', count: 2 },
            commandContext
          );
          if (equipCmd) {
            ctx.metadata._preparedEquipment = equipCmd;
            // Remove static badge and add dynamic ones
            const filtered = outcomeBadges.filter(b => !b.template?.includes('armies receive equipment'));
            outcomeBadges.length = 0;
            outcomeBadges.push(...filtered, ...(equipCmd.outcomeBadges || []));
          }
        } else if (outcome === 'success') {
          const equipHandler = new RandomArmyEquipmentHandler();
          const equipCmd = await equipHandler.prepare(
            { type: 'randomArmyEquipment', count: 1 },
            commandContext
          );
          if (equipCmd) {
            ctx.metadata._preparedEquipment = equipCmd;
            // Remove static badge and add dynamic one
            const filtered = outcomeBadges.filter(b => !b.template?.includes('army receives equipment'));
            outcomeBadges.length = 0;
            outcomeBadges.push(...filtered, ...(equipCmd.outcomeBadges || []));
          }
        }
      }

      ctx.metadata._selectedApproach = approach;

      // Prepare faction adjustments for failure outcomes
      if ((approach === 'virtuous' && outcome === 'failure') ||
          (approach === 'ruthless' && outcome === 'failure')) {
        const factionHandler = new AdjustFactionHandler();
        const factionCommand = await factionHandler.prepare(
          { type: 'adjustFactionAttitude', steps: -1, count: 1 },
          commandContext
        );
        if (factionCommand) {
          ctx.metadata._preparedFactionAdjust = factionCommand;
          if (factionCommand.outcomeBadges) {
            outcomeBadges.push(...factionCommand.outcomeBadges);
          } else if (factionCommand.outcomeBadge) {
            outcomeBadges.push(factionCommand.outcomeBadge);
          }
        }
      }

      return { resources: [], outcomeBadges, warnings };
    }
  },

  postApplyInteractions: [
    {
      type: 'map-selection',
      id: 'fortifyHex',
      mode: 'hex-selection',
      count: 1,
      colorType: 'fortify',
      title: 'Select hex to fortify (free Earthworks)',
      required: true,
      condition: (ctx: any) => {
        const approach = ctx.kingdom?.turnState?.eventsPhase?.selectedApproach;
        return approach === 'virtuous' &&
               (ctx.outcome === 'criticalSuccess' || ctx.outcome === 'success');
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

          // Check if already at max fortification
          const currentTier = hex.fortification?.tier || 0;
          if (currentTier >= 4) {
            return { valid: false, message: 'Already at maximum fortification (Fortress)' };
          }

          // Event grants free fortification - show what will be built/upgraded
          if (currentTier === 0) {
            return { valid: true, message: 'Build free Earthworks' };
          } else {
            const tierNames = ['', 'Earthworks', 'Wooden Tower', 'Stone Tower', 'Fortress'];
            const nextTier = Math.min(currentTier + 1, 4);
            return { valid: true, message: `Upgrade to ${tierNames[nextTier]} (free)` };
          }
        }, hexId, 'military-exercises fortify validation');
      },
      getHexInfo: (hexId: string) => {
        const kingdom = getFreshKingdomData();
        const hex = kingdom.hexes?.find((h: any) => h.id === hexId);

        if (!hex) return null;

        const currentTier = hex.fortification?.tier || 0;
        const tierNames = ['None', 'Earthworks', 'Wooden Tower', 'Stone Tower', 'Fortress'];
        const tierDescriptions = [
          '',
          'Basic earthen defensive positions with ditches and berms.',
          'Wooden watchtower with palisade defenses.',
          'Stone tower with reinforced defensive walls.',
          'Massive fortified keep with multiple defensive layers.'
        ];

        if (currentTier >= 4) {
          return `<div style="color: var(--text-warning); text-align: center;">
            <i class="fas fa-crown"></i> Maximum fortification (Fortress)
          </div>`;
        }

        const nextTier = currentTier + 1;
        const action = currentTier === 0 ? 'Build' : 'Upgrade to';

        return `
          <div style="line-height: 1.6;">
            <div style="font-weight: bold; color: var(--text-primary); margin-bottom: 4px;">
              ${action}: ${tierNames[nextTier]}
            </div>
            <div style="color: var(--text-tertiary); margin-bottom: 4px;">
              ${tierDescriptions[nextTier]}
            </div>
            <div style="color: var(--text-success); font-weight: bold;">
              <i class="fas fa-gift"></i> FREE (event reward)
            </div>
          </div>
        `;
      }
    }
  ],

  execute: async (ctx) => {
    const approach = ctx.metadata?._selectedApproach;
    const outcome = ctx.outcome;

    // Commit prepared faction adjustments
    const factionCommand = ctx.metadata?._preparedFactionAdjust;
    if (factionCommand?.commit) {
      await factionCommand.commit();
    }

    // Commit prepared army condition (well-trained, fatigued, enfeebled)
    const armyCommand = ctx.metadata?._preparedArmyCondition;
    if (armyCommand?.commit) {
      await armyCommand.commit();
    }

    // Commit prepared equipment upgrades (practical CS/S)
    const equipmentCommand = ctx.metadata?._preparedEquipment;
    if (equipmentCommand?.commit) {
      await equipmentCommand.commit();
    }

    // Handle fortify hex for virtuous success outcomes
    if (approach === 'virtuous' && (outcome === 'criticalSuccess' || outcome === 'success')) {
      const selectedHexData = ctx.resolutionData?.compoundData?.fortifyHex;

      if (selectedHexData) {
        // Get the selected hex ID
        let hexId: string | undefined;
        if (selectedHexData?.hexIds && Array.isArray(selectedHexData.hexIds)) {
          hexId = selectedHexData.hexIds[0];
        } else if (Array.isArray(selectedHexData)) {
          hexId = selectedHexData[0];
        }

        if (hexId) {
          // Get current fortification tier to determine next tier
          const { get } = await import('svelte/store');
          const { kingdomData } = await import('../../stores/KingdomStore');
          const kingdom = get(kingdomData);
          const hex = kingdom.hexes?.find((h: any) => h.id === hexId);
          const currentTier = hex?.fortification?.tier || 0;
          const nextTier = Math.min(currentTier + 1, 4) as 1 | 2 | 3 | 4;

          // Execute fortification (free - no cost deduction needed)
          // Note: fortifyHexExecution deducts costs, so we need a modified version
          // For now, use updateKingdom directly for free fortifications
          const { updateKingdom } = await import('../../stores/KingdomStore');
          await updateKingdom(k => {
            const targetHex = k.hexes.find((h: any) => h.id === hexId);
            if (targetHex) {
              targetHex.fortification = {
                tier: nextTier,
                maintenancePaid: true,
                turnBuilt: k.currentTurn
              };
              logger.info(`[Military Exercises] Built free fortification tier ${nextTier} on hex ${hexId}`);
            }
          });

          const tierNames = ['', 'Earthworks', 'Wooden Tower', 'Stone Tower', 'Fortress'];
          logger.info(`[Military Exercises] Free fortification: ${tierNames[nextTier]} on hex ${hexId}`);
        }
      }
    }

    return { success: true };
  },

  traits: ["beneficial"],
};
