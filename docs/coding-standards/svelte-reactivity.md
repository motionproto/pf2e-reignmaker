# Svelte Reactivity Coding Standards

**Status:** MANDATORY - Core Stability Requirement  
**Last Updated:** 2025-12-10  
**Applies To:** All TypeScript/Svelte code that modifies kingdom state

---

## The Golden Rule

> **NEVER mutate objects or arrays inside `updateKingdom()` callbacks.**
> 
> **ALWAYS create new references through reassignment.**

---

## Why This Matters

Svelte's reactivity system tracks **object and array references**, not their contents. Mutations don't change references, so Svelte doesn't detect the change.

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

Const reactive statements only recalculate when `items` reference changes. Mutations like `.push()` don't change the reference.

### Service Layer Must Be Bulletproof

Our services must work with ALL Svelte reactive patterns:
- ✅ Top-level store subscriptions
- ✅ Derived stores
- ✅ Const reactive statements (`{@const}`)
- ✅ Reactive blocks (`$:`)

**If you use mutations, you break fine-grained reactivity.**

---

## The Rules

### ❌ NEVER Do This

```typescript
await updateKingdom(kingdom => {
  // ❌ Array mutations
  kingdom.array.push(item);
  kingdom.array.splice(index, 1);
  kingdom.array[index] = item;
  
  // ❌ Object mutations
  item.status = 'resolved';
  kingdom.turnState.unrestPhase.incidentRoll = 10;
});
```

### ✅ ALWAYS Do This

```typescript
await updateKingdom(kingdom => {
  // ✅ Array operations
  kingdom.array = [...kingdom.array, item];                    // Add
  kingdom.array = kingdom.array.filter(i => i.id !== itemId); // Remove
  kingdom.array = kingdom.array.map(i =>                       // Update
    i.id === itemId ? { ...i, status: 'resolved' } : i
  );
  
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

### Array Operations

```typescript
// Add
kingdom.array = [...kingdom.array, item];

// Remove
kingdom.array = kingdom.array.filter(i => i.id !== itemId);

// Update
kingdom.array = kingdom.array.map(i =>
  i.id === itemId ? { ...i, status: 'resolved' } : i
);

// Update at index
const updated = [...kingdom.array];
updated[index] = { ...updated[index], status: 'resolved' };
kingdom.array = updated;
```

### Object Updates

```typescript
// Shallow update
kingdom.obj = { ...kingdom.obj, property: value };

// Nested update
kingdom.turnState = {
  ...kingdom.turnState,
  unrestPhase: {
    ...kingdom.turnState.unrestPhase,
    incidentRoll: 10
  }
};

// Conditional update
kingdom.array = kingdom.array.map(item =>
  condition(item) ? { ...item, property: value } : item
);
```

---

## Service Layer Requirements

### All Services MUST

1. **Use immutable patterns exclusively** - No exceptions
2. **Work with all reactive patterns** - Test with const reactive statements
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

### Anti-Patterns

```typescript
// ❌ BAD: Exposing mutable references
getItems(): Item[] {
  return get(kingdomData).items;  // Caller can mutate!
}

// ✅ GOOD: Return immutable copies
getItems(): readonly Item[] {
  return [...get(kingdomData).items];
}
```

---

## Testing Requirements

Test all reactive patterns when implementing new features:

```svelte
<script>
  // Pattern 1: Top-level subscription (baseline)
  $: items = $kingdomData.items;
  
  // Pattern 2: Const reactive statement (strictest test)
  {#each items as item}
    {@const status = computeStatus(item)}
    <div>{status}</div>
  {/each}
  
  // Pattern 3: Derived store
  const itemCount = derived(kingdomData, $k => $k.items?.length || 0);
  
  // Pattern 4: Reactive block
  $: {
    const filtered = items.filter(condition);
    console.log('Filtered count:', filtered.length);
  }
</script>
```

**All patterns must update when you call the service method.**

If patterns 2-4 don't update, you're using mutations.

---

## Finding and Fixing Mutations

### Find Mutations

```bash
# Search for array mutations
grep -rn "\.push\(" src/services/
grep -rn "\.splice\(" src/services/
grep -rn "\[.*\] =" src/services/
```

### Fix Mutations

1. **Identify:** `kingdom.items.push(item);`
2. **Replace:** `kingdom.items = [...kingdom.items, item];`
3. **Test:** All reactive patterns update
4. **Document:** `✅ Mutation-free`

---

## Helper Utilities (Optional)

```typescript
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
}
```

---

## Exceptions

### There Are No Exceptions

Mutations are **never** acceptable in `updateKingdom()` callbacks.

If you think you need an exception, refactor your approach.

---

## Enforcement

### Code Review Checklist

All PRs that touch kingdom state must:
- ✅ Use immutable patterns exclusively
- ✅ Include tests with const reactive statements
- ✅ Document mutation-free guarantee

### Future: Automated Linting

```json
{
  "rules": {
    "@custom/no-mutations-in-updateKingdom": "error"
  }
}
```

---

## Summary

1. **Never mutate** - Arrays/objects in `updateKingdom()`
2. **Always reassign** - Create new references
3. **Test strictly** - Use const reactive statements
4. **Document guarantee** - `✅ Mutation-free` in service methods
5. **No exceptions** - Hard architectural requirement

Following these rules ensures services work reliably with **all** Svelte reactive patterns.

---

## References

- [Svelte Reactivity Tutorial](https://svelte.dev/tutorial/reactive-assignments)
- [Svelte Store Contract](https://svelte.dev/docs#run-time-svelte-store)
