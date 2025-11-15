# Action Migration Checklist

**Status:** 7/26 actions complete (27%)

**Last Updated:** 2025-11-15

---

## Recommended Priority Order

### Week 5A: Simple Actions (No Game Commands) - START HERE

1. [x] claim-hexes (hex selection) ✅ COMPLETE
2. [x] deal-with-unrest (pure resource changes) ✅ COMPLETE
3. [x] sell-surplus (simple, no custom logic) ✅ COMPLETE
4. [x] purchase-resources (custom execution) ✅ COMPLETE
5. [x] harvest-resources (has choice-buttons) ✅ COMPLETE
6. [x] build-roads (has hex selection) ✅ COMPLETE
7. [x] fortify-hex (has hex selection) ✅ COMPLETE
8. [ ] create-worksite (has hex selection)
9. [ ] send-scouts (has dice)

### Week 6: Pre-Roll Dialog Actions

10. [ ] collect-stipend (settlement selection)
11. [ ] execute-or-pardon-prisoners (settlement selection)
12. [ ] establish-diplomatic-relations (faction selection)
13. [ ] request-economic-aid (faction selection)
14. [ ] request-military-aid (faction selection)
15. [ ] train-army (army selection)
16. [ ] disband-army (army selection)

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
     'fortify-hex'           // #7 ✅ Add here
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
