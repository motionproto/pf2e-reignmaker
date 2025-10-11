# Outcome Handling Architecture Audit

**Date:** 2025-10-11  
**Bug Report:** Economic Crash incident (failure outcome) with `-2d6` dice modifier - "Apply Result" button stays disabled after rolling dice

---

## 🐛 ROOT CAUSE IDENTIFIED

### Critical Bug in `PhaseHelpers.ts` Line ~147

```typescript
// ❌ BROKEN - Double backslashes escape the regex pattern
const DICE_PATTERN = /^-?\(?\\d+d\\d+([+-]\\d+)?\)?$|^-?\d+d\d+([+-]\d+)?$/;

// ✅ CORRECT - Single backslashes for regex character classes
const DICE_PATTERN = /^-?\(?\d+d\d+([+-]\d+)?\)?$|^-?\d+d\d+([+-]\d+)?$/;
```

**Impact:** The broken regex in `convertModifiersToStateChanges()` doesn't match dice formulas like `-2d6`, so they leak into `stateChanges` object. OutcomeDisplay then detects unresolved dice in both `modifiers` array AND `stateChanges` object, keeping the Apply button disabled even after rolling.

---

## 📋 COMPLETE DATA FLOW MAP

### Events & Incidents Flow (Current Architecture)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER ROLLS SKILL CHECK                                       │
│    Phase Component: executeSkillCheck(skill)                    │
│    → CheckHandler executes PF2e roll                            │
│    → Returns: { outcome, actorName, rollBreakdown }             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. PHASE COMPONENT PROCESSES OUTCOME                            │
│    EventsPhase.svelte / UnrestPhase.svelte                      │
│                                                                  │
│    const outcomeData = controller.getEventModifiers(            │
│       event, outcome                                            │
│    );                                                           │
│    → Returns: {                                                 │
│         msg: string,                                            │
│         modifiers: EventModifier[],                             │
│         manualEffects: string[]                                 │
│      }                                                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. CONVERT MODIFIERS TO STATE CHANGES (🐛 BUG HERE!)           │
│    convertModifiersToStateChanges(outcomeData.modifiers)        │
│                                                                  │
│    Purpose: Filter out resource arrays & dice formulas          │
│    Bug: Broken regex doesn't match dice → leaks to output       │
│                                                                  │
│    Input:  [{ resource: 'gold', value: '-2d6' }]                │
│    Output: { gold: '-2d6' }  ← Should be {}                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. BUILD RESOLUTION OBJECT FOR DISPLAY                          │
│    eventResolution = {                                          │
│       outcome,                                                  │
│       actorName,                                                │
│       skillName: skill,                                         │
│       effect: outcomeData.msg,                                  │
│       stateChanges: stateChanges,  ← Contains dice!             │
│       modifiers: outcomeData.modifiers,  ← Also contains dice!  │
│       manualEffects: outcomeData.manualEffects                  │
│    }                                                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. OUTCOMEDISPLAY VALIDATION (Lines ~140-150)                  │
│                                                                  │
│    diceModifiers = detectDiceModifiers(modifiers)               │
│    → Finds: [{ resource: 'gold', value: '-2d6', index: 0 }]    │
│                                                                  │
│    stateChangeDice = detectStateChangeDice(stateChanges)        │
│    → Finds: [{ key: 'gold', formula: '-2d6' }]                 │
│                                                                  │
│    primaryButtonDisabled =                                      │
│       (hasDiceModifiers && !diceResolved) ||                    │
│       (hasStateChangeDice && !stateChangeDiceResolved)          │
│                                                                  │
│    Result: Button disabled waiting for BOTH to resolve!         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. USER ROLLS DICE                                              │
│    → Only resolves modifiers[0], not stateChanges['gold']       │
│    → Button stays disabled! 🐛                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 CURRENT STATE ANALYSIS

### Phase Controllers (EventPhaseController, UnrestPhaseController)

**Pattern:**
```typescript
getEventModifiers(event, outcome) {
  const outcomeData = event.effects[outcome];
  return {
    msg: outcomeData?.msg || '',
    modifiers: outcomeData?.modifiers || [],
    manualEffects: outcomeData?.manualEffects || []
  };
}
```

**Status:** ✅ **Consistent and working well**
- Clean delegation pattern
- Simple data extraction
- No business logic, just data mapping

### Phase Components (EventsPhase.svelte, UnrestPhase.svelte)

**Pattern:**
```typescript
// Get outcome data from controller
const outcomeData = controller.getEventModifiers(item, outcome);

// Convert to stateChanges (🐛 BROKEN HERE)
const stateChanges = convertModifiersToStateChanges(outcomeData.modifiers);

// Build resolution object
eventResolution = {
  outcome,
  actorName,
  skillName: skill,
  effect: outcomeData.msg,
  stateChanges: stateChanges,  // Passes filtered object
  modifiers: outcomeData.modifiers,  // Passes original array
  manualEffects: outcomeData.manualEffects
};
```

**Status:** ⚠️ **Working but fragile**
- Dual data passing (modifiers + stateChanges) creates confusion
- Relies on broken helper function
- Same pattern repeated in both EventsPhase and UnrestPhase

### Helper Functions (PhaseHelpers.ts)

**convertModifiersToStateChanges():**
```typescript
export function convertModifiersToStateChanges(
  modifiers: Array<{ resource: string | string[]; value: number | string }>
): Record<string, any> {
  const stateChanges = new Map<string, any>();
  const DICE_PATTERN = /^-?\(?\\d+d\\d+([+-]\\d+)?\)?$|^-?\d+d\d+([+-]\d+)?$/;  // 🐛 BUG!
  
  modifiers.forEach((mod) => {
    if (Array.isArray(mod.resource)) return;  // Skip arrays
    if (typeof mod.value === 'string' && DICE_PATTERN.test(mod.value)) return;  // Skip dice
    stateChanges.set(mod.resource, mod.value);
  });
  
  return Object.fromEntries(stateChanges);
}
```

**Status:** ❌ **BROKEN**
- Double backslashes in regex escape the pattern
- Doesn't match dice formulas
- Causes dual validation bug in OutcomeDisplay

### Resolution Services (DiceRollingService.ts)

**Dice Detection:**
```typescript
const DICE_PATTERN = /^-?\(?\d+d\d+([+-]\d+)?\)?$|^-?\d+d\d+([+-]\d+)?$/;  // ✅ CORRECT

export function detectDiceModifiers(modifiers) {
  return modifiers
    .map((m, index) => ({ ...m, originalIndex: index }))
    .filter(m => typeof m.value === 'string' && DICE_PATTERN.test(m.value));
}

export function detectStateChangeDice(stateChanges) {
  return Object.entries(stateChanges)
    .filter(([_, value]) => typeof value === 'string' && DICE_PATTERN.test(value))
    .map(([key, formula]) => ({ key, formula }));
}
```

**Status:** ✅ **Working correctly**
- Proper regex pattern
- Clean detection logic
- Correctly identifies dice in both structures

### OutcomeDisplay.svelte

**Validation Logic:**
```typescript
// Lines ~140-150
$: {
  // Detect dice in modifiers array
  const diceModifiers = detectDiceModifiers(modifiers?.filter(m => !Array.isArray(m.resource)));
  const hasDiceModifiers = diceModifiers.length > 0;
  const diceResolved = hasDiceModifiers && diceModifiers.every(m => resolvedDice.has(m.originalIndex));
  
  // Detect dice in stateChanges object (🐛 Should be empty but isn't!)
  const stateChangeDice = detectStateChangeDice(stateChanges);
  const hasStateChangeDice = stateChangeDice.length > 0;
  const stateChangeDiceResolved = hasStateChangeDice && stateChangeDice.every(d => resolvedDice.has(`state:${d.key}`));
  
  // Disable button if ANY dice unresolved
  primaryButtonDisabled = applied || 
    (hasDiceModifiers && !diceResolved) || 
    (hasStateChangeDice && !stateChangeDiceResolved);
}
```

**Status:** ⚠️ **Working as designed, but suffers from upstream bug**
- Correct dual validation (modifiers + stateChanges)
- BUT: stateChanges should never contain dice (broken helper causes it)
- Creates double validation requirement

---

## 📊 ARCHITECTURAL INCONSISTENCIES

### 1. Dual Data Passing Pattern

**Current:**
```typescript
// Phase passes BOTH to OutcomeDisplay
<OutcomeDisplay
  modifiers={outcomeData.modifiers}         // Original array
  stateChanges={stateChanges}               // Filtered object
/>
```

**Issues:**
- Redundant data representation
- Two sources of truth for same information
- Requires synchronization via helper function
- Helper function is broken (regex bug)

### 2. Resource Array Handling Evolution

**Old Pattern (Actions):**
- Resource arrays remained in `stateChanges`
- OutcomeDisplay manually detected and created choice buttons

**New Pattern (Events/Incidents):**
- `convertModifiersToStateChanges()` filters out resource arrays
- OutcomeDisplay auto-generates choices from `modifiers` array
- Choice buttons show preview with rolled values

**Status:** ✅ **New pattern is better, but needs cleanup**
- Single place to filter (helper function)
- But helper is broken and creates confusion

### 3. Dice Resolution Tracking

**Current:**
```typescript
// OutcomeDisplay tracks dice resolution in Map
resolvedDice: Map<number | string, number>

// Keys used:
// - Modifier index: 0, 1, 2, ...
// - StateChange key: "state:gold", "state:lumber", ...
```

**Issues:**
- Two different key formats for same concept
- Requires careful coordination
- Easy to have mismatches

---

## ✅ IMMEDIATE FIX

### Fix the Regex in PhaseHelpers.ts

```typescript
// Line ~147 in convertModifiersToStateChanges()
// BEFORE:
const DICE_PATTERN = /^-?\(?\\d+d\\d+([+-]\\d+)?\)?$|^-?\d+d\d+([+-]\d+)?$/;

// AFTER:
const DICE_PATTERN = /^-?\(?\d+d\d+([+-]\d+)?\)?$|^-?\d+d\d+([+-]\d+)?$/;
```

**Impact:**
- Dice formulas will be correctly filtered from `stateChanges`
- OutcomeDisplay will only validate dice in `modifiers` array
- Apply button will enable after rolling dice once
- **Fixes the immediate bug without architectural changes**

---

## 🏗️ PROPOSED CONSOLIDATION (Future)

### Goal: Eliminate Dual Data Passing

**Option 1: Pass Only Modifiers (Recommended)**

```typescript
// Phase Component
eventResolution = {
  outcome,
  actorName,
  skillName: skill,
  effect: outcomeData.msg,
  modifiers: outcomeData.modifiers,  // ✅ Single source
  manualEffects: outcomeData.manualEffects
};

// OutcomeDisplay
// - Compute displayStateChanges internally from modifiers
// - No need for phase to pre-filter
// - Single responsibility: Display knows how to display
```

**Benefits:**
- Single source of truth (modifiers array)
- No helper function needed in phase
- OutcomeDisplay owns display logic
- Simpler phase components

**Option 2: Pass Only StateChanges (Not Recommended)**

```typescript
// Would require transforming modifiers to stateChanges completely
// Loses original structure (array vs choice)
// Harder to distinguish resource arrays from single values
```

### Unified Service Architecture

```typescript
// src/services/resolution/OutcomeProcessingService.ts

export async function createOutcomeProcessingService() {
  return {
    /**
     * Extract outcome data from any item type
     * Works for events, incidents, actions
     */
    getOutcomeData(item: Event | Incident | Action, outcome: string) {
      const outcomeData = item.effects[outcome];
      return {
        msg: outcomeData?.msg || '',
        modifiers: outcomeData?.modifiers || [],
        manualEffects: outcomeData?.manualEffects || []
      };
    },
    
    /**
     * Build resolution object for OutcomeDisplay
     */
    buildResolutionObject(outcome, actorName, skillName, outcomeData) {
      return {
        outcome,
        actorName,
        skillName,
        effect: outcomeData.msg,
        modifiers: outcomeData.modifiers,
        manualEffects: outcomeData.manualEffects
      };
    }
  };
}
```

**Benefits:**
- Controllers delegate to service
- Consistent across all phase types
- Single place to update if structure changes
- Easier testing

---

## 📝 IMPLEMENTATION PLAN

### Phase 1: Immediate Bug Fix (NOW)

1. ✅ **Fix regex in PhaseHelpers.ts**
   - File: `src/controllers/shared/PhaseHelpers.ts`
   - Line: ~147
   - Change: Remove double backslashes
   - Test: Economic Crash incident with `-2d6` modifier

2. ✅ **Verify fix across all dice scenarios**
   - Test events with dice modifiers
   - Test incidents with dice modifiers  
   - Test multiple dice in same outcome
   - Test parenthetical dice: `-(1d4+1)`

### Phase 2: Code Consolidation (Next Sprint)

3. **Simplify data passing to OutcomeDisplay**
   - Remove `stateChanges` prop
   - Pass only `modifiers` array
   - Let OutcomeDisplay compute displayStateChanges internally
   - Update EventsPhase.svelte
   - Update UnrestPhase.svelte
   - Update ActionsPhase.svelte (if needed)

4. **Remove convertModifiersToStateChanges() helper**
   - No longer needed with simplified architecture
   - Logic moves to OutcomeDisplay (where it belongs)

5. **Create OutcomeProcessingService**
   - Consolidate outcome extraction logic
   - Update controllers to use service
   - Reduce duplication across EventPhaseController, UnrestPhaseController

### Phase 3: Testing & Documentation

6. **Integration tests**
   - Test all outcome types (events, incidents, actions)
   - Test all modifier types (numeric, dice, resource arrays)
   - Test choice selection + dice rolling combinations
   - Test shortage detection

7. **Update documentation**
   - Document simplified data flow
   - Update ARCHITECTURE_SUMMARY.md
   - Create OutcomeProcessingService documentation

---

## 🎯 SUCCESS CRITERIA

### Immediate (Phase 1)
- ✅ Economic Crash incident `-2d6` modifier works
- ✅ Apply button enables after rolling dice
- ✅ No regression in other outcome types

### Medium-term (Phase 2)
- ✅ Single data passing pattern (modifiers only)
- ✅ No helper functions needed in phase components
- ✅ OutcomeDisplay owns all display logic
- ✅ Consistent across all phase types

### Long-term (Phase 3)
- ✅ <5 lines of outcome-related code in phase components
- ✅ All business logic in controllers/services
- ✅ Easy to add new outcome types
- ✅ Clear separation of concerns

---

## 📚 REFERENCES

**Working Examples:**
- ✅ EventPhaseController.getEventModifiers() - Clean delegation
- ✅ DiceRollingService - Correct regex patterns
- ✅ OutcomeDisplay validation - Robust but over-complex due to dual data

**Problematic Areas:**
- ❌ PhaseHelpers.convertModifiersToStateChanges() - Broken regex
- ⚠️ Dual data passing (modifiers + stateChanges) - Unnecessary complexity

**Key Files:**
- `src/controllers/shared/PhaseHelpers.ts` - **FIX REGEX HERE**
- `src/services/resolution/DiceRollingService.ts` - Reference for correct patterns
- `src/view/kingdom/components/OutcomeDisplay/OutcomeDisplay.svelte` - Validation logic
- `src/view/kingdom/turnPhases/EventsPhase.svelte` - Data flow example
- `src/view/kingdom/turnPhases/UnrestPhase.svelte` - Data flow example
