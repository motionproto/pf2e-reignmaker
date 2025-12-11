/**
 * Natural Disaster Event Pipeline (CHOICE-BASED)
 *
 * Earthquake, tornado, wildfire, or severe flooding strikes the kingdom.
 * This is a crisis where all choices involve some damage - the question is priorities.
 *
 * Approaches:
 * - Prioritize Lives (V) - Save people over property
 * - Balanced Response (P) - Balanced evacuation and damage control
 * - Save Assets (R) - Deploy troops to protect valuable structures
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { valueBadge, textBadge, diceBadge } from '../../types/OutcomeBadge';

export const naturalDisasterPipeline: CheckPipeline = {
  id: 'natural-disaster',
  name: 'Natural Disaster',
  description: 'Earthquake, tornado, wildfire, or severe flooding strikes the kingdom.',
  checkType: 'event',
  tier: 1,

  // Strategic choice - triggers voting system
  // Options ordered: Virtuous (left) → Practical (center) → Ruthless (right)
  strategicChoice: {
    label: 'How will you respond to the disaster?',
    required: true,
    options: [
      {
        id: 'prioritize-lives',
        label: 'Prioritize Lives',
        description: 'Save people over property at any cost',
        icon: 'fas fa-people-roof',
        skills: ['survival', 'medicine'],
        personality: { virtuous: 3 },
        outcomeBadges: {
          criticalSuccess: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive'),
            textBadge('1 structure damaged', 'fas fa-house-crack', 'negative')
          ],
          success: [
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive'),
            textBadge('1 structure damaged', 'fas fa-house-crack', 'negative')
          ],
          failure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
            textBadge('1 structure damaged', 'fas fa-house-crack', 'negative'),
            textBadge('1 worksite destroyed', 'fas fa-industry', 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
            textBadge('1 structure destroyed', 'fas fa-house-fire', 'negative'),
            textBadge('1 worksite destroyed', 'fas fa-industry', 'negative')
          ]
        }
      },
      {
        id: 'balanced',
        label: 'Balanced Response',
        description: 'Balanced evacuation and damage control',
        icon: 'fas fa-scale-balanced',
        skills: ['society', 'crafting'],
        personality: { practical: 3 },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive'),
            textBadge('1 structure damaged', 'fas fa-house-crack', 'negative')
          ],
          success: [
            textBadge('1 structure damaged', 'fas fa-house-crack', 'negative')
          ],
          failure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
            textBadge('1 structure damaged', 'fas fa-house-crack', 'negative'),
            textBadge('1 worksite destroyed', 'fas fa-industry', 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
            textBadge('2 structures damaged', 'fas fa-house-crack', 'negative')
          ]
        }
      },
      {
        id: 'save-assets',
        label: 'Save Assets',
        description: 'Deploy troops to protect valuable structures',
        icon: 'fas fa-building-shield',
        skills: ['warfare', 'intimidation'],
        personality: { ruthless: 3 },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Lumber/Stone/Ore (salvaged)', 'fas fa-boxes-stacked', '2d4', 'positive'),
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ],
          success: [
            textBadge('1 structure damaged', 'fas fa-house-crack', 'negative'),
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ],
          failure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative'),
            textBadge('1 army gains enfeebled', 'fas fa-person-falling', 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative'),
            textBadge('1 structure damaged', 'fas fa-house-crack', 'negative'),
            textBadge('1 army gains enfeebled', 'fas fa-person-falling', 'negative')
          ]
        }
      }
    ]
  },

  skills: [
    { skill: 'survival', description: 'evacuation and rescue' },
    { skill: 'crafting', description: 'emergency shelters' },
    { skill: 'society', description: 'coordinate relief' },
    { skill: 'medicine', description: 'treat the injured' },
    { skill: 'warfare', description: 'deploy troops' },
    { skill: 'intimidation', description: 'enforce evacuation' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'The disaster is handled with minimal casualties.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    success: {
      description: 'The disaster is managed effectively.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    failure: {
      description: 'Major damage occurs despite your efforts.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'The disaster causes devastating losses.',
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
      const selectedOption = naturalDisasterPipeline.strategicChoice?.options.find(opt => opt.id === approach);

      // Get outcome badges from the selected approach
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      // Calculate modifiers and prepare game commands based on approach
      let modifiers: any[] = [];
      const commandContext: GameCommandContext = {
        actionId: 'natural-disaster',
        outcome: ctx.outcome,
        kingdom: ctx.kingdom,
        metadata: ctx.metadata || {}
      };

      if (approach === 'prioritize-lives') {
        // Prioritize Lives (Virtuous)
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'static', resource: 'fame', value: 1, duration: 'immediate' },
            { type: 'dice', resource: 'unrest', formula: '1d3', negative: true, duration: 'immediate' }
          ];
          // Damage 1 structure
          const { DamageStructureHandler } = await import('../../services/gameCommands/handlers/DamageStructureHandler');
          const handler = new DamageStructureHandler();
          const cmd = await handler.prepare({ type: 'damageStructure', count: 1 }, commandContext);
          if (cmd) {
            ctx.metadata._preparedDamageStructure = cmd;
            if (cmd.outcomeBadges) outcomeBadges.push(...cmd.outcomeBadges);
            else if (cmd.outcomeBadge) outcomeBadges.push(cmd.outcomeBadge);
          }
        } else if (outcome === 'success') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
          ];
          // Damage 1 structure
          const { DamageStructureHandler } = await import('../../services/gameCommands/handlers/DamageStructureHandler');
          const handler = new DamageStructureHandler();
          const cmd = await handler.prepare({ type: 'damageStructure', count: 1 }, commandContext);
          if (cmd) {
            ctx.metadata._preparedDamageStructure = cmd;
            if (cmd.outcomeBadges) outcomeBadges.push(...cmd.outcomeBadges);
            else if (cmd.outcomeBadge) outcomeBadges.push(cmd.outcomeBadge);
          }
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
          ];
          // Damage 1 structure and destroy 1 worksite
          const { DamageStructureHandler } = await import('../../services/gameCommands/handlers/DamageStructureHandler');
          const damageHandler = new DamageStructureHandler();
          const damageCmd = await damageHandler.prepare({ type: 'damageStructure', count: 1 }, commandContext);
          if (damageCmd) {
            ctx.metadata._preparedDamageStructure = damageCmd;
            if (damageCmd.outcomeBadges) outcomeBadges.push(...damageCmd.outcomeBadges);
            else if (damageCmd.outcomeBadge) outcomeBadges.push(damageCmd.outcomeBadge);
          }
          const { DestroyWorksiteHandler } = await import('../../services/gameCommands/handlers/DestroyWorksiteHandler');
          const worksiteHandler = new DestroyWorksiteHandler();
          const worksiteCmd = await worksiteHandler.prepare({ type: 'destroyWorksite', count: 1 }, commandContext);
          if (worksiteCmd) {
            ctx.metadata._preparedDestroyWorksite = worksiteCmd;
            if (worksiteCmd.outcomeBadges) outcomeBadges.push(...worksiteCmd.outcomeBadges);
            else if (worksiteCmd.outcomeBadge) outcomeBadges.push(worksiteCmd.outcomeBadge);
          }
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '1d3', duration: 'immediate' }
          ];
          // Destroy 1 structure and 1 worksite
          const { DestroyStructureHandler } = await import('../../services/gameCommands/handlers/DestroyStructureHandler');
          const destroyHandler = new DestroyStructureHandler();
          const destroyCmd = await destroyHandler.prepare({ type: 'destroyStructure', count: 1 }, commandContext);
          if (destroyCmd) {
            ctx.metadata._preparedDestroyStructure = destroyCmd;
            if (destroyCmd.outcomeBadges) outcomeBadges.push(...destroyCmd.outcomeBadges);
            else if (destroyCmd.outcomeBadge) outcomeBadges.push(destroyCmd.outcomeBadge);
          }
          const { DestroyWorksiteHandler } = await import('../../services/gameCommands/handlers/DestroyWorksiteHandler');
          const worksiteHandler = new DestroyWorksiteHandler();
          const worksiteCmd = await worksiteHandler.prepare({ type: 'destroyWorksite', count: 1 }, commandContext);
          if (worksiteCmd) {
            ctx.metadata._preparedDestroyWorksite = worksiteCmd;
            if (worksiteCmd.outcomeBadges) outcomeBadges.push(...worksiteCmd.outcomeBadges);
            else if (worksiteCmd.outcomeBadge) outcomeBadges.push(worksiteCmd.outcomeBadge);
          }
        }
      } else if (approach === 'balanced') {
        // Balanced Response (Practical)
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '1d3', negative: true, duration: 'immediate' }
          ];
          // Damage 1 structure
          const { DamageStructureHandler } = await import('../../services/gameCommands/handlers/DamageStructureHandler');
          const handler = new DamageStructureHandler();
          const cmd = await handler.prepare({ type: 'damageStructure', count: 1 }, commandContext);
          if (cmd) {
            ctx.metadata._preparedDamageStructure = cmd;
            if (cmd.outcomeBadges) outcomeBadges.push(...cmd.outcomeBadges);
            else if (cmd.outcomeBadge) outcomeBadges.push(cmd.outcomeBadge);
          }
        } else if (outcome === 'success') {
          modifiers = [];
          // Damage 1 structure
          const { DamageStructureHandler } = await import('../../services/gameCommands/handlers/DamageStructureHandler');
          const handler = new DamageStructureHandler();
          const cmd = await handler.prepare({ type: 'damageStructure', count: 1 }, commandContext);
          if (cmd) {
            ctx.metadata._preparedDamageStructure = cmd;
            if (cmd.outcomeBadges) outcomeBadges.push(...cmd.outcomeBadges);
            else if (cmd.outcomeBadge) outcomeBadges.push(cmd.outcomeBadge);
          }
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
          ];
          // Damage 1 structure and destroy 1 worksite
          const { DamageStructureHandler } = await import('../../services/gameCommands/handlers/DamageStructureHandler');
          const damageHandler = new DamageStructureHandler();
          const damageCmd = await damageHandler.prepare({ type: 'damageStructure', count: 1 }, commandContext);
          if (damageCmd) {
            ctx.metadata._preparedDamageStructure = damageCmd;
            if (damageCmd.outcomeBadges) outcomeBadges.push(...damageCmd.outcomeBadges);
            else if (damageCmd.outcomeBadge) outcomeBadges.push(damageCmd.outcomeBadge);
          }
          const { DestroyWorksiteHandler } = await import('../../services/gameCommands/handlers/DestroyWorksiteHandler');
          const worksiteHandler = new DestroyWorksiteHandler();
          const worksiteCmd = await worksiteHandler.prepare({ type: 'destroyWorksite', count: 1 }, commandContext);
          if (worksiteCmd) {
            ctx.metadata._preparedDestroyWorksite = worksiteCmd;
            if (worksiteCmd.outcomeBadges) outcomeBadges.push(...worksiteCmd.outcomeBadges);
            else if (worksiteCmd.outcomeBadge) outcomeBadges.push(worksiteCmd.outcomeBadge);
          }
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '1d3', duration: 'immediate' }
          ];
          // Damage 2 structures
          const { DamageStructureHandler } = await import('../../services/gameCommands/handlers/DamageStructureHandler');
          const handler = new DamageStructureHandler();
          const cmd = await handler.prepare({ type: 'damageStructure', count: 2 }, commandContext);
          if (cmd) {
            ctx.metadata._preparedDamageStructure = cmd;
            if (cmd.outcomeBadges) outcomeBadges.push(...cmd.outcomeBadges);
            else if (cmd.outcomeBadge) outcomeBadges.push(cmd.outcomeBadge);
          }
        }
      } else if (approach === 'save-assets') {
        // Save Assets (Ruthless)
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
          ];
          // Gain 2d4 of choice resource (Lumber/Stone/Ore) - using choice modifier
          // For now, we'll use a dice roll for lumber as default
          modifiers.push({ type: 'dice', resource: 'lumber', formula: '2d4', duration: 'immediate' });
        } else if (outcome === 'success') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
          ];
          // Damage 1 structure
          const { DamageStructureHandler } = await import('../../services/gameCommands/handlers/DamageStructureHandler');
          const handler = new DamageStructureHandler();
          const cmd = await handler.prepare({ type: 'damageStructure', count: 1 }, commandContext);
          if (cmd) {
            ctx.metadata._preparedDamageStructure = cmd;
            if (cmd.outcomeBadges) outcomeBadges.push(...cmd.outcomeBadges);
            else if (cmd.outcomeBadge) outcomeBadges.push(cmd.outcomeBadge);
          }
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '1d3', duration: 'immediate' },
            { type: 'static', resource: 'fame', value: -1, duration: 'immediate' }
          ];
          // 1 army gains enfeebled - TODO: implement army condition handler
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '1d3', duration: 'immediate' },
            { type: 'static', resource: 'fame', value: -1, duration: 'immediate' }
          ];
          // Damage 1 structure
          const { DamageStructureHandler } = await import('../../services/gameCommands/handlers/DamageStructureHandler');
          const handler = new DamageStructureHandler();
          const cmd = await handler.prepare({ type: 'damageStructure', count: 1 }, commandContext);
          if (cmd) {
            ctx.metadata._preparedDamageStructure = cmd;
            if (cmd.outcomeBadges) outcomeBadges.push(...cmd.outcomeBadges);
            else if (cmd.outcomeBadge) outcomeBadges.push(cmd.outcomeBadge);
          }
          // 1 army gains enfeebled - TODO: implement army condition handler
        }
      }

      // Store modifiers in context for execute step
      ctx.metadata._outcomeModifiers = modifiers;

      return { resources: [], outcomeBadges };
    }
  },

  execute: async (ctx) => {
    // NOTE: Standard modifiers (unrest, fame, lumber, etc.) are applied automatically by
    // ResolutionDataBuilder + GameCommandsService via outcomeBadges.
    // This execute() only handles special game commands.

    // Execute game commands
    const damageCommand = ctx.metadata?._preparedDamageStructure;
    if (damageCommand?.commit) {
      await damageCommand.commit();
    }

    const destroyCommand = ctx.metadata?._preparedDestroyStructure;
    if (destroyCommand?.commit) {
      await destroyCommand.commit();
    }

    const worksiteCommand = ctx.metadata?._preparedDestroyWorksite;
    if (worksiteCommand?.commit) {
      await worksiteCommand.commit();
    }

    // TODO: Track personality choice (Phase 4)
    // await personalityTracker.recordChoice(approach, personality);

    return { success: true };
  },

  // Show destroyed worksites on map after applying result
  postApplyInteractions: [
    {
      ...(() => {
        // Inline import to avoid top-level await
        const getInteraction = async () => {
          const { DestroyWorksiteHandler } = await import('../../services/gameCommands/handlers/DestroyWorksiteHandler');
          return DestroyWorksiteHandler.getMapDisplayInteraction('Worksites Destroyed by Disaster');
        };
        // Return a placeholder that will be replaced at runtime
        return {
          type: 'map-selection' as const,
          id: 'affectedHexes',
          mode: 'display' as const,
          count: (ctx: any) => {
            const instance = ctx.kingdom?.pendingOutcomes?.find((i: any) => i.previewId === ctx.instanceId);
            return instance?.metadata?.destroyedHexIds?.length || 0;
          },
          colorType: 'destroyed' as const,
          title: 'Worksites Destroyed by Disaster',
          condition: (ctx: any) => {
            const instance = ctx.kingdom?.pendingOutcomes?.find((i: any) => i.previewId === ctx.instanceId);
            return (instance?.metadata?.destroyedHexIds?.length > 0) || (ctx.metadata?.destroyedHexIds?.length > 0);
          },
          existingHexes: (ctx: any) => {
            const instance = ctx.kingdom?.pendingOutcomes?.find((i: any) => i.previewId === ctx.instanceId);
            return instance?.metadata?.destroyedHexIds || [];
          },
          validateHex: () => ({ valid: false, message: 'Display only - showing affected hexes' }),
          allowToggle: false,
          getHexInfo: (hexId: string, ctx: any) => {
            const instance = ctx.kingdom?.pendingOutcomes?.find((i: any) => i.previewId === ctx.instanceId);
            const worksite = instance?.metadata?.destroyedWorksites?.find((w: any) => w.id === hexId);
            if (worksite) {
              return `<p style="color: #FF4444;"><strong>Destroyed:</strong> ${worksite.worksiteType}</p><p style="color: #999;">${worksite.name}</p>`;
            }
            return '<p style="color: #FF4444;"><strong>Worksite destroyed</strong></p>';
          }
        };
      })()
    }
  ],

  traits: ["dangerous"],
};
