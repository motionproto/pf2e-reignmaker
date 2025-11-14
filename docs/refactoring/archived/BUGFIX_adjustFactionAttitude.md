# Bug Fix: adjustFactionAttitude Execution Function

**Date:** 2025-11-14
**Status:** ✅ Fixed

---

## Issue

Vite compilation error when loading the module:

```
E:/repos/pf2e-reignmaker/src/execution/factions/adjustFactionAttitude.ts:40:76
```

**Error:** Import from non-existent file `../../services/factions/factionHelpers`

---

## Root Cause

The execution function `adjustFactionAttitude.ts` was created during Phase 2 with an incorrect import:

```typescript
// INCORRECT - file doesn't exist
const { getFaction, adjustAttitude, getNextAttitudeLevel } =
  await import('../../services/factions/factionHelpers');
```

The functions it needed actually exist in:
- `factionService` from `../../services/factions/index.ts`
- `adjustAttitudeBySteps` from `../../utils/faction-attitude-adjuster.ts`

---

## Fix Applied

**File:** `src/execution/factions/adjustFactionAttitude.ts`

### 1. Updated Imports

```typescript
// Added type import
import type { AttitudeLevel } from '../../models/Faction';

// Fixed dynamic imports (inside function)
const { factionService } = await import('../../services/factions');
const { adjustAttitudeBySteps } = await import('../../utils/faction-attitude-adjuster');
```

### 2. Updated Function Signature

```typescript
// Changed from generic 'string' to typed 'AttitudeLevel'
options?: {
  maxLevel?: AttitudeLevel;  // was: string
  minLevel?: AttitudeLevel;  // was: string
  count?: number;
}
```

### 3. Updated Logic

**Before:**
```typescript
// Used non-existent getNextAttitudeLevel function
const nextLevel = getNextAttitudeLevel(f.attitude, steps);

// Used non-existent adjustAttitude function
const newAttitude = adjustAttitude(faction.attitude, steps);
```

**After:**
```typescript
// Use adjustAttitudeBySteps for filtering
const nextLevel = adjustAttitudeBySteps(f.attitude, steps, {
  maxLevel: options?.maxLevel,
  minLevel: options?.minLevel
});

// Use factionService.adjustAttitude for execution
const result = await factionService.adjustAttitude(targetId, steps, {
  maxLevel: options?.maxLevel,
  minLevel: options?.minLevel
});
```

---

## Testing

### Verification Steps

1. ✅ TypeScript compilation: 0 errors
2. ✅ Vite dev server: No import errors
3. ✅ Console: No runtime errors on module load
4. ✅ Pipeline system initializes successfully
5. ⏳ Runtime testing: Pending (requires executing faction-related actions)

### Actions That Use This Function

The following pipeline configs use `adjustFactionAttitudeExecution`:

1. **establish-diplomatic-relations** (`src/pipelines/actions/establishDiplomaticRelations.ts`)
2. **infiltration** (`src/pipelines/actions/infiltration.ts`)
3. **request-economic-aid** (`src/pipelines/actions/requestEconomicAid.ts`)

All three actions should be tested to verify the fix works end-to-end.

---

## Impact

**Low Risk** - The function was never executed before because:
- Pipeline integration was just implemented (Phase 4)
- This is new code, not a change to existing functionality
- Only affects 3 specific player actions

**No Regression** - Legacy system still works normally for all actions.

---

## Lessons Learned

1. **Import Validation** - Should verify all imports exist before committing execution functions
2. **Phase 2 Oversight** - The execution function was created during Phase 2 but the import path wasn't validated
3. **Testing Strategy** - Should have a compilation check as part of Phase 2/3 completion

---

## Related Files

- `src/execution/factions/adjustFactionAttitude.ts` - Fixed file
- `src/services/factions/index.ts` - Contains factionService
- `src/utils/faction-attitude-adjuster.ts` - Contains adjustAttitudeBySteps
- `src/pipelines/actions/establishDiplomaticRelations.ts` - Uses this function
- `src/pipelines/actions/infiltration.ts` - Uses this function
- `src/pipelines/actions/requestEconomicAid.ts` - Uses this function

---

## Status

✅ **Fixed and Verified** (compilation only)
⏳ **Runtime Testing** (pending user testing of faction actions)
