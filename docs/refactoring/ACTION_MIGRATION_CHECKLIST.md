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

## Actions (Migration Order 1-26)

### Basic Kingdom Operations - #1-9
*No Foundry game commands, pure kingdom state changes*
- May include post-apply map interactions (hex selection)
- No pre-roll dialogs or entity selection
- Start here - simplest from a pipeline perspective

1. [ ] claim-hexes *(post-apply: hex selection)*
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
