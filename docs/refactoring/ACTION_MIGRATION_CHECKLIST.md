# Action Migration Checklist

**Status:** 14/26 actions complete (54%)

**Last Updated:** 2025-11-16

---

## Interaction Pattern Reference

**See:** `PIPELINE_DATA_FLOW.md` for complete architectural details

| Pattern | When to Use | Data Flow |
|---------|-------------|-----------|
| **Pattern 1: Pre-Roll** | Entity selection before roll | User selects → `PipelineMetadataStorage` → Roll → `CheckContext` → Execute |
| **Pattern 2: Post-Apply** | Map/entity selection after roll | Roll → Apply → Dialog → `onComplete(result, ctx)` → Execute |
| **Pattern 3: No Interactions** | Fully automatic | Roll → Apply → Execute |

**Key Architecture:** `CheckContext` acts as a unified data bus - all pipeline stages (preview, execute, interactions) receive the same context object with full access to metadata, kingdom state, and resolution data.

---

## Recommended Priority Order

### Week 5A: Simple Actions (No Game Commands) - START HERE

**Patterns Used:** Pattern 2 (post-apply hex selection), Pattern 3 (no interactions)

1. [x] claim-hexes (hex selection) ✅ COMPLETE - Pattern 2
2. [x] deal-with-unrest (pure resource changes) ✅ COMPLETE - Pattern 3
3. [x] sell-surplus (simple, no custom logic) ✅ COMPLETE - Pattern 3
4. [x] purchase-resources (custom execution) ✅ COMPLETE - Pattern 3
5. [x] harvest-resources (has choice-buttons) ✅ COMPLETE - Pattern 3
6. [x] build-roads (has hex selection) ✅ COMPLETE - Pattern 2
7. [x] fortify-hex (has hex selection) ✅ COMPLETE - Pattern 2
8. [x] create-worksite (has hex selection) ✅ COMPLETE - Pattern 2
9. [x] send-scouts (has hex selection + World Explorer integration) ✅ COMPLETE - Pattern 2

### Week 6: Pre-Roll Dialog Actions

**Pattern Used:** Pattern 1 (pre-roll entity selection via `PipelineMetadataStorage`)

10. [x] collect-stipend (auto-select highest settlement) ✅ COMPLETE - Pattern 3 (no dialog)
11. [x] execute-or-pardon-prisoners (settlement selection) ✅ COMPLETE - Pattern 1
12. [x] establish-diplomatic-relations (faction selection) ✅ COMPLETE - Pattern 1
13. [x] request-economic-aid (faction selection) ✅ COMPLETE - Pattern 1
14. [x] request-military-aid (faction selection) ✅ COMPLETE - Pattern 1
15. [ ] train-army (army selection) - Pattern 1
16. [ ] disband-army (army selection) - Pattern 1

### Week 7: Game Command Actions

17. [ ] recruit-unit (post-roll compound + game command)
18. [ ] deploy-army (pre-roll entity + map + game command)
19. [ ] build-structure (pre-roll entity + game command)
20. [ ] repair-structure (pre-roll entity + post-roll choice + game command)
21. [ ] upgrade-settlement (pre-roll entity + game command)

### Week 8: Custom Resolution Actions

22. [ ] arrest-dissidents (custom component)
23. [ ] outfit-army (custom component)
24. [ ] infiltration (custom logic)
25. [ ] establish-settlement (complex compound)
26. [ ] recover-army (healing calculation)

---

## After Each Migration

When you complete an action:

1. **Check the box** in the list above
2. **Update progress count** at the top
3. **Add to MIGRATED_ACTIONS** in `ActionsPhase.svelte`:
   ```typescript
   const MIGRATED_ACTIONS = new Set([
     'claim-hexes',          // #1
     'deal-with-unrest',     // #2
     'sell-surplus',         // #3
     'purchase-resources',   // #4
     'harvest-resources',    // #5
     'build-roads',          // #6
     'fortify-hex',          // #7
     'create-worksite',      // #8
     'send-scouts',          // #9
     'collect-stipend',      // #10
     'execute-or-pardon-prisoners',  // #11
     'establish-diplomatic-relations',  // #12
     'request-economic-aid',  // #13
     'request-military-aid'   // #14 ✅ Add here
   ]);
   ```
4. **Verify with migration checker:**
   ```bash
   npm run check-migration
   ```

---

## Progress Tracking

Run the migration checker to see current status:

```bash
npm run check-migration
```

This will show:
- ✅ Migrated actions
- ⚠️ Actions with pipelines but not marked as migrated
- 🗑️ Legacy folders safe to delete
- 📝 Remaining actions by complexity
