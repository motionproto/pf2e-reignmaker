/**
 * Food Shortage Event Pipeline (CHOICE-BASED)
 *
 * Disease, weather, or pests destroy agricultural production.
 * How will you respond to the crisis?
 *
 * Approaches:
 * - Feed the People (V) - Distribute aid freely, drain military supplies
 * - Controlled Rationing (P) - Fair compensation and allocation
 * - Prioritize Elite (R) - Military and leadership first, let poor suffer
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { valueBadge, textBadge, diceBadge } from '../../types/OutcomeBadge';
import { PLAYER_KINGDOM } from '../../types/ownership';

export const foodShortagePipeline: CheckPipeline = {
  id: 'food-shortage',
  name: 'Food Shortage',
  description: 'Disease, weather, or pests destroy agricultural production.',
  checkType: 'event',
  tier: 1,

  // Strategic choice - triggers voting system
  // Options ordered: Virtuous (left) → Practical (center) → Ruthless (right)
  strategicChoice: {
    label: 'How will you allocate scarce resources?',
    required: true,
    options: [
      {
        id: 'feed-people',
        label: 'Share Reserves',
        description: 'Distribute aid freely, drain military supplies if needed',
        icon: 'fas fa-hand-holding-heart',
        skills: ['diplomacy', 'society', 'applicable lore'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Selfless generosity inspires miraculous donations; unity thrives amid scarcity.',
          success: 'Compassionate aid heals hearts; grateful communities endure together.',
          failure: 'Noble intentions drain reserves; weakened troops fall ill from hunger.',
          criticalFailure: 'Reckless charity empties storehouses; starving soldiers lose morale.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive'),
            textBadge('Adjust 1 faction +1', 'fas fa-users', 'positive'),
            textBadge('Adjust 1 faction +1', 'fas fa-users', 'positive')
          ],
          success: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
          ],
          failure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
            diceBadge('Lose {{value}} Food', 'fas fa-drumstick-bite', '1d3', 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
            diceBadge('Lose {{value}} Food', 'fas fa-drumstick-bite', '2d4+1', 'negative')
          ]
        }
      },
      {
        id: 'rationing',
        label: 'Ration & Import',
        description: 'Fair compensation and systematic allocation',
        icon: 'fas fa-scale-balanced',
        skills: ['society', 'nature', 'applicable lore'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Masterful logistics prevent waste; crisis resolved with minimal suffering.',
          success: 'Fair distribution maintains order; citizens accept rationed hardships.',
          failure: 'Bureaucratic tangles spoil food; frustration breeds discontent.',
          criticalFailure: 'Rationing system collapses; corruption and black markets flourish.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d4', 'positive'),
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive')
          ],
          success: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative'),
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative'),
            diceBadge('Lose {{value}} Food', 'fas fa-drumstick-bite', '2d3', 'negative')
          ]
        }
      },
      {
        id: 'prioritize-elite',
        label: 'Feed Nobility',
        description: 'Military and leadership first, let the poor suffer',
        icon: 'fas fa-crown',
        skills: ['intimidation', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Iron rule crushes dissent; elite feast while cowed masses submit.',
          success: 'Military strength preserved; starving commoners simmer with resentment.',
          failure: 'Desperate hunger ignites riots; mobs ransack buildings seeking food.',
          criticalFailure: 'Mass starvation triggers revolt; burning buildings mark your cruelty.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d4', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d4', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d3', 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Food', 'fas fa-drumstick-bite', '1d3', 'negative'),
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d4', 'negative'),
            diceBadge('Lose {{value}} Food', 'fas fa-drumstick-bite', '1d3', 'negative'),
            textBadge('Adjust 1 faction -1', 'fas fa-users-slash', 'negative')
          ]
        }
      }
    ]
  },

  skills: [
    { skill: 'nature', description: 'agricultural expertise' },
    { skill: 'survival', description: 'emergency measures' },
    { skill: 'diplomacy', description: 'coordinate relief' },
    { skill: 'society', description: 'systematic rationing' },
    { skill: 'intimidation', description: 'enforce order' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your approach manages the crisis admirably.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    success: {
      description: 'The food shortage is handled appropriately.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    failure: {
      description: 'The shortage causes hardship.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'Your approach deepens the crisis.',
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
      const selectedOption = foodShortagePipeline.strategicChoice?.options.find(opt => opt.id === approach);

      // Get outcome badges from the selected approach
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      // Calculate modifiers and prepare game commands based on approach
      let modifiers: any[] = [];

      if (approach === 'feed-people') {
        // Feed the People (Virtuous)
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'static', resource: 'fame', value: 1, duration: 'immediate' },
            { type: 'dice', resource: 'unrest', formula: '1d3', negative: true, duration: 'immediate' },
            { type: 'dice', resource: 'food', formula: '1d4', negative: true, duration: 'immediate' }
          ];
        } else if (outcome === 'success') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' },
            { type: 'dice', resource: 'food', formula: '1d4', negative: true, duration: 'immediate' }
          ];
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
            { type: 'dice', resource: 'food', formula: '2d4', negative: true, duration: 'immediate' }
          ];
          // 1 army gains sickened - select random player army
          const playerArmies = kingdom.armies?.filter((a: any) => a.ledBy === PLAYER_KINGDOM && a.actorId) || [];
          if (playerArmies.length > 0) {
            const randomArmy = playerArmies[Math.floor(Math.random() * playerArmies.length)];
            ctx.metadata._armyCondition = { actorId: randomArmy.actorId, condition: 'sickened', value: 1 };
            // Update badge with army name
            const armyBadgeIndex = outcomeBadges.findIndex(b => b.template?.includes('army gains sickened'));
            if (armyBadgeIndex >= 0) {
              outcomeBadges[armyBadgeIndex] = textBadge(`${randomArmy.name} gains sickened`, 'fas fa-skull', 'negative');
            }
          }
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '1d3', duration: 'immediate' },
            { type: 'dice', resource: 'food', formula: '2d4', negative: true, duration: 'immediate' }
          ];
          // 1 army rolls morale check - select random player army (morale check handled by GM)
          const playerArmies = kingdom.armies?.filter((a: any) => a.ledBy === PLAYER_KINGDOM && a.actorId) || [];
          if (playerArmies.length > 0) {
            const randomArmy = playerArmies[Math.floor(Math.random() * playerArmies.length)];
            ctx.metadata._armyMoraleCheck = { actorId: randomArmy.actorId, armyName: randomArmy.name };
            // Update badge with army name
            const armyBadgeIndex = outcomeBadges.findIndex(b => b.template?.includes('army rolls morale'));
            if (armyBadgeIndex >= 0) {
              outcomeBadges[armyBadgeIndex] = textBadge(`${randomArmy.name} rolls morale check`, 'fas fa-person-falling-burst', 'negative');
            }
          }
        }
      } else if (approach === 'rationing') {
        // Controlled Rationing (Practical)
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '1d3', negative: true, duration: 'immediate' },
            { type: 'dice', resource: 'food', formula: '1d4', negative: true, duration: 'immediate' }
          ];
        } else if (outcome === 'success') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' },
            { type: 'dice', resource: 'food', formula: '1d4', negative: true, duration: 'immediate' }
          ];
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
            { type: 'dice', resource: 'food', formula: '1d4', negative: true, duration: 'immediate' }
          ];
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '1d3', duration: 'immediate' },
            { type: 'dice', resource: 'food', formula: '2d4', negative: true, duration: 'immediate' }
          ];
        }
      } else if (approach === 'prioritize-elite') {
        // Prioritize Elite (Ruthless)
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'dice', resource: 'food', formula: '1d4', negative: true, duration: 'immediate' }
          ];
          // Imprison rioters (convert unrest to imprisoned)
          const { ConvertUnrestToImprisonedHandler } = await import('../../services/gameCommands/handlers/ConvertUnrestToImprisonedHandler');
          const imprisonHandler = new ConvertUnrestToImprisonedHandler();
          const commandContext: GameCommandContext = {
            actionId: 'food-shortage',
            outcome: ctx.outcome,
            kingdom: ctx.kingdom,
            metadata: ctx.metadata || {}
          };
          // Roll 1d4 for imprisoned count
          const roll = new Roll('1d4');
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
            { type: 'dice', resource: 'food', formula: '1d4', negative: true, duration: 'immediate' },
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
          ];
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '1d3', duration: 'immediate' },
            { type: 'dice', resource: 'food', formula: '1d4', negative: true, duration: 'immediate' }
          ];
          // Damage 1 structure
          const { DamageStructureHandler } = await import('../../services/gameCommands/handlers/DamageStructureHandler');
          const damageHandler = new DamageStructureHandler();
          const commandContext: GameCommandContext = {
            actionId: 'food-shortage',
            outcome: ctx.outcome,
            kingdom: ctx.kingdom,
            metadata: ctx.metadata || {}
          };
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
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '1d3', duration: 'immediate' },
            { type: 'static', resource: 'fame', value: -1, duration: 'immediate' },
            { type: 'dice', resource: 'food', formula: '2d4', negative: true, duration: 'immediate' }
          ];
          // Damage 1 structure
          const { DamageStructureHandler } = await import('../../services/gameCommands/handlers/DamageStructureHandler');
          const damageHandler = new DamageStructureHandler();
          const commandContext: GameCommandContext = {
            actionId: 'food-shortage',
            outcome: ctx.outcome,
            kingdom: ctx.kingdom,
            metadata: ctx.metadata || {}
          };
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

  execute: async (ctx) => {
    // NOTE: Standard modifiers (unrest, gold, fame, food) are applied automatically by
    // ResolutionDataBuilder + GameCommandsService via outcomeBadges.
    // This execute() only handles special game commands.

    const { get } = await import('svelte/store');
    const { kingdomData } = await import('../../stores/KingdomStore');
    const kingdom = get(kingdomData);
    const approach = kingdom.turnState?.eventsPhase?.selectedApproach;
    const outcome = ctx.outcome;

    // Execute game commands based on approach and outcome
    if (approach === 'feed-people') {
      // Feed the People: failure applies sickened to army
      if (outcome === 'failure') {
        const armyCondition = ctx.metadata?._armyCondition;
        if (armyCondition?.actorId) {
          const { applyArmyConditionExecution } = await import('../../execution/armies/applyArmyCondition');
          await applyArmyConditionExecution(armyCondition.actorId, armyCondition.condition, armyCondition.value);
        }
      }
      // Critical failure: army rolls morale check (notification only - GM handles the roll)
      if (outcome === 'criticalFailure') {
        const armyMoraleCheck = ctx.metadata?._armyMoraleCheck;
        if (armyMoraleCheck?.armyName) {
          ChatMessage.create({
            content: `<p><strong>Morale Check Required:</strong> ${armyMoraleCheck.armyName} must roll a morale check due to severe food shortage.</p>`,
            speaker: ChatMessage.getSpeaker()
          });
        }
      }
    } else if (approach === 'prioritize-elite') {
      if (outcome === 'criticalSuccess') {
        const imprisonCommand = ctx.metadata?._preparedImprison;
        if (imprisonCommand?.commit) {
          await imprisonCommand.commit();
        }
      } else if (outcome === 'failure' || outcome === 'criticalFailure') {
        const damageCommand = ctx.metadata?._preparedDamageStructure;
        if (damageCommand?.commit) {
          await damageCommand.commit();
        }
      }
    }

    return { success: true };
  },

  traits: ['dangerous', 'ongoing'],
};
