# Debugging Reroll Modifier Persistence Issue

## Current Status

You reported that custom modifiers added in the original roll are not being preserved when you reroll. I've added comprehensive logging to help diagnose the issue.

## Enhanced Logging Added

The system now logs detailed information at each critical step of the modifier persistence flow.

## How to Debug

### Step 1: Perform Initial Roll

1. Open the browser console (F12)
2. Clear the console
3. Perform a kingdom action that requires a roll
4. In the PF2e roll dialog, **add a custom modifier** (e.g., "+2 test bonus")
5. Complete the roll

### Expected Console Output (Initial Roll):

```
🔍 [PF2eSkillService.wrappedCallback] Extracted X total modifiers from PF2e message for instance <instanceId>
🔍 [PF2eSkillService.wrappedCallback] ALL modifiers (before filtering): [...]
🔍 [PF2eSkillService.wrappedCallback] After filtering: X non-ability/non-proficiency modifiers
🔍 [PF2eSkillService.wrappedCallback] FILTERED modifiers (to be stored): [...]
💾 [PF2eSkillService] Successfully stored X modifiers for instance <instanceId>
```

**KEY QUESTION:** Is your custom modifier in the "ALL modifiers (before filtering)" array?
- If YES → Continue to Step 2
- If NO → The PF2e system isn't including your custom modifier in the message (PF2e system issue)

**KEY QUESTION:** Is your custom modifier in the "FILTERED modifiers (to be stored)" array?
- If YES → Continue to Step 2
- If NO → Check the modifier type. If it's "ability" or "proficiency", it's being filtered out (by design)

### Step 2: Perform Reroll

1. Keep the console open
2. Click "Reroll with Fame" button
3. Watch for the retrieval logs

### Expected Console Output (Reroll):

```
🔍 [PF2eSkillService] Reroll detected - attempting to load modifiers for instance <instanceId>
🔍 [PF2eSkillService] Available instances: [...]
✅ [PF2eSkillService] Found stored modifiers for instance <instanceId>: X
🔍 [PF2eSkillService] Stored modifiers details: [...]
🔄 [PF2eSkillService] Applying stored modifiers from previous roll: X
  ✅ Matched kingdom modifier "..." with stored modifier "..."
  ✨ Adding unmatched modifier from previous roll: "..." = X (type: ...)
🔄 [PF2eSkillService] Restored X modifiers (Y matched, Z added)
```

## Common Issues & Solutions

### Issue 1: Custom Modifier Not in "ALL modifiers" Array

**Symptom:** Your custom modifier doesn't appear in the initial extraction log.

**Cause:** The PF2e system might not be including manually-added modifiers in the message flags.

**Solution:** 
- Check if the custom modifier shows up in the chat message
- Verify you're adding it correctly in the PF2e roll dialog
- This might be a PF2e system limitation

### Issue 2: No Modifiers Stored (shows 0 modifiers)

**Symptom:** 
```
ℹ️ [PF2eSkillService] No modifiers to store for instance <id> (all were ability/proficiency)
```

**Cause:** All modifiers were filtered out (ability/proficiency only).

**Solution:** This is expected if you have no kingdom modifiers, aids, or custom non-ability/proficiency modifiers.

### Issue 3: Modifiers Not Found on Reroll

**Symptom:**
```
❌ [PF2eSkillService] No stored modifiers found for reroll! Instance <id>
🔍 [PF2eSkillService] Available instances: []
```

**Cause:** The modifier storage didn't persist or instanceId mismatch.

**Possible Reasons:**
1. **InstanceId Mismatch:** The reroll is using a different instanceId than the initial roll
2. **Storage Never Happened:** Check Step 1 logs - was `💾 Successfully stored` message shown?
3. **Data Lost:** Kingdom state was cleared between initial roll and reroll

**Debug Steps:**
a) Compare the instanceId in the initial roll vs reroll
b) Check if the instanceId appears in "Available instances" array
c) If available instances is empty, the turnState was cleared

### Issue 4: Wrong InstanceId Used

**Symptom:** The instanceId in the reroll doesn't match the initial roll.

**Cause:** The reroll is creating a new instance instead of reusing the existing one.

**Solution:** Check `ActionsPhase.handlePerformReroll()` - it should be calling `pipelineCoordinator.rerollFromStep3(instanceId)` with the SAME instanceId from the initial roll.

### Issue 5: Modifiers Stored But Not Applied

**Symptom:** Modifiers found in storage but don't appear in the new roll dialog.

**Cause:** The modifier application logic (lines 426-466) isn't working correctly.

**Debug:** Check if you see:
```
🔄 [PF2eSkillService] Applying stored modifiers from previous roll: X
```

If you see this but modifiers still don't appear, the issue is in the modifier matching/addition logic.

## Additional Logging Points

If the above doesn't reveal the issue, check for:

1. **PipelineCoordinator callback:** Should NO longer have storage messages (we removed duplicate storage)
2. **OutcomeDisplayController:** Has a reference to `storeModifiersForReroll()` that doesn't exist (line 354) - this might be throwing an error

## Next Steps

1. **Run the test** with console open
2. **Copy the complete console output** for both initial roll and reroll
3. **Share the output** so we can see exactly where the flow is breaking

The enhanced logging will show us:
- ✅ Are modifiers being extracted from the PF2e message?
- ✅ Are modifiers being filtered correctly?
- ✅ Are modifiers being stored successfully?
- ✅ Is the correct instanceId being used on reroll?
- ✅ Are modifiers being found in storage?
- ✅ Are modifiers being applied to the new roll?

With this information, we can pinpoint the exact failure point and fix it.


