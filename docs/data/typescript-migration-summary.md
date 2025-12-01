# TypeScript Pipeline Migration Summary

**Date:** December 2025 - January 2026  
**Status:** ✅ Complete

---

## Overview

This document summarizes the complete migration from JSON-based data files to self-contained TypeScript pipelines for all actions, events, and incidents in the PF2e Reignmaker module.

## What Changed

### Before (JSON + TypeScript Hybrid)

**Data Architecture:**
- Actions, events, and incidents defined in individual JSON files
- Python build scripts compiled JSON into monolithic files
- TypeScript pipelines loaded data from compiled JSON using `createActionPipeline()` helper
- Split between data (JSON) and logic (TypeScript)
- Sync issues between JSON and TypeScript features

**File Structure:**
```
data/
├── player-actions/  # 29 JSON files
├── events/          # Multiple JSON files
└── incidents/       # Multiple JSON files

src/
├── controllers/
│   ├── actions/action-loader.ts       # Loaded from JSON
│   ├── events/event-loader.ts         # Loaded from JSON
│   └── incidents/incident-loader.ts   # Loaded from JSON
└── pipelines/
    ├── shared/createActionPipeline.ts # Helper to merge JSON + TS
    ├── actions/     # TypeScript overrides
    ├── events/      # TypeScript overrides
    └── incidents/   # TypeScript overrides
```

### After (Pure TypeScript)

**Data Architecture:**
- All pipelines fully defined in TypeScript (self-contained)
- No JSON compilation needed for actions/events/incidents
- `PipelineRegistry` as single source of truth at runtime
- Single location for both data and logic
- Full TypeScript features available everywhere

**File Structure:**
```
src/pipelines/
├── PipelineRegistry.ts  # Central registry
├── actions/             # 29 self-contained TS files
├── events/              # All self-contained TS files
└── incidents/           # All self-contained TS files

archived-implementations/data-json/
├── player-actions/      # Archived JSON (reference only)
├── events/              # Archived JSON (reference only)
└── incidents/           # Archived JSON (reference only)
```

## Migration Steps

### 1. Migrated Actions (All 29)
- Removed `createActionPipeline()` helper dependency
- Embedded all JSON data directly into TypeScript files
- Each action now fully self-contained with:
  - `id`, `name`, `description`
  - `category`, `checkType`, `skills`
  - Complete `outcomes` with descriptions, modifiers, and game commands
  - Optional `requirements`, `getDC`, `preview`, `execute` functions

### 2. Migrated Events & Incidents
- Created Python migration script to transfer JSON data
- Added `endsEvent` field to all event outcomes
- Added `traits` field where applicable
- Verified all events and incidents compile correctly

### 3. Updated Phase Controllers
- **EventPhaseController**: Now uses `pipelineRegistry.getPipelinesByType('event')`
- **UnrestPhaseController**: Now uses `pipelineRegistry.getPipelinesByType('incident')`
- **ActionPhaseController**: Now uses `pipelineRegistry.getPipeline(actionId)`
- All controllers updated to use TypeScript outcome structure

### 4. Deleted Legacy Infrastructure
- ✅ Deleted `src/controllers/events/event-loader.ts`
- ✅ Deleted `src/controllers/incidents/incident-loader.ts`
- ✅ Deleted `src/controllers/actions/pipeline-loader.ts`
- ✅ Deleted `src/pipelines/shared/createActionPipeline.ts`
- ✅ Deleted `buildscripts/migrate-events-incidents.py` (migration script, no longer needed)
- ✅ Deleted `buildscripts/generate-event-incident-pipelines.py`
- ✅ Removed empty directories: `src/controllers/events/`, `src/controllers/incidents/`

### 5. Archived JSON Data
- Moved all JSON files to `archived-implementations/data-json/`
- Created `README.md` explaining migration and archive purpose
- Updated `combine-data.py` to only compile factions and structures
- Removed actions/events/incidents from build process

### 6. Updated UI Components
- **EventsPhase.svelte**: Updated to use `pipelineRegistry` and `buildEventOutcomes`
- **UnrestPhase.svelte**: Updated to load incidents from `pipelineRegistry`
- **ActionsPhase.svelte**: Updated to load actions from `pipelineRegistry`
- **ActionCategorySection.svelte**: Fixed to use `action.outcomes.<type>.description`
- All outcome displays now consistently use `description` field

### 7. Documentation Updates
- Updated `docs/ARCHITECTURE.md` with new pipeline architecture
- Updated `docs/BUILD_SYSTEM.md` with simplified build process
- Updated `README.md` with TypeScript-first approach
- Updated `docs/systems/core/events-and-incidents-system.md`
- Updated `docs/systems/core/pipeline-patterns.md`
- Removed outdated references to JSON loaders

## Benefits

### 1. **Single Source of Truth**
- All data and logic in one place (TypeScript file)
- No sync issues between JSON and TypeScript
- Easier to find and understand complete pipeline

### 2. **Full TypeScript Features**
- `outcomeBadges` work consistently (were missing in JSON)
- `preview.calculate()` available for all checks
- `execute()` custom logic fully integrated
- `postApplyInteractions` for hex display
- Complete type safety at compile time

### 3. **Simpler Architecture**
- No build scripts for actions/events/incidents
- No JSON compilation step
- No loader services
- Direct registry access
- Faster development iteration

### 4. **Better Maintainability**
- Clear, readable TypeScript code
- Self-documenting with interfaces
- IDE autocomplete and type checking
- Easier to refactor and extend
- Single file contains entire pipeline

### 5. **Consistency**
- All actions, events, and incidents use same pattern
- Same `CheckPipeline` interface
- Same execution flow
- Same feature set available

## Breaking Changes

### For End Users
**None.** This is an internal refactoring with no gameplay impact.

### For Developers

**Code Changes Required:**
```typescript
// ❌ OLD (no longer works)
import { actionLoader } from '../controllers/actions/action-loader'
const action = actionLoader.getActionById('claim-hexes')

// ✅ NEW (current pattern)
import { pipelineRegistry } from '../pipelines/PipelineRegistry'
const action = pipelineRegistry.getPipeline('claim-hexes')
```

**Adding New Content:**
```typescript
// ❌ OLD (no longer works)
// 1. Create JSON file in data/player-actions/
// 2. Run build to compile
// 3. Create TypeScript override in src/pipelines/actions/

// ✅ NEW (current pattern)
// 1. Create self-contained TypeScript file in src/pipelines/actions/
// 2. Register in PipelineRegistry.ts
// 3. Done!
```

## Migration Statistics

- **Actions migrated:** 29 (100%)
- **Events migrated:** All (100%)
- **Incidents migrated:** All (100%)
- **Loaders deleted:** 3
- **Helper functions removed:** 1 (`createActionPipeline`)
- **Empty directories removed:** 2
- **JSON files archived:** ~80
- **Build steps simplified:** 2 → 1 (for actions/events/incidents)
- **Lines of migration code:** ~1,500

## Verification

### Build System
- ✅ `npm run build` passes without errors
- ✅ No references to deleted loaders remain
- ✅ All pipelines compile with TypeScript strict mode
- ✅ Bundle size acceptable (~9MB main chunk)

### Runtime
- ✅ All 29 actions load correctly
- ✅ All events load and execute
- ✅ All incidents trigger correctly
- ✅ Outcome badges display (static and dynamic)
- ✅ Custom execute functions work
- ✅ Post-apply interactions work (hex display)
- ✅ Phase controllers load pipelines correctly

### Documentation
- ✅ ARCHITECTURE.md updated
- ✅ BUILD_SYSTEM.md updated
- ✅ README.md updated
- ✅ System docs updated
- ✅ All references to JSON loaders removed

## Future Considerations

### 1. Fortification Data
Currently still uses JSON import from archived location:
```typescript
// In fortifyHex.ts, fortifyHexValidator.ts, etc.
import fortificationData from '../../../archived-implementations/data-json/player-actions/fortify-hex.json'
```

**Recommendation:** Extract to shared `src/data/fortificationTiers.ts` module.

### 2. Factions & Structures
Still use JSON compilation:
- `src/data-compiled/factions.json`
- `src/data-compiled/structures.json`

**Status:** Working as intended. These are configuration data, not game logic.

### 3. PipelineLoaderService (Optional)
Could add abstraction layer for cleaner API:
```typescript
PipelineLoaderService.getAction('claim-hexes')  // Type-safe
PipelineLoaderService.getEvent('drug-den')       // Type-safe
```

**Status:** Not implemented. Direct `pipelineRegistry` access is sufficient.

## Lessons Learned

1. **Start with Types** - Define interfaces first, migrate data second
2. **Automate Migration** - Python scripts saved hours of manual work
3. **Incremental Testing** - Test each type (actions/events/incidents) separately
4. **Documentation Matters** - Clear docs prevented confusion during migration
5. **Archive, Don't Delete** - Keeping JSON for reference was valuable

## Related Documentation

- [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) - Complete system architecture
- [`docs/BUILD_SYSTEM.md`](../BUILD_SYSTEM.md) - Build process details
- [`docs/systems/core/pipeline-patterns.md`](../systems/core/pipeline-patterns.md) - Pipeline implementation patterns
- [`archived-implementations/data-json/README.md`](../../archived-implementations/data-json/README.md) - Archive explanation

---

**Migration Completed:** January 28, 2026  
**Build Verified:** ✅ Passing  
**Runtime Verified:** ✅ Working  
**Documentation:** ✅ Updated

