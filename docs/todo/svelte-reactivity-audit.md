# Svelte Reactivity Audit & Architecture Fix

**Priority:** HIGH - Affects core stability  
**Status:** In Progress  
**Created:** 2025-11-30

## Problem Statement

The OutcomePreviewService was using **imperative mutations** (`.push()`, direct property assignment) which breaks Svelte reactivity patterns. This is a **service-layer architectural issue**, not a phase-specific problem.

### Why This Matters

The service layer should provide a **bulletproof interface** that works with ANY reactive pattern:
- ✅ Top-level store subscriptions (`$kingdomData.pendingOutcomes`)
- ✅ Derived stores (`$: derived = ...`)
- ✅ Const reactive statements (`{@const x = ...}`)
- ✅ Reactive blocks (`$: { ... }`)

Currently, the service relies on **Foundry's flag update** triggering store updates, which only works for top-level subscriptions. Fine-grained reactivity (const statements, derived stores) requires **array/object reassignment**.

## Root Cause

### The Anti-Pattern

```typescript
// ❌ BAD: Mutation doesn't change reference
await updateKingdom(kingdom => {
  kingdom.pendingOutcomes.push(preview);      // No reference change
  preview.status = 'resolved';                 // No reference change
  kingdom.pendingOutcomes[index] = updated;   // No reference change
});
```

### Why Actions Worked

```svelte
<!-- ActionsPhase.svelte - Works because of top-level subscription -->
$: currentActionInstances = ($kingdomData.pendingOutcomes || [])
```

When `updateKingdom()` → `setFlag()` → Foundry update → **entire `$kingdomData` object changes** → reactivity triggers.

### Why Incidents Failed

```svelte
<!-- IncidentDebugPanel.svelte - Breaks with const reactive statements -->
{#each incidents as incident}
  {@const preview = getIncidentPreview(incident)}  <!-- Only recalculates on array reference change -->
```

Const reactive statements inside `{#each}` **only recalculate when the array reference changes**. Mutations don't change the reference.

## Immediate Fixes Applied

### Files Fixed (2025-11-30)

1. **OutcomePreviewService.ts** (3 locations)
   - ✅ `createInstance()` - line 46
   - ✅ `storeOutcome()` - lines 121-142
   - ✅ `createMinimalOutcomePreview()` - lines 387-399

### Pattern Applied

```typescript
// ✅ GOOD: Reassignment triggers all reactivity patterns
await updateKingdom(kingdom => {
  // Adding items
  kingdom.pendingOutcomes = [...kingdom.pendingOutcomes, newItem];
  
  // Updating items
  const updated = [...kingdom.pendingOutcomes];
  updated[index] = { ...updated[index], newProperty: value };
  kingdom.pendingOutcomes = updated;
  
  // Filtering
  kingdom.pendingOutcomes = kingdom.pendingOutcomes.filter(condition);
});
```

## Full Audit Required

### Phase 1: Identify All Mutations ✅ PRIORITY

Search entire codebase for mutation patterns in `updateKingdom()` calls:

```bash
# Search for array mutations
grep -r "\.push\(" src/ --include="*.ts" --include="*.svelte"
grep -r "\[.*\] =" src/ --include="*.ts" --include="*.svelte"
grep -r "\.unshift\(" src/ --include="*.ts" --include="*.svelte"
grep -r "\.splice\(" src/ --include="*.ts" --include="*.svelte"

# Search for object mutations
grep -r "\.\w\+ =" src/ --include="*.ts" --include="*.svelte" | grep -v "const\|let\|var"
```

**Focus Areas:**
- [ ] All services (`src/services/`)
- [ ] All controllers (`src/controllers/`)
- [ ] Phase components (`src/view/kingdom/turnPhases/`)
- [ ] Shared utilities (`src/utils/`)

### Phase 2: Service Layer Hardening

**Goal:** Make ALL service methods use immutable patterns by default.

#### 2.1 OutcomePreviewService Audit
- [x] `createInstance()` - FIXED
- [x] `storeOutcome()` - FIXED  
- [x] `createMinimalOutcomePreview()` - FIXED
- [x] `markApplied()` - Already uses `.map()`
- [x] `clearCompleted()` - Already uses `.filter()`
- [x] `clearInstance()` - Already uses `.filter()`
- [ ] `updateShortfallResources()` - **NEEDS AUDIT**

#### 2.2 Other Core Services
- [ ] **GameCommandsService** - Army/settlement/structure operations
- [ ] **TerritoryService** - Hex operations
- [ ] **ModifierService** - Modifier array operations
- [ ] **ActionLogService** - Action tracking
- [ ] **FactionService** - Faction operations
- [ ] **EventService** - Event operations

### Phase 3: Controller Audit

**Controllers should delegate to services, not manipulate kingdom data directly.**

- [ ] **UnrestPhaseController** - Incident handling
- [ ] **EventsPhaseController** - Event handling  
- [ ] **ResourcesPhaseController** - Resource phase
- [ ] **StatusPhaseController** - Status phase
- [ ] **UpkeepPhaseController** - Upkeep phase
- [ ] **GameCommandsResolver** - Command execution

### Phase 4: Component Audit

**Components should NEVER call `updateKingdom()` directly - only through services/controllers.**

- [ ] All phase components (`turnPhases/*.svelte`)
- [ ] All tab components (`tabs/**/*.svelte`)
- [ ] All shared components (`components/**/*.svelte`)

## Proposed Architectural Improvements

### 1. Create `ImmutableUpdateHelper`

```typescript
/**
 * Helper service to enforce immutable update patterns
 */
export class ImmutableUpdateHelper {
  /**
   * Add item to array (immutably)
   */
  static addToArray<T>(array: T[], item: T): T[] {
    return [...array, item];
  }
  
  /**
   * Update item in array (immutably)
   */
  static updateInArray<T>(array: T[], index: number, updater: (item: T) => T): T[] {
    const updated = [...array];
    updated[index] = updater(updated[index]);
    return updated;
  }
  
  /**
   * Update item in array by predicate (immutably)
   */
  static updateWhere<T>(
    array: T[],
    predicate: (item: T) => boolean,
    updater: (item: T) => T
  ): T[] {
    return array.map(item => predicate(item) ? updater(item) : item);
  }
  
  /**
   * Update nested object property (immutably)
   */
  static updateProperty<T extends object, K extends keyof T>(
    obj: T,
    key: K,
    value: T[K]
  ): T {
    return { ...obj, [key]: value };
  }
  
  /**
   * Deep update nested object (immutably)
   */
  static deepUpdate<T extends object>(obj: T, path: string[], value: any): T {
    const [first, ...rest] = path;
    if (rest.length === 0) {
      return { ...obj, [first]: value };
    }
    return {
      ...obj,
      [first]: this.deepUpdate((obj as any)[first], rest, value)
    };
  }
}
```

### 2. Update `updateKingdom` Type Safety

```typescript
/**
 * RULE: All updates must be immutable
 * 
 * This type helper enforces immutable patterns at compile time
 */
type ImmutableUpdater<T> = (value: Readonly<T>) => T;

export async function updateKingdom(
  updater: ImmutableUpdater<KingdomData>
): Promise<void> {
  // Implementation remains the same, but TypeScript enforces immutability
}
```

### 3. Lint Rule (ESLint Plugin)

```json
{
  "rules": {
    "no-array-mutation-in-updateKingdom": "error",
    "no-object-mutation-in-updateKingdom": "error"
  }
}
```

### 4. Update Service Layer Contract

**All services MUST:**
1. ✅ Use immutable update patterns
2. ✅ Never mutate arrays/objects
3. ✅ Return new references on all updates
4. ✅ Work with any Svelte reactive pattern

## Coding Standards Update

### New Rule: Immutable Updates

**Location:** Create `docs/coding-standards/svelte-reactivity.md`

```markdown
# Svelte Reactivity Standards

## Rule: Always Use Immutable Updates

### Why

Svelte reactivity requires **reassignment** to trigger updates. Mutations don't change object/array references, so fine-grained reactive patterns (const statements, derived stores) won't recalculate.

### The Rule

**In `updateKingdom()` callbacks, NEVER:**
- ❌ `array.push(item)`
- ❌ `array.unshift(item)`
- ❌ `array.splice(index, count)`
- ❌ `array[index] = value`
- ❌ `object.property = value`
- ❌ Direct mutations of any kind

**Instead, ALWAYS reassign:**
- ✅ `array = [...array, item]`
- ✅ `array = [item, ...array]`
- ✅ `array = array.filter(condition)`
- ✅ `array = array.map(transform)`
- ✅ `object = { ...object, property: value }`

### Examples

#### ❌ BAD
```typescript
await updateKingdom(kingdom => {
  kingdom.pendingOutcomes.push(preview);
  preview.status = 'resolved';
  kingdom.settlements[0].name = 'New Name';
});
```

#### ✅ GOOD
```typescript
await updateKingdom(kingdom => {
  kingdom.pendingOutcomes = [...kingdom.pendingOutcomes, preview];
  
  kingdom.pendingOutcomes = kingdom.pendingOutcomes.map(p =>
    p.previewId === preview.previewId
      ? { ...p, status: 'resolved' }
      : p
  );
  
  kingdom.settlements = kingdom.settlements.map((s, i) =>
    i === 0 ? { ...s, name: 'New Name' } : s
  );
});
```

### Testing Reactivity

When implementing new features, test with BOTH reactive patterns:

```svelte
<!-- Pattern 1: Top-level subscription (always works) -->
$: items = $kingdomData.pendingOutcomes

<!-- Pattern 2: Const reactive statement (requires reassignment) -->
{#each items as item}
  {@const derived = computeValue(item)}
{/each}
```

Both must work. If Pattern 2 fails, you're using mutations.
```

## Testing Plan

### 1. Create Test Harness

```typescript
/**
 * Test that service methods trigger all reactive patterns
 */
describe('OutcomePreviewService Reactivity', () => {
  it('triggers top-level subscriptions', async () => {
    const values: any[] = [];
    kingdomData.subscribe(v => values.push(v.pendingOutcomes));
    
    await service.createInstance(...);
    
    expect(values.length).toBe(2); // Initial + update
  });
  
  it('triggers derived stores', async () => {
    const derived = derived(kingdomData, $k => $k.pendingOutcomes?.length);
    const values: number[] = [];
    derived.subscribe(v => values.push(v));
    
    await service.createInstance(...);
    
    expect(values.length).toBe(2); // Should trigger
  });
});
```

### 2. Manual Testing Checklist

For each fixed service method:
- [ ] Test in ActionsPhase (top-level subscription)
- [ ] Test in EventsPhase (top-level subscription)
- [ ] Test in IncidentDebugPanel (const reactive statements)
- [ ] Test with derived stores
- [ ] Test with reactive blocks

## Success Criteria

1. ✅ All mutations identified and catalogued
2. ✅ All service methods use immutable patterns
3. ✅ Coding standards documented
4. ✅ Helper utilities created
5. ✅ Tests passing for all reactive patterns
6. ✅ No regression in existing functionality

## Timeline

- **Phase 1 (Immediate):** ✅ Fix OutcomePreviewService (DONE)
- **Phase 2 (This Week):** Complete audit, create standards doc
- **Phase 3 (Next Week):** Fix all identified mutations
- **Phase 4 (Following Week):** Add linting rules, tests

## Related Issues

- Incident outcome display not appearing (#incident-reactivity)
- Array mutations breaking fine-grained reactivity
- Service layer architectural improvements

## References

- [Svelte Reactivity Docs](https://svelte.dev/docs#component-format-script-2-assignments-are-reactive)
- [Svelte Store Contract](https://svelte.dev/docs#run-time-svelte-store-writable)
- Current implementation: `src/services/OutcomePreviewService.ts`
- Affected phases: All (Actions, Events, Incidents, Unrest, Status, etc.)

