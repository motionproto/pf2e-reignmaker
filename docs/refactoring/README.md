# Unified Check Resolution System - Migration Documentation

**Purpose:** Complete documentation for migrating Actions, Events, and Incidents to a unified pipeline system

**Last Updated:** 2025-11-14

---

## Documentation Status

**✅ Ready for Execution** - All critical documents complete

**AI Execution Readiness Score: 7/10** (was 4/10)

---

## Active Documents (Use These)

### 1. UNIFIED_CHECK_ARCHITECTURE.md (Root Level) ⭐ PRIMARY
**Location:** `docs/UNIFIED_CHECK_ARCHITECTURE.md`

**Purpose:** Master reference for the unified check resolution system

**Use For:**
- Understanding the overall architecture
- 9-step pipeline flow with 3-phase interaction system
- Two preview modes (calculated vs interactive)
- Data structures (CheckPipeline, CheckContext, PreviewData)
- Complete interaction system documentation

**Status:** ✅ Complete and current (updated 2025-11-14)

---

### 2. MIGRATION_GUIDE.md ⭐ ESSENTIAL
**Location:** `docs/refactoring/MIGRATION_GUIDE.md`

**Purpose:** High-level migration strategy and timeline

**Contains:**
- 6 phases over 12 weeks
- Dependency reasoning (why game commands must come first)
- Phase-by-phase deliverables
- Testing strategy
- Rollback procedures
- Three-phase interaction system migration notes

**Status:** ✅ Complete (updated 2025-11-14)

---

### 3. BUGFIX_actor_context_architecture.md
**Location:** `docs/refactoring/BUGFIX_actor_context_architecture.md`

**Purpose:** Documentation of recent architecture fix

**Contains:**
- Actor context integration in CheckContext
- Dynamic interaction parameter support
- Proficiency-based hex count implementation
- claim-hexes migration example

**Status:** ✅ Complete - Reference for dynamic interactions


---

## Archived Documents

**Location:** `docs/refactoring/archived/`

These documents have been superseded:

- `unified-action-handler-architecture.md` - Merged into UNIFIED_CHECK_ARCHITECTURE.md
- `unified-check-resolution-system.md` - Merged into UNIFIED_CHECK_ARCHITECTURE.md
- `PHASE_1_IMPLEMENTATION_TEMPLATE.md` - Replaced by implementation/ directory

**Do not use these** - they contain outdated information.

---

## Document Dependencies

```
UNIFIED_CHECK_ARCHITECTURE.md (Master reference)
    ↓
MIGRATION_GUIDE.md (High-level plan)
    ↓
implementation/ (Phase 1 - Ready-to-use TypeScript files)
    ↓
GAME_COMMANDS_CLASSIFICATION.md (Phase 2 guide)
    ↓ 
GameCommandsResolver-Integration-Steps.md (Phase 2 execution)
    ↓
ACTION_MIGRATION_MATRIX.md (Phase 3 guide)
    ↓
ActionsPhase-Refactoring-Checklist.md (Phase 4 guide)

CODE_INVENTORY.md (Reference for all phases)
action-resolution-touchpoints.md (Data flow reference)
```

---

## Quick Start for AI Agent

**To execute the migration:**

1. **Read:** `UNIFIED_CHECK_ARCHITECTURE.md` - Understand the system
2. **Read:** `MIGRATION_GUIDE.md` - Understand the phases
3. **Read:** `CODE_INVENTORY.md` - Find existing code locations
4. **✅ Execute Phase 1:** (COMPLETE)
   - Navigate to `implementation/` directory
   - Copy type files to `src/types/`
   - Copy UnifiedCheckHandler to `src/services/`
   - Run validation checks (see implementation/README.md)
5. **✅ Execute Phase 2:** (COMPLETE)
   - Read `GAME_COMMANDS_CLASSIFICATION.md`
   - Follow `GameCommandsResolver-Integration-Steps.md`
   - Extract game commands one-by-one
   - Test each extraction
6. **✅ Execute Phase 3:** (COMPLETE)
   - Read `ACTION_MIGRATION_MATRIX.md`
   - Convert actions week-by-week (26/26 actions converted)
   - Follow action-specific procedures
7. **✅ Execute Phase 4:** (COMPLETE - TESTING IN PROGRESS)
   - Read `PHASE_4_COMPLETE.md` for implementation details
   - Create PipelineIntegrationAdapter for backward compatibility
   - Wire pipeline registry to action loader
   - Update ActionPhaseController to use UnifiedCheckHandler
   - Initialize pipeline system at app startup
   - Run comprehensive testing (see PHASE_4_COMPLETE.md)

**Current Status:** ✅ Phase 4 COMPLETE with full interaction system. See `PHASE_4_COMPLETE.md` for details.

---

## Success Metrics

### Code Metrics (Phase 1-4)
- [x] Create ~550 lines of UnifiedCheckHandler (✅ Complete)
- [x] Create ~2,200 lines of pipeline configs (26 actions) (✅ Complete)
- [x] Create ~1,100 lines of execution functions (12 commands) (✅ Complete)
- [x] Create ~300 lines of type definitions (✅ Complete)
- [x] Create ~255 lines of integration adapter (✅ Complete)
- [x] Create ~200 lines of interaction dialogs (✅ Complete - Phase 4)
- [x] Create ~150 lines of interaction handlers (✅ Complete - Phase 4)
- [x] Create ~50 lines of claimHexes execution (✅ Complete - Phase 4)
- **Total Created:** ~4,955 lines across 47 files
- [ ] Remove ~2500 lines of duplicated code (Phase 6 - Deprecation)
- **Net Impact:** +2,455 lines (will be -45 after Phase 6 cleanup)

### UX Metrics (Phase 5+)
- [ ] 93/93 checks show preview (currently ~10/93)
- [ ] Consistent UX across all checks
- [ ] Zero unexpected state changes

### Developer Metrics (Phase 1-4)
- [x] TypeScript compilation: 0 errors (✅ Complete)
- [x] All 26 actions available via pipelines (✅ Complete)
- [x] Backward compatibility maintained (✅ Complete)
- [ ] New check implementation: 2 hours → 20 minutes (testing needed)
- [ ] Code per check: ~80 lines → ~30 lines (achieved: ~85 lines avg)
- [ ] Test coverage: 40% → 85% (Phase 5+)

### Integration Status (Phase 4)
- [x] Pipeline registry initialized at app startup (✅ Complete)
- [x] ActionPhaseController integrated (✅ Complete)
- [x] Feature flags for gradual rollout (✅ Complete)
- [x] Dual-path architecture (pipeline + legacy) (✅ Complete)
- [x] Pre-roll interaction system (✅ Complete)
- [x] Post-roll interaction system (✅ Complete)
- [x] Outcome-based interaction adjustment (✅ Complete)
- [x] InteractionDialogs service (✅ Complete)
- [x] claim-hexes migrated to post-roll (✅ Complete)
- [ ] End-to-end testing (user to perform)
- [ ] Edge case testing (deferred to usage)

---

## What's Still Needed for Autonomous AI Execution

**Current Readiness: 7/10**

**To reach 9/10:**
- [ ] Automated validation scripts (`test/migration-validation.ts`)
- [ ] Edge case decision trees (more examples)
- [ ] Rollback procedures (detailed per phase)

**To reach 10/10:**
- [ ] Complete end-to-end example migration (1 full action)
- [ ] Integration test suite
- [ ] Performance benchmarks

---

## Notes

- All documents use consistent terminology
- All examples are based on actual codebase
- All file locations are accurate as of 2025-11-14
- All line counts are estimates based on current code

---

## Support

For questions or clarifications:
1. Check `UNIFIED_CHECK_ARCHITECTURE.md` first
2. Review relevant phase document
3. Consult `AI_EXECUTION_READINESS_ASSESSMENT.md` for known gaps
