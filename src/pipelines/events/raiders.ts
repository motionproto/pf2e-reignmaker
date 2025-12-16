/**
 * Raiders Event Pipeline (CHOICE-BASED)
 *
 * Armed raiders threaten settlements and trade routes.
 *
 * Approaches:
 * - Negotiate Peace Treaty (Virtuous) - Diplomacy and trade
 * - Fortify Borders (Practical) - Defense and preparation
 * - Preemptive Strike (Ruthless) - Military assault
 *
 * Based on EVENT_MIGRATION_STATUS.md specifications
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { DestroyWorksiteHandler } from '../../services/gameCommands/handlers/DestroyWorksiteHandler';
import { valueBadge, diceBadge, textBadge } from '../../types/OutcomeBadge';

export const raidersPipeline: CheckPipeline = {
  id: 'raiders',
  name: 'Raiders',
  description: 'Armed raiders threaten settlements and trade routes.',
  checkType: 'event',
  tier: 1,

  // Strategic choice - triggers voting system
  // Options ordered: Virtuous (left) → Practical (center) → Ruthless (right)
  strategicChoice: {
    label: 'How will you respond to raiders?',
    required: true,
    options: [
      {
        id: 'virtuous',
        label: 'Defend & Protect',
        description: 'Seek peaceful resolution through diplomacy',
        icon: 'fas fa-dove',
        skills: ['diplomacy', 'society', 'applicable lore'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Peace treaty establishes profitable trade.',
          success: 'Raiders agree to peace and offer modest trade goods.',
          failure: 'Failed negotiations cost gifts and goodwill.',
          criticalFailure: 'Raiders demand tribute to leave peacefully.'
        },
        outcomeBadges: {
          criticalSuccess: [
            textBadge('Adjust 1 faction +1', 'fas fa-users', 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d4', 'positive')
          ],
          success: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative')
          ],
          criticalFailure: [
            textBadge('Adjust 1 faction -1', 'fas fa-users-slash', 'negative'),
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d4', 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Strategic Defense',
        description: 'Prepare defenses and protect territory',
        icon: 'fas fa-fort-awesome',
        skills: ['intimidation', 'stealth', 'applicable lore'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Defenses repel raiders. Salvaged materials bolster fortifications.',
          success: 'Fortifications hold and raiders retreat.',
          failure: 'Raiders damage a fortification or worksite.',
          criticalFailure: 'Raiders destroy a fortification or worksite.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive'),
            diceBadge('Gain {{value}} random resource', 'fas fa-box', '1d3', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive'),
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')
          ],
          failure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ],
          criticalFailure: [
            textBadge('1 structure damaged', 'fas fa-house-crack', 'negative'),
            valueBadge('Lose {{value}} Gold', 'fas fa-coins', 1, 'negative'),
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Counter-raid',
        description: 'Launch military assault on raider camps',
        icon: 'fas fa-fire',
        skills: ['intimidation', 'stealth', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Devastating victory. Plunder seized and army gains battle experience.',
          success: 'Raiders defeated and plunder recovered.',
          failure: 'Costly assault drains resources.',
          criticalFailure: 'Failed assault exhausts army and damages reputation.'
        },
        outcomeBadges: {
          criticalSuccess: [
            textBadge('Claim 1 hex', 'fas fa-map', 'positive'),
            diceBadge('Imprison {{value}} dissidents', 'fas fa-user-lock', '1d3', 'positive'),
            valueBadge('Gain {{value}} Gold', 'fas fa-coins', 1, 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive'),
            diceBadge('Imprison {{value}} dissidents', 'fas fa-user-lock', '1d3', 'positive')
          ],
          failure: [
            textBadge('Random army becomes Fatigued', 'fas fa-tired', 'negative'),
            valueBadge('Lose {{value}} Food', 'fas fa-drumstick-bite', 1, 'negative')
          ],
          criticalFailure: [
            textBadge('Random army becomes Enfeebled', 'fas fa-exclamation-triangle', 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative'),
            valueBadge('Lose {{value}} Food', 'fas fa-drumstick-bite', 1, 'negative')
          ]
        }
      }
    ]
  },

  skills: [
    { skill: 'diplomacy', description: 'negotiate peace' },
    { skill: 'society', description: 'establish trade' },
    { skill: 'intimidation', description: 'military response' },
    { skill: 'stealth', description: 'track to base' },
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
      const selectedOption = raidersPipeline.strategicChoice?.options.find(opt => opt.id === approach);

      // Get outcome badges from the selected approach
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      const commandContext: GameCommandContext = {
        actionId: 'raiders',
        outcome: ctx.outcome,
        kingdom: ctx.kingdom,
        metadata: ctx.metadata || {}
      };

      const PLAYER_KINGDOM = 'player';

      if (approach === 'virtuous') {
        // Negotiate Peace Treaty (Virtuous)
        // All outcomes handled by standard badges
      } else if (approach === 'practical') {
        // Fortify Borders (Practical)
        if (outcome === 'failure') {
          // +1 Unrest, -1d3 Gold, damage 1 fortification or worksite
          // For simplicity, damage a worksite (fortifications are structures)
          const damageHandler = new DestroyWorksiteHandler();
          const damageCommand = await damageHandler.prepare(
            { type: 'destroyWorksite', count: 1 },
            commandContext
          );
          if (damageCommand) {
            ctx.metadata._preparedDamageWorksite = damageCommand;
            if (damageCommand.metadata) {
              Object.assign(ctx.metadata, damageCommand.metadata);
            }
            // Don't add badge - just mark as damaged (not destroyed)
            // Actually, let's use DamageStructureHandler for proper fortifications
          }
        } else if (outcome === 'criticalFailure') {
          // +1d3 Unrest, -1d3 Gold, destroy 1 fortification or worksite
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
        }
      } else if (approach === 'ruthless') {
        // Preemptive Strike (Ruthless)
        // Handle army conditions - select specific army and update badge
        if (outcome === 'failure' || outcome === 'criticalFailure') {
          const playerArmies = kingdom.armies?.filter((a: any) => a.ledBy === PLAYER_KINGDOM && a.actorId) || [];
          if (playerArmies.length > 0) {
            const randomArmy = playerArmies[Math.floor(Math.random() * playerArmies.length)];
            
            if (outcome === 'failure') {
              // Fatigued
              ctx.metadata._armyCondition = { actorId: randomArmy.actorId, condition: 'fatigued', value: 1 };
              const armyBadgeIndex = outcomeBadges.findIndex(b => b.template?.includes('army becomes Fatigued'));
              if (armyBadgeIndex >= 0) {
                outcomeBadges[armyBadgeIndex] = textBadge(
                  `${randomArmy.name} becomes Fatigued`,
                  'fas fa-tired',
                  'negative'
                );
              }
            } else {
              // Critical Failure - Enfeebled
              ctx.metadata._armyCondition = { actorId: randomArmy.actorId, condition: 'enfeebled', value: 1 };
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
      }

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

    // Execute worksite destruction (practical CF)
    const destroyCommand = ctx.metadata?._preparedDestroyWorksite;
    if (destroyCommand?.commit) {
      await destroyCommand.commit();
    }

    // Apply army condition (selected in preview.calculate)
    const armyCondition = ctx.metadata?._armyCondition;
    if (armyCondition?.actorId) {
      const { applyArmyConditionExecution } = await import('../../execution/armies/applyArmyCondition');
      await applyArmyConditionExecution(armyCondition.actorId, armyCondition.condition, armyCondition.value);
    }

    return { success: true };
  },

  // Post-apply interaction to show destroyed worksites on map
  postApplyInteractions: [
    DestroyWorksiteHandler.getMapDisplayInteraction('Worksite Destroyed by Raiders')
  ],

  traits: ["dangerous", "ongoing"],
};
