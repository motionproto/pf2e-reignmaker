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
import { valueBadge, textBadge, diceBadge } from '../../types/OutcomeBadge';

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
        skills: ['medicine', 'religion', 'applicable lore'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Your selfless care saves countless lives and earns deep gratitude from your people.',
          success: 'Free treatment contains the plague while maintaining public trust.',
          failure: 'The cost of treating everyone strains resources as the plague spreads.',
          criticalFailure: 'Your treatment efforts are overwhelmed, draining resources as the plague spreads uncontrollably.'
        },
        outcomeBadges: {
          criticalSuccess: [
            textBadge('Adjust 1 faction +1', 'fas fa-users', 'positive'),
            textBadge('Adjust 1 faction +1', 'fas fa-users', 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
          ],
          success: [
            textBadge('Adjust 1 faction +1', 'fas fa-users', 'positive'),
            valueBadge('Gain {{value}} Gold', 'fas fa-coins', 1, 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Food', 'fas fa-drumstick-bite', '1d3', 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ],
          criticalFailure: [
            diceBadge('Lose {{value}} Food', 'fas fa-drumstick-bite', '2d4', 'negative'),
            textBadge('1 settlement loses level', 'fas fa-city', 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Contain Spread',
        description: 'Contain the spread and compensate losses',
        icon: 'fas fa-house-medical-circle-check',
        skills: ['society', 'medicine', 'applicable lore'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Your systematic quarantine stops the plague with minimal disruption.',
          success: 'Effective containment measures limit the spread and calm fears.',
          failure: 'Quarantine measures prove insufficient as the plague continues spreading.',
          criticalFailure: 'Your quarantine fails catastrophically, draining resources while the plague rages on.'
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
        skills: ['intimidation', 'survival', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Your brutal lockdown eradicates the plague completely, and salvaged assets fill your treasury.',
          success: 'Harsh measures stop the spread, though some assets are seized in the process.',
          failure: 'Your brutal approach damages infrastructure while failing to stop the plague.',
          criticalFailure: 'Your draconian measures destroy property, damage relationships, and fail to contain the outbreak.'
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

      if (approach === 'virtuous') {
        // Provide Free Treatment (Virtuous)
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
          const commandContext: GameCommandContext = {
            actionId: 'plague',
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
            { type: 'static', resource: 'fame', value: -1, duration: 'immediate' }
          ];
          // Destroy 1 structure
          const { DestroyStructureHandler } = await import('../../services/gameCommands/handlers/DestroyStructureHandler');
          const destroyHandler = new DestroyStructureHandler();
          const commandContext: GameCommandContext = {
            actionId: 'plague',
            outcome: ctx.outcome,
            kingdom: ctx.kingdom,
            metadata: ctx.metadata || {}
          };
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
    // NOTE: Standard modifiers (unrest, gold, fame, food) are applied automatically by
    // ResolutionDataBuilder + GameCommandsService via outcomeBadges.
    // This execute() only handles special game commands.

    const { get } = await import('svelte/store');
    const { kingdomData } = await import('../../stores/KingdomStore');
    const kingdom = get(kingdomData);
    const approach = kingdom.turnState?.eventsPhase?.selectedApproach;
    const outcome = ctx.outcome;

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
        const factionAdjustment = ctx.metadata?._factionAdjustment;
        if (factionAdjustment?.factionId && factionAdjustment?.newAttitude) {
          const { factionService } = await import('../../services/factions');
          await factionService.adjustAttitude(
            factionAdjustment.factionId,
            factionAdjustment.steps
          );
        }
      }
    }

    // TODO: Track personality choice (Phase 4)
    // await personalityTracker.recordChoice(approach, personality);

    return { success: true };
  },

  traits: ["dangerous", "ongoing"],
};
