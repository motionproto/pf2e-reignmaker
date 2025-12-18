/**
 * Plague Event Pipeline (CHOICE-BASED)
 *
 * Disease spreads rapidly through your settlements. How will you respond?
 *
 * Approaches:
 * - Provide Free Treatment (V) - Care for all regardless of cost
 * - Quarantine Effectively (P) - Contain the spread systematically
 * - Lock Down Hard (R) - Burn infected areas if necessary
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { AdjustFactionHandler } from '../../services/gameCommands/handlers/AdjustFactionHandler';
import { ReduceSettlementLevelHandler } from '../../services/gameCommands/handlers/ReduceSettlementLevelHandler';
import { valueBadge, diceBadge, textBadge } from '../../types/OutcomeBadge';

export const plaguePipeline: CheckPipeline = {
  id: 'plague',
  name: 'Plague',
  description: 'Disease spreads rapidly through your settlements.',
  checkType: 'event',
  tier: 1,

  // Strategic choice - triggers voting system
  // Options ordered: Virtuous (left) → Practical (center) → Ruthless (right)
  strategicChoice: {
    label: 'How will you respond to the plague?',
    required: true,
    options: [
      {
        id: 'virtuous',
        label: 'Quarantine & Care',
        description: 'Care for all citizens regardless of cost',
        icon: 'fas fa-hand-holding-medical',
        skills: ['medicine', 'religion', 'nature', 'applicable lore'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Your selfless devotion inspires hope; people rally together.',
          success: 'Compassionate care earns gratitude and donations.',
          failure: 'Treatment costs drain treasuries faster than plague spreads.',
          criticalFailure: 'Overwhelmed healers watch helplessly as settlements wither.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
          ],
          success: [
            valueBadge('Gain {{value}} Gold', 'fas fa-coins', 1, 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Food', 'fas fa-drumstick-bite', '1d3', 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ],
          criticalFailure: [
            diceBadge('Lose {{value}} Food', 'fas fa-drumstick-bite', '2d4', 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Contain Spread',
        description: 'Contain the spread and compensate losses',
        icon: 'fas fa-house-medical-circle-check',
        skills: ['society', 'medicine', 'crafting', 'applicable lore'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Methodical isolation halts the spread; order restored.',
          success: 'Disciplined measures contain outbreak before it spreads.',
          failure: 'Quarantine breaches allow disease to claim more victims.',
          criticalFailure: 'Chaos erupts as containment fails spectacularly.'
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
            diceBadge('Lose {{value}} Food', 'fas fa-drumstick-bite', '1d3', 'negative'),
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d4', 'negative'),
            diceBadge('Lose {{value}} Food', 'fas fa-drumstick-bite', '2d4', 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Burn the Infected',
        description: 'Burn infected areas to stop the spread',
        icon: 'fas fa-fire',
        skills: ['intimidation', 'survival', 'athletics', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Ruthless purge eradicates plague; seized assets fill coffers.',
          success: 'Fear-driven compliance stops the spread cold.',
          failure: 'Heavy-handed tactics create more problems than they solve.',
          criticalFailure: 'Fires meant to cleanse instead destroy livelihoods.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d4', 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d4', 'positive')
          ],
          success: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative')
          ],
          criticalFailure: [
            textBadge('Lose 1 worksite', 'fas fa-industry', 'negative'),
            textBadge('1 structure damaged', 'fas fa-house-crack', 'negative')
          ]
        }
      }
    ]
  },

  skills: [
    { skill: 'medicine', description: 'treat the sick' },
    { skill: 'religion', description: 'divine healing' },
    { skill: 'society', description: 'quarantine measures' },
    { skill: 'intimidation', description: 'enforce lockdown' },
    { skill: 'survival', description: 'emergency response' },
    { skill: 'crafting', description: 'build quarantine facilities' },
    { skill: 'athletics', description: 'enforce restrictions' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your approach stops the plague completely.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    success: {
      description: 'The plague is brought under control.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    failure: {
      description: 'The plague spreads despite your efforts.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'Your approach worsens the outbreak.',
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
      const selectedOption = plaguePipeline.strategicChoice?.options.find(opt => opt.id === approach);

      // Get outcome badges from the selected approach
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      // Calculate modifiers and prepare game commands based on approach
      let modifiers: any[] = [];

      const commandContext: GameCommandContext = {
        actionId: 'plague',
        outcome: ctx.outcome,
        kingdom: ctx.kingdom,
        metadata: ctx.metadata || {}
      };

      if (approach === 'virtuous') {
        // Provide Free Treatment (Virtuous)
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'static', resource: 'fame', value: 1, duration: 'immediate' },
            { type: 'dice', resource: 'unrest', formula: '1d3', negative: true, duration: 'immediate' }
          ];

          // Adjust 2 random factions +1
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: 1, factionId: 'random', count: 2 },
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
          modifiers = [
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
          ];

          // Adjust 1 random faction +1
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: 1, factionId: 'random' },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFactionVirtuousS = factionCommand;
            if (factionCommand.outcomeBadges) {
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
            }
          }
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
            { type: 'dice', resource: 'gold', formula: '1d3', negative: true, duration: 'immediate' },
            { type: 'dice', resource: 'food', formula: '1d4', negative: true, duration: 'immediate' }
          ];
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '1d3', duration: 'immediate' },
            { type: 'dice', resource: 'gold', formula: '1d3', negative: true, duration: 'immediate' },
            { type: 'dice', resource: 'food', formula: '2d4', negative: true, duration: 'immediate' }
          ];
          // Mark that ongoing plague effect should be added (-1d4 Food/turn for 2 turns)
          ctx.metadata._addOngoingPlague = true;
          
          // Settlement level reduction
          const reduceHandler = new ReduceSettlementLevelHandler();
          const reduceCommand = await reduceHandler.prepare(
            { type: 'reduceSettlementLevel', reduction: 1 },
            commandContext
          );
          if (reduceCommand) {
            ctx.metadata._preparedSettlementReduceVirtuousCF = reduceCommand;
            if (reduceCommand.outcomeBadges) {
              outcomeBadges.push(...reduceCommand.outcomeBadges);
            } else if (reduceCommand.outcomeBadge) {
              outcomeBadges.push(reduceCommand.outcomeBadge);
            }
          }
        }
      } else if (approach === 'practical') {
        // Quarantine Effectively (Practical)
        if (outcome === 'criticalSuccess') {
          modifiers = [
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
      } else if (approach === 'ruthless') {
        // Lock Down Hard (Ruthless)
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '1d3', negative: true, duration: 'immediate' },
            { type: 'dice', resource: 'gold', formula: '2d3', duration: 'immediate' }
          ];
        } else if (outcome === 'success') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' },
            { type: 'dice', resource: 'gold', formula: '1d3', duration: 'immediate' }
          ];
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
          ];
          // Damage 1 structure
          const { DamageStructureHandler } = await import('../../services/gameCommands/handlers/DamageStructureHandler');
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
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '1d3', duration: 'immediate' },
            { type: 'static', resource: 'fame', value: -1, duration: 'immediate' }
          ];
          // Destroy 1 structure
          const { DestroyStructureHandler } = await import('../../services/gameCommands/handlers/DestroyStructureHandler');
          const destroyHandler = new DestroyStructureHandler();
          const destroyCommand = await destroyHandler.prepare(
            { type: 'destroyStructure', count: 1 },
            commandContext
          );
          if (destroyCommand) {
            ctx.metadata._preparedDestroyStructure = destroyCommand;
            if (destroyCommand.outcomeBadges) {
              outcomeBadges.push(...destroyCommand.outcomeBadges);
            } else if (destroyCommand.outcomeBadge) {
              outcomeBadges.push(destroyCommand.outcomeBadge);
            }
          }
          // Adjust 1 random faction -1
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: -1, factionId: 'random' },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFactionRuthlessCF = factionCommand;
            if (factionCommand.outcomeBadges) {
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
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

    // Execute faction adjustments
    const factionVirtuousCS = ctx.metadata?._preparedFactionVirtuousCS;
    if (factionVirtuousCS?.commit) {
      await factionVirtuousCS.commit();
    }

    const factionVirtuousS = ctx.metadata?._preparedFactionVirtuousS;
    if (factionVirtuousS?.commit) {
      await factionVirtuousS.commit();
    }

    // Execute settlement level reduction (virtuous CF)
    const reduceCommand = ctx.metadata?._preparedSettlementReduceVirtuousCF;
    if (reduceCommand?.commit) {
      await reduceCommand.commit();
    }

    // Execute game commands for treatment approach
    if (approach === 'virtuous') {
      if (outcome === 'criticalFailure' && ctx.metadata?._addOngoingPlague) {
        // Add ongoing plague modifier directly to kingdom
        const { updateKingdom } = await import('../../stores/KingdomStore');
        const currentTurn = kingdom.currentTurn || 1;
        const modifierId = `ongoing-plague-${Date.now()}`;

        await updateKingdom(k => {
          if (!k.activeModifiers) {
            k.activeModifiers = [];
          }
          k.activeModifiers.push({
            id: modifierId,
            name: 'Plague Spreads',
            description: 'The plague continues to ravage your kingdom, spoiling food stores.',
            icon: 'fas fa-biohazard',
            tier: 1,
            sourceType: 'custom',
            sourceId: ctx.instanceId || 'plague-event',
            sourceName: 'Plague Event',
            startTurn: currentTurn,
            modifiers: [
              { type: 'dice', resource: 'food', formula: '1d4', negative: true, duration: 2 }
            ]
          });
        });

        ChatMessage.create({
          content: `<p><strong>Ongoing Effect:</strong> Plague Spreads</p><p>The plague continues to ravage your kingdom, spoiling food stores.</p><p><em>Effect: -1d4 Food per turn for 2 turns</em></p>`,
          speaker: ChatMessage.getSpeaker()
        });
      }
    }

    // Execute game commands for lockdown approach
    if (approach === 'ruthless') {
      if (outcome === 'failure') {
        const damageCommand = ctx.metadata?._preparedDamageStructure;
        if (damageCommand?.commit) {
          await damageCommand.commit();
        }
      } else if (outcome === 'criticalFailure') {
        const destroyCommand = ctx.metadata?._preparedDestroyStructure;
        if (destroyCommand?.commit) {
          await destroyCommand.commit();
        }
        const factionRuthlessCF = ctx.metadata?._preparedFactionRuthlessCF;
        if (factionRuthlessCF?.commit) {
          await factionRuthlessCF.commit();
        }
      }
    }

    // TODO: Track personality choice (Phase 4)
    // await personalityTracker.recordChoice(approach, personality);

    return { success: true };
  },

  traits: ["dangerous", "ongoing"],
};
