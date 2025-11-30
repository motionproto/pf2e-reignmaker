# Svelte Reactivity Coding Standards

**Status:** MANDATORY - Core Stability Requirement  
**Last Updated:** 2025-11-30  
**Applies To:** All TypeScript/Svelte code that modifies kingdom state

---

## The Golden Rule

> **NEVER mutate objects or arrays inside `updateKingdom()` callbacks.**
> 
> **ALWAYS create new references through reassignment.**

---

## Why This Matters

### Svelte Reactivity Requires Reassignment

Svelte's reactivity system tracks **object and array references**, not their contents. When you mutate an array or object, the reference stays the same, so Svelte doesn't detect the change.

**This works:** ✅
```typescript
$: items = $kingdomData.pendingOutcomes;  // Top-level subscription
```

**This breaks:** ❌
```svelte
{#each items as item}
  {@const derived = compute(item)}  // Const reactive statement
{/each}
```

The const reactive statement only recalculates when `items` reference changes. Mutations like `.push()` don't change the reference.

### The Service Layer Must Be Bulletproof

Our service layer (OutcomePreviewService, GameCommandsService, etc.) must work with **ALL** Svelte reactive patterns:

- ✅ Top-level store subscriptions
- ✅ Derived stores
- ✅ Const reactive statements (`{@const}`)
- ✅ Reactive blocks (`$: {}`)
- ✅ Reactive declarations (`$: x = ...`)

**If you use mutations, you break fine-grained reactivity.**

---

## The Rules

### ❌ NEVER Do This

```typescript
await updateKingdom(kingdom => {
  // ❌ Array mutations
  kingdom.pendingOutcomes.push(item);
  kingdom.pendingOutcomes.unshift(item);
  kingdom.pendingOutcomes.splice(index, count);
  kingdom.pendingOutcomes[index] = item;
  kingdom.pendingOutcomes.pop();
  kingdom.pendingOutcomes.shift();
  
  // ❌ Object mutations
  item.status = 'resolved';
  item.appliedOutcome = data;
  kingdom.settlements[0].name = 'New Name';
  
  // ❌ Nested mutations
  kingdom.turnState.unrestPhase.incidentRoll = 10;
});
```

### ✅ ALWAYS Do This

```typescript
await updateKingdom(kingdom => {
  // ✅ Array additions
  kingdom.pendingOutcomes = [...kingdom.pendingOutcomes, item];
  kingdom.pendingOutcomes = [item, ...kingdom.pendingOutcomes];
  
  // ✅ Array removal
  kingdom.pendingOutcomes = kingdom.pendingOutcomes.filter(i => i.id !== itemId);
  
  // ✅ Array updates
  kingdom.pendingOutcomes = kingdom.pendingOutcomes.map(i =>
    i.id === itemId ? { ...i, status: 'resolved' } : i
  );
  
  // ✅ Specific index update
  const updated = [...kingdom.pendingOutcomes];
  updated[index] = { ...updated[index], status: 'resolved' };
  kingdom.pendingOutcomes = updated;
  
  // ✅ Object updates
  kingdom.turnState = {
    ...kingdom.turnState,
    unrestPhase: {
      ...kingdom.turnState.unrestPhase,
      incidentRoll: 10
    }
  };
});
```

---

## Common Patterns

### Pattern 1: Add Item to Array

```typescript
// ❌ BAD
kingdom.array.push(item);

// ✅ GOOD
kingdom.array = [...kingdom.array, item];
```

### Pattern 2: Remove Item from Array

```typescript
// ❌ BAD
const index = kingdom.array.findIndex(i => i.id === itemId);
kingdom.array.splice(index, 1);

// ✅ GOOD
kingdom.array = kingdom.array.filter(i => i.id !== itemId);
```

### Pattern 3: Update Item in Array

```typescript
// ❌ BAD
const item = kingdom.array.find(i => i.id === itemId);
item.status = 'resolved';

// ✅ GOOD
kingdom.array = kingdom.array.map(i =>
  i.id === itemId ? { ...i, status: 'resolved' } : i
);
```

### Pattern 4: Update Item at Specific Index

```typescript
// ❌ BAD
kingdom.array[index] = newItem;

// ✅ GOOD
const updated = [...kingdom.array];
updated[index] = newItem;
kingdom.array = updated;
```

### Pattern 5: Update Nested Object Property

```typescript
// ❌ BAD
kingdom.turnState.unrestPhase.incidentRoll = 10;

// ✅ GOOD
kingdom.turnState = {
  ...kingdom.turnState,
  unrestPhase: {
    ...kingdom.turnState.unrestPhase,
    incidentRoll: 10
  }
};
```

### Pattern 6: Conditional Updates

```typescript
// ❌ BAD
const item = kingdom.array.find(condition);
if (item) {
  item.property = value;
}

// ✅ GOOD
kingdom.array = kingdom.array.map(item =>
  condition(item) ? { ...item, property: value } : item
);
```

---

## Service Layer Requirements

### All Services MUST

1. **Use immutable patterns exclusively**
   - No exceptions, no "this one is fine"
   
2. **Work with all reactive patterns**
   - Test with const reactive statements
   - Test with derived stores
   - Test with reactive blocks

3. **Document mutation-free guarantee**
   ```typescript
   /**
    * Adds item to kingdom data
    * 
    * ✅ Mutation-free: Safe for all Svelte reactive patterns
    */
   async addItem(item: Item): Promise<void> {
     await updateKingdom(kingdom => {
       kingdom.items = [...kingdom.items, item];
     });
   }
   ```

### Service Layer Anti-Patterns

#### ❌ BAD: Exposing mutable references

```typescript
class MyService {
  getItems(): Item[] {
    return get(kingdomData).items;  // ❌ Caller can mutate!
  }
}
```

#### ✅ GOOD: Return immutable copies

```typescript
class MyService {
  getItems(): readonly Item[] {
    return [...get(kingdomData).items];  // ✅ Copy
  }
}
```

---

## Testing Requirements

### Test All Reactive Patterns

When implementing new features that modify kingdom state:

```svelte
<!-- Test Setup -->
<script>
  // Pattern 1: Top-level subscription (baseline)
  $: items = $kingdomData.items;
  
  // Pattern 2: Const reactive statement (strict test)
  {#each items as item}
    {@const status = computeStatus(item)}
    <div>{status}</div>
  {/each}
  
  // Pattern 3: Derived store (intermediate test)
  const itemCount = derived(kingdomData, $k => $k.items?.length || 0);
  
  // Pattern 4: Reactive block (comprehensive test)
  $: {
    const filtered = items.filter(condition);
    console.log('Filtered count:', filtered.length);
  }
</script>
```

**All patterns must update when you call the service method.**

If Pattern 2-4 don't update, you're using mutations.

---

## Migration Guide

### Finding Mutations in Your Code

```bash
# Search for array mutations
grep -rn "\.push\(" src/services/
grep -rn "\.splice\(" src/services/
grep -rn "\[.*\] =" src/services/

# Search for object mutations (rough heuristic)
grep -rn "\.\w\+ =" src/services/ | grep -v "const\|let\|var"
```

### Fixing Mutations

1. **Identify the mutation**
   ```typescript
   kingdom.items.push(item);  // Found it!
   ```

2. **Replace with immutable pattern**
   ```typescript
   kingdom.items = [...kingdom.items, item];
   ```

3. **Test all reactive patterns**
   - Top-level subscription
   - Const reactive statements
   - Derived stores

4. **Document the guarantee**
   ```typescript
   /**
    * ✅ Mutation-free
    */
   ```

---

## Helper Utilities

### ImmutableUpdateHelper (Proposed)

```typescript
/**
 * Helper utilities for immutable updates
 */
export class ImmutableUpdateHelper {
  static addToArray<T>(array: T[], item: T): T[] {
    return [...array, item];
  }
  
  static updateInArray<T>(
    array: T[],
    predicate: (item: T) => boolean,
    updater: (item: T) => T
  ): T[] {
    return array.map(item => predicate(item) ? updater(item) : item);
  }
  
  static removeFromArray<T>(
    array: T[],
    predicate: (item: T) => boolean
  ): T[] {
    return array.filter(item => !predicate(item));
  }
  
  static updateObject<T extends object, K extends keyof T>(
    obj: T,
    updates: Partial<T>
  ): T {
    return { ...obj, ...updates };
  }
}
```

**Usage:**
```typescript
await updateKingdom(kingdom => {
  kingdom.items = ImmutableUpdateHelper.addToArray(kingdom.items, newItem);
});
```

---

## Exceptions

### There Are No Exceptions

Mutations are **never** acceptable in `updateKingdom()` callbacks. This is a hard rule.

If you think you need an exception, you're solving the wrong problem. Refactor your approach.

---

## Enforcement

### Manual Review

All PRs that touch kingdom state must be reviewed for mutations.

Reviewers should:
1. Search for mutation patterns
2. Request immutable refactoring
3. Verify tests include const reactive statements

### Automated Linting (Future)

```json
{
  "rules": {
    "@custom/no-mutations-in-updateKingdom": "error"
  }
}
```

---

## References

- [Svelte Reactivity Tutorial](https://svelte.dev/tutorial/reactive-assignments)
- [Svelte Store Contract](https://svelte.dev/docs#run-time-svelte-store)
- **Audit Task:** `docs/todo/svelte-reactivity-audit.md`
- **Incident Case Study:** Outcome display not appearing due to mutations

---

## Summary

1. **Never mutate** arrays/objects in `updateKingdom()`
2. **Always reassign** to trigger reactivity
3. **Test with const reactive statements** - strictest test
4. **Document mutation-free guarantee** in service methods
5. **No exceptions** - this is a hard architectural requirement

Following these rules ensures the service layer works reliably with **all** Svelte reactive patterns, making the codebase more robust and predictable.

