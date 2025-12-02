# Reroll Modifier Persistence - Enhanced Debugging

## Changes Made

### 1. Fixed Duplicate Storage Issue
**File:** `src/services/PipelineCoordinator.ts`

Removed duplicate modifier storage logic (lines 487-512) that was creating race conditions with PF2eSkillService. Now only PF2eSkillService handles modifier persistence.

### 2. Added Comprehensive Debugging Logs
**File:** `src/services/pf2e/PF2eSkillService.ts`

Added detailed logging to both storage and retrieval flows:

#### Storage (wrappedCallback):
- Logs all modifiers extracted from PF2e message (before filtering)
- Logs filtered modifiers (after removing ability/proficiency)
- Confirms successful storage or reports errors
- Shows warning if no instanceId provided

#### Retrieval (on reroll):
- Logs reroll detection
- Shows available instance IDs in turnState
- Logs found modifiers with full details
- Shows clear error if modifiers not found

## How To Test

1. **Build the module:** `npm run build` ✅ (completed successfully)
2. **Start Foundry VTT** with the module enabled
3. **Open browser console** (F12)
4. **Perform an initial roll** with a custom modifier added in the PF2e dialog
5. **Watch console logs** - you should see detailed logging about modifier extraction and storage
6. **Click "Reroll with Fame"**
7. **Watch console logs** - you should see modifier retrieval and application logs

## Expected Console Output

### Initial Roll:
```
🔍 [PF2eSkillService.wrappedCallback] Extracted X total modifiers from PF2e message for instance <id>
🔍 [PF2eSkillService.wrappedCallback] ALL modifiers (before filtering): [array with all modifiers including your custom one]
🔍 [PF2eSkillService.wrappedCallback] After filtering: X non-ability/non-proficiency modifiers
🔍 [PF2eSkillService.wrappedCallback] FILTERED modifiers (to be stored): [array with modifiers that will be saved]
💾 [PF2eSkillService] Successfully stored X modifiers for instance <id>
```

### Reroll:
```
🔍 [PF2eSkillService] Reroll detected - attempting to load modifiers for instance <id>
🔍 [PF2eSkillService] Available instances: ["<id>"]
✅ [PF2eSkillService] Found stored modifiers for instance <id>: X
🔍 [PF2eSkillService] Stored modifiers details: [array with stored modifiers]
🔄 [PF2eSkillService] Applying stored modifiers from previous roll: X
  ✅ Matched kingdom modifier "..." with stored modifier "..."
  ✨ Adding unmatched modifier from previous roll: "..." = X (type: ...)
🔄 [PF2eSkillService] Restored X modifiers (Y matched, Z added)
```

## Troubleshooting

If you see:
- **❌ No stored modifiers found for reroll!** → The storage didn't work or instanceId mismatch
- **⚠️ wrappedCallback called without instanceId** → The instanceId wasn't passed to performKingdomSkillCheck
- **Empty "Available instances" array** → turnState was cleared between initial roll and reroll

## Next Steps

Please test in Foundry and share the console output. The enhanced logging will tell us:
1. Whether custom modifiers are in the PF2e message
2. Whether they're being filtered correctly
3. Whether storage is working
4. Whether the correct instanceId is being used on reroll
5. Whether retrieval is finding the stored modifiers

With this information, we can identify the exact failure point and fix it.

## Related Files

- `DEBUGGING_REROLL_ISSUE.md` - Detailed debugging guide
- `REROLL_FIX_SUMMARY.md` - Original fix summary

## Build Status

✅ Module builds successfully with no errors
✅ Enhanced logging in place
✅ Ready for testing in Foundry VTT


