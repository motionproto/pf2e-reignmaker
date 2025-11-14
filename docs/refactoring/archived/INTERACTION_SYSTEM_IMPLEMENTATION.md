# Interaction System Implementation - Complete ✅

**Date:** 2025-11-14
**Status:** ✅ IMPLEMENTED & READY FOR TESTING

---

## Summary

Implemented the complete pre-roll and post-roll interaction system for the unified check resolution pipeline. This allows actions to collect user input at the proper times in the check flow.

---

## What Was Built

### 1. InteractionDialogs Service (`src/services/InteractionDialogs.ts`)

A new service providing Foundry VTT dialog-based interactions:

**Functions:**
- `showEntitySelectionDialog(entityType, label, filter)` - Select settlement/army/faction
- `showTextInputDialog(label, defaultValue)` - Text input
- `showConfirmationDialog(message)` - Yes/No confirmation

**Features:**
- Promise-based API (async/await support)
- Integration with kingdom data stores
- Cancel handling
- Entity filtering support

### 2. UnifiedCheckHandler Updates

**Pre-Roll Interactions (`executePreRollInteractions`):**
- Executes BEFORE skill check roll
- Processes `pipeline.preRollInteractions` array
- Calls interaction handlers sequentially
- Collects data into `CheckMetadata` object
- Supports conditional interactions
- Returns metadata for check creation

**Post-Roll Interactions (`executePostRollInteractions`):**
- Executes AFTER roll, BEFORE "Apply" button
- Retrieves check instance and pipeline
- Processes `pipeline.postRollInteractions` array
- **Outcome-based adjustment** via `adjustInteractionForOutcome()`
- Collects data into `ResolutionData` object
- Stores results in appropriate fields

**Interaction Handlers:**
- `executeEntitySelection()` - Opens entity picker dialog, returns `{ id, name }`
- `executeMapSelection()` - Delegates to `hexSelectorService`, supports outcome-based counts
- `executeTextInput()` - Opens text input dialog, returns string
- `executeConfiguration()` - Placeholder for future use
- `executeInteraction()` - Router that dispatches to appropriate handler

### 3. Updated claim-hexes Pipeline

**Before (Incorrect):**
```typescript
// Pre-roll: Select hexes (wrong timing!)
preRollInteractions: [{
  type: 'map-selection',
  count: 3  // Fixed count, doesn't consider outcome
}]
```

**After (Correct):**
```typescript
// Post-roll: Select hexes based on outcome
postRollInteractions: [{
  type: 'map-selection',
  id: 'selectedHexes',
  mode: 'hex-selection',
  outcomeAdjustment: {
    criticalSuccess: { count: 3, title: 'Select up to 3 hexes' },
    success: { count: 1, title: 'Select 1 hex' },
    failure: { count: 0 },  // No interaction
    criticalFailure: { count: 0 }
  },
  condition: (ctx) => ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess'
}]
```

---

## How It Works

### Correct Flow (Example: claim-hexes)

1. **Start Action** → Player clicks "Claim Hexes"
2. **Pre-roll** → No interactions (none defined)
3. **Skill Check** → Player rolls Survival/Society check
4. **Post-roll Interaction** → Based on outcome:
   - **Success:** Hex selector opens for 1 hex
   - **Critical Success:** Hex selector opens for 3 hexes (TODO: proficiency-based)
   - **Failure/Crit Failure:** Skipped (condition returns false)
5. **Preview** → Shows selected hexes + resource changes
6. **Apply** → Executes with collected data

### Data Flow

```typescript
// Pre-roll interactions → CheckMetadata
{
  settlementId: "settlement-123",
  settlementName: "Olegton",
  factionId: "faction-456"
}

// Post-roll interactions → ResolutionData
{
  compoundData: {
    selectedHexes: ["hex-1", "hex-2", "hex-3"]
  },
  customComponentData: {
    armyId: "army-789",
    armyName: "Olegton Guard"
  },
  textInputs: {
    settlementName: "New Village"
  }
}
```

### Outcome-Based Adjustments

The `adjustInteractionForOutcome()` method modifies interaction parameters based on the roll result:

```typescript
// In pipeline config
outcomeAdjustment: {
  criticalSuccess: { count: 3, title: 'Select 3 hexes' },
  success: { count: 1, title: 'Select 1 hex' }
}

// At runtime
if (outcome === 'criticalSuccess') {
  interaction.count = 3;
  interaction.title = 'Select 3 hexes';
}
```

---

## Interaction Types Implemented

### ✅ entity-selection
**Purpose:** Select settlement, army, or faction
**Returns:** `{ id: string, name: string }`
**Example:**
```typescript
{
  type: 'entity-selection',
  id: 'settlementId',
  label: 'Select settlement with Counting House',
  entityType: 'settlement',
  filter: (s) => s.structureIds.includes('counting-house')
}
```

### ✅ map-selection
**Purpose:** Select hexes on the kingdom map
**Returns:** `string[]` (array of hex IDs)
**Example:**
```typescript
{
  type: 'map-selection',
  id: 'selectedHexes',
  mode: 'hex-selection',
  count: 3,
  colorType: 'claimed',
  validation: (hex) => isAdjacentToKingdom(hex)
}
```

### ✅ text-input
**Purpose:** Collect text from user
**Returns:** `string`
**Example:**
```typescript
{
  type: 'text-input',
  id: 'settlementName',
  label: 'Name your new settlement',
  defaultValue: 'New Village'
}
```

### ⏳ Other Types (Future)
- `dice` - Roll dice during interaction
- `choice` - Select from predefined choices
- `allocation` - Allocate points/resources
- `compound` - Multiple related inputs
- `confirmation` - Confirm action
- `configuration` - Complex configuration UI

---

## Files Created/Modified

### Created
- ✅ `src/services/InteractionDialogs.ts` (200 lines)

### Modified
- ✅ `src/services/UnifiedCheckHandler.ts` (+150 lines)
  - Implemented `executePreRollInteractions()`
  - Implemented `executePostRollInteractions()`
  - Implemented `adjustInteractionForOutcome()`
  - Updated all interaction handlers
- ✅ `src/pipelines/actions/claimHexes.ts`
  - Moved from pre-roll to post-roll
  - Added outcome-based adjustments
  - Added conditional execution

---

## Integration Points

### With Existing Systems

1. **CheckInstanceService** - Used to retrieve check instances and metadata
2. **hexSelectorService** - Delegated to for map-selection interactions
3. **kingdomData Store** - Read for entity lists (settlements, armies, factions)
4. **Foundry Dialog** - Used for entity-selection and text-input

### With Pipeline System

1. **Pipeline configs** define interactions array
2. **UnifiedCheckHandler** executes interactions
3. **ResolutionData** stores collected inputs
4. **Execute function** receives complete data

---

## Testing Checklist

### Pre-Roll Interactions

- [ ] **collect-stipend** - Entity selection (settlement with Counting House)
  - Opens settlement selector before roll
  - Filters to only settlements with revenue structures
  - Stores settlementId in metadata

- [ ] **train-army** - Entity selection (army)
  - Opens army selector before roll
  - Stores armyId in metadata

- [ ] **disband-army** - Entity selection (army)
  - Opens army selector before roll
  - Stores armyId in metadata

- [ ] **establish-settlement** - Text input (settlement name)
  - Opens text input before roll
  - Stores name in metadata

### Post-Roll Interactions

- [ ] **claim-hexes** - Map selection (outcome-based)
  - Success: Opens hex selector for 1 hex
  - Critical Success: Opens hex selector for 3 hexes
  - Failure: Skips interaction
  - Critical Failure: Skips interaction
  - Selected hexes stored in resolutionData

- [ ] **send-scouts** - Map selection (if any have it)

### General Tests

- [ ] Cancellation handling (all dialogs)
- [ ] Empty entity lists (warning message)
- [ ] Conditional interactions (only execute when condition true)
- [ ] Multiple interactions in sequence
- [ ] Metadata persistence across pre/post roll
- [ ] Resolution data passed to execute function

---

## Known Limitations

1. **Proficiency-Based Hex Count** - claim-hexes uses fixed count of 3 for critical success
   - Should be 2-4 based on proficiency rank
   - TODO: Add proficiency access to post-roll context

2. **Dialog Styling** - Using basic Foundry dialogs
   - Could be improved with custom Svelte components
   - Future enhancement

3. **Validation Execution** - Map selection validation runs in hex selector
   - Could be enhanced to run during interaction execution
   - Current implementation works but isn't optimal

4. **Custom Implementations** - claim-hexes still has custom implementation registered
   - Pipeline version should take precedence
   - Need to ensure `shouldUsePipeline('claim-hexes')` returns true

---

## Next Steps

### Immediate
1. **Test in Foundry** - Execute claim-hexes action end-to-end
2. **Verify Flow** - Ensure post-roll hex selector opens automatically
3. **Check Integration** - Confirm "Apply" button works with collected data

### Short-term
1. **Update Other Map Actions** - Apply same pattern to:
   - build-roads
   - fortify-hex
   - send-scouts
   - create-worksite

2. **Update Entity Selection Actions** - Ensure pre-roll works for:
   - collect-stipend
   - train-army
   - disband-army
   - deploy-army

### Long-term
1. **Implement Remaining Interaction Types**
   - dice, choice, allocation, compound, configuration
2. **Create Svelte-based Dialogs**
   - Better UX than Foundry native dialogs
3. **Add Proficiency Context**
   - Pass proficiency rank to post-roll interactions
4. **Remove Custom Implementations**
   - Deprecate old ClaimHexesAction.ts
   - Rely entirely on pipeline system

---

## Success Criteria

✅ **Architecture:** Pre/post-roll interactions execute at correct times
✅ **Implementation:** All handlers functional (entity, map, text)
✅ **Integration:** Works with existing services (hex selector, dialogs)
✅ **Example:** claim-hexes updated to use post-roll with outcome-based counts
✅ **Compilation:** 0 TypeScript errors
⏳ **Testing:** Awaiting user testing in Foundry

**Status:** 🟢 READY FOR TESTING
