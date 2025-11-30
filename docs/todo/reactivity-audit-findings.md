# Svelte Reactivity Audit - Findings Report

**Date:** 2025-11-30  
**Status:** Phase 1 Complete - Mutations Identified  
**Priority:** HIGH - Multiple critical mutations found

---

## Executive Summary

**Found:** 37 mutation sites across the codebase  
**Critical (In updateKingdom):** 15 mutations  
**Medium (Services):** 12 mutations  
**Low (Local state):** 10 mutations  

### Impact Assessment

**CRITICAL** - These break fine-grained Svelte reactivity:
- GameCommandsService: 7 mutations
- WaterFeatureService: 10 mutations  
- Structure Services: 3 mutations
- ModifierService: 1 mutation
- PF2eSkillService: 1 mutation

---

## Critical Mutations (MUST FIX)

###1. GameCommandsService.ts (7 mutations)

#### Line 198: Action Log Mutation ⚠️ CRITICAL
```typescript
kingdom.turnState.actionLog.push(entry);
```
**Fix:**
```typescript
kingdom.turnState.actionLog = [...kingdom.turnState.actionLog, entry];
```

#### Line 384: Direct Resource Assignment
```typescript
kingdom.resources[resource] = newValue;
```
**Fix:**
```typescript
kingdom.resources = { ...kingdom.resources, [resource]: newValue };
```

#### Line 512: Action Instance Assignment
```typescript
kingdom.turnState.actionsPhase.actionInstances[instanceId] = { ... };
```
**Fix:**
```typescript
kingdom.turnState.actionsPhase.actionInstances = {
  ...kingdom.turnState.actionsPhase.actionInstances,
  [instanceId]: { ... }
};
```

#### Line 574: Structure Condition Assignment
```typescript
settlement.structureConditions[target.structure.id] = StructureCondition.DAMAGED;
```
**Fix:**
```typescript
settlement.structureConditions = {
  ...settlement.structureConditions,
  [target.structure.id]: StructureCondition.DAMAGED
};
```

#### Line 661: Push to structureIds
```typescript
settlement.structureIds.push(previousTierId);
```
**Fix:**
```typescript
settlement.structureIds = [...settlement.structureIds, previousTierId];
```

#### Line 669: Nested Structure Condition
```typescript
settlement.structureConditions[previousTierId] = StructureCondition.DAMAGED;
```
**Fix:**
```typescript
settlement.structureConditions = {
  ...settlement.structureConditions,
  [previousTierId]: StructureCondition.DAMAGED
};
```

#### Actions 231, 268, 324: factionsAidedThisTurn.push
```typescript
kingdom.turnState.actionsPhase.factionsAidedThisTurn.push(factionId);
```
**Fix:**
```typescript
kingdom.turnState.actionsPhase.factionsAidedThisTurn = [
  ...kingdom.turnState.actionsPhase.factionsAidedThisTurn,
  factionId
];
```

---

### 2. WaterFeatureService.ts (10 mutations) ⚠️ CRITICAL

All use `.splice()` to remove items from arrays:

#### Lines 93, 106, 125, 180, 190, 202: Lakes/Swamps
```typescript
kingdom.waterFeatures.lakes.splice(existingIndex, 1);
kingdom.waterFeatures.swamps.splice(swampIndex, 1);
```
**Fix:**
```typescript
kingdom.waterFeatures.lakes = kingdom.waterFeatures.lakes.filter((_, i) => i !== existingIndex);
kingdom.waterFeatures.swamps = kingdom.waterFeatures.swamps.filter((_, i) => i !== swampIndex);
```

#### Lines 299, 383, 396, 481, 494: Rivers
```typescript
kingdom.rivers.waterfalls.splice(existingIndex, 1);
kingdom.rivers.crossings.splice(existingIndex, 1);
```
**Fix:**
```typescript
kingdom.rivers.waterfalls = kingdom.rivers.waterfalls.filter((_, i) => i !== existingIndex);
kingdom.rivers.crossings = kingdom.rivers.crossings.filter((_, i) => i !== existingIndex);
```

---

### 3. Structure Services (3 mutations)

#### structures/management.ts Line 82: Push Structure
```typescript
structuresToAdd.push(prereq.id);
```
**Context:** Inside updateKingdom callback  
**Fix:**
```typescript
structuresToAdd = [...structuresToAdd, prereq.id];
```

#### structures/management.ts Line 105: Structure Condition
```typescript
s.structureConditions[id] = StructureCondition.GOOD;
```
**Fix:**
```typescript
s.structureConditions = { ...s.structureConditions, [id]: StructureCondition.GOOD };
```

#### structures/management.ts Line 291: Structure Condition Update
```typescript
s.structureConditions[structureId] = condition;
```
**Fix:**
```typescript
s.structureConditions = { ...s.structureConditions, [structureId]: condition };
```

---

### 4. ModifierService.ts (1 mutation)

#### Line 44: Resource Assignment
```typescript
kingdom.resources[mod.resource] = newValue;
```
**Fix:**
```typescript
kingdom.resources = { ...kingdom.resources, [mod.resource]: newValue };
```

---

### 5. PF2eSkillService.ts (1 mutation)

#### Line 212: Bonus Map Assignment
```typescript
bonusMap[skill] = { ... };
```
**Context:** May or may not be in updateKingdom - needs investigation  
**Fix:**
```typescript
bonusMap = { ...bonusMap, [skill]: { ... } };
```

---

## Medium Priority (Service Layer State)

These are in services but may be local state (need verification):

### RiverEditorHandlers.ts (4 mutations)
- Lines 187, 288, 300, 458, 734: River path mutations
- **Action:** Verify if these affect kingdom state

### KingdomInitializationService.ts (2 mutations)
- Lines 37-38, 72: Resource initialization
- **Action:** These may be acceptable during initialization

---

## Low Priority (Local State - Safe)

These are local variables, NOT kingdom state mutations:

1. **PF2eSkillService**: Building modifier arrays (safe)
2. **structures/selection.ts**: Building result arrays (safe)
3. **HexSelectorService**: Component-local state (safe)
4. **TerritoryOutline**: Utility function state (safe)

---

## Fix Priority Order

### Phase 1: Critical Core Services (THIS WEEK)

1. **GameCommandsService** (7 fixes) - Most used service
2. **WaterFeatureService** (10 fixes) - River/lake features
3. **ModifierService** (1 fix) - Core resource updates

**Impact:** Fixes ~80% of reactivity issues

### Phase 2: Structure & Skill Services (NEXT WEEK)

4. **Structure Services** (3 fixes)
5. **PF2eSkillService** (1 fix after verification)

**Impact:** Completes service layer hardening

### Phase 3: Editor Services (WEEK 3)

6. **RiverEditorHandlers** (verify + fix if needed)
7. **KingdomInitializationService** (verify + fix if needed)

---

## Testing Strategy

For each fixed service:

1. **Unit Test:** Call method, verify array reference changes
2. **Reactive Test:** Test with const reactive statement:
   ```svelte
   {@const derived = compute($kingdomData.field)}
   ```
3. **Integration Test:** Test in actual phase component
4. **Regression Test:** Verify existing functionality unchanged

---

## Proposed Fixes Timeline

| Service | Mutations | Estimated Time | Priority |
|---------|-----------|----------------|----------|
| GameCommandsService | 7 | 2 hours | P0 |
| WaterFeatureService | 10 | 2 hours | P0 |
| ModifierService | 1 | 30 min | P0 |
| Structure Services | 3 | 1 hour | P1 |
| PF2eSkillService | 1 | 30 min | P1 |

**Total Critical Path:** ~6 hours of focused work

---

## Implementation Pattern

### Standard Fix Template

```typescript
// ❌ BEFORE
await updateKingdom(kingdom => {
  kingdom.array.push(item);
  kingdom.object[key] = value;
  kingdom.array.splice(index, 1);
});

// ✅ AFTER
await updateKingdom(kingdom => {
  kingdom.array = [...kingdom.array, item];
  kingdom.object = { ...kingdom.object, [key]: value };
  kingdom.array = kingdom.array.filter((_, i) => i !== index);
});
```

### Nested Object Fix Template

```typescript
// ❌ BEFORE
kingdom.turnState.actionsPhase.actionLog.push(entry);

// ✅ AFTER
kingdom.turnState = {
  ...kingdom.turnState,
  actionsPhase: {
    ...kingdom.turnState.actionsPhase,
    actionLog: [...kingdom.turnState.actionsPhase.actionLog, entry]
  }
};
```

---

## Next Steps

1. ✅ Audit complete - mutations catalogued
2. **NOW:** Begin Phase 1 fixes (GameCommandsService)
3. Create PR for each service (easier review)
4. Test each fix with all reactive patterns
5. Update audit doc with progress

---

## Success Criteria

- [ ] All 15 critical mutations fixed
- [ ] All services pass reactive statement test
- [ ] No regression in existing tests
- [ ] Documentation updated
- [ ] Coding standards enforced

---

**Status:** Ready to begin Phase 1 fixes  
**Blocker:** None  
**Risk:** Low (fixes are straightforward, well-understood patterns)

