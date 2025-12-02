# Reroll Modifier Persistence Fix - Implementation Summary

## Problem Identified

The reroll mechanic was failing to preserve modifiers due to **duplicate storage logic** in two different services, creating race conditions:

1. **PipelineCoordinator** stored modifiers in `step3_executeRoll` callback (lines 487-512)
2. **PF2eSkillService** ALSO stored modifiers in `wrappedCallback` (lines 491-528)

Both wrote to `kingdom.turnState.actionsPhase.actionInstances[instanceId]`, but:
- Different timing in the callback chain
- PipelineCoordinator always stored (no reroll check)
- PF2eSkillService only stored on initial rolls (`!isReroll` check)
- Unpredictable which one would win/overwrite the other

## Solution Implemented

### 1. Removed Duplicate Storage from PipelineCoordinator

**File:** `src/services/PipelineCoordinator.ts`

**Change:** Removed lines 487-512 that stored modifiers in `kingdom.turnState`

**Before:**
```typescript
// ✅ PERSIST: Store modifiers in kingdom.turnState for rerolls
if (modifiers && modifiers.length > 0) {
  const actor = getKingdomActor();
  if (actor) {
    await actor.updateKingdomData((kingdom: any) => {
      // ... storage logic ...
    });
  }
}
```

**After:**
```typescript
// NOTE: Modifier persistence for rerolls is handled by PF2eSkillService.wrappedCallback
// This eliminates duplicate storage and ensures consistent modifier extraction
```

**Kept:** Modifier extraction for `ctx.rollData.rollBreakdown` (needed for OutcomeDisplay)

### 2. Verified PF2eSkillService Logic

**File:** `src/services/pf2e/PF2eSkillService.ts`

**Storage (lines 490-537):**
- ✅ Correctly checks `!isReroll` before storing (line 493)
- ✅ Modifier extraction matches expected filtering (filters out ability and proficiency)
- ✅ Storage structure matches `ActionInstance` interface
- ✅ Stores by `instanceId` for complete isolation

**Retrieval (lines 407-466):**
- ✅ Loads modifiers from `actionInstances[instanceId]` on reroll
- ✅ Sets `lastRollModifiers` correctly
- ✅ Matching logic preserves all modifier properties: `type`, `enabled`, `ignored`
- ✅ Handles both matched and unmatched modifiers correctly

## Architectural Rationale

Modifier storage remains in **PF2eSkillService** (not PipelineCoordinator or resolution services) because:

1. **PF2eSkillService** is the PF2e integration layer with direct access to roll message modifiers
2. **PipelineCoordinator** orchestrates pipeline steps, not PF2e-specific roll state
3. **PF2eRollService** is a pure utility with no state management
4. **Resolution services** handle outcome application, not roll-level modifier state

## Testing Guide

### Test Case 1: Initial Roll with Modifiers

**Setup:**
1. Start a new turn in Foundry
2. Ensure kingdom has at least 1 Fame point
3. Have at least one active modifier (e.g., structure bonus, aid bonus)

**Steps:**
1. Perform any kingdom action
2. Check console for: `💾 [PF2eSkillService] Stored modifiers for instance...`
3. Verify ONLY ONE storage message (not duplicate from PipelineCoordinator)

**Expected:**
- Single storage message from PF2eSkillService
- No message from PipelineCoordinator about storing modifiers

### Test Case 2: Single Reroll

**Setup:**
1. Complete Test Case 1 (have a rolled action with modifiers)

**Steps:**
1. Click "Reroll with Fame" button
2. Check console for:
   - `🔄 [PF2eSkillService] Restoring modifiers from instance...`
   - `🔄 [PF2eSkillService] Applying stored modifiers from previous roll:...`
3. In the roll dialog, verify all modifiers from the original roll are present

**Expected:**
- Modifiers loaded from turnState
- All original modifiers (including custom ones) are restored
- Modifier properties (type, enabled, ignored) preserved
- New roll uses the same modifiers

### Test Case 3: Multiple Rerolls

**Setup:**
1. Complete Test Case 2 (have Fame >= 2)

**Steps:**
1. Perform first reroll with Fame
2. Without applying the result, click "Reroll with Fame" again
3. Verify modifiers persist across multiple rerolls
4. Check console logs for modifier restoration each time

**Expected:**
- Each reroll loads modifiers from turnState
- Modifiers remain consistent across all rerolls
- No accumulation or loss of modifiers

### Test Case 4: No Modifiers Case

**Setup:**
1. Remove all structure bonuses, aids, etc.
2. Ensure no active modifiers

**Steps:**
1. Perform any kingdom action
2. Roll and then reroll

**Expected:**
- No errors in console
- System handles zero modifiers gracefully
- Reroll works without modifiers

### Console Log Indicators

**Initial Roll (Success):**
```
💾 [PF2eSkillService] Stored modifiers for instance <id> (isolated per execution)
```

**Reroll (Success):**
```
🔄 [PF2eSkillService] Restoring modifiers from instance <id>: <count>
🔄 [PF2eSkillService] Applying stored modifiers from previous roll: <count>
  ✅ Matched kingdom modifier "<name>" with stored modifier "<name>"
  ✨ Adding unmatched modifier from previous roll: "<name>" = <value> (type: <type>)
🔄 [PF2eSkillService] Restored <count> modifiers (<matched> matched, <added> added)
🔄 [PF2eSkillService] This is a reroll - not storing modifiers (already stored from initial roll)
```

**Error Indicators:**
```
❌ Duplicate storage messages from both services
❌ No modifiers found on reroll
❌ Modifier count mismatch between initial roll and reroll
```

## Expected Outcome

After this fix:
- ✅ Modifiers stored once by PF2eSkillService after initial roll
- ✅ Modifiers retrieved from persistent storage on reroll
- ✅ All modifier properties (type, enabled, ignored) preserved
- ✅ No race conditions or duplicate storage
- ✅ Multiple rerolls of same action work correctly
- ✅ Clean, predictable console logs

## Files Modified

1. `src/services/PipelineCoordinator.ts` - Removed duplicate storage (lines 487-512)

## Rollback Instructions

If issues arise, revert the change in `src/services/PipelineCoordinator.ts`:

```bash
git checkout HEAD -- src/services/PipelineCoordinator.ts
```

Then investigate whether PF2eSkillService's wrappedCallback needs adjustment.


