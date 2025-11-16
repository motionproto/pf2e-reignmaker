# Action Pipeline Migration - Quick Reference

**Status:** 0/26 actions tested (0%)

## Files in This Directory

1. **README.md** (this file) - Succinct summary
2. **ACTION_MIGRATION_CHECKLIST.md** - Complete 1-26 action list with categories
3. **PIPELINE_COORDINATOR_DESIGN.md** - Architecture details

## Current State

- ✅ **PipelineCoordinator** implemented - 9-step unified pipeline
- ✅ **Tracking system** ready - `src/constants/migratedActions.ts`
- ✅ **UI badges** working - Yellow ⚠ (untested) / Green ✓ (tested)
- ⚠️ **All 26 actions untested** - Need systematic testing in Foundry

## Testing Workflow

1. **Test in Foundry:** Click action → Roll → Apply Result → Verify kingdom state
2. **Update status:** In `src/constants/migratedActions.ts`:
   ```typescript
   ['claim-hexes', 'tested'],  // ✅ Changed from 'untested'
   ```
3. **Rebuild:** `npm run dev` (HMR) or `npm run build`
4. **Badge turns green ✓** automatically

## Preview Data Structure (Important!)

⚠️ When creating pipelines with preview calculations, always return a **complete** `PreviewData` object:

```typescript
preview: {
  calculate: (ctx) => ({
    resources: [{ resource: 'unrest', value: -2 }],
    specialEffects: []  // ⚠️ Required - don't omit!
  })
}
```

**Why?** Missing `specialEffects` causes crashes during preview formatting:
```
TypeError: preview.specialEffects is not iterable
```

**Helper available:** Use `createEmptyPreviewData()` from `src/types/PreviewData.ts` to avoid this bug.

See `ACTION_MIGRATION_CHECKLIST.md` for detailed requirements.

## Migration Order (1-26)

**#1-9: Basic Kingdom Operations** - No pre-roll dialogs, no game commands (start here)  
**#10-16: Entity Selection** - Pre-roll dialogs for faction/settlement/army selection  
**#17-21: Foundry Integration** - Create actors, items, chat cards  
**#22-26: Complex Custom Logic** - Custom components, compound operations

See `ACTION_MIGRATION_CHECKLIST.md` for complete list with interaction details.

## Data Flow

```
User clicks action
  → PipelineCoordinator.executePipeline(actionId)
  → 9 steps execute (requirements, pre-roll, roll, instance, preview, 
                    confirmation PAUSE, post-apply, execute, cleanup)
  → Kingdom state updated
  → Badge shows status
```

## Key Files

- `src/constants/migratedActions.ts` - Status tracking (single source of truth)
- `src/services/PipelineCoordinator.ts` - Main coordinator
- `src/types/PipelineContext.ts` - Context object flowing through pipeline
- `src/pipelines/actions/*.ts` - Individual action pipeline definitions

## After Completing All 26

1. Archive old code: `src/actions/*` → `src/actions-deprecated/`
2. Remove event system from ActionsPhase.svelte
3. Mark stable actions as 'verified'
