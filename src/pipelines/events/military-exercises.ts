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
import { valueBadge, textBadge, diceBadge } from '../../types/OutcomeBadge';
import { logger } from '../../utils/Logger';
import { EQUIPMENT_ICONS, EQUIPMENT_NAMES } from '../../utils/presentation';
import { PLAYER_KINGDOM } from '../../types/ownership';
import { factionService } from '../../services/factions';
import { adjustAttitudeBySteps } from '../../utils/faction-attitude-adjuster';

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
            textBadge('Random army becomes Fatigued', 'fas fa-tired', 'negative'),
            textBadge('Adjust 1 faction -1', 'fas fa-users-slash', 'negative')
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
            textBadge('Random army becomes Fatigued', 'fas fa-tired', 'negative'),
            textBadge('Adjust 1 faction -1', 'fas fa-users-slash', 'negative')
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
      let modifiers: any[] = [];

      // Check if we have armies for military effects
      const needsArmy = (approach === 'virtuous' && outcome !== 'criticalSuccess' && outcome !== 'success') ||
                        (approach === 'practical') ||
                        (approach === 'ruthless');

      if (needsArmy && playerArmies.length === 0) {
        warnings.push('No armies available - military effects will not apply');
        return { resources: [], outcomeBadges: [], warnings };
      }

      // Select random army for conditions and update badges
      if (playerArmies.length > 0) {
        const randomArmy = playerArmies[Math.floor(Math.random() * playerArmies.length)];
        
        // Store army for execute step
        if ((approach === 'virtuous' && (outcome === 'failure' || outcome === 'criticalFailure')) ||
            (approach === 'practical' && (outcome === 'failure' || outcome === 'criticalFailure')) ||
            (approach === 'ruthless')) {
          
          // Determine condition type
          let condition = '';
          if (outcome === 'criticalSuccess' || outcome === 'success') {
            if (approach === 'ruthless') {
              condition = 'well-trained';
              ctx.metadata._selectedArmy = { actorId: randomArmy.actorId, name: randomArmy.name };
              
              const armyBadgeIndex = outcomeBadges.findIndex(b => b.template?.includes('army becomes Well Trained'));
              if (armyBadgeIndex >= 0) {
                outcomeBadges[armyBadgeIndex] = textBadge(
                  `${randomArmy.name} becomes Well Trained (+1 saves)`,
                  'fas fa-star',
                  'positive'
                );
              }
            }
          } else if (outcome === 'failure') {
            condition = 'fatigued';
            ctx.metadata._selectedArmy = { actorId: randomArmy.actorId, name: randomArmy.name };
            
            const armyBadgeIndex = outcomeBadges.findIndex(b => b.template?.includes('army becomes Fatigued'));
            if (armyBadgeIndex >= 0) {
              outcomeBadges[armyBadgeIndex] = textBadge(
                `${randomArmy.name} becomes Fatigued`,
                'fas fa-tired',
                'negative'
              );
            }
          } else if (outcome === 'criticalFailure') {
            condition = 'enfeebled';
            ctx.metadata._selectedArmy = { actorId: randomArmy.actorId, name: randomArmy.name };
            
            const armyBadgeIndex = outcomeBadges.findIndex(b => b.template?.includes('army becomes Enfeebled'));
            if (armyBadgeIndex >= 0) {
              outcomeBadges[armyBadgeIndex] = textBadge(
                `${randomArmy.name} becomes Enfeebled`,
                'fas fa-exclamation-triangle',
                'negative'
              );
            }
          }
        }
      }

      // Calculate modifiers based on approach and outcome
      if (approach === 'virtuous') {
        // Defensive Drills
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'static', resource: 'fame', value: 1, duration: 'immediate' }
          ];
          // Fortify hex handled in execute
        } else if (outcome === 'success') {
          // Fortify hex handled in execute
        } else if (outcome === 'failure') {
          // Army fatigued + faction -1 handled in execute
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'static', resource: 'fame', value: -1, duration: 'immediate' }
          ];
          // Army enfeebled handled in execute
        }
      } else if (approach === 'practical') {
        // Equipment Focus
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'static', resource: 'gold', value: 1, duration: 'immediate' }
          ];
          // 2 armies equipment handled in execute
        } else if (outcome === 'success') {
          modifiers = [
            { type: 'static', resource: 'gold', value: 1, duration: 'immediate' }
          ];
          // 1 army equipment handled in execute
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'dice', resource: 'gold', formula: '-1d3-1', negative: true, duration: 'immediate' }
          ];
          // Army fatigued handled in execute
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'static', resource: 'fame', value: -1, duration: 'immediate' }
          ];
          // Army enfeebled handled in execute
        }
      } else if (approach === 'ruthless') {
        // Aggressive Training
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'static', resource: 'fame', value: 1, duration: 'immediate' },
            { type: 'static', resource: 'gold', value: 1, duration: 'immediate' }
          ];
          // Army well trained handled in execute
        } else if (outcome === 'success') {
          modifiers = [
            { type: 'static', resource: 'gold', value: 1, duration: 'immediate' }
          ];
          // Army well trained handled in execute
        } else if (outcome === 'failure') {
          // Army fatigued + faction -1 handled in execute
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'static', resource: 'fame', value: -1, duration: 'immediate' }
          ];
          // Army enfeebled handled in execute
        }
      }

      // Store modifiers in context for execute step
      ctx.metadata._outcomeModifiers = modifiers;
      ctx.metadata._selectedApproach = approach;

      return { resources: [], outcomeBadges, warnings };
    }
  },

  execute: async (ctx) => {
    const { armyService } = await import('../../services/army');
    const { removeEffectFromActor } = await import('../../services/commands/combat/conditionHelpers');
    const game = (globalThis as any).game;
    
    const approach = ctx.metadata?._selectedApproach;
    const outcome = ctx.outcome;
    
    const playerArmies = ctx.kingdom.armies?.filter((a: any) => 
      a.actorId && a.ledBy === PLAYER_KINGDOM
    ) || [];

    if (playerArmies.length === 0) {
      return { success: true, message: 'No armies available for military effects' };
    }

    // Get pre-selected army from preview (or select randomly if not available)
    const getSelectedArmy = () => {
      if (ctx.metadata?._selectedArmy?.actorId) {
        return playerArmies.find((a: any) => a.actorId === ctx.metadata._selectedArmy.actorId) || playerArmies[0];
      }
      return playerArmies[Math.floor(Math.random() * playerArmies.length)];
    };

    // Helper: Apply Well Trained
    const applyWellTrained = async (army: any) => {
      const armyActor = game?.actors?.get(army.actorId);
      if (!armyActor) return;

      await removeEffectFromActor(armyActor, 'poorly-trained');
      await removeEffectFromActor(armyActor, 'well-trained');

      const wellTrainedEffect = {
        type: 'effect',
        name: 'Well Trained',
        img: 'icons/magic/life/cross-worn-green.webp',
        system: {
          slug: 'well-trained',
          badge: { value: 1 },
          description: { value: '<p>Exceptional training provides +1 to all saving throws.</p>' },
          duration: { value: -1, unit: 'unlimited', sustained: false, expiry: null },
          rules: [{ key: 'FlatModifier', selector: 'saving-throw', value: 1, type: 'circumstance' }]
        }
      };

      await armyService.addItemToArmy(army.actorId, wellTrainedEffect);
      logger.info(`✨ [Military Exercises] Applied Well Trained to ${army.name}`);
    };

    // Helper: Apply Fatigued
    const applyFatigued = async (army: any) => {
      const armyActor = game?.actors?.get(army.actorId);
      if (!armyActor) return;

      const fatiguedCondition = {
        name: 'Fatigued',
        type: 'condition',
        img: 'systems/pf2e/icons/conditions/fatigued.webp',
        system: {
          slug: 'fatigued',
          description: { value: '<p>Training exhaustion affects performance.</p>' },
          duration: { value: -1, unit: 'unlimited', sustained: false, expiry: null }
        }
      };

      await armyService.addItemToArmy(army.actorId, fatiguedCondition as any);
      logger.info(`⚠️ [Military Exercises] Applied Fatigued to ${army.name}`);
    };

    // Helper: Apply Enfeebled
    const applyEnfeebled = async (army: any) => {
      const armyActor = game?.actors?.get(army.actorId);
      if (!armyActor) return;

      const items = Array.from(armyActor.items.values()) as any[];
      const enfeebledEffect = items.find((i: any) => i.system?.slug === 'enfeebled');

      if (enfeebledEffect) {
        const currentValue = enfeebledEffect.system?.badge?.value || 1;
        const newValue = currentValue + 1;
        await armyService.updateItemOnArmy(army.actorId, enfeebledEffect.id, { 'system.badge.value': newValue });
        logger.info(`⚠️ [Military Exercises] Increased ${army.name}'s enfeebled to ${newValue}`);
      } else {
        const enfeebledCondition = {
          name: 'Enfeebled',
          type: 'condition',
          img: 'systems/pf2e/icons/conditions/enfeebled.webp',
          system: {
            slug: 'enfeebled',
            badge: { value: 1 },
            description: { value: '<p>Training accident has weakened the troops.</p>' },
            duration: { value: -1, unit: 'unlimited', sustained: false, expiry: null }
          }
        };
        await armyService.addItemToArmy(army.actorId, enfeebledCondition as any);
        logger.info(`⚠️ [Military Exercises] Applied Enfeebled 1 to ${army.name}`);
      }
    };

    // Helper: Outfit army with equipment
    const outfitRandomArmy = async (count: number) => {
      const { outfitArmy } = await import('../../services/commands/armies/outfitArmy');
      
      for (let i = 0; i < count; i++) {
        const armiesWithSlots = playerArmies.filter((a: any) => {
          const equipment = a.equipment || {};
          return !equipment.armor || !equipment.weapons || !equipment.runes || !equipment.equipment;
        });

        if (armiesWithSlots.length === 0) break;

        const army = armiesWithSlots[Math.floor(Math.random() * armiesWithSlots.length)];
        const equipment = army.equipment || {};
        const availableSlots = ['armor', 'weapons', 'runes', 'equipment'].filter(slot => !equipment[slot]);
        const selectedSlot = availableSlots[Math.floor(Math.random() * availableSlots.length)];

        const prepared = await outfitArmy(army.id, selectedSlot, 'success', false);
        if (prepared?.commit) {
          await prepared.commit();
          logger.info(`✨ [Military Exercises] Equipped ${army.name} with ${selectedSlot}`);
        }
      }
    };

    // Execute based on approach and outcome
    if (approach === 'virtuous') {
      // Defensive Drills
      if (outcome === 'criticalSuccess' || outcome === 'success') {
        // TODO: Fortify hex - requires hex selection UI
        logger.info('[Military Exercises] Fortify hex effect (not yet implemented)');
      } else if (outcome === 'failure') {
        const army = getSelectedArmy();
        await applyFatigued(army);
        // Adjust 1 faction -1
        const factions = factionService.getAllFactions();
        const eligibleFactions = factions.filter((f: any) => f.attitude && f.attitude !== 'Hostile');
        if (eligibleFactions.length > 0) {
          const faction = eligibleFactions[Math.floor(Math.random() * eligibleFactions.length)];
          const newAttitude = adjustAttitudeBySteps(faction.attitude, -1);
          if (newAttitude) {
            await factionService.updateAttitude(faction.id, newAttitude);
            logger.info(`[Military Exercises] Adjusted faction ${faction.name} by -1`);
          }
        }
      } else if (outcome === 'criticalFailure') {
        const army = getSelectedArmy();
        await applyEnfeebled(army);
      }
    } else if (approach === 'practical') {
      // Equipment Focus
      if (outcome === 'criticalSuccess') {
        await outfitRandomArmy(2);
      } else if (outcome === 'success') {
        await outfitRandomArmy(1);
      } else if (outcome === 'failure') {
        const army = getSelectedArmy();
        await applyFatigued(army);
      } else if (outcome === 'criticalFailure') {
        const army = getSelectedArmy();
        await applyEnfeebled(army);
      }
    } else if (approach === 'ruthless') {
      // Aggressive Training
      if (outcome === 'criticalSuccess' || outcome === 'success') {
        const army = getSelectedArmy();
        await applyWellTrained(army);
      } else if (outcome === 'failure') {
        const army = getSelectedArmy();
        await applyFatigued(army);
        // Adjust 1 faction -1
        const factions = factionService.getAllFactions();
        const eligibleFactions = factions.filter((f: any) => f.attitude && f.attitude !== 'Hostile');
        if (eligibleFactions.length > 0) {
          const faction = eligibleFactions[Math.floor(Math.random() * eligibleFactions.length)];
          const newAttitude = adjustAttitudeBySteps(faction.attitude, -1);
          if (newAttitude) {
            await factionService.updateAttitude(faction.id, newAttitude);
            logger.info(`[Military Exercises] Adjusted faction ${faction.name} by -1`);
          }
        }
      } else if (outcome === 'criticalFailure') {
        const army = getSelectedArmy();
        await applyEnfeebled(army);
      }
    }

    return { success: true };
  },

  traits: ["beneficial"],
};
