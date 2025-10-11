# Outcome Handling Architecture Audit

**Date:** 2025-10-11  
**Status:** ✅ RESOLVED - Typed modifier system implemented

---

## 🎯 CURRENT STATE

### Typed Modifier System (Implemented)

The outcome handling system now uses explicit type discrimination instead of regex parsing:

```typescript
// src/types/modifiers.ts
export type EventModifier = StaticModifier | DiceModifier | ChoiceModifier;

// Type-safe discrimination
if (modifier.type === 'dice') {
  // Handle dice rolling
} else if (modifier.type === 'choice') {
  // Handle player choice
} else {
  // Handle static value
}
```

**Benefits:**
- ✅ No regex parsing needed
- ✅ TypeScript type safety
- ✅ Self-documenting data
- ✅ Explicit handling of each case

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

### Phase Controllers (EventPhaseController, UnrestPhaseController, ActionPhaseController)

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
- Returns typed modifiers (EventModifier[])
- No business logic, just data mapping

### Phase Components (EventsPhase.svelte, UnrestPhase.svelte, ActionsPhase.svelte)

**Pattern:**
```typescript
// Get outcome data from controller
const outcomeData = controller.getEventModifiers(item, outcome);

// Build resolution object with typed modifiers
eventResolution = {
  outcome,
  actorName,
  skillName: skill,
  effect: outcomeData.msg,
  modifiers: outcomeData.modifiers,  // EventModifier[] - typed array
  manualEffects: outcomeData.manualEffects
};
```

**Status:** ✅ **Clean and working**
- Single data source (typed modifiers)
- No helper functions needed
- Type safety through EventModifier union type
- Consistent across all phase components

### Helper Functions (PhaseHelpers.ts)

**Current Implementation:**
```typescript
// Svelte-specific helpers only
- usePhaseController() - Controller initialization
- usePF2eRollHandler() - Roll event handling
- getStepCompletion() - Step status helpers
- safePhaseInit() - Safe initialization
```

**Status:** ✅ **Refactored**
- No modifier conversion functions (no longer needed)
- Type-safe helpers for Svelte components
- Clean separation of concerns

### Resolution Services (DiceRollingService.ts)

**Type-Based Detection:**
```typescript
// No regex needed - use type discrimination
export function detectDiceModifiers(modifiers: EventModifier[]) {
  return modifiers
    .map((m, index) => ({ ...m, originalIndex: index }))
    .filter(m => m.type === 'dice');
}

export function detectChoiceModifiers(modifiers: EventModifier[]) {
  return modifiers
    .map((m, index) => ({ ...m, originalIndex: index }))
    .filter(m => m.type === 'choice');
}
```

**Status:** ✅ **Type-safe and clean**
- No regex patterns needed
- TypeScript type narrowing
- Explicit type checking via discriminant field

### OutcomeDisplay.svelte

**Validation Logic:**
```typescript
$: {
  // Detect dice modifiers by type
  const diceModifiers = modifiers?.filter(m => m.type === 'dice') || [];
  const hasDiceModifiers = diceModifiers.length > 0;
  const diceResolved = hasDiceModifiers && 
    diceModifiers.every((_, i) => resolvedDice.has(i));
  
  // Detect choice modifiers
  const choiceModifiers = modifiers?.filter(m => m.type === 'choice') || [];
  const hasChoices = choiceModifiers.length > 0;
  const choicesResolved = hasChoices && 
    choiceModifiers.every((_, i) => selectedResources.has(i));
  
  // Disable button if any unresolved
  primaryButtonDisabled = applied || 
    (hasDiceModifiers && !diceResolved) || 
    (hasChoices && !choicesResolved);
}
```

**Status:** ✅ **Type-safe and working**
- Single data source (modifiers array)
- Type discrimination for validation
- No dual validation confusion
- Clean resolution tracking

---

## 📊 CURRENT ARCHITECTURE

### 1. Single Data Source Pattern

**Implementation:**
```typescript
// Phase passes only typed modifiers
<OutcomeDisplay
  modifiers={outcomeData.modifiers}  // EventModifier[]
  manualEffects={outcomeData.manualEffects}
/>
```

**Benefits:**
- ✅ Single source of truth
- ✅ No data synchronization needed
- ✅ TypeScript type safety
- ✅ No helper functions required

### 2. Type-Based Modifier Handling

**Pattern:**
```typescript
// Type discrimination replaces pattern matching
modifiers.forEach(modifier => {
  switch (modifier.type) {
    case 'static':
      applyStatic(modifier);
      break;
    case 'dice':
      showDiceRoller(modifier);
      break;
    case 'choice':
      showChoiceUI(modifier);
      break;
  }
});
```

**Status:** ✅ **Clean and extensible**
- Explicit handling per type
- Easy to add new modifier types
- TypeScript ensures exhaustive checks

### 3. Resolution Tracking

**Current:**
```typescript
// Simple index-based tracking
resolvedDice: Map<number, number>        // modifier index → rolled value
selectedResources: Map<number, string>   // choice index → selected resource
```

**Benefits:**
- ✅ Single key format (modifier index)
- ✅ Clear ownership per modifier
- ✅ No key collision possible

---

## ✅ IMPLEMENTATION COMPLETE

### Typed Modifier System (DONE)

All phases have been migrated to the typed modifier system:

```typescript
// Single, type-safe data structure
eventResolution = {
  outcome,
  actorName,
  skillName: skill,
  effect: outcomeData.msg,
  modifiers: outcomeData.modifiers,  // EventModifier[]
  manualEffects: outcomeData.manualEffects
};
```

**Completed:**
1. ✅ All data files migrated to typed modifiers
2. ✅ TypeScript types created (`src/types/modifiers.ts`)
3. ✅ All phase components updated
4. ✅ Helper functions refactored (PhaseHelpers.ts)
5. ✅ OutcomeDisplay uses type discrimination
6. ✅ All outcome types tested and working

### Architecture Benefits

**Before (Regex-based):**
- String parsing with brittle patterns
- Dual data structures (modifiers + stateChanges)
- Complex validation logic
- Easy to introduce bugs

**After (Type-based):**
- Explicit type discrimination
- Single data source (typed modifiers)
- Simple validation through type checking
- Type-safe and maintainable

---

## 🎯 SUCCESS CRITERIA - ALL MET ✅

### Type Safety
- ✅ All modifiers use explicit `type` field
- ✅ TypeScript enforces correct structure
- ✅ No regex parsing needed
- ✅ Compile-time validation

### Architecture
- ✅ Single data passing pattern (EventModifier[])
- ✅ Clean separation of concerns
- ✅ OutcomeDisplay owns display logic
- ✅ Consistent across all phase types

### Maintainability
- ✅ Minimal outcome code in phase components
- ✅ Business logic in controllers/services
- ✅ Easy to add new modifier types
- ✅ Self-documenting data structures

---

## 📚 REFERENCES

**Core Type Definitions:**
- ✅ `src/types/modifiers.ts` - Hand-written modifier types
- ✅ `src/types/events.ts` - Auto-generated, imports from modifiers.ts
- ✅ `src/models/Modifiers.ts` - ActiveModifier for kingdom state

**Working Examples:**
- ✅ EventPhaseController.getEventModifiers() - Clean delegation
- ✅ DiceRollingService - Type-based detection
- ✅ OutcomeDisplay - Type-safe validation
- ✅ PhaseHelpers.ts - Svelte-specific utilities

**Key Files:**
- `src/types/modifiers.ts` - Core modifier type definitions
- `src/controllers/shared/PhaseHelpers.ts` - Refactored Svelte helpers
- `src/services/resolution/DiceRollingService.ts` - Type-based resolution
- `src/view/kingdom/components/OutcomeDisplay/OutcomeDisplay.svelte` - UI handling
- `src/view/kingdom/turnPhases/*.svelte` - Phase implementations
