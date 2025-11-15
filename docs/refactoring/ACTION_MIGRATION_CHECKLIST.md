# Action Migration Checklist

**Status:** 6/26 actions complete (23%)

**Last Updated:** 2025-11-15

---

## Recommended Priority Order

### Week 5A: Simple Actions (No Game Commands) - START HERE

- [x] claim-hexes (hex selection) ✅ COMPLETE
- [x] deal-with-unrest (pure resource changes) ✅ COMPLETE
- [x] sell-surplus (simple, no custom logic) ✅ COMPLETE
- [x] purchase-resources (custom execution) ✅ COMPLETE
- [x] harvest-resources (has choice-buttons) ✅ COMPLETE
- [x] build-roads (has hex selection) ✅ COMPLETE
- [ ] fortify-hex (has hex selection)
- [ ] create-worksite (has hex selection)
- [ ] send-scouts (has dice)

### Week 6: Pre-Roll Dialog Actions

- [ ] collect-stipend (settlement selection)
- [ ] execute-or-pardon-prisoners (settlement selection)
- [ ] establish-diplomatic-relations (faction selection)
- [ ] request-economic-aid (faction selection)
- [ ] request-military-aid (faction selection)
- [ ] train-army (army selection)
- [ ] disband-army (army selection)

### Week 7: Game Command Actions

- [ ] recruit-unit (post-roll compound + game command)
- [ ] deploy-army (pre-roll entity + map + game command)
- [ ] build-structure (pre-roll entity + game command)
- [ ] repair-structure (pre-roll entity + post-roll choice + game command)
- [ ] upgrade-settlement (pre-roll entity + game command)

### Week 8: Custom Resolution Actions

- [ ] arrest-dissidents (custom component)
- [ ] outfit-army (custom component)
- [ ] infiltration (custom logic)
- [ ] establish-settlement (complex compound)
- [ ] recover-army (healing calculation)

---

## After Each Migration

When you complete an action:

1. **Check the box** in the list above
2. **Update progress count** at the top
3. **Add to MIGRATED_ACTIONS** in `ActionsPhase.svelte`:
   ```typescript
   const MIGRATED_ACTIONS = new Set([
     'claim-hexes',
     'deal-with-unrest',
     'sell-surplus',
     'purchase-resources',
     'harvest-resources',
     'build-roads'  // ✅ Add here
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
