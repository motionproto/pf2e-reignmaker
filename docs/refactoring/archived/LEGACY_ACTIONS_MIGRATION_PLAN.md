# Legacy Actions Migration Plan

**Created:** 2025-11-14  
**Status:** Assessment Complete  
**Purpose:** Comprehensive inventory and migration strategy for all legacy custom action implementations

---

## Executive Summary

**Total Actions:** 26  
**Migrated to Unified Pipeline:** 1 (claim-hexes)  
**Remaining Legacy Implementations:** 25  
**Actions Using Custom Handlers:** 14 (pre-roll dialogs)  
**Actions Registered in implementations/index.ts:** 20  
**Global Variables to Eliminate:** ~15  
**Estimated Code Reduction:** ~2000 lines

---

## Current State Analysis

### Three-Tier Legacy System

#### Tier 1: ActionsPhase.svelte Custom Handlers
**Pattern:** Direct dialog management in component  
**Mechanism:** `CUSTOM_ACTION_HANDLERS` from action-handlers-config.ts  
**State Management:** `pending*` variables + `show*` dialog flags  
**Count:** 14 actions

#### Tier 2: implementations/index.ts Registry
**Pattern:** CustomActionImplementation interface  
**Mechanism:** Pre-roll dialogs + custom resolution components  
**State Management:** Global variables (`globalThis.__pending*`)  
**Count:** 20 actions (overlaps with Tier 1)

#### Tier 3: CheckInstanceHelpers.ts Prepare/Commit
**Pattern:** Game commands with PreparedCommand pattern  
**Mechanism:** Prepare preview → User confirms → Commit execution  
**State Management:** commitStorage (client-side)  
**Count:** Partially migrated (train-army, disband-army done)

---

## Complete Action Inventory

### ✅ Migrated to Unified Pipeline (1 action)

| Action | Status | Pipeline File | Notes |
|--------|--------|---------------|-------|
| claim-hexes | ✅ Complete | `src/pipelines/actions/claimHexes.ts` | Actor context architecture fix applied |

---

### 🔴 Legacy Pattern 1: Pre-Roll Dialog Only (6 actions)

**Pattern:** Entity/map selection before roll, standard outcome handling  
**Migration Complexity:** ⭐⭐ Medium  
**Current Files:** ActionsPhase handler + dialog component

| # | Action | Dialog Type | Global Var | Implementation File | Dialog Component |
|---|--------|-------------|------------|---------------------|------------------|
| 1 | collect-stipend | Settlement selection | `__pendingStipendSettlement` | ❌ None | SettlementSelectionDialog.svelte |
| 2 | execute-or-pardon-prisoners | Settlement selection | `__pendingExecuteOrPardonSettlement` | ✅ Custom | ExecuteOrPardonSettlementDialog.svelte |
| 3 | establish-diplomatic-relations | Faction selection | `__pendingEconomicAidFaction` | ✅ Custom | FactionSelectionDialog.svelte |
| 4 | infiltration | Faction selection | `__pendingInfiltrationFactionName` | ✅ Custom | InfiltrationDialog.svelte |
| 5 | request-economic-aid | Faction selection | `__pendingEconomicAidFaction` | ✅ Custom | RequestEconomicAidDialog.svelte |
| 6 | request-military-aid | Faction selection | `__pendingEconomicAidFaction` | ✅ Custom | RequestMilitaryAidDialog.svelte |

**Migration Strategy:**
1. Create pipeline with `preRollInteractions: [{ type: 'entity-selection' }]`
2. Remove from action-handlers-config.ts
3. Remove pending* variables from ActionsPhase
4. Delete dialog components (replaced by generic EntitySelectionDialog)
5. Eliminate global variables

---

### 🔴 Legacy Pattern 2: Pre-Roll + Prepare/Commit (4 actions)

**Pattern:** Dialog selection → Roll → Preview → Apply (uses CheckInstanceHelpers)  
**Migration Complexity:** ⭐⭐⭐ High  
**Status:** train-army and disband-army already migrated to prepare/commit

| # | Action | Dialog Type | Global Var | Implementation File | Notes |
|---|--------|-------------|------------|---------------------|-------|
| 7 | train-army | Army selection | `__pendingTrainArmyArmy` | ⚠️ Removed from impl | Migrated to prepare/commit |
| 8 | disband-army | Army selection | `__pendingDisbandArmyArmy` | ⚠️ Removed from impl | Migrated to prepare/commit |
| 9 | upgrade-settlement | Settlement selection | None (uses pendingUpgradeAction) | ✅ Custom | Uses CheckInstanceHelpers placeholders |
| 10 | build-structure | Structure + Settlement | None (uses pendingBuildAction) | ✅ Custom | Complex dual-entity selection |

**Migration Strategy for train-army/disband-army:**
1. ✅ Already removed from implementations/index.ts
2. ✅ Already using CheckInstanceHelpers prepare/commit
3. ⚠️ Still registered in action-handlers-config.ts (remove)
4. ⚠️ Still have pending* variables in ActionsPhase (remove)
5. Create pipelines with `preRollInteractions: [{ type: 'entity-selection' }]`

**Migration Strategy for upgrade-settlement/build-structure:**
1. Currently use CheckInstanceHelpers for placeholder replacement
2. Need pipeline with `preRollInteractions`
3. Remove from implementations/index.ts
4. Convert to unified pipeline pattern

---

### 🔴 Legacy Pattern 3: Pre-Roll Map Selection (3 actions)

**Pattern:** Map interaction before roll (hex selection, road placement, fortification)  
**Migration Complexity:** ⭐⭐⭐ High  
**Integration:** Requires map overlay system

| # | Action | Map Mode | Implementation File | Notes |
|---|--------|----------|---------------------|-------|
| 11 | build-roads | Path selection | ✅ Custom | Uses RoadBuildingPanel service |
| 12 | fortify-hex | Hex selection | ✅ Custom | Single hex fortification |
| 13 | claim-hexes | Hex selection | ✅ Migrated | **DONE** - See claimHexes.ts pipeline |

**Migration Strategy:**
1. Create pipeline with `preRollInteractions: [{ type: 'map-selection' }]`
2. Map mode: 'hex-selection', 'path-selection', 'placement'
3. Validation functions for allowed selections
4. Remove custom action files
5. Integrate with map overlay system

---

### 🔴 Legacy Pattern 4: Post-Roll Dice/Choice (3 actions)

**Pattern:** Standard roll → Dice roll or resource choice → Apply  
**Migration Complexity:** ⭐⭐ Medium  
**Uses:** Custom resolution components

| # | Action | Post-Roll Type | Implementation File | Resolution Component |
|---|--------|----------------|---------------------|----------------------|
| 14 | send-scouts | Dice (1d4 hexes) | ✅ Custom | SendScoutsResolution.svelte |
| 15 | harvest-resources | Choice (4 resources) | ✅ Custom | HarvestResourcesResolution.svelte |
| 16 | execute-or-pardon-prisoners | Dice (1d4 reduction) | ✅ Custom | ExecuteOrPardonResolution.svelte |

**Migration Strategy:**
1. Create pipeline with `postRollInteractions: [{ type: 'dice' }]` or `[{ type: 'choice' }]`
2. UnifiedCheckHandler manages interaction
3. Remove custom resolution components
4. Use generic DiceInteraction or ChoiceInteraction components

---

### 🔴 Legacy Pattern 5: Post-Roll Allocation (2 actions)

**Pattern:** Roll → Slider/allocation UI → Apply  
**Migration Complexity:** ⭐⭐⭐ High  
**Custom UI:** Slider-based resource allocation

| # | Action | Allocation Type | Implementation File | Resolution Component |
|---|--------|-----------------|---------------------|----------------------|
| 17 | arrest-dissidents | Slider (0 to max) | ✅ Custom | ArrestDissidentsResolution.svelte |
| 18 | outfit-army | Equipment type selection | ✅ Custom | OutfitArmyResolution.svelte |

**Migration Strategy:**
1. Create pipeline with `postRollInteractions: [{ type: 'allocation' }]`
2. Define min/max/default functions
3. Remove custom resolution components
4. Use generic AllocationInteraction component

**Special Case - outfit-army:**
- Currently ONLY action skipped in CheckInstanceHelpers prepare/commit
- Has complex post-roll dialog (army selection + equipment type)
- Needs careful migration to maintain equipment selection flow

---

### 🔴 Legacy Pattern 6: Post-Roll Compound (3 actions)

**Pattern:** Roll → Complex multi-input dialog → Apply  
**Migration Complexity:** ⭐⭐⭐⭐ Very High  
**Custom UI:** Multiple inputs (text + entity + map)

| # | Action | Compound Inputs | Implementation File | Resolution Component |
|---|--------|-----------------|---------------------|----------------------|
| 19 | recruit-unit | Name (text) + Settlement (entity) | ✅ Custom | RecruitUnitResolution.svelte |
| 20 | establish-settlement | Name (text) + Location (map) + Free Structure (entity, crit only) | ✅ Custom | EstablishSettlementResolution.svelte |
| 21 | repair-structure | Cost choice (buttons) | ✅ Custom | RepairStructureResolution.svelte |

**Migration Strategy:**
1. Create pipeline with `postRollInteractions: [{ type: 'compound' }]`
2. Define component array (text-input + entity-selection + map-selection)
3. Conditional components based on outcome (e.g., free structure on crit)
4. Remove custom resolution components
5. Use generic CompoundInteraction component

---

### 🔴 Legacy Pattern 7: Pure Game Command Actions (2 actions)

**Pattern:** Simple JSON-defined actions with game commands  
**Migration Complexity:** ⭐ Low  
**No Custom Code:** Pure JSON + game commands

| # | Action | Game Command | Implementation File | Notes |
|---|--------|--------------|---------------------|-------|
| 22 | purchase-resources | `purchaseResources` | ✅ Custom (requirements only) | Minimal custom code |
| 23 | sell-surplus | `sellSurplus` | ✅ Custom (requirements only) | Minimal custom code |

**Migration Strategy:**
1. Create simple pipeline with standard outcomes
2. Game commands handled by CheckInstanceHelpers
3. Remove from implementations/index.ts
4. No dialogs or custom resolution needed

---

### 🔴 Legacy Pattern 8: Special Case - Deploy Army (1 action)

**Pattern:** Pre-roll map interaction + post-roll animation  
**Migration Complexity:** ⭐⭐⭐⭐ Very High  
**Custom Service:** ArmyDeploymentPanel (floating map UI)

| # | Action | Pattern | Implementation File | Service |
|---|--------|---------|---------------------|---------|
| 24 | deploy-army | Map path selection → Roll → Animation | ✅ Custom | ArmyDeploymentPanel.ts |

**Migration Strategy:**
1. Unique workflow (panel service, not dialog)
2. Create pipeline with `preRollInteractions: [{ type: 'map-selection', mode: 'path-selection' }]`
3. Integrate ArmyDeploymentPanel with UnifiedCheckHandler
4. Maintain animation flow
5. Complex migration - handle last

---

## Migration Waves

### Wave 1: Simple Pre-Roll Dialogs (6 actions) - Week 1
**Complexity:** ⭐⭐ Medium  
**Estimated Effort:** 8 hours

- collect-stipend
- establish-diplomatic-relations
- infiltration
- request-economic-aid
- request-military-aid
- execute-or-pardon-prisoners (has dice, but simple)

**Benefits:**
- 6 actions migrated
- 6 global variables eliminated
- 6 dialog components deleted
- Establishes entity-selection pattern

---

### Wave 2: Prepare/Commit Finalization (4 actions) - Week 1
**Complexity:** ⭐⭐ Medium  
**Estimated Effort:** 6 hours

- train-army (mostly done)
- disband-army (mostly done)
- upgrade-settlement (uses CheckInstanceHelpers)
- build-structure (complex dual-entity)

**Benefits:**
- Completes prepare/commit migration
- Removes train-army/disband-army from action-handlers-config
- Cleans up upgrade-settlement placeholder logic

---

### Wave 3: Post-Roll Interactions (5 actions) - Week 2
**Complexity:** ⭐⭐⭐ High  
**Estimated Effort:** 12 hours

- send-scouts (dice)
- harvest-resources (choice)
- arrest-dissidents (allocation)
- repair-structure (choice + compound)
- outfit-army (allocation + equipment)

**Benefits:**
- Establishes dice/choice/allocation patterns
- Tests UnifiedCheckHandler post-roll flow
- Removes 5 custom resolution components

---

### Wave 4: Map Integration (2 actions) - Week 2
**Complexity:** ⭐⭐⭐ High  
**Estimated Effort:** 10 hours

- build-roads (path selection)
- fortify-hex (hex selection)

**Benefits:**
- Completes map-selection pattern
- Validates map overlay integration
- claim-hexes already done as reference

---

### Wave 5: Compound Interactions (3 actions) - Week 3
**Complexity:** ⭐⭐⭐⭐ Very High  
**Estimated Effort:** 16 hours

- recruit-unit (text + entity)
- establish-settlement (text + map + conditional entity)
- purchase-resources (simple)
- sell-surplus (simple)

**Benefits:**
- Most complex interactions migrated
- Generic CompoundInteraction component created
- Pure game command actions cleaned up

---

### Wave 6: Special Cases (1 action) - Week 3
**Complexity:** ⭐⭐⭐⭐ Very High  
**Estimated Effort:** 8 hours

- deploy-army (ArmyDeploymentPanel integration)

**Benefits:**
- All 26 actions migrated
- Custom action system completely replaced
- Legacy code eliminated

---

## Migration Checklist Per Action

### Pre-Migration Analysis
- [ ] Document current implementation pattern
- [ ] Identify all custom files (action, dialogs, resolution)
- [ ] List global variables used
- [ ] Note interaction types (pre-roll, post-roll)
- [ ] Document game commands
- [ ] Identify special cases/edge cases

### Pipeline Creation
- [ ] Create `src/pipelines/actions/{actionName}.ts`
- [ ] Define skills array
- [ ] Define preRollInteractions (if needed)
- [ ] Define postRollInteractions (if needed)
- [ ] Define outcomes with modifiers
- [ ] Implement preview.calculate()
- [ ] Implement execute() (if custom logic)
- [ ] Register in `src/pipelines/actions/index.ts`

### Component Integration
- [ ] Remove from action-handlers-config.ts (if pre-roll)
- [ ] Remove from implementations/index.ts
- [ ] Remove pending* variables from ActionsPhase
- [ ] Remove show* dialog flags from ActionsPhase
- [ ] Eliminate global variables (`globalThis.__pending*`)

### Code Cleanup
- [ ] Delete custom action files (src/actions/{actionName}/)
- [ ] Delete dialog components
- [ ] Delete resolution components
- [ ] Remove from ActionsPhase dialog manager

### Testing
- [ ] Action card displays correctly
- [ ] Pre-roll interactions work (if applicable)
- [ ] Skill roll executes
- [ ] Post-roll interactions work (if applicable)
- [ ] Preview displays correctly (resources, special effects)
- [ ] Apply Result executes correctly
- [ ] State changes match legacy version
- [ ] No console errors
- [ ] Can execute multiple times
- [ ] Outcome switching works (debug mode)

### Documentation
- [ ] Update ACTION_MIGRATION_MATRIX.md
- [ ] Document any migration notes
- [ ] Update MIGRATION_GUIDE.md

---

## Global Variables to Eliminate

| Variable | Used By | Count |
|----------|---------|-------|
| `__pendingStipendSettlement` | collect-stipend | 1 |
| `__pendingExecuteOrPardonSettlement` | execute-or-pardon-prisoners | 1 |
| `__pendingEconomicAidFaction` | establish-diplomatic-relations, request-economic-aid, request-military-aid | 3 |
| `__pendingEconomicAidFactionName` | request-economic-aid, request-military-aid | 2 |
| `__pendingInfiltrationFactionName` | infiltration | 1 |
| `__pendingTrainArmyArmy` | train-army | 1 |
| `__pendingDisbandArmyArmy` | disband-army | 1 |
| `__pendingOutfitArmyArmy` | outfit-army | 1 |
| `__pendingRecruitArmy` | recruit-unit, request-military-aid | 2 |
| `__pendingDeployArmy` | deploy-army | 1 |

**Total:** ~15 global variable usages across 10 unique variables

**Replacement:** All stored in `ctx.metadata` via UnifiedCheckHandler

---

## Code Deletion Estimate

### Custom Action Files
- src/actions/* directories: ~1500 lines
- Dialog components: ~300 lines
- Resolution components: ~400 lines

### Registry/Handler Code
- action-handlers-config.ts: ~150 lines
- implementations/index.ts entries: ~100 lines
- ActionsPhase.svelte handlers: ~400 lines

**Total Estimated Deletion:** ~2850 lines  
**New Pipeline Code:** ~1300 lines  
**Net Reduction:** ~1550 lines (54% reduction)

---

## Risk Assessment

### High Risk Areas
1. **outfit-army** - Only action using prepare/commit skip
2. **deploy-army** - Custom ArmyDeploymentPanel service
3. **establish-settlement** - Most complex compound interaction
4. **Map interactions** - Integration with overlay system

### Mitigation Strategies
1. Migrate lowest-risk actions first (simple pre-roll dialogs)
2. Test each wave thoroughly before proceeding
3. Keep legacy code until pipeline fully tested
4. Document any behavior changes
5. Create rollback plan for each wave

---

## Success Criteria

### Per Action
- ✅ Functionality matches legacy version exactly
- ✅ No global variables used
- ✅ No custom dialog/resolution components
- ✅ Uses unified pipeline pattern
- ✅ Passes all manual test cases
- ✅ No console errors/warnings

### Overall Project
- ✅ All 26 actions migrated to unified pipeline
- ✅ action-handlers-config.ts deleted or empty
- ✅ implementations/index.ts deleted or minimal
- ✅ All global variables eliminated
- ✅ All custom action directories deleted
- ✅ ActionsPhase.svelte simplified (no custom handlers)
- ✅ Net code reduction of ~1500 lines
- ✅ Improved maintainability and consistency

---

## Next Steps

1. **Immediate:** Begin Wave 1 (simple pre-roll dialogs)
2. **This Week:** Complete Waves 1-2 (10 actions)
3. **Next Week:** Complete Waves 3-4 (7 actions)
4. **Week 3:** Complete Waves 5-6 (9 actions)

**Total Timeline:** 3 weeks for complete migration

---

## Appendix: Pattern Comparison

### Legacy Pattern
```typescript
// ActionsPhase.svelte
let pendingStipendAction: { skill: string; settlementId?: string } | null = null;

const CUSTOM_ACTION_HANDLERS = {
  'collect-stipend': {
    requiresPreDialog: true,
    showDialog: () => { showSettlementSelectionDialog = true; },
    storePending: (skill: string) => { pendingStipendAction = { skill }; }
  }
};

function handleSettlementSelected(event: CustomEvent) {
  if (pendingStipendAction) {
    pendingStipendAction.settlementId = event.detail.settlementId;
    showSettlementSelectionDialog = false;
    (globalThis as any).__pendingStipendSettlement = event.detail.settlementId;
    await executeStipendRoll(pendingStipendAction);
  }
}
```

### Unified Pipeline Pattern
```typescript
// src/pipelines/actions/collectStipend.ts
export const collectStipendPipeline: CheckPipeline = {
  id: 'collect-stipend',
  skills: [{ skill: 'diplomacy', description: 'request funds' }],
  preRollInteractions: [{
    type: 'entity-selection',
    entityType: 'settlement',
    storeAs: 'settlementId'
  }],
  preview: {
    calculate: (ctx) => {
      const settlement = findSettlement(ctx.kingdom, ctx.metadata.settlementId);
      const gold = calculateStipend(settlement);
      return { resources: [{ resource: 'gold', value: -gold }] };
    }
  }
};
```

**Benefits:**
- ✅ No component state management
- ✅ No global variables
- ✅ Declarative configuration
- ✅ Type-safe metadata
- ✅ Reusable interaction components
- ✅ Centralized flow control

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-14  
**Next Review:** After Wave 1 completion
