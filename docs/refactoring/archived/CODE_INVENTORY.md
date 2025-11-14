# Code Inventory - Unified Check Resolution System Migration

**Purpose:** Complete audit of existing files for migration planning

**Created:** 2025-11-14

---

## Controllers (src/controllers/actions/)

### Core Files
| File | Lines | Purpose | Migration Impact |
|------|-------|---------|------------------|
| `ActionExecutionHelpers.ts` | ~170 | Roll orchestration (consolidated) | Keep - UnifiedCheckHandler will use these |
| `ActionPhaseController.ts` | ~200 | Phase controller | Simplify to ~50 lines (delegation only) |
| `action-resolver.ts` | ~450 | Action execution & game commands | Replace with UnifiedCheckHandler |
| `action-loader.ts` | ~300 | Load actions from JSON | Keep - loads data for pipeline configs |
| `action-handlers-config.ts` | ~120 | Pre-roll dialog routing | Move logic to pipeline configs |
| `action-types.ts` | ~80 | Type definitions | Keep - adapt for CheckPipeline types |
| `CheckInstanceHelpers.ts` | ~180 | Check instance creation | Keep - UnifiedCheckHandler will use |
| `game-commands.ts` | ~50 | Game command type exports | Delete - replaced by execution functions |
| `implementations/index.ts` | ~100 | Custom action registry | Delete - replaced by pipeline configs |
| `shared-requirements.ts` | ~90 | Validation helpers | Keep - pipeline configs will use |

**Total:** ~1740 lines
**Migration:** ~800 lines to delete, ~400 lines to simplify, ~540 lines to keep

---

## Custom Actions (src/actions/)

### 23 Action Implementations Found

| Action | Has Custom Code? | Pre-Roll Dialog? | Post-Roll Component? | Game Commands? |
|--------|------------------|------------------|---------------------|----------------|
| arrest-dissidents | ✅ Yes | No | ✅ Allocation UI | arrestDissidents |
| build-roads | ✅ Yes | No | No (map is pre-roll) | buildRoads |
| build-structure | ✅ Yes | ✅ Yes | No | buildStructure |
| claim-hexes | ✅ Yes | No | No (map is pre-roll) | claimHexes |
| collect-stipend | No | No | No | giveActorGold |
| deploy-army | ✅ Yes | ✅ Yes | No | deployArmy |
| disband-army | ✅ Yes | ✅ Yes | No | disbandArmy |
| establish-diplomatic-relations | ✅ Yes | ✅ Yes | No | establishRelations |
| establish-settlement | ✅ Yes | No | ✅ Compound (name+map+entity) | foundSettlement |
| execute-or-pardon-prisoners | ✅ Yes | ✅ Yes | No | reduceImprisoned |
| fortify-hex | No | No | No (map is pre-roll) | fortifyHex |
| harvest-resources | No | No | ✅ Choice buttons | chooseAndGainResource |
| infiltration | ✅ Yes | ✅ Yes | No | infiltrate |
| outfit-army | ✅ Yes | ✅ Yes | ✅ Allocation UI | outfitArmy |
| purchase-resources | No | No | No | purchaseResources |
| recruit-unit | ✅ Yes | ✅ Yes | ✅ Compound (name+entity) | recruitArmy |
| repair-structure | ✅ Yes | ✅ Yes | ✅ Choice buttons (cost) | repairStructure |
| request-economic-aid | ✅ Yes | ✅ Yes | No | requestEconomicAid |
| request-military-aid | ✅ Yes | ✅ Yes | No | requestMilitaryAid |
| sell-surplus | No | No | No | sellSurplus |
| send-scouts | No | No | No | scoutTerritory |
| train-army | No | No | No | trainArmy |
| upgrade-settlement | ✅ Yes | ✅ Yes | No | upgradeSettlement |

**With Custom Code:** 15/23 (65%)
**With Pre-Roll Dialog:** 11/23 (48%)
**With Post-Roll Component:** 5/23 (22%)
**JSON-Only:** 8/23 (35%)

### Files by Action
- Each custom action: 1-3 files (~150-400 lines total)
  - `*Action.ts` - Custom resolution logic
  - `*Dialog.svelte` (optional) - Pre-roll dialog
  - `*Resolution.svelte` (optional) - Post-roll component
- Shared: `ActionHelpers.ts` (~350 lines)

**Total Custom Action Code:** ~1950 lines

---

## Game Commands (src/services/)

### GameCommandsResolver.ts
- **Location:** `src/services/GameCommandsResolver.ts`
- **Size:** ~800 lines
- **Status:** Exports `createGameCommandsResolver()` factory
- **Will be:** Replaced by simple execution functions

### Command Organization Files
| File | Purpose | Status |
|------|---------|--------|
| `GameCommandsResolver.ts` | Main resolver factory | Replace with execution functions |
| `GameCommandsService.ts` | Outcome application service | Keep - handles modifier application |
| `commands/armies/armyCommands.ts` | Army operations | Refactor - extract execution logic |
| `commands/factions/attitudeCommands.ts` | Faction attitude | Refactor - extract execution logic |
| `commands/structures/damageCommands.ts` | Structure damage/destruction | Refactor - extract execution logic |

**Commands in GameCommandsResolver (14 methods):**
1. recruitArmy (PreparedCommand) ✅ prepare/commit
2. disbandArmy (PreparedCommand) ✅ prepare/commit
3. foundSettlement (PreparedCommand) ✅ prepare/commit
4. giveActorGold (PreparedCommand) ✅ prepare/commit
5. reduceImprisoned (ResolveResult) ❌ immediate
6. trainArmy (PreparedCommand) ✅ prepare/commit
7. outfitArmy (mixed) ⚠️ prepare/commit but has dialogs
8. deployArmy (ResolveResult) ❌ immediate
9. releaseImprisoned (ResolveResult) ❌ immediate
10. destroyStructure (ResolveResult) ❌ immediate
11. damageStructure (ResolveResult) ❌ immediate
12. removeBorderHexes (ResolveResult) ❌ immediate
13. adjustFactionAttitude (PreparedCommand) ✅ prepare/commit
14. chooseAndGainResource (ResolveResult) ❌ immediate

**Command Files (imported by resolver):**
- `commands/armies/armyCommands.ts` - recruitArmy, disbandArmy, trainArmy
- `commands/settlements/foundSettlement.ts` - foundSettlement
- `commands/resources/playerRewards.ts` - giveActorGold, chooseAndGainResource
- `commands/unrest/imprisonedUnrest.ts` - reduceImprisoned, releaseImprisoned
- `commands/structures/damageCommands.ts` - destroyStructure, damageStructure
- `commands/territory/borderHexes.ts` - removeBorderHexes, getBorderHexes
- `commands/factions/attitudeCommands.ts` - adjustFactionAttitude
- `commands/combat/conditionHelpers.ts` - calculateRandomNearbyHex, applyConditionToActor

**Total Command Files:** ~1200 lines (resolver + imported commands)

---

## Action JSON Files (data/player-actions/)

### 26 Action Definitions (one per action)

All actions have base JSON file defining:
- Metadata (id, name, category)
- Skills
- DC calculations
- Effects (outcomes with modifiers)
- Game commands (if applicable)

**JSON-Only Actions (no custom code):**
1. collect-stipend
2. deal-with-unrest
3. fortify-hex
4. harvest-resources (has choice-dropdown)
5. purchase-resources
6. sell-surplus
7. send-scouts
8. train-army

**Total:** ~3000 lines (all 26 files)

---

## Services to Keep/Adapt

| Service | Location | Purpose | Migration Impact |
|---------|----------|---------|------------------|
| CheckInstanceService | `src/services/CheckInstanceService.ts` | Manage check instances | Keep - no changes |
| GameCommandsService | `src/services/GameCommandsService.ts` | Apply modifier outcomes | Keep - adapt for pipeline |
| OutcomeApplicationService | `src/services/resolution/OutcomeApplicationService.ts` | Apply resolutions | Keep - adapt for pipeline |
| ActionEffectsService | `src/services/ActionEffectsService.ts` | Complex state changes | Keep - called by execution functions |

---

## UI Components

### OutcomeDisplay Component
- **Location:** `src/view/kingdom/components/OutcomeDisplay/`
- **Size:** ~800 lines (main + subcomponents)
- **Status:** Keep - already handles preview display
- **Subcomponents:**
  - DiceRoller.svelte
  - StateChanges.svelte
  - ManualEffects.svelte
  - ChoiceSelector.svelte

### Phase Component
- **Location:** `src/view/kingdom/turnPhases/ActionsPhase.svelte`
- **Size:** ~950 lines (after refactoring from 1600+)
- **Status:** Simplify - remove custom action logic
- **Delegation:** To UnifiedCheckHandler

---

## Events & Incidents (for Phases 4-5)

### Events
- **Location:** `data/events/*.json`
- **Count:** 37 event files
- **Total:** ~4500 lines
- **Custom Code:** None (all JSON-defined)

### Incidents
- **Location:** `data/incidents/{minor,moderate,major}/*.json`
- **Count:** 30 incident files (8 minor, 10 moderate, 12 major)
- **Total:** ~3500 lines
- **Custom Code:** None (all JSON-defined)

### Event/Incident Controllers
- **EventPhaseController:** `src/controllers/EventPhaseController.ts` (~150 lines)
- **UnrestPhaseController:** `src/controllers/UnrestPhaseController.ts` (~180 lines)
- **Migration:** Simplify both to ~50 lines each

---

## Summary Statistics

### Current Codebase
- **Controllers:** ~1740 lines
- **Custom Actions:** ~1950 lines
- **Game Commands:** ~1200 lines
- **Action JSONs:** ~3000 lines
- **Event/Incident JSONs:** ~8000 lines
- **Phase Controllers:** ~530 lines (3 controllers)

**Total Affected:** ~16,420 lines

### Migration Impact
- **To Delete:** ~3150 lines
  - Custom action implementations: ~1950
  - GameCommandsResolver: ~800
  - action-resolver.ts: ~400
- **To Simplify:** ~1140 lines → ~450 lines
  - Controllers: 530 → ~150
  - action-handlers-config: 120 → ~30
  - Others: 490 → ~270
- **To Create:** ~2000 lines
  - UnifiedCheckHandler: ~400
  - Pipeline configs (26 actions): ~1300
  - Execution functions (25+): ~300

**Net Change:** -1150 lines (7% reduction in affected code)
**Real Benefit:** Elimination of duplication, consistent patterns, easier maintenance

---

## Files to Create

### Phase 1: Foundation
- `src/services/UnifiedCheckHandler.ts` (~400 lines)
- `src/types/CheckPipeline.ts` (~100 lines)
- `src/types/CheckContext.ts` (~50 lines)
- `src/types/PreviewData.ts` (~80 lines)
- `src/types/SpecialEffect.ts` (exists, may need updates)

### Phase 2: Execution Functions
- `src/execution/armies/recruitArmy.ts`
- `src/execution/armies/disbandArmy.ts`
- `src/execution/armies/trainArmy.ts`
- `src/execution/armies/outfitArmy.ts`
- `src/execution/armies/deployArmy.ts`
- `src/execution/settlements/foundSettlement.ts`
- `src/execution/resources/giveActorGold.ts`
- `src/execution/resources/chooseAndGainResource.ts`
- `src/execution/unrest/reduceImprisoned.ts`
- `src/execution/unrest/releaseImprisoned.ts`
- `src/execution/structures/destroyStructure.ts`
- `src/execution/structures/damageStructure.ts`
- `src/execution/territory/removeBorderHexes.ts`
- `src/execution/factions/adjustFactionAttitude.ts`
- Plus ~10 more for territory, diplomatic, etc.

**Total:** ~25 execution function files (~300 lines total, ~12 lines each)

### Phase 3: Pipeline Configs
- `src/pipelines/actions/` - 26 files (~1300 lines total, ~50 lines each)
- `src/pipelines/index.ts` - Registry (~50 lines)

### Phases 4-5: Events/Incidents Pipeline Configs
- `src/pipelines/events/` - 37 files (~1850 lines, ~50 lines each)
- `src/pipelines/incidents/` - 30 files (~1500 lines, ~50 lines each)

---

## Next Steps

1. ✅ **Completed:** Code inventory (this document)
2. **Next:** Game commands classification table
3. **Next:** Action migration matrix
4. **Then:** Create Phase 1 implementation templates
5. **Then:** Begin migration execution

---

## Notes

- **Global Variables:** Search shows 11+ uses of `globalThis.__pending*` patterns
- **CheckInstance Usage:** ~15 files directly manipulate check instances
- **Existing Tests:** Minimal automated testing (manual only)
- **Documentation:** Good high-level docs, missing implementation details (now being addressed)
