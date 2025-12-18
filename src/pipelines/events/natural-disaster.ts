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
import { AdjustFactionHandler } from '../../services/gameCommands/handlers/AdjustFactionHandler';
import { ApplyArmyConditionHandler } from '../../services/gameCommands/handlers/ApplyArmyConditionHandler';
import { valueBadge, diceBadge, genericStructureDamaged, genericStructureDestroyed, genericWorksiteDestroyed, genericArmyConditionNegative } from '../../types/OutcomeBadge';

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
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')
          ],
          success: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d4', 'positive')
          ],
          failure: [
            genericStructureDamaged(1),
            genericWorksiteDestroyed(1)
          ],
          criticalFailure: [
            genericStructureDestroyed(1),
            genericWorksiteDestroyed(1)
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
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d2', 'positive')
          ],
          failure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d2', 'negative'),
            genericArmyConditionNegative('Enfeebled')
          ],
          criticalFailure: [
            genericStructureDamaged(1),
            genericArmyConditionNegative('Enfeebled')
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

      const commandContext: GameCommandContext = {
        actionId: 'natural-disaster',
        outcome: ctx.outcome,
        kingdom: ctx.kingdom,
        metadata: ctx.metadata || {}
      };

      if (approach === 'virtuous') {
        // Prioritize Lives (Virtuous)
        if (outcome === 'criticalSuccess') {
          // Faction adjustment
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: 1, count: 1 },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFaction = factionCommand;
            if (factionCommand.outcomeBadges) {
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
            }
          }
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
          // Well Trained bonus
          const armyHandler = new ApplyArmyConditionHandler();
          const armyCmd = await armyHandler.prepare(
            { type: 'applyArmyCondition', condition: 'well-trained', value: 1, armyId: 'random' },
            commandContext
          );
          if (armyCmd) {
            ctx.metadata._preparedArmyConditionWellTrained = armyCmd;
            if (armyCmd.outcomeBadges) {
              outcomeBadges.push(...armyCmd.outcomeBadges);
            }
          }
        } else if (outcome === 'success') {
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
          // 1 army gains enfeebled
          const armyHandler = new ApplyArmyConditionHandler();
          const armyCmd = await armyHandler.prepare(
            { type: 'applyArmyCondition', condition: 'enfeebled', value: 1, armyId: 'random' },
            commandContext
          );
          if (armyCmd) {
            ctx.metadata._preparedArmyCondition = armyCmd;
            // Remove static badge and add dynamic one
            const filtered = outcomeBadges.filter(b => !b.template?.includes('army gains enfeebled'));
            outcomeBadges.length = 0;
            outcomeBadges.push(...filtered, ...(armyCmd.outcomeBadges || []));
          }
        } else if (outcome === 'criticalFailure') {
          // Damage 1 structure
          const { DamageStructureHandler } = await import('../../services/gameCommands/handlers/DamageStructureHandler');
          const handler = new DamageStructureHandler();
          const cmd = await handler.prepare({ type: 'damageStructure', count: 1 }, commandContext);
          if (cmd) {
            ctx.metadata._preparedDamageStructure = cmd;
            if (cmd.outcomeBadges) outcomeBadges.push(...cmd.outcomeBadges);
            else if (cmd.outcomeBadge) outcomeBadges.push(cmd.outcomeBadge);
          }
          // 1 army gains enfeebled
          const armyHandler = new ApplyArmyConditionHandler();
          const armyCmd = await armyHandler.prepare(
            { type: 'applyArmyCondition', condition: 'enfeebled', value: 1, armyId: 'random' },
            commandContext
          );
          if (armyCmd) {
            ctx.metadata._preparedArmyCondition = armyCmd;
            // Remove static badge and add dynamic one
            const filtered = outcomeBadges.filter(b => !b.template?.includes('army gains enfeebled'));
            outcomeBadges.length = 0;
            outcomeBadges.push(...filtered, ...(armyCmd.outcomeBadges || []));
          }
        }
      }

      return { resources: [], outcomeBadges };
    }
  },

  execute: async (ctx) => {
    // NOTE: Standard modifiers (unrest, fame, lumber, etc.) are applied automatically by
    // ResolutionDataBuilder + GameCommandsService via outcomeBadges.
    // This execute() only handles special game commands.

    // Execute faction adjustment
    const factionCommand = ctx.metadata?._preparedFaction;
    if (factionCommand?.commit) {
      await factionCommand.commit();
    }

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

    // Execute army condition - Well Trained (ruthless CS)
    const armyWellTrained = ctx.metadata?._preparedArmyConditionWellTrained;
    if (armyWellTrained?.commit) {
      await armyWellTrained.commit();
    }

    // Execute army condition - Enfeebled (ruthless failure/critical failure)
    const armyCommand = ctx.metadata?._preparedArmyCondition;
    if (armyCommand?.commit) {
      await armyCommand.commit();
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
