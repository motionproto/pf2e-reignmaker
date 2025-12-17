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
import { PLAYER_KINGDOM } from '../../types/ownership';

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
        id: 'virtuous',
        label: 'Rescue & Relief',
        description: 'Save people over property at any cost',
        icon: 'fas fa-people-roof',
        skills: ['survival', 'medicine', 'athletics', 'applicable lore'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Heroic rescues save every soul; grateful survivors rebuild together.',
          success: 'Compassionate evacuation spares lives; survivors mourn lost homes, not loved ones.',
          failure: 'Noble focus on people leaves assets unguarded; ruins mark your priorities.',
          criticalFailure: 'Chaos overwhelms good intentions; crumbling structures bury hopes and dreams.'
        },
        outcomeBadges: {
          criticalSuccess: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive'),
            textBadge('Adjust 1 faction +1', 'fas fa-users', 'positive'),
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')
          ],
          success: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d4', 'positive')
          ],
          failure: [
            textBadge('Lose 1 worksite', 'fas fa-industry', 'negative')
          ],
          criticalFailure: [
            textBadge('1 structure damaged', 'fas fa-house-crack', 'negative'),
            textBadge('Lose 1 worksite', 'fas fa-industry', 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Protect Infrastructure',
        description: 'Balanced evacuation and damage control',
        icon: 'fas fa-scale-balanced',
        skills: ['society', 'crafting', 'survival', 'applicable lore'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Methodical coordination saves lives and salvages valuable resources.',
          success: 'Balanced triage protects most critical assets; measured approach succeeds.',
          failure: 'Divided efforts achieve neither goal; disaster claims buildings and morale.',
          criticalFailure: 'Indecision paralyzes response; catastrophe consumes all while leaders deliberate.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d4', 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d4', 'positive')
          ],
          success: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d2', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          failure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
            diceBadge('Lose {{value}} Food', 'fas fa-drumstick-bite', '1d3', 'negative'),
            valueBadge('Lose {{value}} Gold', 'fas fa-coins', 1, 'negative')
          ],
          criticalFailure: [
            diceBadge('Lose {{value}} Food', 'fas fa-drumstick-bite', '1d3', 'negative'),
            diceBadge('Lose {{value}} Lumber', 'fas fa-tree', '1d3', 'negative'),
            diceBadge('Lose {{value}} Ore', 'fas fa-gem', '1d3', 'negative'),
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Martial Law',
        description: 'Deploy troops to protect valuable structures',
        icon: 'fas fa-building-shield',
        skills: ['intimidation', 'survival', 'thievery', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Ruthless troops salvage materials from ruins; cold efficiency earns harsh discipline.',
          success: 'Soldiers guard property over people; saved buildings stand as monuments to greed.',
          failure: 'Callous priorities exhaust troops guarding doomed structures; shame follows.',
          criticalFailure: 'Brutal orders break morale; soldiers watch helplessly as everything burns anyway.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d2', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive'),
            textBadge('Random army becomes Well Trained (+1 saves)', 'fas fa-star', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d2', 'positive')
          ],
          failure: [
            textBadge('Random army becomes Enfeebled', 'fas fa-exclamation-triangle', 'negative')
          ],
          criticalFailure: [
            textBadge('1 structure damaged', 'fas fa-house-crack', 'negative'),
            textBadge('Random army becomes Enfeebled', 'fas fa-exclamation-triangle', 'negative')
          ]
        }
      }
    ]
  },

  skills: [
    { skill: 'survival', description: 'evacuation and rescue' },
    { skill: 'athletics', description: 'rescue operations' },
    { skill: 'crafting', description: 'emergency shelters' },
    { skill: 'society', description: 'coordinate relief' },
    { skill: 'medicine', description: 'treat the injured' },
    { skill: 'intimidation', description: 'enforce evacuation' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your priorities prove wise in the crisis.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    success: {
      description: 'The disaster is managed according to your priorities.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    failure: {
      description: 'The disaster causes significant damage.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'Your approach leads to catastrophic losses.',
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

      if (approach === 'virtuous') {
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
      } else if (approach === 'practical') {
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
      } else if (approach === 'ruthless') {
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
          // 1 army gains enfeebled - select random player army
          const playerArmies = kingdom.armies?.filter((a: any) => a.ledBy === PLAYER_KINGDOM && a.actorId) || [];
          if (playerArmies.length > 0) {
            const randomArmy = playerArmies[Math.floor(Math.random() * playerArmies.length)];
            ctx.metadata._armyCondition = { actorId: randomArmy.actorId, condition: 'enfeebled', value: 1 };
            // Update badge with army name
            const armyBadgeIndex = outcomeBadges.findIndex(b => b.template?.includes('army gains enfeebled'));
            if (armyBadgeIndex >= 0) {
              outcomeBadges[armyBadgeIndex] = textBadge(`${randomArmy.name} gains enfeebled`, 'fas fa-person-falling', 'negative');
            }
          }
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
          // 1 army gains enfeebled - select random player army
          const playerArmies = kingdom.armies?.filter((a: any) => a.ledBy === PLAYER_KINGDOM && a.actorId) || [];
          if (playerArmies.length > 0) {
            const randomArmy = playerArmies[Math.floor(Math.random() * playerArmies.length)];
            ctx.metadata._armyCondition = { actorId: randomArmy.actorId, condition: 'enfeebled', value: 1 };
            // Update badge with army name
            const armyBadgeIndex = outcomeBadges.findIndex(b => b.template?.includes('army gains enfeebled'));
            if (armyBadgeIndex >= 0) {
              outcomeBadges[armyBadgeIndex] = textBadge(`${randomArmy.name} gains enfeebled`, 'fas fa-person-falling', 'negative');
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

    // Execute army condition (Save Assets failure/critical failure)
    const armyCondition = ctx.metadata?._armyCondition;
    if (armyCondition?.actorId) {
      const { applyArmyConditionExecution } = await import('../../execution/armies/applyArmyCondition');
      await applyArmyConditionExecution(armyCondition.actorId, armyCondition.condition, armyCondition.value);
    }

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
