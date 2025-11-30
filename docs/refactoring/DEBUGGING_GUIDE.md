# Pipeline Debugging Guide

**Purpose:** Quick reference for debugging common issues during action testing

**Based on:** Learnings from `deal-with-unrest` testing session (2025-11-18)

---

## 🚨 Critical Issues & Fixes

### Issue #1: Outcome Display Not Appearing After Roll

**Symptoms:**
- Roll completes successfully
- No outcome card appears in UI
- Console shows no errors

**Root Cause:** Naming mismatch in reactive stores/lookups

**Common Causes:**
1. Looking up by wrong ID field
2. Filtering by wrong field names

**Fix Checklist:**
```typescript
// ✅ CORRECT - Current naming
const instances = $kingdomData.pendingOutcomes?.filter(...)
const instance = instances.find(i => i.previewId === id)
```

**Files to Check:**
- `src/view/kingdom/turnPhases/ActionsPhase.svelte`
- `src/view/kingdom/turnPhases/components/ActionCategorySection.svelte`

---

### Issue #2: Old Outcomes Appearing When Expanding Action

**Symptoms:**
- Click to expand action
- See outcome from previous test session
- Clicking "Apply Result" fails with "No pending context"

**Root Cause:** Stale instances persisting in Foundry flags

**Why It Happens:**
- Instances stored in `kingdom.pendingOutcomes` (persists in Foundry)
- Coordinator context stored in memory (lost on page refresh)
- Old instances survive refresh, but context doesn't

**Fix #1: Cleanup on Toggle**
```typescript
// In ActionsPhase.svelte - toggleAction()
const actor = getKingdomActor();
if (actor && checkInstanceService) {
  const kingdom = actor.getKingdomData();
  const oldInstances = (kingdom.pendingOutcomes || []).filter(
    (i: any) => i.checkType === 'action' && i.checkId === actionId
  );
  
  for (const instance of oldInstances) {
    await checkInstanceService.clearInstance(instance.previewId);
  }
}
```

**Fix #2: Cleanup on Pipeline Start**
```typescript
// In PipelineCoordinator.ts - executePipeline()
await this.cleanupOldInstances(actionId);  // Before creating new pipeline
```

**When to Use Each:**
- **Fix #1:** User-triggered (expanding action card)
- **Fix #2:** Automatic (starting new pipeline)

---

### Issue #3: State Changes Not Persisting

**Symptoms:**
- "Apply Result" completes successfully
- Logs show "Success"
- Resources/kingdom state don't update in UI

**Root Cause:** State updated but not persisted to Foundry

**Debug Steps:**
1. Check logs for "Applying modifiers: Success" (Step 8)
2. Check if `updateKingdom()` is being called
3. Verify actor is wrapped with `updateKingdomData()` method

**Common Cause:** Missing `await` on `updateKingdom()`
```typescript
// ❌ WRONG - Fire and forget
updateKingdom(kingdom => {
  kingdom.unrest -= 2;
});

// ✅ CORRECT - Wait for persistence
await updateKingdom(kingdom => {
  kingdom.unrest -= 2;
});
```

**Verification:**
```typescript
// After applying changes, check in console
const actor = game.actors.getName("Party");
const kingdom = actor.getFlag('pf2e-reignmaker', 'kingdom-data');
console.log('Unrest:', kingdom.unrest);  // Should show new value
```

---

### Issue #4: "No Pending Context" Error

**Symptoms:**
- Click "Apply Result"
- Error: "No pending context for instance: T1-action-xyz"
- Pipeline doesn't continue to Steps 7-9

**Root Cause:** Coordinator lost in-memory context

**When This Happens:**
- Page refresh after rolling (coordinator context lost)
- Trying to apply old instance from previous session

**Fix:** **Full browser refresh** required
```
Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
```

**Why:** Clears:
- Stale instances in `pendingOutcomes`
- Lost coordinator contexts
- Cached UI state

**Prevention:** Always start fresh test session after code changes

---

### Issue #5: Action Tracked But Card Doesn't Reset

**Symptoms:**
- Action completes successfully
- Resources updated correctly
- Action card still shows "Resolved" state
- Can't perform action again

**Root Cause:** Step 9 not deleting instance

**Fix:** Ensure Step 9 cleanup is complete
```typescript
// In PipelineCoordinator.ts - step9_cleanup()

// 1. Track action in actionLog
await gameCommandsService.trackPlayerAction(...);

// 2. DELETE instance from pendingOutcomes
await this.checkInstanceService.clearInstance(ctx.instanceId);

// 3. Remove from in-memory context
this.pendingContexts.delete(ctx.instanceId);
```

**Verification:**
```typescript
// After action completes, check in console
const actor = game.actors.getName("Party");
const kingdom = actor.getFlag('pf2e-reignmaker', 'kingdom-data');
console.log('Pending outcomes:', kingdom.pendingOutcomes.length);  // Should be 0
console.log('Action log:', kingdom.turnState.actionLog.length);    // Should increase
```

---

## 🔍 Debugging Checklist

When an action fails, work through this checklist:

### Pre-Test Setup
- [ ] Full browser refresh (Ctrl+Shift+R)
- [ ] Dev server running (`npm run dev`)
- [ ] Kingdom has required resources
- [ ] No old instances in `pendingOutcomes` (check console)

### During Testing
- [ ] Logs show "Starting pipeline for [action-id]"
- [ ] All 9 steps execute (check console for Step 0-9)
- [ ] No TypeScript/JavaScript errors in console
- [ ] Roll dialog appears (Step 3)
- [ ] Outcome display appears (Step 4-5)

### After Apply Result
- [ ] Steps 7-8-9 execute in console
- [ ] "Pipeline execution complete" log appears
- [ ] Resources updated in UI
- [ ] Action card resets to default state
- [ ] No errors in console

### If Something Fails
1. **Check console logs** - Look for Step numbers to see where pipeline stopped
2. **Check naming** - Verify `pendingOutcomes`, `previewId`, `checkId` usage
3. **Full refresh** - Clear stale state with Ctrl+Shift+R
4. **Verify pipeline** - Check action pipeline file exists and exports correctly
5. **Check actor wrapping** - Verify `updateKingdomData()` method exists

---

## 📋 Naming Reference

**ALWAYS use these exact names:**

| Context | Correct Name |
|---------|--------------|
| Instance storage | `pendingOutcomes` |
| Instance ID field | `previewId` |
| Action identifier (in instance) | `checkId` |
| Check type | `checkType: 'action'` |
| Status field | `status: 'pending' | 'resolved'` |

**Code Examples:**
```typescript
// ✅ Reading instances
const instances = $kingdomData.pendingOutcomes || [];
const actionInstance = instances.find(i => 
  i.checkType === 'action' && 
  i.checkId === 'deal-with-unrest' &&
  i.status === 'pending'
);

// ✅ Getting instance ID
const instanceId = currentActionInstances.get(actionId);
const instance = instances.find(i => i.previewId === instanceId);

// ✅ Deleting instance
await checkInstanceService.clearInstance(instance.previewId);
```

---

## 🔄 Browser Refresh Scenarios

### When to Use Full Refresh (Ctrl+Shift+R)

**Required After:**
- Code changes to coordinator/pipeline files
- Fixing bugs in ActionsPhase.svelte
- Multiple failed test attempts
- Any "stale data" errors

**What It Clears:**
- All in-memory state (coordinator contexts, etc.)
- Stale instances in `pendingOutcomes`
- UI component cache
- Service worker cache

### When Normal Refresh Is OK

**Safe After:**
- Simple data changes (resources, etc.)
- UI-only component updates (styles, text)
- Adding console.logs for debugging

---

## 🎯 Step-by-Step Debugging Example

**Scenario:** Action rolled successfully, but no outcome appears

### Step 1: Check Console Logs
```
Look for:
✅ "Starting pipeline for deal-with-unrest"
✅ "Step 3: Roll initiated with callback"
✅ "Step 4: Check instance created: T1-deal-with-unrest-123"
❌ Missing: "Step 5: Preview calculated"
```

**Diagnosis:** Pipeline stopped at Step 4/5 boundary

### Step 2: Check Instance Storage
```javascript
// In browser console
const actor = game.actors.getName("Party");
const kingdom = actor.getFlag('pf2e-reignmaker', 'kingdom-data');
console.log('Pending outcomes:', kingdom.pendingOutcomes);
```

**Look for:**
- Does instance exist?
- Is `previewId` field present?
- Is `status` = 'pending' or 'resolved'?

### Step 3: Check UI Binding
```typescript
// In ActionsPhase.svelte - check reactive statement
$: currentActionInstances = ($kingdomData.pendingOutcomes || [])
  .filter(i => i.checkType === 'action' && i.status === 'pending')
  .reduce((map, instance) => {
    map.set(instance.checkId, instance.previewId);  // ← Check field names
    return map;
  }, new Map());
```

**Common Issues:**
- Using wrong `status` value
- Wrong field names

### Step 4: Fix & Test
1. Fix naming issues
2. **Full browser refresh** (Ctrl+Shift+R)
3. Re-test action from scratch
4. Verify outcome appears

---

## 🛠️ Quick Fixes Reference

### Fix: Clear All Stale Instances
```javascript
// Run in browser console
const actor = game.actors.getName("Party");
await actor.updateKingdomData(kingdom => {
  kingdom.pendingOutcomes = [];
});
```

### Fix: Verify Action Pipeline Loaded
```javascript
// Run in browser console
const { getPipeline } = await import('/src/types/PipelineContext.js');
const ctx = { actionId: 'deal-with-unrest' };
const pipeline = await getPipeline(ctx);
console.log('Pipeline:', pipeline);
```

### Fix: Check Coordinator Context
```javascript
// In PipelineCoordinator - add debug log
confirmApply(instanceId: string): void {
  console.log('Pending contexts:', this.pendingContexts);  // ← Debug
  const context = this.pendingContexts.get(instanceId);
  // ...
}
```

---

## 📊 Success Indicators

**You know testing is working when:**
1. ✅ All 9 steps log in sequence
2. ✅ Outcome displays immediately after roll
3. ✅ "Apply Result" triggers Steps 7-9
4. ✅ Resources update in UI
5. ✅ Action card resets to default state
6. ✅ No stale instances on next expand
7. ✅ Badge turns green ✓ after updating `migratedActions.ts`

---

**Last Updated:** 2025-11-30  
**Verified:** All naming conventions confirmed against codebase  
**Based on:** First action testing session (deal-with-unrest)
