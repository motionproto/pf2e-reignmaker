# Action Cleanup Plan

## ⚠️ DO NOT TOUCH - Working Actions

These actions are **currently functional** and should **NOT** be modified without careful testing:

### Fully Working with Custom UI
- `arrest-dissidents` - Custom allocation UI, working correctly
- `repair-structure` - Custom cost choice UI (RepairCostChoice.svelte)
- `establish-settlement` - Custom naming UI + StaticModifiers (good example)
- `upgrade-settlement` - Pre-roll dialog system (UpgradeSettlementSelectionDialog.svelte)

**→ Leave these alone - they work perfectly**

---

## 📋 Future Cleanup Candidates

### Phase 1: Low-Risk Improvements (JSON Only)

These actions **work but have invisible costs**. Adding StaticModifiers would show costs in UI without breaking functionality.

**Risk: Very Low** (JSON only, no code changes)

#### claim-hexes.json
**Status:** Works, but 1 gold cost is invisible  
**Update:**
```json
{
  "success": {
    "modifiers": [
      { "type": "static", "resource": "gold", "value": -1, "duration": "immediate" }
    ]
  }
}
```

#### build-roads.json
**Status:** Works, but 1 lumber cost is invisible  
**Update:**
```json
{
  "success": {
    "modifiers": [
      { "type": "static", "resource": "lumber", "value": -1, "duration": "immediate" }
    ]
  }
}
```

#### fortify-hex.json
**Status:** Works, but lumber/ore costs are invisible  
**Update:**
```json
{
  "success": {
    "modifiers": [
      { "type": "static", "resource": "lumber", "value": -1, "duration": "immediate" },
      { "type": "static", "resource": "ore", "value": -1, "duration": "immediate" }
    ]
  }
}
```

#### create-worksite.json
**Status:** Works, but 1 lumber cost is invisible  
**Update:**
```json
{
  "success": {
    "modifiers": [
      { "type": "static", "resource": "lumber", "value": -1, "duration": "immediate" }
    ]
  }
}
```

**Testing for Phase 1:**
1. Update JSON
2. Run action in-game
3. Verify cost appears in OutcomeDisplay
4. Verify action still completes successfully
5. If broken, revert immediately

---

### Phase 2: Medium-Risk Improvements (JSON + Code)

These actions **work with manual cost handling**. Refactoring to use modifiers would improve maintainability but requires code changes.

**Risk: Medium** (requires implementing ComputedModifier resolvers)

#### build-structure.json
**Status:** Works with manual structure cost handling in code  
**Why improve:** Make costs visible in OutcomeDisplay  
**Complexity:** Medium (structure costs vary by tier)

**Update Needed:**
1. Add ComputedModifiers to JSON:
```json
{
  "criticalSuccess": {
    "modifiers": [
      { "type": "computed", "resource": "lumber", "formula": "halfStructureLumberCost", "negative": true },
      { "type": "computed", "resource": "ore", "formula": "halfStructureOreCost", "negative": true },
      { "type": "computed", "resource": "gold", "formula": "halfStructureGoldCost", "negative": true }
    ]
  },
  "success": {
    "modifiers": [
      { "type": "computed", "resource": "lumber", "formula": "fullStructureLumberCost", "negative": true },
      { "type": "computed", "resource": "ore", "formula": "fullStructureOreCost", "negative": true },
      { "type": "computed", "resource": "gold", "formula": "fullStructureGoldCost", "negative": true }
    ]
  }
}
```

2. Add resolver to BuildStructureAction.ts:
```typescript
function resolveComputedModifiers(modifiers: EventModifier[], structure: Structure): EventModifier[] {
  return modifiers.map(mod => {
    if (!isComputedModifier(mod)) return mod;
    
    const resource = mod.formula.includes('Lumber') ? 'lumber' 
                   : mod.formula.includes('Ore') ? 'ore' 
                   : 'gold';
    
    const fullCost = structure.cost[resource] || 0;
    const value = mod.formula.includes('half') 
      ? Math.ceil(fullCost / 2) 
      : fullCost;
    
    return { type: 'static', resource: mod.resource, value: -value, duration: mod.duration };
  });
}
```

3. Remove manual cost handling from existing code
4. Test extensively

#### recruit-unit.json
**Status:** Works with manual army recruitment cost handling  
**Why improve:** Make costs visible  
**Complexity:** Medium (army costs vary by level)

**Update Needed:**
```json
{
  "success": {
    "modifiers": [
      { "type": "computed", "resource": "gold", "formula": "armyRecruitmentCost", "negative": true }
    ]
  }
}
```

Plus resolver function in RecruitUnitAction.ts

#### outfit-army.json
**Status:** Works with manual outfit cost handling  
**Why improve:** Make costs visible  
**Complexity:** Low-Medium (cost based on army level)

**Update Needed:**
```json
{
  "success": {
    "modifiers": [
      { "type": "computed", "resource": "gold", "formula": "armyOutfitCost", "negative": true }
    ]
  }
}
```

Plus resolver function

#### collect-stipend.json
**Status:** Works with manual/GM-determined gold gain  
**Why improve:** Could be automated based on kingdom size  
**Complexity:** Medium (formula depends on kingdom economy rules)

**Update Needed:**
```json
{
  "success": {
    "modifiers": [
      { "type": "computed", "resource": "gold", "formula": "monthlyStipend", "negative": false }
    ]
  }
}
```

**Note:** Only if stipend formula is well-defined

**Testing for Phase 2:**
1. Create backup of working action code
2. Update JSON + code
3. Test all outcome paths (crit success, success, failure, crit failure)
4. Verify costs display correctly
5. Verify costs are actually deducted
6. Test edge cases (insufficient resources, etc.)
7. If anything fails, revert to backup immediately

---

## ✅ No Cleanup Needed

These actions are **intentionally manual** and should stay that way:

- deal-with-unrest.json
- deploy-army.json
- disband-army.json
- establish-diplomatic-relations.json
- execute-or-pardon-prisoners.json
- hire-adventurers.json
- infiltration.json
- harvest-resources.json (too context-dependent)
- purchase-resources.json (player choice of quantity)
- sell-surplus.json (player choice)
- recover-army.json
- request-economic-aid.json
- request-military-aid.json
- send-scouts.json
- train-army.json

---

## Implementation Strategy

### When to Clean Up

**Only when:**
1. You have time to test thoroughly
2. Players aren't actively using the system
3. You want to improve cost visibility in UI
4. You're okay with potential regression risk

**Don't clean up when:**
- System is stable and working
- Time is limited
- Players are in active campaigns
- Risk of breaking existing functionality

### Recommended Order

1. **Phase 1 first** (claim-hexes, build-roads, etc.) - Very safe, JSON only
2. **Wait and observe** - Make sure Phase 1 works for a week
3. **One Phase 2 action** - Pick simplest (collect-stipend or outfit-army)
4. **Wait and observe** - Make sure it works for a week
5. **Rest of Phase 2** - One at a time, with testing

### Backup Strategy

Before each cleanup:
```bash
git add .
git commit -m "Backup before cleaning up [action-name]"
```

If something breaks:
```bash
git revert HEAD
```

---

## Current Status

### ✅ Completed
- ComputedModifier type system added
- Documentation created
- One example action updated (upgrade-settlement JSON)

### ⏸️ On Hold (No Rush)
- All Phase 1 actions
- All Phase 2 actions

### ❌ Won't Do
- Any action in "No Cleanup Needed" list

---

## References

- Implementation guide: `src/actions/shared/IMPLEMENTATION_GUIDE.md`
- Detailed update plan: `docs/ACTION_JSON_UPDATE_PLAN.md`
- Type definitions: `src/types/modifiers.ts`

## Notes

- **The system works fine as-is**
- These are **optional improvements for maintainability**
- **Not required for functionality**
- Only proceed if you have time and are comfortable with risk
- Test extensively before committing changes
- Keep backups

---

**Last Updated:** October 18, 2025
