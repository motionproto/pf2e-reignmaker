# Cleanup Guide - Removing Legacy Action System

**Purpose:** Detailed instructions for safely removing old action code after migration

**When to use:** After all 26 actions are migrated to pipelines

**Last Updated:** 2025-11-15

---

## Understanding the Code Organization

Before deleting anything, understand the **three-layer architecture**:

### Layer 1: Custom Action Implementations (`src/actions/`)
**Purpose:** Action-specific logic, requirement checks, custom resolution handlers  
**Status:** ❌ **DELETE AFTER MIGRATION**

```
src/actions/
  ├── claim-hexes/
  │   ├── ClaimHexesAction.ts           ❌ DELETE
  │   ├── claimHexValidator.ts          ❌ DELETE
  │   └── ...
  ├── purchase-resources/
  │   └── PurchaseResourcesAction.ts    ❌ DELETE
  └── [24 more action folders]          ❌ DELETE ALL
```

**Why delete?** Logic moved to pipeline configs in `src/pipelines/actions/`.

---

### Layer 2: Action Registry (`src/controllers/actions/implementations/`)
**Purpose:** Central registry that imports all custom action implementations  
**Status:** ❌ **DELETE ENTIRE FOLDER AFTER MIGRATION**

```
src/controllers/actions/implementations/
  └── index.ts                          ❌ DELETE
```

**Why delete?** Pipelines register themselves directly with UnifiedCheckHandler; no central registry needed.

---

### Layer 3: Execution Functions (`src/services/commands/`, `src/execution/`)
**Purpose:** Reusable domain logic (e.g., claimHexes, recruitArmy)  
**Status:** ✅ **KEEP - These are building blocks**

```
src/services/commands/
  ├── territory/
  │   └── claimHexes.ts                 ✅ KEEP
  ├── armies/
  │   └── recruitArmy.ts                ✅ KEEP
  └── settlements/
      └── buildStructure.ts             ✅ KEEP

src/execution/
  ├── territory/
  │   └── claimHexes.ts                 ✅ KEEP
  └── ...
```

**Why keep?** These are pure execution functions called by pipelines, events, automated processes. They're domain logic, not action-specific.

---

## Cleanup Strategy: Incremental vs. Batch

### Option 1: Incremental Deletion (Recommended)

**Process:**
1. Migrate action to pipeline
2. Test thoroughly
3. **Immediately delete** corresponding `src/actions/[action-name]/` folder
4. Update progress tracker

**Advantages:**
- ✅ Cleaner diffs (1 action per commit)
- ✅ Clear progress tracking
- ✅ Easier to spot issues
- ✅ No accumulation of dead code

**Example commit:**
```
feat: migrate claim-hexes to pipeline

- Add src/pipelines/actions/claimHexes.ts
- Delete src/actions/claim-hexes/ (legacy)
- Update MIGRATED_ACTIONS tracker
```

---

### Option 2: Batch Deletion (Alternative)

**Process:**
1. Migrate all 26 actions first
2. One big cleanup commit at end
3. Delete all legacy code together

**Advantages:**
- ✅ Single "cleanup" PR
- ✅ Easier to track what's migrated vs. not

**Disadvantages:**
- ❌ 26 dead folders accumulating
- ❌ Potential confusion about what's active
- ❌ Harder to debug issues

---

## Detailed Cleanup Checklist

### After Each Action Migration (Incremental Approach)

When you complete an action migration:

**1. Verify migration works:**
```bash
# Test the migrated action in-game
# Check console for errors
# Verify state changes are identical
```

**2. Delete action folder:**
```bash
# Example: After migrating claim-hexes
rm -rf src/actions/claim-hexes/
```

**3. Update registry (if using batch deletion):**
```typescript
// src/controllers/actions/implementations/index.ts
// Comment out or remove the import
// import ClaimHexesAction from '../../../actions/claim-hexes/ClaimHexesAction';
// actionImplementations.set(ClaimHexesAction.id, ClaimHexesAction);
```

**4. Git commit:**
```bash
git add .
git commit -m "feat: migrate claim-hexes to pipeline system

- Add pipeline config: src/pipelines/actions/claimHexes.ts
- Delete legacy implementation: src/actions/claim-hexes/
- Progress: 4/26 actions migrated"
```

---

### After ALL Actions Migrated (Final Cleanup)

Once all 26 actions are migrated:

**1. Delete entire action implementations folder:**
```bash
rm -rf src/actions/
```

**2. Delete registry:**
```bash
rm -rf src/controllers/actions/implementations/
```

**3. Delete or simplify action-resolver:**
```bash
# Option A: Delete entirely if no longer needed
rm src/controllers/actions/action-resolver.ts

# Option B: Simplify to minimal router (~10 lines)
# Keep if you still need basic routing logic
```

**4. Delete legacy handlers config:**
```bash
rm src/controllers/actions/action-handlers-config.ts
```

**5. Update imports across codebase:**

Search for imports from deleted files:
```bash
# Find all imports from deleted folders
grep -r "from.*actions/" src/
grep -r "from.*implementations" src/
grep -r "from.*action-resolver" src/
```

Remove or update these imports.

---

## What to KEEP (Do NOT Delete)

**✅ Reusable Execution Functions:**
```
src/services/commands/          ✅ KEEP ALL
src/execution/                  ✅ KEEP ALL
src/actions/shared/             ✅ KEEP (reusable helpers)
```

**✅ Pipeline Configs:**
```
src/pipelines/actions/          ✅ KEEP (new home for actions)
src/pipelines/events/           ✅ KEEP (future)
src/pipelines/incidents/        ✅ KEEP (future)
```

**✅ Core Infrastructure:**
```
src/services/UnifiedCheckHandler.ts     ✅ KEEP
src/types/CheckPipeline.ts              ✅ KEEP
src/types/CheckContext.ts               ✅ KEEP
src/types/PreviewData.ts                ✅ KEEP
```

---

## Safety Checks Before Deleting

**Before deleting ANY file, verify:**

1. **No active imports:**
```bash
# Check if file is still imported anywhere
grep -r "ClaimHexesAction" src/
```

2. **Action is in MIGRATED_ACTIONS:**
```typescript
// src/view/kingdom/turnPhases/ActionsPhase.svelte
const MIGRATED_ACTIONS = new Set([
  'claim-hexes',  // ✅ Listed = safe to delete folder
]);
```

3. **Pipeline config exists:**
```bash
# Verify pipeline file exists
ls src/pipelines/actions/claimHexes.ts
```

4. **Test passes:**
```bash
npm run build  # No TypeScript errors
# Manual test in Foundry VTT
```

---

## Files to Delete (Complete List)

After all 26 actions are migrated:

**Action Implementation Folders (26 folders):**
```
❌ src/actions/arrest-dissidents/
❌ src/actions/build-roads/
❌ src/actions/build-structure/
❌ src/actions/claim-hexes/
❌ src/actions/collect-stipend/
❌ src/actions/deploy-army/
❌ src/actions/disband-army/
❌ src/actions/establish-diplomatic-relations/
❌ src/actions/establish-settlement/
❌ src/actions/execute-or-pardon-prisoners/
❌ src/actions/fortify-hex/
❌ src/actions/harvest-resources/
❌ src/actions/infiltration/
❌ src/actions/outfit-army/
❌ src/actions/purchase-resources/
❌ src/actions/recruit-unit/
❌ src/actions/repair-structure/
❌ src/actions/request-economic-aid/
❌ src/actions/request-military-aid/
❌ src/actions/sell-surplus/
❌ src/actions/send-scouts/
❌ src/actions/train-army/
❌ src/actions/upgrade-settlement/
❌ src/actions/index.ts (if exists)
❌ src/actions/README.md (if exists)
```

**Controller Files:**
```
❌ src/controllers/actions/implementations/index.ts
❌ src/controllers/actions/implementations/ (entire folder)
❌ src/controllers/actions/action-resolver.ts (or simplify)
❌ src/controllers/actions/action-handlers-config.ts
```

**Estimated deletion:**
- ~26 folders
- ~2,500 lines of code
- ~30 files

---

## Example: Complete Migration Flow

**Step 1: Migrate claim-hexes**
```bash
# Create pipeline config
touch src/pipelines/actions/claimHexes.ts
# Implement pipeline
# Test thoroughly
```

**Step 2: Delete legacy implementation**
```bash
rm -rf src/actions/claim-hexes/
```

**Step 3: Update tracker**
```typescript
// src/view/kingdom/turnPhases/ActionsPhase.svelte
const MIGRATED_ACTIONS = new Set([
  'claim-hexes',  // ✅ Added
]);
```

**Step 4: Commit**
```bash
git add .
git commit -m "feat: migrate claim-hexes to pipeline
- Add src/pipelines/actions/claimHexes.ts
- Delete src/actions/claim-hexes/
- Progress: 1/26"
```

**Repeat for all 26 actions...**

**Final Step: Delete registry**
```bash
# After last action is migrated
rm -rf src/controllers/actions/implementations/
rm src/controllers/actions/action-resolver.ts
git commit -m "chore: remove legacy action system
- Delete implementations registry
- Delete action-resolver
- Migration complete: 26/26 actions"
```

---

## Current Migration Progress (as of 2025-11-15)

**Migrated (4/26):**
- ✅ claim-hexes → ⚠️ Can delete `src/actions/claim-hexes/` now
- ✅ deal-with-unrest → ⚠️ Check if folder exists, delete if so
- ✅ sell-surplus → ⚠️ Can delete `src/actions/sell-surplus/` now
- ✅ purchase-resources → ⚠️ Can delete `src/actions/purchase-resources/` now

**Safe to delete immediately:** 4 action folders

**Not yet safe to delete:**
- ❌ `src/controllers/actions/implementations/` - still used by 22 unmigrated actions
- ❌ `src/controllers/actions/action-resolver.ts` - still routing to legacy system
