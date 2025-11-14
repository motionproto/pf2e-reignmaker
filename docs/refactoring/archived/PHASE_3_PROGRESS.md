# Phase 3: Action Conversions - Progress Tracker

**Goal:** Convert all 26 player actions from JSON to pipeline configs

**Status:** Week 5 Complete (9/26 actions converted)

---

## ✅ Week 5: Simple Actions (9/9 Complete)

### Resource Actions (4/4)
- ✅ deal-with-unrest - Simple unrest reduction
- ✅ sell-surplus - Commerce-based resource trading
- ✅ purchase-resources - Commerce-based resource purchasing
- ✅ harvest-resources - Resource gathering with post-roll choice

### Map-Based Actions (4/4)
- ✅ claim-hexes - Territory expansion with map selection
- ✅ build-roads - Infrastructure with path selection
- ✅ fortify-hex - Defensive structures with hex selection
- ✅ create-worksite - Worksite placement with hex selection

### Interactive Actions (1/1)
- ✅ send-scouts - Exploration with dice-based discovery

---

## 🔲 Week 6: Pre-roll Dialog Actions (0/7)

### Resource Actions (1)
- ⏳ collect-stipend - Settlement selection → giveActorGold

### Justice Actions (1)
- ⏳ execute-or-pardon-prisoners - Settlement selection → reduceImprisoned

### Diplomatic Actions (5)
- ⏳ establish-diplomatic-relations - Faction selection → adjustFactionAttitude
- ⏳ request-economic-aid - Faction selection → dice resources
- ⏳ request-military-aid - Faction selection → recruitArmy (exempt)

### Army Actions (2)
- ⏳ train-army - Army selection → trainArmyExecution
- ⏳ disband-army - Army selection → disbandArmyExecution

---

## 🔲 Week 7: Game Command Actions (0/5)

- ⏳ recruit-unit - Compound form → recruitArmyExecution
- ⏳ deploy-army - Army + map selection → deployArmyExecution
- ⏳ build-structure - Settlement + structure selection → buildStructure
- ⏳ repair-structure - Settlement + structure selection → repairStructure
- ⏳ upgrade-settlement - Settlement selection → upgradeSettlement

---

## 🔲 Week 8: Custom Resolution Actions (0/5)

- ⏳ arrest-dissidents - Custom component (ArrestDissidentsResolution.svelte)
- ⏳ outfit-army - Custom component (army + equipment selection)
- ⏳ infiltration - Custom logic (complex conditions)
- ⏳ establish-settlement - Complex compound (multiple steps)
- ⏳ recover-army - Healing calculation (army recovery)

---

## Summary

- **Completed:** 9/26 actions (35%)
- **Remaining:** 17 actions (65%)

### Files Created (Week 5)
```
src/pipelines/actions/
  ├── dealWithUnrest.ts
  ├── sellSurplus.ts
  ├── purchaseResources.ts
  ├── harvestResources.ts
  ├── claimHexes.ts
  ├── buildRoads.ts
  ├── fortifyHex.ts
  ├── createWorksite.ts
  └── sendScouts.ts

src/pipelines/
  └── PipelineRegistry.ts
```

### Pattern Established

All pipelines follow this structure:
```typescript
export const actionPipeline: CheckPipeline = {
  id: 'action-id',
  name: 'Display Name',
  description: '...',
  checkType: 'action',
  category: 'category-name',

  skills: [...],

  preRollInteractions: [...],  // Optional
  postRollInteractions: [...], // Optional

  outcomes: {
    criticalSuccess: { description, modifiers, gameCommands },
    success: { ... },
    failure: { ... },
    criticalFailure: { ... }
  },

  preview: {
    calculate: (ctx) => ({ resources, specialEffects, warnings }),
    providedByInteraction: boolean  // Optional
  },

  execute: async (ctx) => { ... }  // Optional
};
```

---

## Next Steps

1. **Convert Week 6 actions** (7 actions with pre-roll entity selection)
2. **Convert Week 7 actions** (5 actions with game command execution)
3. **Convert Week 8 actions** (5 actions with custom resolution)
4. **Update registry** to import all pipelines
5. **Integration testing** with existing system
6. **Deprecate old JSON system** (Phase 4)

---

## Migration Notes

### Global Variables Eliminated
- ❌ `globalThis.__pendingStipendSettlement`
- ❌ `globalThis.__pendingExecuteOrPardonSettlement`
- ❌ `globalThis.__pendingBuildAction`
- ❌ `globalThis.__pendingRecruitArmy`
- ✅ All replaced with `CheckContext.metadata.*`

### Prepare/Commit Pattern Eliminated
- ✅ Preview logic → pipeline.preview.calculate()
- ✅ Execution logic → execution/*.ts functions
- ✅ No more closures or PreparedCommand pattern

### Game Commands Extracted
- ✅ 11 execution functions in src/execution/
- ✅ Clean, testable functions (no context objects)
- ✅ All async operations properly handled
