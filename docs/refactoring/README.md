# Unified Check Resolution System - Migration Documentation

**Purpose:** Complete documentation for migrating Actions, Events, and Incidents to a unified pipeline system

**Last Updated:** 2025-11-14

---

## Documentation Status

**✅ Ready for Execution** - All critical documents complete

**AI Execution Readiness Score: 7/10** (was 4/10)

---

## Primary Documents (Use These)

### 1. UNIFIED_CHECK_ARCHITECTURE.md (Root Level)
**Location:** `docs/UNIFIED_CHECK_ARCHITECTURE.md`

**Purpose:** Master reference for the unified check resolution system

**Use For:**
- Understanding the overall architecture
- 9-step pipeline flow
- Two preview modes (calculated vs interactive)
- Data structures (CheckPipeline, CheckContext, PreviewData)
- Interaction system overview

**Status:** ✅ Complete and current

---

### 2. CODE_INVENTORY.md
**Location:** `docs/refactoring/CODE_INVENTORY.md`

**Purpose:** Complete audit of existing codebase

**Contains:**
- All 23 action implementations with file locations
- 14 game commands classification
- Controllers and services breakdown
- Line counts and migration impact analysis
- ~16,420 lines affected by migration
- Files to create, keep, delete

**Status:** ✅ Complete - Use for finding existing code

---

### 3. GAME_COMMANDS_CLASSIFICATION.md
**Location:** `docs/refactoring/GAME_COMMANDS_CLASSIFICATION.md`

**Purpose:** Detailed analysis of all game commands

**Contains:**
- 14 commands in GameCommandsResolver analyzed
- Classification: 6 prepare/commit vs 8 immediate-execute
- Detailed code examples for each command
- Migration complexity ratings
- Global variables audit (11+ variables)
- Target structure for each command type

**Status:** ✅ Complete - Use for Phase 2 (game commands extraction)

---

### 4. ACTION_MIGRATION_MATRIX.md
**Location:** `docs/refactoring/ACTION_MIGRATION_MATRIX.md`

**Purpose:** Action-by-action migration procedures

**Contains:**
- Complete matrix: All 26 actions classified
- Detailed migration examples for 9 representative actions
- Week-by-week breakdown (Weeks 5-8 of Phase 3)
- Testing procedures for each action
- Migration checklist template

**Status:** ✅ Complete - Use for Phase 3 (action conversions)

---

### 5. implementation/ ⭐ NEW
**Location:** `docs/refactoring/implementation/`

**Purpose:** Actual TypeScript files (not markdown) ready to copy into codebase

**Contains:**
- `types/CheckPipeline.ts` - Pipeline configuration types (~130 lines)
- `types/CheckContext.ts` - Runtime data structures (~110 lines)
- `types/PreviewData.ts` - Preview calculation types (~60 lines)
- `services/UnifiedCheckHandler.ts` - Main orchestrator (~400 lines)
- `README.md` - Implementation guide with examples

**Status:** ✅ Complete - Copy files directly to `src/`

---

### 6. MIGRATION_GUIDE.md
**Location:** `docs/refactoring/MIGRATION_GUIDE.md`

**Purpose:** High-level migration strategy and timeline

**Contains:**
- 6 phases over 12 weeks
- Dependency reasoning
- Phase-by-phase deliverables
- Testing strategy
- Rollback procedures

**Status:** ✅ Complete - Use for planning and timeline

---

### 7. AI_EXECUTION_READINESS_ASSESSMENT.md
**Location:** `docs/refactoring/AI_EXECUTION_READINESS_ASSESSMENT.md`

**Purpose:** Gap analysis and recommendations

**Contains:**
- Assessment of documentation completeness
- Critical gaps identified (now mostly addressed)
- Recommendations for autonomous AI execution
- Before/after readiness scores

**Status:** ✅ Complete - Reference for what's been addressed

---

## Additional Documents

**Location:** `docs/refactoring/`

### ActionsPhase-Refactoring-Checklist.md
**Purpose:** Step-by-step checklist for ActionsPhase.svelte refactoring

**Status:** In Progress (Phases 1-3 complete, ready for Phase 4)

### GameCommandsResolver-Integration-Steps.md
**Purpose:** Final integration steps for extracted game commands

**Status:** Ready for execution (20 integration steps documented)

### GameCommandsResolver-Refactoring-Analysis.md
**Purpose:** Analysis of GameCommandsResolver refactoring strategy

**Status:** Complete reference

### action-resolution-touchpoints.md
**Purpose:** Complete mapping of action resolution data flow

**Status:** Complete reference (22 touchpoints documented)

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
4. **Execute Phase 1:**
   - Navigate to `implementation/` directory
   - Copy type files to `src/types/`
   - Copy UnifiedCheckHandler to `src/services/`
   - Run validation checks (see implementation/README.md)
5. **Execute Phase 2:**
   - Read `GAME_COMMANDS_CLASSIFICATION.md`
   - Follow `GameCommandsResolver-Integration-Steps.md`
   - Extract game commands one-by-one
   - Test each extraction
6. **Execute Phase 3:**
   - Read `ACTION_MIGRATION_MATRIX.md`
   - Convert actions week-by-week
   - Follow action-specific procedures
7. **Execute Phase 4:**
   - Read `ActionsPhase-Refactoring-Checklist.md`
   - Refactor ActionsPhase.svelte (988 → ~300 lines)
   - Update dialog patterns

---

## Success Metrics

### Code Metrics
- [ ] Remove ~2500 lines of duplicated code
- [ ] Create ~400 lines of UnifiedCheckHandler
- [ ] Create ~1300 lines of pipeline configs (26 actions)
- [ ] Net reduction: ~800 lines

### UX Metrics
- [ ] 93/93 checks show preview (currently ~10/93)
- [ ] Consistent UX across all checks
- [ ] Zero unexpected state changes

### Developer Metrics
- [ ] New check implementation: 2 hours → 20 minutes
- [ ] Code per check: ~80 lines → ~30 lines
- [ ] Test coverage: 40% → 85%

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
