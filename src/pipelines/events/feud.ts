/**
 * Feud Event Pipeline (CHOICE-BASED)
 *
 * Two prominent families are engaged in a bitter feud.
 * Players choose their approach, which determines available skills and outcome modifiers.
 * 
 * Approaches:
 * - Mediate Peacefully (Diplomacy/Society) - Peaceful resolution
 * - Force Compliance (Intimidation/Warfare) - Authoritarian approach
 * - Manipulate Outcome (Deception/Intrigue) - Cunning/political approach
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { DamageStructureHandler } from '../../services/gameCommands/handlers/DamageStructureHandler';
import { valueBadge, textBadge } from '../../types/OutcomeBadge';

export const feudPipeline: CheckPipeline = {
  id: 'feud',
  name: 'Feud',
  description: 'Two prominent families are engaged in a bitter feud that threatens to tear the community apart.',
  checkType: 'event',
  tier: 1,

  // Event strategic choice: How will you handle the feud?
  strategicChoice: {
    label: 'How will you handle the feud?',
    required: true,
    options: [
      {
        id: 'mediate',
        label: 'Mediate Peacefully',
        description: 'Use diplomacy to bring the families together',
        icon: 'fas fa-handshake',
        skills: ['diplomacy', 'society', 'religion'],
        personality: { virtuous: 2, practical: 1 }
      },
      {
        id: 'force',
        label: 'Force Compliance',
        description: 'Use authority and intimidation to end the conflict',
        icon: 'fas fa-fist-raised',
        skills: ['intimidation', 'performance', 'athletics'],
        personality: { ruthless: 3 }
      },
      {
        id: 'manipulate',
        label: 'Manipulate Outcome',
        description: 'Use deception to secretly resolve the feud',
        icon: 'fas fa-mask',
        skills: ['deception', 'stealth', 'thievery'],
        personality: { practical: 2, ruthless: 1 }
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
      description: 'The families become allies.',
      endsEvent: true,
      modifiers: [], // Modified by choice
      outcomeBadges: [] // Dynamically populated by EventsPhase
    },
    success: {
      description: 'The feud is resolved.',
      endsEvent: true,
      modifiers: [], // Modified by choice
      outcomeBadges: [] // Dynamically populated by EventsPhase
    },
    failure: {
      description: 'The feud escalates.',
      endsEvent: false,
      modifiers: [], // Modified by choice
      outcomeBadges: [] // Dynamically populated by EventsPhase
    },
    criticalFailure: {
      description: 'Violence erupts in the streets.',
      endsEvent: false,
      modifiers: [], // Modified by choice
      gameCommands: [], // Modified by choice (force approach adds structure damage)
      outcomeBadges: [] // Dynamically populated by EventsPhase
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
      const outcomeBadges: any[] = [];

      // Apply outcome-specific modifiers based on approach
      let modifiers: any[] = [];

      if (approach === 'mediate') {
        // Mediate Peacefully approach - Diplomatic resolution
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: -2, duration: 'immediate' },
            { type: 'static', resource: 'fame', value: 1, duration: 'immediate' }
          ];
          outcomeBadges.push(
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 2, 'positive'),
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive'),
            textBadge('The families become allies', 'fas fa-handshake', 'info')
          );
        } else if (outcome === 'success') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: -2, duration: 'immediate' },
            { type: 'static', resource: 'fame', value: 1, duration: 'immediate' }
          ];
          outcomeBadges.push(
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 2, 'positive'),
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive'),
            textBadge('Peace is restored', 'fas fa-handshake', 'info')
          );
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
          ];
          outcomeBadges.push(
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
            textBadge('Negotiations break down', 'fas fa-comments-slash', 'info')
          );
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
          ];
          outcomeBadges.push(
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
            textBadge('The feud escalates further', 'fas fa-fire', 'negative')
          );
        }
      } else if (approach === 'force') {
        // Force Compliance approach - Authoritarian resolution
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
          ];
          outcomeBadges.push(
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive'),
            textBadge('Both families submit to authority', 'fas fa-fist-raised', 'info')
          );
        } else if (outcome === 'success') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
          ];
          outcomeBadges.push(
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive'),
            textBadge('The families are forced to comply', 'fas fa-fist-raised', 'info')
          );
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
          ];
          outcomeBadges.push(
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 2, 'negative'),
            textBadge('Intimidation backfires', 'fas fa-angry', 'info')
          );
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
          ];
          outcomeBadges.push(
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 2, 'negative'),
            textBadge('Violence erupts in the streets', 'fas fa-fire', 'negative')
          );
          
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
      } else if (approach === 'manipulate') {
        // Manipulate Outcome approach - Cunning resolution
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: -2, duration: 'immediate' },
            { type: 'static', resource: 'fame', value: 1, duration: 'immediate' }
          ];
          outcomeBadges.push(
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 2, 'positive'),
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive'),
            textBadge('Masterful manipulation ends the feud', 'fas fa-mask', 'info')
          );
        } else if (outcome === 'success') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
          ];
          outcomeBadges.push(
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive'),
            textBadge('Secret machinations succeed', 'fas fa-mask', 'info')
          );
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
            { type: 'static', resource: 'fame', value: -1, duration: 'immediate' }
          ];
          outcomeBadges.push(
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative'),
            textBadge('Deception is discovered', 'fas fa-eye', 'info')
          );
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
            { type: 'static', resource: 'fame', value: -1, duration: 'immediate' }
          ];
          outcomeBadges.push(
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative'),
            textBadge('Manipulation exposed and condemned', 'fas fa-user-secret', 'negative')
          );
        }
      }

      // Store modifiers in context for execute step
      ctx.metadata._outcomeModifiers = modifiers;

      return { resources: [], outcomeBadges };
    }
  },

  // Execute the prepared commands
  execute: async (ctx) => {
    const approach = ctx.metadata?.approach;
    const outcome = ctx.outcome;

    // Apply modifiers calculated in preview
    const modifiers = ctx.metadata?._outcomeModifiers || [];
    if (modifiers.length > 0) {
      const { updateKingdom } = await import('../../stores/KingdomStore');
      await updateKingdom((kingdom) => {
        for (const mod of modifiers) {
          if (mod.resource === 'unrest') {
            kingdom.unrest = Math.max(0, kingdom.unrest + mod.value);
          } else if (mod.resource === 'fame') {
            kingdom.fame = Math.max(0, kingdom.fame + mod.value);
          }
        }
      });
    }

    // Execute structure damage for force + critical failure
    if (approach === 'force' && outcome === 'criticalFailure') {
      const damageCommand = ctx.metadata?._preparedDamageStructure;
      if (damageCommand?.commit) {
        await damageCommand.commit();
      }
    }

    // TODO: Track personality choice (Phase 4)
    // await personalityTracker.recordChoice(approach, personality);

    return { success: true };
  },

  traits: ["dangerous", "ongoing"],
};
