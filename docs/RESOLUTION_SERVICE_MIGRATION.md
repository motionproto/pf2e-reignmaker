# Resolution Service Migration Plan

**Status**: 🟡 In Progress  
**Started**: 2025-10-05  
**Goal**: Consolidate scattered roll handling logic into unified `src/services/resolution/` structure

---

## 📋 Executive Summary

Roll handling logic is currently scattered across 3 architectural layers. This migration consolidates everything into a clean service layer following the project's architecture principles.

### Current Problems:
- ❌ Business logic in UI components (`OutcomeDisplayLogic.ts`)
- ❌ Service-level code in controller utilities (`resolution-service.ts`)
- ❌ Duplicated dice rolling logic in multiple places
- ❌ Unclear separation of concerns

### Target Solution:
- ✅ All business logic in `src/services/resolution/`
- ✅ Clean separation: Services (logic) ← Controllers (orchestration) ← Views (display)
- ✅ Single source of truth for each concern
- ✅ Easier testing and maintenance

---

## 🎯 Target Architecture

```
src/services/resolution/
├── DiceRollingService.ts          ✅ CREATED
├── OutcomeResolutionService.ts     📦 TO MOVE (from view/logic)
├── StateChangesService.ts          📦 TO MOVE (from controllers/shared)
├── OutcomeFormattingService.ts     🆕 TO CREATE (extract from OutcomeDisplayLogic)
└── index.ts                        🆕 TO CREATE (clean exports)
```

---

## 📊 Migration Checklist

### Phase 1: Foundation ✅
- [x] Create `src/services/resolution/` directory
- [x] Create `DiceRollingService.ts` (consolidate dice logic)
- [x] Fix dice roll bug (preRolledValues with mixed key types)
- [x] Update documentation (`ROLL_HANDLING_FLOW.md`)

### Phase 2: Service Layer Migration 🔄
- [ ] Move `OutcomeResolutionService.ts` from `view/logic/` to `services/resolution/`
- [ ] Move state change logic from `controllers/shared/resolution-service.ts` to `StateChangesService.ts`
- [ ] Create `OutcomeFormattingService.ts` (extract formatting from `OutcomeDisplayLogic.ts`)
- [ ] Create `index.ts` with clean exports
- [ ] Update `GameEffectsService.ts` to use `DiceRollingService`

### Phase 3: Update Imports 📝
- [ ] Update `OutcomeDisplay.svelte` imports
- [ ] Update `OutcomeDisplayLogic.ts` imports (use services)
- [ ] Update `StateChanges.svelte` imports
- [ ] Update `CheckResultHandler.ts` imports
- [ ] Update `UnrestPhaseController.ts` imports
- [ ] Update `EventPhaseController.ts` imports
- [ ] Update any other files importing old locations

### Phase 4: Cleanup 🧹
- [ ] Remove old `view/kingdom/components/OutcomeDisplay/logic/` (if empty)
- [ ] Remove duplicate dice logic from `OutcomeDisplayLogic.ts`
- [ ] Archive or remove `controllers/shared/resolution-service.ts` (logic moved)
- [ ] Update architecture documentation
- [ ] Verify no broken imports

### Phase 5: Testing ✅
- [ ] Test incident resolution (Disease Outbreak scenario)
- [ ] Test event resolution
- [ ] Test player action resolution
- [ ] Test dice rolling (both UI and fallback)
- [ ] Test resource selection
- [ ] Test choice selection
- [ ] Verify no regressions

---

## 📁 File Inventory

### Files to Move:
| Current Location | New Location | Lines | Status |
|-----------------|--------------|-------|--------|
| `view/.../OutcomeResolutionService.ts` | `services/resolution/OutcomeResolutionService.ts` | ~150 | 📦 Pending |
| `controllers/shared/resolution-service.ts` | `services/resolution/StateChangesService.ts` | ~200 | 📦 Pending |

### Files to Extract From:
| Source File | Extract To | What to Extract | Status |
|-------------|------------|-----------------|--------|
| `view/.../OutcomeDisplayLogic.ts` | `services/resolution/OutcomeFormattingService.ts` | Formatting helpers | 📦 Pending |
| `view/.../OutcomeDisplayLogic.ts` | `services/resolution/DiceRollingService.ts` | Dice logic | ✅ Done |
| `GameEffectsService.ts` | `services/resolution/DiceRollingService.ts` | evaluateDiceFormula | ✅ Done |

### Files to Update (Import Changes):
- [ ] `src/view/kingdom/components/OutcomeDisplay/OutcomeDisplay.svelte`
- [ ] `src/view/kingdom/components/OutcomeDisplay/logic/OutcomeDisplayLogic.ts`
- [ ] `src/view/kingdom/components/OutcomeDisplay/components/StateChanges.svelte`
- [ ] `src/view/kingdom/components/OutcomeDisplay/components/DiceRoller.svelte`
- [ ] `src/view/kingdom/components/CheckCard.svelte`
- [ ] `src/controllers/shared/CheckResultHandler.ts`
- [ ] `src/controllers/UnrestPhaseController.ts`
- [ ] `src/controllers/EventPhaseController.ts`
- [ ] `src/controllers/ActionPhaseController.ts` (if exists)
- [ ] `src/services/GameEffectsService.ts`

---

## 🔗 Dependency Map

```
Before:
OutcomeDisplay.svelte → OutcomeDisplayLogic.ts → (local dice logic)
GameEffectsService.ts → (local dice logic)
CheckResultHandler → OutcomeResolutionService (in view/logic!)

After:
OutcomeDisplay.svelte → OutcomeFormattingService → DiceRollingService
GameEffectsService.ts → DiceRollingService
CheckResultHandler → OutcomeResolutionService (in services/resolution!)
```

---

## ⚠️ Migration Risks & Mitigation

### Risk 1: Import Breakage
- **Mitigation**: Update all imports atomically in Phase 3
- **Testing**: Run build after each batch of import updates

### Risk 2: Circular Dependencies
- **Mitigation**: Keep services pure (no cross-imports between resolution services)
- **Testing**: Check TypeScript compilation

### Risk 3: Logic Duplication During Transition
- **Mitigation**: Complete migration quickly, don't leave half-migrated
- **Testing**: Remove old logic only after new logic is verified

---

## 🧪 Testing Checkpoints

After each phase, verify:

### ✅ Phase 1 Complete:
- [x] No TypeScript errors
- [x] Build succeeds
- [x] Dice roll bug fixed (preRolledValues work correctly)

### Phase 2 Complete:
- [ ] All services in `services/resolution/`
- [ ] No TypeScript errors
- [ ] Build succeeds

### Phase 3 Complete:
- [ ] All imports updated
- [ ] No TypeScript errors
- [ ] Build succeeds
- [ ] No runtime errors in console

### Phase 4 Complete:
- [ ] Old files removed
- [ ] No dead code
- [ ] Documentation updated

### Phase 5 Complete:
- [ ] All resolution flows work (events, incidents, actions)
- [ ] Dice rolling works (UI + fallback)
- [ ] Resource/choice selection works
- [ ] No regressions from previous functionality

---

## 📝 Notes & Decisions

### 2025-10-05
- ✅ Fixed dice roll bug (values weren't being passed through)
- ✅ Created `DiceRollingService.ts` as first consolidated service
- ✅ Updated type definitions to support mixed key types (number | string)
- 📝 Decision: Full consolidation approved, proceeding with complete migration
- 📝 Context at 73% - will continue in new task/context

### Next Steps:
1. Move remaining services to `services/resolution/`
2. Update all imports systematically
3. Clean up old locations
4. Comprehensive testing

---

## 📚 Related Documentation

- [ROLL_HANDLING_FLOW.md](./ROLL_HANDLING_FLOW.md) - Flow documentation (updated)
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Architecture principles
- [GAME_EFFECTS_SYSTEM.md](./GAME_EFFECTS_SYSTEM.md) - Effects system overview

---

**Last Updated**: 2025-10-05 15:42  
**Next Review**: After Phase 2 completion
