# Action Migration Checklist

**Status:** 0/26 actions tested (0%)

**Last Updated:** 2025-11-17

---

## Overview

This checklist tracks the implementation and testing of all 26 player actions through the unified PipelineCoordinator architecture.

**Tracking Location:** `src/constants/migratedActions.ts`

**UI Badges:**
- 🔲 Gray badge with number - Untested
- ✅ Green badge with checkmark - Tested
- ⚪ White badge with border - Currently testing

**Update Workflow:**
1. Test action in Foundry
2. Update status in `src/constants/migratedActions.ts`
3. Badge automatically turns green ✓ in UI

---

## Actions (Testing Order 1-26: Simplest → Most Complex)

### Phase 1: No Interactions - #1
*Simplest actions - no dialogs, no map interactions*
- Pure modifier application to kingdom state
- Perfect for validating core pipeline
- Start here to build confidence

1. [ ] deal-with-unrest *(no interactions)*

### Phase 2: Post-Apply Map Interactions - #2-7
*Map selection after applying result*
- Validates post-apply interaction pattern
- Hex selection, validation, state updates
- Common pattern across many actions

2. [ ] claim-hexes *(post-apply: hex selection)*
3. [ ] build-roads *(post-apply: hex selection)*
4. [ ] fortify-hex *(post-apply: hex selection)*
5. [ ] create-worksite *(post-apply: hex selection)*
6. [ ] harvest-resources *(in-preview: resource choice)*
7. [ ] send-scouts *(post-apply: hex selection + World Explorer)*

### Phase 3: Custom Components (Graceful Degradation) - #8-9
*Actions with custom UI components*
- May not mount properly yet (acceptable)
- Should fail gracefully without crashing
- Validates error handling

8. [ ] sell-surplus *(custom component: resource selector)*
9. [ ] purchase-resources *(custom component: resource selector)*

### Phase 4: Pre-Roll Entity Selection - #10-16
*Dialog appears before roll*
- Pre-roll dialog to select faction, settlement, or army
- Selected entity stored in metadata
- Used in preview calculation and execution

10. [ ] collect-stipend *(auto-selects highest settlement)*
11. [ ] execute-or-pardon-prisoners *(pre-roll: settlement selection)*
12. [ ] establish-diplomatic-relations *(pre-roll: faction selection)*
13. [ ] request-economic-aid *(pre-roll: faction selection)*
14. [ ] request-military-aid *(pre-roll: faction selection)*
15. [ ] train-army *(pre-roll: army selection)*
16. [ ] disband-army *(pre-roll: army selection)*

### Phase 5: Foundry Integration (gameCommands) - #17-21
*Creates/modifies Foundry actors and items*
- Integrate with PF2e system
- Creates actors or items in Foundry
- Validates gameCommands execution

17. [ ] recruit-unit *(game command: create army actor)*
18. [ ] deploy-army *(game command: army placement)*
19. [ ] build-structure *(game command: structure creation)*
20. [ ] repair-structure *(game command: structure update)*
21. [ ] upgrade-settlement *(game command: settlement tier change)*

### Phase 6: Complex Custom Logic - #22-26
*Most complex actions - test last*
- Custom components with complex logic
- Compound operations (multiple patterns)
- Special handling required

22. [ ] arrest-dissidents *(custom: unrest reduction component)*
23. [ ] outfit-army *(custom: army equipment logic)*
24. [ ] infiltration *(custom: complex resolution)*
25. [ ] establish-settlement *(compound: pre-roll + post-apply + gameCommands)*
26. [ ] recover-army *(custom: healing calculation)*

---


## Testing Workflow

### For Each Action:

1. **Test in Foundry VTT:**
   ```
   Click action → Select skill → Roll succeeds
   ↓
   Preview displays → Click "Apply Result"
   ↓
   Post-apply interactions (if any) → Complete interaction
   ↓
   Verify kingdom state updated correctly
   ```

2. **Update Status:**
   ```typescript
   // In src/constants/migratedActions.ts
   export const ACTION_STATUS = new Map<string, ActionStatus>([
     // Economic & Resources
     ['sell-surplus', 'tested'],  // ✅ Changed from 'untested'
     // ...
   ]);
   ```

3. **Rebuild:**
   ```bash
   npm run build
   # OR use dev server with HMR for auto-update
   npm run dev
   ```

4. **Verify Badge:**
   - Badge changes from yellow ⚠️ to green ✓
   - Action card shows "#N" with checkmark

5. **Update This Checklist:**
   - Change `[ ]` to `[x]` for completed action
   - Update overall status at top

---

## Recommended Testing Order

**Start with simple actions** (no complex interactions):
1. Economic & Resources
2. Territory & Expansion (except send-scouts)
3. Stability & Governance (except arrest-dissidents)

**Then test actions with pre-roll dialogs:**
4. Foreign Affairs
5. Military Operations (train-army, disband-army)

**Finally test complex actions:**
6. Urban Planning
7. Remaining Military Operations
8. Custom resolution actions

---

## Progress Tracking Commands

**Check current status:**
```typescript
import { getCompletionStats } from './src/constants/migratedActions';
const stats = getCompletionStats();
console.log(stats);
// { untested: 26, tested: 0, verified: 0, total: 26, percentComplete: 0 }
```

**List all untested actions:**
```typescript
import { getActionsByStatus } from './src/constants/migratedActions';
const untested = getActionsByStatus('untested');
console.log(untested);
```

---

## After Completing All 26

Once all actions show green ✓ badges:

1. **Archive old code:**
   - Move `src/actions/*` to `src/actions-deprecated/`
   - Move old controller helpers to `src/controllers/actions-deprecated/`

2. **Remove event system:**
   - Delete event listeners in ActionsPhase.svelte
   - Add deprecation warnings to old systems

3. **Final verification:**
   - Test each category in a real game session
   - Mark stable actions as 'verified' (optional third status)

---

## Interaction Patterns Reference

All actions use one of these patterns:

| Pattern | Description | Examples |
|---------|-------------|------------|
| **No Interactions** | Roll → Apply → Execute | deal-with-unrest, sell-surplus |
| **Pre-Roll Dialog** | Select entity → Roll → Apply → Execute | execute-or-pardon-prisoners |
| **Post-Apply Map** | Roll → Apply → Select hexes → Execute | claim-hexes, build-roads |
| **Pre-Roll + Post-Apply** | Select entity → Roll → Apply → Select hexes → Execute | establish-settlement |

**All patterns flow through the same 9-step pipeline** - the coordinator skips optional steps for simpler actions.

---

## Implementation Notes

**For complete architecture details, see:** `docs/systems/pipeline-coordinator.md`

**Key points:**
- All actions use the same PipelineCoordinator
- Single `PipelineContext` object persists through all 9 steps
- Optional steps are automatically skipped
- Centralized error handling with rollback support

---

## Resource Modification Best Practices

### ⚠️ CRITICAL: Always Use `applyOutcome()` for Resource Changes

**DO NOT modify resources directly via `updateKingdom()`** - this bypasses the debt tracking system.

### ❌ Wrong (Direct Modification):
```typescript
// BAD - No debt tracking, no shortfall penalties
await updateKingdom(k => {
  k.resources.gold -= 10;
  k.resources.lumber -= 5;
});
```

### ✅ Correct (Using applyOutcome):
```typescript
// GOOD - Automatic debt tracking and shortfall penalties
import { createGameCommandsService } from '../../services/GameCommandsService';

const gameCommandsService = await createGameCommandsService();
await gameCommandsService.applyOutcome({
  type: 'action',
  sourceId: 'your-action-id',
  sourceName: 'Your Action Name',
  outcome: 'success',
  modifiers: [
    {
      type: 'static',
      resource: 'gold',
      value: -10,  // Negative to deduct
      duration: 'immediate'
    },
    {
      type: 'static',
      resource: 'lumber',
      value: -5,
      duration: 'immediate'
    }
  ]
});
```

### Why This Matters

**Automatic Shortfall Handling:**
- If you have enough resources → Deducts normally
- If you DON'T have enough resources:
  - Resources go negative (debt)
  - +1 Unrest per resource type you can't afford
  - Action still completes (realistic kingdom management)
  - Debt tracked for upkeep phase

**Example Scenario:**
```typescript
// Kingdom has: Gold: 3, Lumber: 0
// Action costs: Gold: 10, Lumber: 5

// After applyOutcome():
// - Gold: -7 (debt)
// - Lumber: -5 (debt)
// - Unrest: +2 (one per resource type)
// - Action completes successfully

// Without applyOutcome():
// - Manual check blocks action
// - No consistent debt tracking
// - Unrest penalty inconsistent
```

### Common Use Cases

**1. Fixed Costs (Action Costs):**
```typescript
// From pipeline.cost definition
const modifiers = Object.entries(cost)
  .map(([resource, amount]) => ({
    type: 'static' as const,
    resource: resource as ResourceType,
    value: -(amount as number),
    duration: 'immediate' as const
  }));

await gameCommandsService.applyOutcome({
  type: 'action',
  sourceId: pipeline.id,
  sourceName: pipeline.name,
  outcome: 'success',
  modifiers
});
```

**2. Variable Costs (User Selection):**
```typescript
// From custom component data
const costData = ctx.resolutionData?.customComponentData?.['repairCost'];
const cost = costData.cost as Record<string, number>;

const modifiers = Object.entries(cost)
  .filter(([_, amount]) => amount > 0)
  .map(([resource, amount]) => ({
    type: 'static' as const,
    resource: resource as ResourceType,
    value: -(amount as number),
    duration: 'immediate' as const
  }));

await gameCommandsService.applyOutcome({
  type: 'action',
  sourceId: 'repair-structure',
  sourceName: `Repair ${structureName}`,
  outcome: 'success',
  modifiers
});
```

**3. Penalties (Critical Failures):**
```typescript
// Even single resource penalties should use applyOutcome
await gameCommandsService.applyOutcome({
  type: 'action',
  sourceId: 'repair-structure',
  sourceName: `Repair ${structureName} (failed)`,
  outcome: 'criticalFailure',
  modifiers: [{
    type: 'static',
    resource: 'gold',
    value: -1,
    duration: 'immediate'
  }]
});
```

### Migration Checklist for Each Action

When migrating an action, search for:

1. ✅ **Direct `updateKingdom()` calls that modify resources**
   - Replace with `applyOutcome()`
   
2. ✅ **Manual affordability checks**
   - Remove them - `applyOutcome()` handles this
   
3. ✅ **Custom unrest penalties for shortfalls**
   - Remove them - `applyOutcome()` auto-applies +1 per resource type

4. ✅ **Actions that block when resources unavailable**
   - Let them proceed - debt system is intentional

### References

- **Repair Structure Example:** `src/pipelines/actions/repairStructure.ts` (all three cost paths)
- **Service Implementation:** `src/services/GameCommandsService.ts`
- **Shortfall Detection:** Search for `shortfallResources` in GameCommandsService.ts
