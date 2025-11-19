# Action Pipeline Refactoring

**Status:** Documentation and architecture finalized - Ready for action implementation

---

## � Quick Onboarding (Start Here!)

**New to testing actions? Follow this sequence:**

1. **Read this README** (5 min) - Understand the architecture
2. **Read DEBUGGING_GUIDE.md** (10 min) - Learn common issues & fixes
3. **Read TESTING_GUIDE.md** (10 min) - Understand test workflow
4. **Start with #1: deal-with-unrest** - Simplest action, validates setup
5. **Full browser refresh before testing** (Ctrl+Shift+R / Cmd+Shift+R)

**First-Time Setup Checklist:**
- [ ] Dev server running: `npm run dev`
- [ ] Foundry VTT loaded with kingdom world
- [ ] Kingdom has resources (gold, lumber, ore, food > 0)
- [ ] Browser console open (F12) to watch pipeline logs

**⚠️ CRITICAL: Always full refresh after code changes!**

---

## �📁 Files in This Directory

- **README.md** (this file) - Quick reference and overview
- **DEBUGGING_GUIDE.md** - ⭐ **START HERE** - Common issues & fixes from real testing
- **TESTING_GUIDE.md** - Detailed test workflows for each action type
- **ACTION_MIGRATION_CHECKLIST.md** - Complete 1-26 action list with testing status
- **CUSTOM_COMPONENTS_TODO.md** - Pending custom component implementation work
- **TEST_RESULTS.md** - Log findings and issues during testing

## ⚠️ Implementation Guidelines

### Creating New Action Implementations

**✅ CORRECT: Create new pipeline files**
```typescript
// src/pipelines/actions/myAction.ts
export const myActionPipeline: CheckPipeline = {
  id: 'my-action',
  name: 'My Action',
  // ... implement from data/player-actions/my-action.json
};
```

**❌ WRONG: Copy old action implementation files**
```typescript
// DON'T copy files from archived-implementations/actions/
// These are REFERENCE ONLY - not for direct implementation!
```

### Using Archived Implementations

**Files in `archived-implementations/actions/` are REFERENCE ONLY:**

- ✅ **Use for:** Understanding patterns, reviewing logic, checking validation rules
- ✅ **Use for:** Seeing how dialogs were structured, what data was needed
- ✅ **Use for:** Finding shared utilities that may have been moved to `src/pipelines/shared/`

- ❌ **DON'T:** Copy entire files into `src/pipelines/actions/`
- ❌ **DON'T:** Import from `archived-implementations/` in new code
- ❌ **DON'T:** Try to integrate old action classes with new pipelines

**The pipeline system is the ONLY active implementation architecture.**

### Development Workflow

1. **Read** `data/player-actions/{action-name}.json` - Source of truth
2. **Reference** `archived-implementations/actions/{action-name}/` - Pattern examples
3. **Create** `src/pipelines/actions/{actionName}.ts` - New pipeline implementation
4. **Test** in Foundry - Verify functionality
5. **Update** `src/constants/migratedActions.ts` - Mark as tested

**Never modify or use files in `archived-implementations/` directly!**

---

## 🏗️ Architecture

**Complete design documentation:** `docs/systems/pipeline-coordinator.md`

### Custom Component Injection (New!)

**When to use:** Actions needing post-roll user choices (select resource, choose cost, etc.)

**Standard Interface:**
```typescript
// Component receives standard props
export let instance: ActiveCheckInstance | null;
export let outcome: string;
export let config: Record<string, any> = {};

// Component emits standard event
dispatch('resolution', {
  isResolved: true,
  modifiers: [{ type: 'static', resource: 'lumber', value: 2 }],
  metadata: { selectedResource: 'lumber', amount: 2 }
});
```

**Examples:** harvest-resources, sell-surplus, purchase-resources, outfit-army

**Full details:** See `docs/systems/pipeline-coordinator.md` - Section 5: Custom Component Injection

---

### Unified PipelineCoordinator (9-Step Architecture)

All actions, events, and incidents flow through the same single coordinator:

```
Step 1: Requirements Check          [optional]
Step 2: Pre-Roll Interactions       [optional]
Step 3: Execute Roll                [always runs]
Step 4: Display Outcome             [always runs]
Step 5: Outcome Interactions        [optional]
Step 6: Wait For Apply              [always runs]
Step 7: Post-Apply Interactions     [optional]
Step 8: Execute Action              [always runs]
Step 9: Cleanup                     [always runs]
```

**Key Principles:**
- Single `PipelineContext` object persists through all steps
- State persisted in `kingdom.pendingOutcomes` (survives page refresh)
- FIFO queue with lock prevents concurrent execution race conditions
- Roll-forward error handling (no rollback - optimistic progression)

## 📊 Current Status

- **Implementation:** Core architecture complete ✅
- **Current Phase:** 🧪 TESTING & VALIDATION
- **Testing:** 0/26 actions tested (0% complete)
- **Tracking:** `src/constants/migratedActions.ts`
- **UI Badges:** Gray (untested) → Green ✓ (tested)
- **Test Guide:** See `TESTING_GUIDE.md` for detailed instructions
- **Results Log:** See `TEST_RESULTS.md` to record findings

## 🎯 Action Implementation Workflows

**Not all actions need the same steps!** Follow the workflow that matches your action type:

### Workflow A: Basic Actions (#1-9)
*No gameCommands needed - just kingdom state changes*

**Examples:** claim-hexes, deal-with-unrest, sell-surplus, harvest-resources, build-roads

**Steps:**
1. **Test in Foundry:**
   ```
   Click action → Roll → Apply Result
   ↓ (if post-apply interaction)
   Complete hex selection → Verify state changes
   ```

2. **Update Status:**
   ```typescript
   // In src/constants/migratedActions.ts
   ['deal-with-unrest', 'tested'],  // ✅ Changed from 'untested'
   ```

3. **Badge Turns Green** ✓ automatically in UI

**NO gameCommands needed** - modifiers update kingdom state directly

---

### Workflow B: Entity Selection (#10-16)
*Pre-roll dialog to select entity, no gameCommands*

**Examples:** execute-or-pardon-prisoners, establish-diplomatic-relations, train-army

**Steps:**
1. **Test in Foundry:**
   ```
   Click action → Select entity (settlement/faction/army)
   ↓
   Roll → Apply Result → Verify state changes
   ```

2. **Update Status** (same as Workflow A)

**NO gameCommands needed** - selected entity stored in metadata, modifiers update state

---

### Workflow C: Foundry Integration (#17-21 + #25)
*Requires gameCommands for Foundry actors/items*

**Examples:** recruit-unit, build-structure, establish-settlement

**Steps:**
1. **Add gameCommands to Action JSON:**
   ```json
   {
     "criticalSuccess": {
       "description": "...",
       "modifiers": [...],
       "gameCommands": [
         {
           "type": "foundSettlement",
           "name": "{{settlementName}}",
           "location": "{{selectedLocation}}"
         }
       ]
     }
   }
   ```

2. **Test in Foundry:**
   ```
   Click action → Roll → Apply Result
   ↓
   gameCommands execute → Verify Foundry integration
   (e.g., army actor created, settlement placed)
   ```

3. **Update Status** (same as Workflow A)

**gameCommands required** - creates/modifies Foundry actors, items, or tokens

---

### Quick Reference: Which Actions Need gameCommands?

**Actions with gameCommands:**
- #17: recruit-unit
- #18: deploy-army  
- #19: build-structure
- #20: repair-structure
- #21: upgrade-settlement
- #25: establish-settlement

**All other actions (#1-16, #22-24, #26):** NO gameCommands needed

## 📋 Testing Order (Simplest → Most Complex)

See `ACTION_MIGRATION_CHECKLIST.md` for detailed action list.

**Phase 1:** #1 - No Interactions (deal-with-unrest)
**Phase 2:** #2-7 - Post-Apply Map Interactions (claim-hexes, build-roads, etc.)
**Phase 3:** #8-9 - Custom Components (sell-surplus, purchase-resources)
**Phase 4:** #10-16 - Pre-Roll Entity Selection (collect-stipend, diplomatic relations, etc.)
**Phase 5:** #17-21 - Foundry Integration (recruit-unit, build-structure, etc.)
**Phase 6:** #22-26 - Complex Custom Logic (arrest-dissidents, establish-settlement, etc.)

**Start with #1 (deal-with-unrest)** - simplest action with no interactions

## 🔗 Key Files

**Documentation:**
- `docs/systems/pipeline-coordinator.md` - Complete architecture design
- `docs/systems/check-instance-system.md` - OutcomePreview system
- `docs/systems/game-commands-system.md` - Game command handlers

**Implementation:**
- `src/services/PipelineCoordinator.ts` - Main coordinator
- `src/types/PipelineContext.ts` - Context object
- `src/constants/migratedActions.ts` - Status tracking
- `src/pipelines/actions/*.ts` - Individual action pipelines

**UI:**
- `src/view/kingdom/turnPhases/components/ActionCategorySection.svelte` - Badge display
- `src/view/kingdom/components/OutcomeDisplay/OutcomeDisplay.svelte` - Outcome interaction

## ⚡ Quick Start

### Starting a New Testing Session

**Copy/paste this prompt when resuming work:**

```
Continue action pipeline testing.

Files:
- Status tracker: src/constants/migratedActions.ts
- Documentation: docs/refactoring/README.md, DEBUGGING_GUIDE.md, TESTING_GUIDE.md

Task: Test the action currently marked as 'testing' in migratedActions.ts

Workflow:
1. Read migratedActions.ts to identify action marked 'testing'
2. Full browser refresh (Ctrl+Shift+R)
3. Test in Foundry: Expand → Roll → Apply → Verify state changes
4. Update status to 'tested' in migratedActions.ts
5. Report results

Proceed with testing.
```

### Testing Each Action (Simple Iteration)

**Your workflow:**
1. Open `src/constants/migratedActions.ts`
2. Change next action from `'untested'` to `'testing'`
3. Save file
4. Prompt: **"Test next action"** (that's it!)

**System will:**
- Auto-detect the action marked `'testing'`
- Execute full test workflow
- Update status to `'tested'` when complete
- Wait for you to mark the next one

**Example:**
```typescript
// In migratedActions.ts
['claim-hexes', 'testing'],  // #2 ← Changed from 'untested'

// Then just say: "Test next action"
// System reads file, finds #2, runs tests, updates to 'tested'
```

### Development Server

```bash
npm run dev  # HMR enabled, auto-rebuild on save
```

## ⚠️ Common Pitfalls (From Real Testing)

**These issues cost hours - avoid them!**

### 1. Stale Instances from Previous Sessions
**Problem:** Old outcomes appear when expanding actions  
**Fix:** Full browser refresh (Ctrl+Shift+R) before testing  
**See:** DEBUGGING_GUIDE.md - Issue #2

### 2. Naming Mismatches
**Problem:** Outcome doesn't appear after roll  
**Always Use:**
- `pendingOutcomes` (NOT `activeCheckInstances`)
- `previewId` (NOT `instanceId`)
- `checkId` (NOT `actionId` in some contexts)  
**See:** DEBUGGING_GUIDE.md - Issue #1

### 3. State Changes Not Persisting
**Problem:** Logs show "Success" but resources don't update  
**Check:** Missing `await` on `updateKingdom()` calls  
**See:** DEBUGGING_GUIDE.md - Issue #3

### 4. "No Pending Context" Error
**Problem:** Can't apply old instances after page refresh  
**Cause:** Coordinator context is in-memory only (lost on refresh)  
**Fix:** Always full refresh to clear stale instances  
**See:** DEBUGGING_GUIDE.md - Issue #4

### 5. Action Card Doesn't Reset
**Problem:** Action completes but card shows "Resolved" forever  
**Cause:** Step 9 not deleting instance from `pendingOutcomes`  
**See:** DEBUGGING_GUIDE.md - Issue #5

**📖 Full details + fixes:** See `DEBUGGING_GUIDE.md`

---

## 📝 Notes

- All actions, events, and incidents use the same 9-step pipeline
- Optional steps are automatically skipped if not needed
- Context persists through all steps for debugging
- Centralized error handling with roll-forward philosophy (no rollback)
- State persistence ensures pipelines survive page refresh
- Concurrency control via FIFO queue prevents race conditions

---

## 🆘 Getting Help

**Stuck on an issue?**
1. Check `DEBUGGING_GUIDE.md` - Has solutions for 5+ common issues
2. Check browser console - Pipeline logs show which step failed
3. Full refresh (Ctrl+Shift+R) - Clears 80% of stale state issues
4. Compare with working action (`deal-with-unrest`) - Reference implementation

**Recording Issues:**
- Add findings to `TEST_RESULTS.md`
- Include console logs and error messages
- Note which action and which step failed

---

**Last Updated:** 2025-11-18  
**Status:** 🚀 Ready for action implementation (1/26 tested)
