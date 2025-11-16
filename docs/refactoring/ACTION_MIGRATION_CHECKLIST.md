# Action Migration Checklist

**Status:** 0/26 actions tested (0%)

**Last Updated:** 2025-11-16

⚠️ **ALL ACTIONS RESET TO 'UNTESTED'** after PipelineCoordinator refactor. Previous event-based system removed - all actions need retesting with continuous pipeline.

---

## Quick Reference

**Current tracking location:** `src/constants/migratedActions.ts`

**How to update status:**
1. Test action in Foundry
2. Update `ACTION_STATUS` Map in `migratedActions.ts`
3. Rebuild (or use HMR in dev mode)
4. Badge turns green ✓ in UI

---

## Actions (Migration Order 1-26)

### Basic Kingdom Operations - #1-9
*No Foundry game commands, pure kingdom state changes*
- May include post-apply map interactions (hex selection)
- No pre-roll dialogs or entity selection
- Start here - simplest from a pipeline perspective

1. [X] claim-hexes *(post-apply: hex selection)*
2. [ ] deal-with-unrest *(no interactions)*
3. [ ] sell-surplus *(no interactions)*
4. [ ] purchase-resources *(no interactions)*
5. [ ] harvest-resources *(in-preview: resource choice)*
6. [ ] build-roads *(post-apply: hex selection)*
7. [ ] fortify-hex *(post-apply: hex selection)*
8. [ ] create-worksite *(post-apply: hex selection)*
9. [ ] send-scouts *(post-apply: hex selection + World Explorer)*

### Entity Selection Actions - #10-16
*Pre-roll dialog to select faction, settlement, or army*
- Dialog appears before roll
- Selected entity stored in metadata
- Used in preview calculation and execution

10. [ ] collect-stipend *(auto-selects highest settlement)*
11. [ ] execute-or-pardon-prisoners *(pre-roll: settlement selection)*
12. [ ] establish-diplomatic-relations *(pre-roll: faction selection)*
13. [ ] request-economic-aid *(pre-roll: faction selection)*
14. [ ] request-military-aid *(pre-roll: faction selection)*
15. [ ] train-army *(pre-roll: army selection)*
16. [ ] disband-army *(pre-roll: army selection)*

### Foundry Integration Actions - #17-21
*Trigger Foundry game commands (chat cards, items, etc.)*
- Integrate with PF2e system
- May create actors or items
- Post-roll chat messages

17. [ ] recruit-unit *(game command: create army actor)*
18. [ ] deploy-army *(game command: army placement)*
19. [ ] build-structure *(game command: structure creation)*
20. [ ] repair-structure *(game command: structure update)*
21. [ ] upgrade-settlement *(game command: settlement tier change)*

### Complex Custom Logic - #22-26
*Custom components, compound operations, or special handling*
- Most complex from implementation perspective
- May combine multiple patterns
- Test after simpler actions work

22. [ ] arrest-dissidents *(custom: unrest reduction component)*
23. [ ] outfit-army *(custom: army equipment logic)*
24. [ ] infiltration *(custom: complex resolution)*
25. [ ] establish-settlement *(compound: pre-roll + post-apply map)*
26. [ ] recover-army *(custom: healing calculation)*

---

## Why Retesting is Required

**What Changed:**
- **Old System:** Event-based, fragmented execution across 5+ locations
- **New System:** Unified PipelineCoordinator with 9-step continuous pipeline

**Key Differences:**
1. **Roll execution:** Now synchronous (direct return) instead of event-based
2. **Context flow:** Single `PipelineContext` object persists through all steps
3. **Step execution:** All 9 steps run in order with centralized error handling
4. **User confirmation:** Internal pause/resume pattern (Step 6)
5. **Post-apply interactions:** Integrated into pipeline (Step 7)

**Testing Verifies:**
- Roll completes correctly
- Preview displays accurate changes
- User confirmation works
- Post-apply interactions trigger
- Kingdom state updates
- No errors during execution

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
|---------|-------------|----------|
| **No Interactions** | Roll → Apply → Execute | deal-with-unrest, sell-surplus |
| **Pre-Roll Dialog** | Select entity → Roll → Apply → Execute | execute-or-pardon-prisoners, establish-diplomatic-relations |
| **Post-Apply Map** | Roll → Apply → Select hexes → Execute | claim-hexes, build-roads, fortify-hex |
| **Pre-Roll + Post-Apply** | Select entity → Roll → Apply → Select hexes → Execute | establish-settlement |

**All patterns flow through the same 9-step pipeline** - the coordinator just skips optional steps for simpler actions.

---

## Preview Data Requirements

⚠️ **CRITICAL:** All pipelines that define a `preview.calculate()` function must return a **complete** `PreviewData` object.

### Required Structure

```typescript
preview: {
  calculate: (ctx) => ({
    resources: ResourceChange[],        // ✅ Required (can be empty array)
    specialEffects: SpecialEffect[],    // ✅ Required (can be empty array)
    entities?: EntityOperation[],       // ⚠️ Optional
    warnings?: string[]                 // ⚠️ Optional
  })
}
```

### Common Mistake

```typescript
// ❌ WRONG - Missing specialEffects
preview: {
  calculate: (ctx) => ({
    resources: [{ resource: 'unrest', value: -2 }]
  })
}

// ✅ CORRECT - Complete PreviewData
preview: {
  calculate: (ctx) => ({
    resources: [{ resource: 'unrest', value: -2 }],
    specialEffects: []  // Required even if empty
  })
}
```

### Why This Matters

The `defaultFormatPreview` method in `UnifiedCheckHandler` iterates over `specialEffects`, causing a crash if the property is undefined:

```
TypeError: preview.specialEffects is not iterable (cannot read property undefined)
```

### Helper Function (Recommended)

Use `createEmptyPreviewData()` to ensure complete structure:

```typescript
import { createEmptyPreviewData } from '../../types/PreviewData';

preview: {
  calculate: (ctx) => {
    const preview = createEmptyPreviewData();
    preview.resources.push({ resource: 'unrest', value: -2 });
    return preview;
  }
}
```

This guarantees all required properties are present and prevents runtime errors.
