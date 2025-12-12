/**
 * Monster Attack Event Pipeline (CHOICE-BASED)
 *
 * A dangerous creature threatens the kingdom's territory.
 *
 * Approaches:
 * - Relocate Peacefully (Virtuous) - Try to resolve without violence
 * - Hire Hunters (Practical) - Professional solution
 * - Mobilize Army (Ruthless) - Use overwhelming force
 *
 * Based on EVENT_MIGRATION_STATUS.md specifications
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { DamageStructureHandler } from '../../services/gameCommands/handlers/DamageStructureHandler';
import { valueBadge, diceBadge } from '../../types/OutcomeBadge';
import { updateKingdom } from '../../stores/KingdomStore';

export const monsterAttackPipeline: CheckPipeline = {
  id: 'monster-attack',
  name: 'Monster Attack',
  description: 'A dangerous creature threatens the kingdom\'s territory.',
  checkType: 'event',
  tier: 1,

  // Base skills (filtered by choice)
  skills: [
    { skill: 'nature', description: 'understand creature behavior' },
    { skill: 'diplomacy', description: 'negotiate peacefully' },
    { skill: 'intrigue', description: 'coordinate with hunters' },
    { skill: 'warfare', description: 'mobilize military forces' }
  ],

  // Strategic choice - triggers voting system
  // Options ordered: Virtuous (left) → Practical (center) → Ruthless (right)
  strategicChoice: {
    label: 'How will you deal with the monster threat?',
    required: true,
    options: [
      {
        id: 'virtuous',
        label: 'Relocate Peacefully',
        description: 'Try to relocate the creature without violence',
        icon: 'fas fa-dove',
        skills: ['nature', 'diplomacy'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'The creature peacefully moves away, nature thrives.',
          success: 'The creature is relocated without incident.',
          failure: 'Relocation attempts fail, the creature remains.',
          criticalFailure: 'The creature attacks during relocation attempts.'
        },
        outcomeBadges: {
          criticalSuccess: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive'),
            diceBadge('Gain {{value}} Food', 'fas fa-drumstick-bite', '1d4', 'positive')
          ],
          success: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1', 'positive')
          ],
          failure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1', 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ],
          criticalFailure: [] // Damage structure + unrest handled by preview.calculate
        }
      },
      {
        id: 'practical',
        label: 'Hire Hunters',
        description: 'Hire professional hunters to deal with the threat',
        icon: 'fas fa-crosshairs',
        skills: ['intrigue', 'warfare'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Hunters defeat the beast, its parts bring profit.',
          success: 'The monster is slain and its parts sold.',
          failure: 'Hunters fail, costs mount.',
          criticalFailure: 'Hunters fail catastrophically, beast damages property.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d3', 'positive')
          ],
          success: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1', 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ],
          criticalFailure: [] // Damage structure + gold/unrest handled by preview.calculate
        }
      },
      {
        id: 'ruthless',
        label: 'Mobilize Army',
        description: 'Use military force to destroy the creature',
        icon: 'fas fa-shield-alt',
        skills: ['warfare', 'intrigue'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Army destroys the beast, soldiers gain experience.',
          success: 'Military force eliminates the threat efficiently.',
          failure: 'Army struggles, beast damages infrastructure.',
          criticalFailure: 'Military operation fails, army suffers casualties.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d3', 'positive')
          ],
          success: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1', 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ],
          criticalFailure: [] // Army enfeebled + gold/unrest handled by execute
        }
      }
    ]
  },

  preview: {
    calculate: async (ctx) => {
      const { get } = await import('svelte/store');
      const { kingdomData } = await import('../../stores/KingdomStore');
      const kingdom = get(kingdomData);
      const approach = kingdom.turnState?.eventsPhase?.selectedApproach;
      const outcome = ctx.outcome;

      const outcomeBadges = [];
      const commandContext: GameCommandContext = { currentKingdom: kingdom };

      // Handle structure damage for failure outcomes
      if (approach === 'virtuous' && outcome === 'criticalFailure') {
        // +1d3 Unrest, damage 1 structure
        outcomeBadges.push(diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'));
        
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
      } else if (approach === 'practical' && outcome === 'criticalFailure') {
        // +1d3 Unrest, -2d3 Gold, damage 1 structure
        outcomeBadges.push(
          diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
          diceBadge('Lose {{value}} Gold', 'fas fa-coins', '2d3', 'negative')
        );
        
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
      } else if (approach === 'ruthless' && outcome === 'failure') {
        // +1 Unrest, -1d3 Gold, damage 1 structure
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
      } else if (approach === 'ruthless' && outcome === 'criticalFailure') {
        // +1d3 Unrest, -2d3 Gold, 1 army gains enfeebled
        outcomeBadges.push(
          diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
          diceBadge('Lose {{value}} Gold', 'fas fa-coins', '2d3', 'negative')
        );
        // Army condition handled in execute
      } else if (approach === 'ruthless' && outcome === 'criticalSuccess') {
        // Army equipment upgrade handled in execute (text badge only)
      }

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

    // Execute structure damage
    const damageCommand = ctx.metadata?._preparedDamage;
    if (damageCommand?.commit) {
      await damageCommand.commit();
    }

    // Handle army effects for ruthless approach
    if (approach === 'ruthless') {
      if (outcome === 'criticalSuccess') {
        // 1 army gains random equipment upgrade
        await updateKingdom(k => {
          if (!k.armies || k.armies.length === 0) return;
          
          const randomArmy = k.armies[Math.floor(Math.random() * k.armies.length)];
          if (randomArmy) {
            // Note: Equipment upgrade would be handled by separate equipment system
            // For now, just log it (in actual game, would trigger Outfit Army flow)
            console.log(`Army ${randomArmy.name} should receive random equipment upgrade`);
          }
        });
      } else if (outcome === 'criticalFailure') {
        // 1 army gains enfeebled
        if (kingdom.armies && kingdom.armies.length > 0) {
          const randomArmy = kingdom.armies[Math.floor(Math.random() * kingdom.armies.length)];
          if (randomArmy?.actorId) {
            const { applyArmyConditionExecution } = await import('../../execution/armies/applyArmyCondition');
            await applyArmyConditionExecution(randomArmy.actorId, 'enfeebled', 1);
          }
        }
      }
    }

    return { success: true };
  },

  traits: ["dangerous"],
};
