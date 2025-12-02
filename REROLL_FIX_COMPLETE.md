# Reroll Modifier Persistence - FIXED

## Root Cause Identified ✅

From your console logs, I found the **exact problem**:

### Initial Roll:
- Instance ID: `settlement-crisis-ORgDo1yqJPqa6u0Y`
- `isReroll: false` ✅
- Successfully stored 2 modifiers (including your custom "supergood" +12 modifier)

### "Reroll":
- Instance ID: `settlement-crisis-PMzkE0JyVdxVa6om` ❌ **DIFFERENT!**
- `isReroll: false` ❌ **WRONG!**
- **NO logs about loading stored modifiers**

**The Problem:** The reroll was creating a **completely new instance** instead of reusing the existing one, so the system thought it was a brand new initial roll and never loaded the stored modifiers.

## The Fix

### File: `src/view/kingdom/turnPhases/UnrestPhase.svelte` (lines 296-319)

**BEFORE:**
```typescript
async function handleReroll(event: CustomEvent) {
   if (!currentIncident) return;
   const { skill, previousFame, enabledModifiers } = event.detail;

   // Reset UI state for new roll
   await handleCancel();  // ❌ This cleared the instance!

   // Small delay to ensure UI updates
   await new Promise(resolve => setTimeout(resolve, 100));

   // Trigger new roll with preserved modifiers
   try {
      await executeSkillCheck(skill, enabledModifiers);  // ❌ Started new pipeline!
   } catch (error) {
      // ...error handling
   }
}
```

**AFTER:**
```typescript
async function handleReroll(event: CustomEvent) {
   if (!currentIncident || !currentIncidentInstance) return;
   const { skill, previousFame } = event.detail;

   // ✅ GET EXISTING INSTANCE ID: Reroll within same pipeline context
   const instanceId = currentIncidentInstance.previewId;
   
   if (!instanceId) {
      logger.error('[UnrestPhase] No instance found for reroll');
      return;
   }
   
   console.log(`🔄 [UnrestPhase] Rerolling from Step 3 (same pipeline): ${instanceId}`);
   
   // 🔄 Reroll using PipelineCoordinator.rerollFromStep3()
   const { getPipelineCoordinator } = await import('../../../services/PipelineCoordinator');
   const pipelineCoordinator = await getPipelineCoordinator();
   
   if (!pipelineCoordinator) {
      throw new Error('PipelineCoordinator not initialized');
   }
   
   try {
      // ✅ Rewind to Step 3 and re-execute with SAME context
      // This preserves metadata, modifiers, and all pipeline state
      await pipelineCoordinator.rerollFromStep3(instanceId);
      
      console.log(`✅ [UnrestPhase] Reroll complete for ${currentIncident.id}`);
      
   } catch (error) {
      // ...error handling (same as before)
   }
}
```

## What Changed

1. **Removed `handleCancel()` call** - This was clearing the instance, losing all stored data
2. **Removed `executeSkillCheck()` call** - This was starting a brand new pipeline
3. **Added `pipelineCoordinator.rerollFromStep3(instanceId)`** - This rewinds to Step 3 within the SAME pipeline, preserving all modifiers

## How It Works Now

1. **Initial Roll:**
   - Creates instance `settlement-crisis-ABC123`
   - Stores modifiers in `kingdom.turnState.actionsPhase.actionInstances['settlement-crisis-ABC123']`
   - Sets `isReroll: false`

2. **Reroll:**
   - Uses SAME instance ID: `settlement-crisis-ABC123`
   - Calls `pipelineCoordinator.rerollFromStep3('settlement-crisis-ABC123')`
   - Sets `isReroll: true` in the context
   - PF2eSkillService detects `isReroll: true` and `instanceId`
   - Loads modifiers from `kingdom.turnState.actionsPhase.actionInstances['settlement-crisis-ABC123']`
   - Applies all stored modifiers (including custom ones) to the new roll dialog

## Expected Console Output (After Fix)

### Initial Roll:
```
🆔 [PipelineCoordinator] Generated new instanceId: settlement-crisis-ABC123
🔹 [PipelineCoordinator] Step 3 (executeRoll): Rolling diplomacy vs DC 23 {isReroll: false}
🔍 [PF2eSkillService.wrappedCallback] Extracted 4 total modifiers
🔍 [PF2eSkillService.wrappedCallback] FILTERED modifiers (to be stored): [{supergood, +12}, {Unrest Penalty, -3}]
💾 [PF2eSkillService] Successfully stored 2 modifiers for instance settlement-crisis-ABC123
```

### Reroll:
```
🔄 [UnrestPhase] Rerolling from Step 3 (same pipeline): settlement-crisis-ABC123
🔄 [PipelineCoordinator] Rerolling from Step 3 (same pipeline context)
🔹 [PipelineCoordinator] Step 3 (executeRoll): Rolling diplomacy vs DC 23 {isReroll: true}  ✅
🔍 [PF2eSkillService] Reroll detected - attempting to load modifiers for instance settlement-crisis-ABC123
🔍 [PF2eSkillService] Available instances: ["settlement-crisis-ABC123"]
✅ [PF2eSkillService] Found stored modifiers for instance settlement-crisis-ABC123: 2
🔍 [PF2eSkillService] Stored modifiers details: [{supergood, +12}, {Unrest Penalty, -3}]
🔄 [PF2eSkillService] Applying stored modifiers from previous roll: 2
  ✅ Matched kingdom modifier "Unrest Penalty" with stored modifier "Unrest Penalty"
  ✨ Adding unmatched modifier from previous roll: "supergood" = 12 (type: status)
🔄 [PF2eSkillService] Restored 2 modifiers (1 matched, 1 added)
🔄 [PF2eSkillService] This is a reroll - not storing modifiers (already stored from initial roll)
✅ [UnrestPhase] Reroll complete for settlement-crisis
```

## Testing Instructions

1. **Reload Foundry VTT** to pick up the changes
2. **Open browser console** (F12)
3. **Clear console** for clean logs
4. **Perform an incident roll** with a custom modifier added in the PF2e roll dialog
5. **Verify storage logs** - should see `💾 Successfully stored X modifiers`
6. **Click "Reroll with Fame"**
7. **Verify reroll logs** - should now see:
   - Same instanceId (not a new one)
   - `isReroll: true`
   - Modifiers being loaded and applied
   - Your custom modifier appearing in the new roll dialog

## Files Modified

1. `src/services/PipelineCoordinator.ts` - Removed duplicate modifier storage
2. `src/services/pf2e/PF2eSkillService.ts` - Added comprehensive debug logging
3. **`src/view/kingdom/turnPhases/UnrestPhase.svelte`** - Fixed reroll handler to use `rerollFromStep3()`

## Build Status

✅ Module builds successfully
✅ No linter errors
✅ Ready for testing

## Note

This same issue might exist in **EventsPhase** as well. If events also have reroll problems, apply the same fix pattern there.


