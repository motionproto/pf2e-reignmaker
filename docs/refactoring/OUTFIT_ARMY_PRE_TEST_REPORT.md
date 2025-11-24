# Outfit Army Action - Pre-Test Verification Report

**Action ID:** `outfit-army` (#23)  
**Status:** `testing` → **✅ READY FOR TESTING**  
**Date:** 2025-11-23  
**Complexity:** Phase 6 - Complex Custom Logic

---

## ✅ ALL ISSUES FIXED

All critical issues and missing features have been implemented. The action is now ready for testing.

---

## 🔴 CRITICAL ISSUES FOUND

### 1. Syntax Error in Pipeline File
**Location:** `src/pipelines/actions/outfitArmy.ts:25`

**Problem:**
```typescript
const outcomeBadges = [];  // ❌ Variable declared but never used
if (ctx.outcome !== 'failure') {
  const bonus = ctx.outcome === 'criticalSuccess' ? '+2' : '+1';
  specialEffects.push({  // ❌ specialEffects is undefined!
    type: 'status' as const,
    message: `Army will receive ${bonus} equipment bonus`,
    variant: (ctx.outcome === 'criticalFailure' ? 'negative' : 'positive') as const
  });
}
```

**Issues:**
- `outcomeBadges` declared but `specialEffects` used (copy-paste error)
- Variable name mismatch will cause runtime error
- Logic error: checking `!== 'failure'` but then checking for `criticalFailure` variant

**Fix Required:**
```typescript
const outcomeBadges = [];
if (ctx.outcome === 'criticalSuccess' || ctx.outcome === 'success') {
  const bonus = ctx.outcome === 'criticalSuccess' ? '+2' : '+1';
  outcomeBadges.push(
    textBadge(`Army will receive ${bonus} equipment bonus`, 'positive')
  );
}
```

---

## 📋 MISSING FEATURES (vs Archived Implementation)

### 1. Pre-Roll Army Selection ❌
**Archived:** Custom `ArmySelectionDialog.svelte` with:
- Filters armies with available equipment slots (< 4 upgrades)
- Shows equipment info (slots available, current equipment)
- Validates army has linked actor
- Stores selection in global state

**Current Pipeline:** Missing entirely

**Required:** Add `preRollInteractions` with entity selection

---

### 2. Post-Apply Equipment Selection ❌
**Archived:** Custom `OutfitArmyResolution.svelte` with:
- Shows 4 equipment types (armor, runes, weapons, equipment)
- Displays bonuses (+1 normal, +2 critical)
- Filters out already-owned equipment
- Visual grid with icons and descriptions
- Auto-selection on click

**Current Pipeline:** Missing entirely

**Required:** Add `postApplyInteractions` with custom component

---

### 3. Game Command Execution ❌
**Archived:** Uses `GameCommandsResolver.outfitArmy()` to:
- Apply equipment to army actor
- Update army equipment flags
- Apply stat bonuses based on equipment type
- Handle critical success (+2) vs success (+1) bonuses

**Current Pipeline:** Has `gameCommands` in JSON but no execution logic

**Required:** Implement in `execute` function

---

### 4. Requirements Check ⚠️
**Archived:** Validates:
- At least one army exists
- Army has available equipment slots (< 4)
- Army has linked actor

**Current Pipeline:** Only checks if armies exist

**Required:** Add slot availability check

---

## 📊 COMPARISON TABLE

| Feature | Archived | Current | Status |
|---------|----------|---------|--------|
| Requirements check | ✅ Full validation | ⚠️ Partial | Missing slot check |
| Pre-roll army selection | ✅ Custom dialog | ❌ Missing | Not implemented |
| Skill check | ✅ 4 skills | ✅ 4 skills | ✅ Complete |
| Preview calculation | ✅ Resources + badges | 🔴 Syntax error | **BROKEN** |
| Post-apply equipment selection | ✅ Custom component | ❌ Missing | Not implemented |
| Game command execution | ✅ Full implementation | ❌ Missing | Not implemented |
| Outcome handling | ✅ All 4 outcomes | ✅ All 4 outcomes | ✅ Complete |

---

## 🎯 REQUIRED FIXES

### Priority 1: Fix Syntax Error (BLOCKING)
```typescript
// Current (BROKEN):
const outcomeBadges = [];
specialEffects.push({ ... });  // ❌ undefined variable

// Fixed:
const outcomeBadges = [];
outcomeBadges.push(textBadge(...));  // ✅ correct variable
```

### Priority 2: Add Pre-Roll Army Selection
```typescript
preRollInteractions: [
  {
    id: 'army-selection',
    type: 'entity-selection',
    entityType: 'army',
    required: true,
    filter: (army) => {
      const equipmentCount = army.equipment 
        ? Object.values(army.equipment).filter(Boolean).length 
        : 0;
      return equipmentCount < 4 && army.actorId;
    }
  }
]
```

### Priority 3: Add Post-Apply Equipment Selection
```typescript
postApplyInteractions: [
  {
    id: 'equipment-selection',
    type: 'configuration',
    component: OutfitArmyResolution,
    required: true,
    condition: (ctx) => ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess'
  }
]
```

### Priority 4: Implement Game Command Execution
```typescript
execute: async (ctx) => {
  const { createGameCommandsResolver } = await import('../../services/GameCommandsResolver');
  const resolver = await createGameCommandsResolver();
  
  const armyId = ctx.metadata.armyId;
  const equipmentType = ctx.resolutionData?.equipmentType;
  
  const result = await resolver.outfitArmy(armyId, equipmentType, ctx.outcome);
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to outfit army');
  }
  
  return { success: true };
}
```

### Priority 5: Enhance Requirements Check
```typescript
requirements: (kingdom) => {
  if (kingdom.armies.length === 0) {
    return { met: false, reason: 'No armies available' };
  }
  
  const eligibleArmies = kingdom.armies.filter(army => {
    const equipmentCount = army.equipment 
      ? Object.values(army.equipment).filter(Boolean).length 
      : 0;
    return equipmentCount < 4 && army.actorId;
  });
  
  if (eligibleArmies.length === 0) {
    return { 
      met: false, 
      reason: 'No armies with available equipment slots' 
    };
  }
  
  return { met: true };
}
```

---

## 🔧 IMPLEMENTATION COMPLEXITY

**Estimated Effort:** High (Phase 6 - Complex Custom Logic)

**Complexity Factors:**
1. **Custom UI Components** - Requires 2 custom Svelte components
2. **Entity Filtering** - Complex army eligibility logic
3. **Game Integration** - Direct actor manipulation via GameCommandsResolver
4. **State Management** - Equipment tracking across multiple systems
5. **Validation** - Multi-step validation (requirements → selection → application)

**Similar Actions:**
- `recruit-unit` (#17) - Game commands + entity selection
- `establish-settlement` (#25) - Custom components + complex logic

---

## ✅ READINESS ASSESSMENT

**Current State:** ✅ **READY FOR TESTING**

**Fixed Issues:**
1. ✅ **Critical syntax error** - Fixed variable name mismatch
2. ✅ **Pre-roll selection** - Implemented entity selection with filtering
3. ✅ **Post-apply selection** - Implemented configuration interaction
4. ✅ **Execution logic** - Implemented game command execution
5. ✅ **Requirements validation** - Enhanced with slot availability check
6. ✅ **TypeScript errors** - Fixed type annotations and return patterns

**Implementation Details:**
- Uses custom `OutfitArmySelectionDialog` component for army selection (pre-roll)
- Uses custom `EquipmentSelectionDialog` component for equipment selection (post-apply)
- Follows archived implementation pattern with custom dialogs
- Validates equipment not already owned in execute function
- Handles both prepare/commit and direct result patterns
- Matches original implementation from archived-implementations/actions/outfit-army/

---

## 📝 TESTING CHECKLIST (After Fixes)

### Requirements Phase
- [ ] Blocks when no armies exist
- [ ] Blocks when all armies fully equipped
- [ ] Blocks when armies missing actors
- [ ] Allows when eligible armies exist

### Pre-Roll Phase
- [ ] Shows army selection dialog
- [ ] Filters to eligible armies only
- [ ] Displays equipment info correctly
- [ ] Stores selected army ID

### Roll Phase
- [ ] All 4 skills available
- [ ] DC calculation correct
- [ ] Roll executes properly

### Preview Phase
- [ ] Shows resource costs correctly
- [ ] Shows equipment bonus badge
- [ ] Critical success shows +2
- [ ] Success shows +1
- [ ] Failure shows no badge

### Post-Apply Phase
- [ ] Shows equipment selection (success/crit only)
- [ ] Filters out owned equipment
- [ ] Shows correct bonuses
- [ ] Validates selection required

### Execution Phase
- [ ] Applies equipment to army actor
- [ ] Updates army flags correctly
- [ ] Applies stat bonuses
- [ ] Deducts resources
- [ ] Handles all outcomes

---

## 🎓 LESSONS FROM RECRUIT-UNIT

**What Worked:**
- Entity selection via `preRollInteractions`
- Game command execution in `execute` function
- Clear separation of concerns

**Apply to Outfit-Army:**
- Use same entity selection pattern for armies
- Use same game command pattern for equipment
- Keep custom components focused on UI only

---

## 📚 REFERENCE FILES

**Current Implementation:**
- `src/pipelines/actions/outfitArmy.ts` (✅ Complete)
- `src/view/kingdom/components/dialogs/OutfitArmySelectionDialog.svelte` (✅ Exists)
- `src/view/kingdom/components/dialogs/EquipmentSelectionDialog.svelte` (✅ Created)
- `data/player-actions/outfit-army.json` (✅ Complete)

**Archived Implementation (Reference):**
- `archived-implementations/actions/outfit-army/OutfitArmyAction.ts`
- `archived-implementations/actions/outfit-army/ArmySelectionDialog.svelte`
- `archived-implementations/actions/outfit-army/OutfitArmyResolution.svelte`

**Related Services:**
- `src/services/GameCommandsResolver.ts` (outfitArmy method)
- `src/models/Army.ts` (equipment structure)

**Component Registration:**
- Both dialogs must be registered in ComponentRegistry for pipeline to find them
- OutfitArmySelectionDialog: Pre-roll army selection with equipment slot filtering
- EquipmentSelectionDialog: Post-apply equipment type selection with ownership validation

---

## 🚦 RECOMMENDATION

**✅ PROCEED WITH TESTING**

All issues have been fixed. The action is ready for end-to-end testing in Foundry VTT.

**Testing Focus Areas:**
1. **Requirements validation** - Test with no armies, fully equipped armies, armies without actors
2. **Army selection** - Verify filtering shows only eligible armies
3. **Equipment selection** - Verify all 4 equipment types available, already-owned filtered out
4. **Game command execution** - Verify equipment applied to army actor correctly
5. **Outcome handling** - Test all 4 outcomes (crit success, success, failure, crit failure)

**Expected Behavior:**
- Requirements block when no eligible armies
- Pre-roll shows filtered army list
- Post-apply shows equipment options (success/crit only)
- Execute applies equipment and updates army stats
- Resources deducted correctly per outcome
