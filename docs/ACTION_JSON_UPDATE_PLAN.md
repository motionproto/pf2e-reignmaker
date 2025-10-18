# Action JSON Update Plan

## Overview

After implementing the `ComputedModifier` system, we need to update action JSON files to properly declare their costs and effects using typed modifiers instead of relying entirely on custom code.

## Current Status

### ✅ Already Correct

**establish-settlement.json**
- Uses `StaticModifier` for all costs/effects
- Good example of proper modifier usage
- No changes needed

**upgrade-settlement.json**
- Uses `ComputedModifier` for dynamic costs
- Good example of formula-based costs
- No changes needed

### ⚠️ Needs ComputedModifier Updates

These actions have **dynamic costs** based on game state that should use `ComputedModifier`:

#### 1. **build-structure.json**
**Current:** Empty modifiers arrays  
**Issue:** Structure costs vary by tier (computed at runtime)  
**Update Needed:**
```json
{
  "criticalSuccess": {
    "modifiers": [
      {
        "type": "computed",
        "resource": "lumber",
        "formula": "halfStructureLumberCost",
        "negative": true
      },
      {
        "type": "computed",
        "resource": "ore",
        "formula": "halfStructureOreCost",
        "negative": true
      },
      {
        "type": "computed",
        "resource": "gold",
        "formula": "halfStructureGoldCost",
        "negative": true
      }
    ]
  },
  "success": {
    "modifiers": [
      {
        "type": "computed",
        "resource": "lumber",
        "formula": "fullStructureLumberCost",
        "negative": true
      },
      {
        "type": "computed",
        "resource": "ore",
        "formula": "fullStructureOreCost",
        "negative": true
      },
      {
        "type": "computed",
        "resource": "gold",
        "formula": "fullStructureGoldCost",
        "negative": true
      }
    ]
  }
}
```

#### 2. **repair-structure.json**
**Current:** Uses `gameEffects` for cost choice  
**Issue:** Could use modifiers for critical failure penalty  
**Note:** Success/CritSuccess use custom choice UI (RepairCostChoice), which is appropriate  
**Update Needed:** Already has static modifier for critical failure ✅

#### 3. **recruit-unit.json**
**Current:** Empty modifiers, uses custom recruitment logic  
**Issue:** Army costs vary by level/type  
**Update Needed:**
```json
{
  "success": {
    "modifiers": [
      {
        "type": "computed",
        "resource": "gold",
        "formula": "armyRecruitmentCost",
        "negative": true
      }
    ]
  }
}
```

#### 4. **outfit-army.json**
**Current:** Empty modifiers  
**Issue:** Outfit costs vary by army level  
**Update Needed:**
```json
{
  "success": {
    "modifiers": [
      {
        "type": "computed",
        "resource": "gold",
        "formula": "armyOutfitCost",
        "negative": true
      }
    ]
  }
}
```

### 🔧 Needs StaticModifier Updates

These actions have **fixed costs** that should use `StaticModifier`:

#### 5. **claim-hexes.json**
**Current:** Empty modifiers  
**Update Needed:**
```json
{
  "success": {
    "modifiers": [
      {
        "type": "static",
        "resource": "gold",
        "value": -1,
        "duration": "immediate"
      }
    ]
  },
  "criticalFailure": {
    "modifiers": [
      {
        "type": "static",
        "resource": "gold",
        "value": -1,
        "duration": "immediate"
      },
      {
        "type": "static",
        "resource": "unrest",
        "value": 1,
        "duration": "immediate"
      }
    ]
  }
}
```

#### 6. **build-roads.json**
**Current:** Empty modifiers  
**Update Needed:**
```json
{
  "success": {
    "modifiers": [
      {
        "type": "static",
        "resource": "lumber",
        "value": -1,
        "duration": "immediate"
      }
    ]
  },
  "criticalFailure": {
    "modifiers": [
      {
        "type": "static",
        "resource": "lumber",
        "value": -1,
        "duration": "immediate"
      }
    ]
  }
}
```

#### 7. **fortify-hex.json**
**Current:** Empty modifiers  
**Update Needed:**
```json
{
  "success": {
    "modifiers": [
      {
        "type": "static",
        "resource": "lumber",
        "value": -1,
        "duration": "immediate"
      },
      {
        "type": "static",
        "resource": "ore",
        "value": -1,
        "duration": "immediate"
      }
    ]
  }
}
```

#### 8. **create-worksite.json**
**Current:** Empty modifiers  
**Update Needed:**
```json
{
  "success": {
    "modifiers": [
      {
        "type": "static",
        "resource": "lumber",
        "value": -1,
        "duration": "immediate"
      }
    ]
  }
}
```

### ✅ No Modifiers Needed (Pure Manual Actions)

These actions are **intentionally manual** with no automatic resource changes:

- **arrest-dissidents.json** - Uses custom allocation UI
- **deal-with-unrest.json** - Purely manual (GM applies)
- **deploy-army.json** - No resource costs
- **disband-army.json** - Manual army management
- **establish-diplomatic-relations.json** - Manual relationship tracking
- **execute-or-pardon-prisoners.json** - Custom choice with unrest effects
- **hire-adventurers.json** - Manual/narrative
- **infiltration.json** - Manual/narrative
- **recover-army.json** - No costs
- **request-economic-aid.json** - Manual aid amounts
- **request-military-aid.json** - Manual aid
- **send-scouts.json** - Information gathering
- **train-army.json** - No costs (time-based)

### 🔀 Special Cases

#### **collect-stipend.json**
**Current:** Empty modifiers  
**Issue:** Gain varies by kingdom size/economy  
**Options:**
1. Use `ComputedModifier` with `formula: "monthlyStipend"`
2. Keep as manual (GM determines amount)

**Recommendation:** ComputedModifier
```json
{
  "success": {
    "modifiers": [
      {
        "type": "computed",
        "resource": "gold",
        "formula": "monthlyStipend",
        "negative": false
      }
    ]
  }
}
```

#### **harvest-resources.json**
**Current:** Empty modifiers  
**Issue:** Resources gained vary by hex features  
**Recommendation:** Keep manual (too context-dependent)

#### **purchase-resources.json**
**Current:** Empty modifiers  
**Issue:** Market prices vary  
**Recommendation:** Keep manual (player choice of quantity)

#### **sell-surplus.json**
**Current:** Empty modifiers  
**Issue:** Quantities vary  
**Recommendation:** Keep manual (player choice)

## Implementation Priority

### High Priority (Dynamic Costs - Clear Benefit)
1. ✅ upgrade-settlement.json (DONE)
2. build-structure.json
3. recruit-unit.json
4. outfit-army.json
5. collect-stipend.json

### Medium Priority (Fixed Costs - Easy Wins)
6. claim-hexes.json
7. build-roads.json
8. fortify-hex.json
9. create-worksite.json

### Low Priority (Keep Manual)
- All pure manual/narrative actions

## Implementation Steps

For each action needing updates:

1. **Analyze the action:**
   - Determine if costs are static or dynamic
   - Identify all resources involved
   - Check for outcome-based variations

2. **Update JSON:**
   - Add appropriate modifier types
   - Use `ComputedModifier` for dynamic costs
   - Use `StaticModifier` for fixed costs
   - Mark costs as `negative: true`

3. **Update action implementation:**
   - For `ComputedModifier`: Add formula resolver function
   - Document formula strings
   - Remove manual cost handling from custom code

4. **Test:**
   - Verify all outcomes display correctly
   - Ensure costs are calculated properly
   - Check that OutcomeDisplay shows modifiers

## Example: build-structure.json Update

### Before
```json
{
  "criticalSuccess": {
    "description": "Build a {structure} for half cost",
    "modifiers": []
  }
}
```

### After
```json
{
  "criticalSuccess": {
    "description": "Build a {structure} for half cost",
    "modifiers": [
      { "type": "computed", "resource": "lumber", "formula": "halfStructureLumberCost", "negative": true },
      { "type": "computed", "resource": "ore", "formula": "halfStructureOreCost", "negative": true },
      { "type": "computed", "resource": "gold", "formula": "halfStructureGoldCost", "negative": true }
    ]
  }
}
```

### Implementation
```typescript
function resolveComputedModifiers(modifiers: EventModifier[], structure: Structure): EventModifier[] {
  return modifiers.map(mod => {
    if (!isComputedModifier(mod)) return mod;
    
    let value: number;
    const fullCost = structure.cost[mod.resource] || 0;
    
    switch (mod.formula) {
      case 'halfStructureLumberCost':
      case 'halfStructureOreCost':
      case 'halfStructureGoldCost':
        value = Math.ceil(fullCost / 2);
        break;
      
      case 'fullStructureLumberCost':
      case 'fullStructureOreCost':
      case 'fullStructureGoldCost':
        value = fullCost;
        break;
      
      default:
        value = 0;
    }
    
    return {
      type: 'static',
      resource: mod.resource,
      value: mod.negative ? -value : value,
      duration: mod.duration
    };
  });
}
```

## Benefits of These Updates

1. **Transparency** - Costs visible in JSON, not buried in code
2. **Automatic UI** - OutcomeDisplay shows all modifiers
3. **Type Safety** - TypeScript validates modifier structure
4. **Maintainability** - Clear separation of data and logic
5. **Consistency** - All actions use same pattern

## Next Steps

1. Review this plan
2. Prioritize which actions to update first
3. Update JSON files one by one
4. Test each update
5. Update action implementations as needed
6. Run build to verify types generate correctly
