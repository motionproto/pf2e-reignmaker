# TODO: Worksite Production Recalculation for Hex Editing

## Overview

When implementing hex editing UI (claim/unclaim hexes, add/remove worksites), you **MUST** call the production recalculation helper to keep `worksiteProduction` in sync with hex changes.

## Why This Matters

`worksiteProduction` is **derived data stored for efficiency**, not a cache. It's calculated from hexes and persisted to avoid recalculating on every resource collection. When hexes change, production MUST be recalculated.

## The Helper Function

**Location:** `src/utils/recalculateProduction.ts`

```typescript
import { recalculateWorksiteProduction } from './utils/recalculateProduction';

// Recalculates production from current hexes and updates KingdomActor
await recalculateWorksiteProduction();
```

## When to Call It

Call `recalculateWorksiteProduction()` after ANY operation that modifies:

### ✅ Hex Claiming/Unclaiming
```typescript
async function claimHex(hexId: string): Promise<void> {
  await updateKingdom(kingdom => {
    const hex = kingdom.hexes.find(h => h.id === hexId);
    if (hex) hex.claimedBy = 1;
  });
  
  // REQUIRED: Recalculate production
  await recalculateWorksiteProduction();
}

async function unclaimHex(hexId: string): Promise<void> {
  await updateKingdom(kingdom => {
    const hex = kingdom.hexes.find(h => h.id === hexId);
    if (hex) hex.claimedBy = 0;
  });
  
  // REQUIRED: Recalculate production
  await recalculateWorksiteProduction();
}
```

### ✅ Worksite Creation/Removal
```typescript
async function addWorksite(hexId: string, worksiteType: WorksiteType): Promise<void> {
  await updateKingdom(kingdom => {
    const hex = kingdom.hexes.find(h => h.id === hexId);
    if (hex) {
      hex.worksite = { type: worksiteType };
    }
  });
  
  // REQUIRED: Recalculate production
  await recalculateWorksiteProduction();
}

async function removeWorksite(hexId: string): Promise<void> {
  await updateKingdom(kingdom => {
    const hex = kingdom.hexes.find(h => h.id === hexId);
    if (hex) {
      hex.worksite = null;
    }
  });
  
  // REQUIRED: Recalculate production
  await recalculateWorksiteProduction();
}
```

### ✅ Worksite Type Changes
```typescript
async function changeWorksiteType(hexId: string, newType: WorksiteType): Promise<void> {
  await updateKingdom(kingdom => {
    const hex = kingdom.hexes.find(h => h.id === hexId);
    if (hex && hex.worksite) {
      hex.worksite.type = newType;
    }
  });
  
  // REQUIRED: Recalculate production
  await recalculateWorksiteProduction();
}
```

### ✅ Commodity Bonus Changes
```typescript
async function toggleCommodityBonus(hexId: string): Promise<void> {
  await updateKingdom(kingdom => {
    const hex = kingdom.hexes.find(h => h.id === hexId);
    if (hex) {
      hex.hasCommodityBonus = !hex.hasCommodityBonus;
    }
  });
  
  // REQUIRED: Recalculate production
  await recalculateWorksiteProduction();
}
```

## Implementation Locations

### UI Components (if implementing hex editing)
- `src/view/kingdom/tabs/TerritoryTab.svelte` - Hex management UI
- `src/view/kingdom/components/HexEditor.svelte` - Hex detail editor (if created)
- Any map interaction handlers that modify hex data

### Controllers (if implementing actions)
- `src/services/ActionEffectsService.ts` - Already has TODOs for worksite actions
- Any custom action controllers that modify hexes

### Services
- `src/services/territory/index.ts` - **✅ Already integrated** (bulk operations)

## Error Handling

The helper includes error handling and won't break hex operations if it fails:

```typescript
try {
  await recalculateWorksiteProduction();
} catch (error) {
  console.error('Failed to recalculate production:', error);
  // Continue with operation - production will be stale but won't crash
}
```

For critical operations where you need to know if recalculation succeeded:

```typescript
const success = await recalculateWorksiteProduction();
if (!success) {
  ui.notifications.warn('Production values may be out of date. Please refresh.');
}
```

## Testing Checklist

When implementing hex editing, test that:

- [ ] Claiming a hex with worksites updates `worksiteProduction`
- [ ] Unclaiming a hex with worksites removes its production
- [ ] Adding a worksite to claimed hex increases production
- [ ] Removing a worksite from claimed hex decreases production
- [ ] Changing worksite type updates production correctly
- [ ] Resource collection uses the updated production values
- [ ] UI displays updated production immediately (reactive stores)

## Current Integration Status

| Location | Purpose | Status |
|----------|---------|--------|
| TerritoryService | Kingmaker sync, bulk updates | ✅ Integrated |
| ActionEffectsService | Worksite actions | ⚠️ TODO (low priority) |
| Hex Editing UI | Manual hex modifications | 🔮 Not yet implemented |
| Migration | Old data handling | ✅ Integrated |

## Performance Notes

- **Minimal Impact**: Only recalculates after user actions (rare)
- **Async Operation**: Doesn't block UI or gameplay
- **Safe Failure**: Won't crash if recalculation fails
- **Efficient**: Resource collection uses stored values (fast)

## Documentation

Full architectural pattern documented in:
- `docs/ARCHITECTURE.md` - "Worksite Production Recalculation Pattern" section
- `.clinerules/ARCHITECTURE_SUMMARY.md` - Core principles

---

**Remember:** If you're modifying hexes or worksites, call `recalculateWorksiteProduction()` after the change!
