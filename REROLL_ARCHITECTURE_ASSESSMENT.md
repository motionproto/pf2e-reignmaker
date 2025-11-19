# Reroll Architecture Assessment

## Executive Summary

**Status:** ⚠️ **NEEDS FIXES** - Architecture has several inconsistencies and potential race conditions

**Key Issues Found:**
1. ❌ Incomplete parameter passing chain (enabledModifiers lost in BaseCheckCard)
2. ❌ Mixed state management (module-scoped + parameter passing)
3. ⚠️ No validation that stored modifiers were applied
4. ⚠️ Race condition between state clearing and reroll execution

---

## Complete Data Flow Map

### 1. User Initiates Reroll (OutcomeDisplay.svelte)

```typescript
// OutcomeActions.svelte
function handleReroll() {
  dispatch('reroll');  // ✅ Simple event, no data
}

// OutcomeDisplay.svelte
async function handleReroll() {
  // ✅ Check fame
  const fameCheck = await canRerollWithFame();
  if (!fameCheck.canReroll) return;
  
  // ✅ Deduct fame
  const deductResult = await deductFameForReroll();
  if (!deductResult.success) return;
  
  // ✅ Extract modifiers (CORRECT: Now preserves kingdom + custom modifiers)
  const enabledModifiers: Array<{ label: string; modifier: number }> = [];
  if (rollBreakdown?.modifiers) {
    for (const mod of rollBreakdown.modifiers) {
      if (mod.enabled === true) {
        // Kingdom modifiers: Unrest, Infrastructure, Aid
        const isKingdomModifier = /* ... */;
        // Custom modifiers: Player-added
        const isCustomModifier = (mod as any).custom === true;
        
        if (isKingdomModifier || isCustomModifier) {
          enabledModifiers.push({
            label: mod.label,
            modifier: mod.modifier
          });
        }
      }
    }
  }
  
  // ✅ Store modifiers (module-scoped state)
  const { storeModifiersForReroll } = await import('../../../../services/pf2e/PF2eSkillService');
  storeModifiersForReroll(enabledModifiers);
  
  // ✅ Clear resolution state
  if (instance) {
    await clearInstanceResolutionState(instance.instanceId);
  }
  componentResolutionData = null;
  
  // ⚠️ ISSUE: enabledModifiers NOT passed to parent
  dispatch('performReroll', { 
    skill: skillName,
    previousFame: deductResult.previousFame
    // ❌ Missing: enabledModifiers
  });
}
```

**Issue #1:** `enabledModifiers` extracted but not passed to parent. Relies entirely on module-scoped state.

---

### 2. Event Bubbles to BaseCheckCard

```typescript
// BaseCheckCard.svelte
function handlePerformReroll(event: CustomEvent) {
  const { skill, previousFame } = event.detail;  // ❌ enabledModifiers not destructured
  dispatch('performReroll', {
    checkId: id,
    skill,
    previousFame,
    checkType
    // ❌ enabledModifiers NOT forwarded
  });
}
```

**Issue #2:** BaseCheckCard doesn't forward `enabledModifiers` even if it were passed.

---

### 3. Event Reaches Phase Component (EventsPhase.svelte)

```typescript
// EventsPhase.svelte
async function handlePerformReroll(event: CustomEvent) {
  if (!currentEvent) return;
  const { skill, previousFame, enabledModifiers } = event.detail;  // ✅ Tries to extract
  
  // ✅ Clear UI state
  await handleCancel();
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // ⚠️ ISSUE: enabledModifiers will be undefined (not passed from BaseCheckCard)
  try {
    await executeSkillCheck(skill, null, enabledModifiers);  // ❌ undefined passed
  } catch (error) {
    // ✅ Restore fame on error
    const { restoreFameAfterFailedReroll } = await import('../../../controllers/shared/RerollHelpers');
    if (previousFame !== undefined) {
      await restoreFameAfterFailedReroll(previousFame);
    }
    ui?.notifications?.error('Failed to reroll. Fame has been restored.');
  }
}

async function executeSkillCheck(skill: string, targetInstanceId: string | null = null, enabledModifiers?: string[]) {
  // ❌ WRONG TYPE: enabledModifiers should be Array<{ label: string; modifier: number }>
  // Not string[]!
  
  await checkHandler.executeCheck({
    checkType: 'event',
    item: currentEvent,
    skill,
    enabledModifiers,  // ⚠️ Passed but wrong type and undefined anyway
    // ...
  });
}
```

**Issue #3:** Parameter type mismatch - expects `string[]` but should be `Array<{ label: string; modifier: number }>`.
**Issue #4:** Parameter will be undefined because BaseCheckCard doesn't forward it.

---

### 4. CheckHandler Receives Parameters

```typescript
// CheckHandler doesn't use enabledModifiers at all
// It relies entirely on PF2eSkillService's module-scoped state
```

**Issue #5:** Parameter chain is broken - even if passed correctly, CheckHandler ignores it.

---

### 5. PF2eSkillService Applies Stored Modifiers

```typescript
// PF2eSkillService.ts
let lastRollModifiers: Array<{ label: string; modifier: number }> | null = null;

export function storeModifiersForReroll(modifiers: Array<{ label: string; modifier: number }>) {
  lastRollModifiers = modifiers;  // ✅ Stored
}

async performKingdomSkillCheck(...) {
  // Get kingdom modifiers
  const kingdomModifiers = await this.getKingdomModifiers(skillName, actionId, checkType);
  
  // ✅ Apply stored modifiers from previous roll (for rerolls)
  if (lastRollModifiers && lastRollModifiers.length > 0) {
    const matchedLabels = new Set<string>();
    
    // Enable existing modifiers that match
    for (const mod of kingdomModifiers) {
      const previousMod = lastRollModifiers.find(m => m.label === mod.name);
      if (previousMod) {
        mod.enabled = true;
        matchedLabels.add(mod.name);
      }
    }
    
    // Add custom modifiers not in our list
    for (const prevMod of lastRollModifiers) {
      if (!matchedLabels.has(prevMod.label)) {
        kingdomModifiers.push({
          name: prevMod.label,
          value: prevMod.modifier,
          type: 'circumstance',
          enabled: true
        });
      }
    }
    
    // ✅ Clear after use
    lastRollModifiers = null;
  }
  
  // Convert and roll
  const pf2eModifiers = this.convertToPF2eModifiers(kingdomModifiers);
  const rollResult = await skill.roll({ modifiers: pf2eModifiers, ... });
  return rollResult;
}
```

**Current State:** ✅ Works via module-scoped state, but fragile.

---

## Issues Summary

### Critical Issues

1. **❌ Broken Parameter Chain**
   - `enabledModifiers` extracted in OutcomeDisplay but not passed to parent
   - BaseCheckCard doesn't forward it
   - EventsPhase expects it but receives undefined
   - Type mismatch: `string[]` vs `Array<{ label: string; modifier: number }>`

2. **❌ Mixed State Management**
   - Primary: Module-scoped `lastRollModifiers` (PF2eSkillService)
   - Secondary: Attempted parameter passing (broken)
   - Creates confusion and maintenance burden

### Medium Priority Issues

3. **⚠️ No Validation**
   - No confirmation that stored modifiers were actually applied
   - Silent failure if module state is cleared unexpectedly

4. **⚠️ Race Condition Risk**
   - `clearInstanceResolutionState()` is async
   - Next roll might start before state is fully cleared
   - 100ms delay in EventsPhase is a band-aid, not a solution

5. **⚠️ Missing Error Recovery**
   - If modifier extraction fails, reroll proceeds with no modifiers
   - No notification to user that context was lost

### Low Priority Issues

6. **⚠️ Global State Pollution**
   - Module-scoped `lastRollModifiers` persists across all checks
   - Could leak between different events/actions if timing is unlucky

---

## Recommended Architecture

### Option A: Pure Module-Scoped (Current + Cleanup)

**Keep module-scoped state but remove broken parameter chain:**

```typescript
// OutcomeDisplay.svelte - NO CHANGE (already correct)
dispatch('performReroll', { 
  skill: skillName,
  previousFame: deductResult.previousFame
  // DON'T pass enabledModifiers
});

// BaseCheckCard.svelte - NO CHANGE
// EventsPhase.svelte - REMOVE enabledModifiers parameter
async function handlePerformReroll(event: CustomEvent) {
  const { skill, previousFame } = event.detail;  // ✅ Only these
  await handleCancel();
  await new Promise(resolve => setTimeout(resolve, 100));
  
  try {
    await executeSkillCheck(skill, null);  // ✅ No enabledModifiers param
  } catch (error) {
    // Restore fame...
  }
}

async function executeSkillCheck(skill: string, targetInstanceId: string | null = null) {
  // ✅ Remove enabledModifiers parameter entirely
  await checkHandler.executeCheck({
    checkType: 'event',
    item: currentEvent,
    skill,
    // NO enabledModifiers
  });
}
```

**Pros:**
- ✅ Minimal changes
- ✅ Already works via module state
- ✅ Removes confusion

**Cons:**
- ❌ Global state pollution risk
- ❌ Hard to test
- ❌ No validation

---

### Option B: Pure Parameter Passing (Clean Architecture)

**Remove module state, pass modifiers explicitly:**

```typescript
// OutcomeDisplay.svelte
dispatch('performReroll', { 
  skill: skillName,
  previousFame: deductResult.previousFame,
  preservedModifiers: enabledModifiers  // ✅ Pass explicitly
});

// BaseCheckCard.svelte
function handlePerformReroll(event: CustomEvent) {
  const { skill, previousFame, preservedModifiers } = event.detail;
  dispatch('performReroll', {
    checkId: id,
    skill,
    previousFame,
    preservedModifiers,  // ✅ Forward
    checkType
  });
}

// EventsPhase.svelte
async function handlePerformReroll(event: CustomEvent) {
  const { skill, previousFame, preservedModifiers } = event.detail;
  await handleCancel();
  
  try {
    await executeSkillCheck(skill, null, preservedModifiers);
  } catch (error) {
    // Restore fame...
  }
}

async function executeSkillCheck(
  skill: string, 
  targetInstanceId: string | null = null,
  preservedModifiers?: Array<{ label: string; modifier: number }>
) {
  await checkHandler.executeCheck({
    checkType: 'event',
    item: currentEvent,
    skill,
    preservedModifiers,  // ✅ Pass to handler
  });
}

// CheckHandler - NEW
interface CheckOptions {
  preservedModifiers?: Array<{ label: string; modifier: number }>;
  // ...
}

// PF2eSkillService - REMOVE module state, accept parameter
async performKingdomSkillCheck(
  skillName: string,
  checkType: 'action' | 'event' | 'incident',
  checkName: string,
  checkId: string,
  checkEffects?: any,
  actionId?: string,
  callback?: Function,
  preservedModifiers?: Array<{ label: string; modifier: number }>  // ✅ NEW
) {
  const kingdomModifiers = await this.getKingdomModifiers(...);
  
  // ✅ Apply preserved modifiers if provided
  if (preservedModifiers && preservedModifiers.length > 0) {
    // Same logic as before but from parameter, not module state
  }
  
  const pf2eModifiers = this.convertToPF2eModifiers(kingdomModifiers);
  return await skill.roll({ modifiers: pf2eModifiers, ... });
}
```

**Pros:**
- ✅ Clean architecture
- ✅ Testable
- ✅ No global state
- ✅ Explicit data flow

**Cons:**
- ❌ Larger refactor
- ❌ Touches many files

---

## Recommendation

**Go with Option A (Pure Module-Scoped + Cleanup)**

**Reasoning:**
1. System already works via module state
2. Minimal risk of breaking changes
3. Can validate and add safeguards without major refactor
4. Can upgrade to Option B later if needed

**Immediate Fixes:**

1. **Remove broken parameter chain** (EventsPhase.svelte)
2. **Add validation** to PF2eSkillService
3. **Fix race condition** with proper async/await
4. **Add user notification** if modifiers fail to apply

---

## Action Items

### High Priority

- [ ] Remove `enabledModifiers` parameter from EventsPhase.executeSkillCheck()
- [ ] Remove `enabledModifiers` from ActionsPhase and UnrestPhase (same issue)
- [ ] Add validation in PF2eSkillService that modifiers were applied
- [ ] Add error notification if modifier extraction fails

### Medium Priority

- [ ] Fix race condition: await clearInstanceResolutionState before dispatching
- [ ] Add timeout to clear `lastRollModifiers` if not used within 5 seconds
- [ ] Add console logging for modifier preservation (debug mode only)

### Low Priority

- [ ] Document reroll flow in architecture docs
- [ ] Add unit tests for modifier extraction logic
- [ ] Consider Option B refactor for v2.0

---

## Testing Checklist

When fixes are applied, verify:

- [ ] Reroll preserves unrest penalty
- [ ] Reroll preserves infrastructure bonuses (e.g., "Capital Courthouse")
- [ ] Reroll preserves aid bonuses
- [ ] Reroll preserves custom player-added modifiers
- [ ] Reroll does NOT preserve ability scores
- [ ] Reroll does NOT preserve proficiency
- [ ] Reroll does NOT preserve level bonus
- [ ] Fame is deducted correctly
- [ ] Fame is restored on error
- [ ] Multiple rerolls in sequence work correctly
- [ ] Reroll works for events, incidents, and actions
- [ ] No modifier leakage between different checks

---

## Conclusion

The reroll system **works in practice** but has **architectural inconsistencies** that create maintenance risk. The broken parameter chain should be removed to avoid confusion. The module-scoped state approach is acceptable for now but should be documented and validated.

**Risk Level:** Medium - Works but fragile
**Effort to Fix:** Low (cleanup broken chain) to High (full refactor to Option B)
**Recommended:** Low-effort cleanup (Option A)
