/**
 * Feud Event Pipeline (CHOICE-BASED)
 *
 * Two prominent families are engaged in a bitter feud.
 * Players choose their approach, which determines available skills and outcome modifiers.
 *
 * Approaches:
 * - Mediate Peacefully (Diplomacy/Society/Religion) - Peaceful resolution (Virtuous)
 * - Manipulate Outcome (Deception/Stealth/Thievery) - Cunning resolution (Practical)
 * - Force Compliance (Intimidation/Performance/Athletics) - Authoritarian approach (Ruthless)
 *
 * Based on EVENT_MIGRATION_STATUS.md specifications
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { DamageStructureHandler } from '../../services/gameCommands/handlers/DamageStructureHandler';
import { ConvertUnrestToImprisonedHandler } from '../../services/gameCommands/handlers/ConvertUnrestToImprisonedHandler';
import { valueBadge, textBadge, diceBadge } from '../../types/OutcomeBadge';
import { factionService } from '../../services/factions';
import { adjustAttitudeBySteps } from '../../utils/faction-attitude-adjuster';

export const feudPipeline: CheckPipeline = {
  id: 'feud',
  name: 'Feud',
  description: 'Two prominent families are engaged in a bitter feud that threatens to tear the community apart.',
  checkType: 'event',
  tier: 1,

  // Event strategic choice: How will you handle the feud?
  // Options ordered: Virtuous (left) → Practical (center) → Ruthless (right)
  strategicChoice: {
    label: 'How will you handle the feud?',
    required: true,
    options: [
      {
        id: 'virtuous',
        label: 'Mediate Peacefully',
        description: 'Use diplomacy to bring the families together',
        icon: 'fas fa-handshake',
        skills: ['diplomacy', 'society', 'religion', 'applicable lore'],
        personality: { virtuous: 3 },
        outcomeBadges: {
          criticalSuccess: [
            textBadge('Adjust 1 faction +1', 'fas fa-users', 'positive'),
            textBadge('Adjust 1 faction +1', 'fas fa-users', 'positive'),
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')
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
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ]
        },
        outcomeDescriptions: {
          criticalSuccess: 'Through patient diplomacy, the families reconcile and become allies.',
          success: 'Your mediation brings the families together peacefully.',
          failure: 'The families reject your peaceful overtures.',
          criticalFailure: 'Your attempts at mediation only inflame tensions further.'
        }
      },
      {
        id: 'practical',
        label: 'Manipulate Outcome',
        description: 'Use deception to secretly resolve the feud',
        icon: 'fas fa-mask',
        skills: ['deception', 'stealth', 'thievery', 'applicable lore'],
        personality: { practical: 3 },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d4', 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d2', 'positive')
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
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative'),
            textBadge('Random army becomes Fatigued', 'fas fa-tired', 'negative'),
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d2', 'negative')
          ]
        },
        outcomeDescriptions: {
          criticalSuccess: 'Your cunning manipulation turns the feuding families into unwitting allies.',
          success: 'Through careful deception, the feud quietly dissolves.',
          failure: 'Your schemes are exposed, worsening the situation.',
          criticalFailure: 'Your manipulation backfires spectacularly, inflaming both families against you.'
        }
      },
      {
        id: 'ruthless',
        label: 'Force Compliance',
        description: 'Use authority and intimidation to end the conflict',
        icon: 'fas fa-fist-raised',
        skills: ['intimidation', 'performance', 'athletics', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Imprison {{value}} dissidents', 'fas fa-user-lock', '2d3', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d3', 'positive')
          ],
          success: [
            diceBadge('Imprison {{value}} dissidents', 'fas fa-user-lock', '1d3', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative')
          ],
          criticalFailure: [
            textBadge('1 structure damaged', 'fas fa-house-crack', 'negative'),
            diceBadge('{{value}} innocents harmed', 'fas fa-user-injured', '1d2', 'negative')
          ]
        },
        outcomeDescriptions: {
          criticalSuccess: 'Your show of force crushes all resistance. Both families submit completely.',
          success: 'Through intimidation and authority, you force the families to end their conflict.',
          failure: 'Your authoritarian approach breeds resentment and defiance.',
          criticalFailure: 'Your brutal crackdown sparks violence and property destruction.'
        }
      }
    ]
  },

  // Base skills (filtered by choice)
  skills: [
    { skill: 'diplomacy', description: 'mediate between families' },
    { skill: 'society', description: 'understand social dynamics' },
    { skill: 'religion', description: 'appeal to shared faith' },
    { skill: 'intimidation', description: 'threaten consequences' },
    { skill: 'performance', description: 'public display of authority' },
    { skill: 'athletics', description: 'show of physical force' },
    { skill: 'deception', description: 'manipulate both sides' },
    { skill: 'stealth', description: 'work behind the scenes' },
    { skill: 'thievery', description: 'plant evidence or steal items' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your approach succeeds brilliantly.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    success: {
      description: 'Your approach resolves the situation.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    failure: {
      description: 'The feud worsens despite your efforts.',
      endsEvent: false,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'Your approach backfires catastrophically.',
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
      const PLAYER_KINGDOM = 'player';

      // Find the selected approach option
      const selectedOption = feudPipeline.strategicChoice?.options.find(opt => opt.id === approach);

      // Get outcome badges from the selected approach
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      // Apply outcome-specific modifiers based on approach
      let modifiers: any[] = [];

      if (approach === 'virtuous') {
        // Mediate Peacefully (Virtuous)
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '-1d3', negative: true, duration: 'immediate' },
            { type: 'static', resource: 'fame', value: 1, duration: 'immediate' }
          ];
        } else if (outcome === 'success') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
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
      } else if (approach === 'practical') {
        // Manipulate Outcome (Practical)
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '-1d3', negative: true, duration: 'immediate' },
            { type: 'static', resource: 'fame', value: 1, duration: 'immediate' },
            { type: 'dice', resource: 'gold', formula: '1d3', duration: 'immediate' }
          ];
          // Adjust 1 random faction +1
          const eligibleFactions = (kingdom.factions || []).filter((f: any) =>
            f.attitude && f.attitude !== 'Helpful'
          );
          if (eligibleFactions.length > 0) {
            const randomFaction = eligibleFactions[Math.floor(Math.random() * eligibleFactions.length)];
            const newAttitude = adjustAttitudeBySteps(randomFaction.attitude, 1);
            ctx.metadata._factionAdjustment = {
              factionId: randomFaction.id,
              factionName: randomFaction.name,
              oldAttitude: randomFaction.attitude,
              newAttitude: newAttitude,
              steps: 1
            };
            if (newAttitude) {
              outcomeBadges.push(textBadge(
                `Relations with ${randomFaction.name} improve: ${randomFaction.attitude} → ${newAttitude}`,
                'fas fa-handshake',
                'positive'
              ));
            }
          }
        } else if (outcome === 'success') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' },
            { type: 'static', resource: 'gold', value: 1, duration: 'immediate' }
          ];
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
          
          // Army becomes fatigued
          const playerArmies = kingdom.armies?.filter((a: any) => a.ledBy === PLAYER_KINGDOM && a.actorId) || [];
          if (playerArmies.length > 0) {
            const randomArmy = playerArmies[Math.floor(Math.random() * playerArmies.length)];
            
            // Store in metadata for execute
            ctx.metadata._armyCondition = { actorId: randomArmy.actorId, condition: 'fatigued', value: 1 };
            
            // Update badge with army name
            const armyBadgeIndex = outcomeBadges.findIndex(b => b.template?.includes('army becomes Fatigued'));
            if (armyBadgeIndex >= 0) {
              outcomeBadges[armyBadgeIndex] = textBadge(
                `${randomArmy.name} becomes Fatigued`, 
                'fas fa-tired', 
                'negative'
              );
            }
          }
          
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
              outcomeBadges.push(textBadge(
                `Relations with ${randomFaction.name} worsen: ${randomFaction.attitude} → ${newAttitude}`,
                'fas fa-handshake-slash',
                'negative'
              ));
            }
          }
        }
      } else if (approach === 'ruthless') {
        // Force Compliance (Ruthless)
        const commandContext: GameCommandContext = {
          actionId: 'feud',
          outcome: ctx.outcome,
          kingdom: ctx.kingdom,
          metadata: ctx.metadata || {}
        };

        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '-1d3', negative: true, duration: 'immediate' }
          ];
          // Imprison 1d3 dissidents (convert unrest to imprisoned)
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
          modifiers = [
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
          ];
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
          ];
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '1d3', duration: 'immediate' }
          ];

          // Add structure damage for force + critical failure
          const commandContext = {
            actionId: 'feud',
            outcome: ctx.outcome,
            kingdom: ctx.kingdom,
            metadata: ctx.metadata || {}
          };

          const damageHandler = new DamageStructureHandler();
          const damageCommand = await damageHandler.prepare(
            { type: 'damageStructure', count: 1 },
            commandContext
          );

          if (damageCommand) {
            ctx.metadata._preparedDamageStructure = damageCommand;

            if (damageCommand.outcomeBadges) {
              outcomeBadges.push(...damageCommand.outcomeBadges);
            } else if (damageCommand.outcomeBadge) {
              outcomeBadges.push(damageCommand.outcomeBadge);
            }
          }
        }
      }

      // Store modifiers in context for execute step
      ctx.metadata._outcomeModifiers = modifiers;

      return { resources: [], outcomeBadges };
    }
  },

  // Execute the prepared commands
  execute: async (ctx) => {
    // NOTE: Standard modifiers (unrest, gold, fame) are applied automatically by
    // ResolutionDataBuilder + GameCommandsService via outcomeBadges.
    // This execute() only handles special game commands.

    // Apply army condition (practical CF)
    const armyCondition = ctx.metadata?._armyCondition;
    if (armyCondition?.actorId) {
      const { applyArmyConditionExecution } = await import('../../execution/armies/applyArmyCondition');
      await applyArmyConditionExecution(armyCondition.actorId, armyCondition.condition, armyCondition.value);
    }

    // Execute faction adjustment (manipulate approach)
    const factionAdjustment = ctx.metadata?._factionAdjustment;
    if (factionAdjustment?.factionId && factionAdjustment?.newAttitude) {
      await factionService.adjustAttitude(
        factionAdjustment.factionId,
        factionAdjustment.steps
      );
    }

    // Execute imprisonment (force approach - critical success)
    const imprisonCommand = ctx.metadata?._preparedImprison;
    if (imprisonCommand?.commit) {
      await imprisonCommand.commit();
    }

    // Execute structure damage (force approach - critical failure)
    const damageCommand = ctx.metadata?._preparedDamageStructure;
    if (damageCommand?.commit) {
      await damageCommand.commit();
    }

    return { success: true };
  },

  traits: ["dangerous", "ongoing"],
};
