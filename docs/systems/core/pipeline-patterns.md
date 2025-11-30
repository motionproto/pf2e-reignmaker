# Action Pipeline Patterns Reference

**Quick Reference Guide for Implementing Actions**

**Last Updated:** 2025-01-28

---

## Execute-First Pattern (Core Concept)

**Since January 2025**, the pipeline uses an **execute-first pattern** for automatic modifier application:

### How It Works

1. **Default modifiers applied FIRST** (before custom execute runs):
   - Fame +1 on all critical successes
   - Pre-rolled dice modifiers from UI (`resolutionData.numericModifiers`)
   - Static JSON modifiers for the outcome
   - All applied via GameCommandsService (includes shortfall detection)

2. **Custom execute runs SECOND** (if defined):
   - Only implements custom game logic
   - Modifiers already applied - don't duplicate!
   - Can add ADDITIONAL dynamic costs if needed

### Simple Pipeline (No Execute Needed)

Most incidents and events need no execute function at all:

```typescript
export const myPipeline = createActionPipeline('my-action', {
  requirements: () => ({ met: true }),
  // No preview needed - JSON modifiers auto-convert to badges
  // No execute needed - modifiers applied automatically!
});
```

### Custom Logic Pipeline

For actions with game logic beyond resource changes:

```typescript
export const myPipeline = createActionPipeline('my-action', {
  execute: async (ctx) => {
    // Modifiers already applied by execute-first pattern
    // Just implement custom logic here
    await claimHexesExecution(ctx.resolutionData.compoundData?.selectedHexes);
    return { success: true };
  }
});
```

### Dynamic Cost Pipeline

For actions where costs are calculated based on user selections:

```typescript
export const myPipeline = createActionPipeline('my-action', {
  execute: async (ctx) => {
    // JSON modifiers already applied
    // Add ADDITIONAL dynamic costs using GameCommandsService
    const dynamicCost = calculateCost(ctx.metadata.selection);
    
    const gameCommandsService = await createGameCommandsService();
    await gameCommandsService.applyNumericModifiers([
      { resource: 'gold', value: -dynamicCost }
    ], ctx.outcome);
    
    // Custom logic
    await doCustomThing(ctx);
    return { success: true };
  }
});
```

### Opt-Out (Rare)

For special cases where you need full control:

```typescript
export const myPipeline = createActionPipeline('special-action', {
  skipDefaultModifiers: true,  // Opts out of execute-first pattern
  execute: async (ctx) => {
    // Handle modifiers manually (unusual case)
  }
});
```

**Current Usage:** Zero pipelines use `skipDefaultModifiers` - all work with the default pattern.

---

## 📋 Quick Pattern Lookup

Use this table to find reference implementations for the pattern you need:

| Pattern | Count | Example Actions | Use When |
|---------|-------|-----------------|----------|
| **No Interactions** | 2 | `dealWithUnrest`, `aidAnother` | Simple modifier application only |
| **Pre-Roll Only** | 6 | `executeOrPardonPrisoners`, `requestEconomicAid`, `upgradeSettlement`, `diplomaticMission` | Need entity selection before rolling |
| **Post-Apply Map** | 6 | `claimHexes`, `buildRoads`, `fortifyHex`, `createWorksite`, `sendScouts` | Hex selection after applying |
| **Post-Roll Component** | 4 | `harvestResources`, `sellSurplus`, `purchaseResources`, `arrestDissidents` | User choice affects outcome (inline UI) |
| **Post-Apply Component** | 5 | `disbandArmy`, `trainArmy`, `outfitArmy`, `recruitUnit`, `requestMilitaryAid` | Complex configuration after apply |
| **Pre + Post-Apply** | 4 | `buildStructure`, `repairStructure`, `establishSettlement`, `infiltration` | Entity selection + configuration |
| **Custom Preview** | 1 | `collectStipend` | Dynamic preview calculation needed |
| **Hex-Path Mode** | 1 | `deployArmy` | Army movement path selection |

**Total:** 28 action pipelines (plus 37 events + 30 incidents)

---

## Pattern 1: No Interactions

**When:** Action only applies modifiers from JSON, no user interaction needed

**Examples:** `dealWithUnrest`, `aidAnother`, plus 57 incidents/events

**Structure:**
```typescript
export const actionPipeline = createActionPipeline('action-id', {
  requirements: () => ({ met: true }),
  
  // Omit preview or set to undefined - JSON modifiers auto-converted to badges
  preview: undefined,
  
  // No execute needed! Modifiers applied automatically by execute-first pattern
});
```

**Key Points:**
- No optional steps: All interaction arrays empty or undefined
- `preview: undefined` - JSON modifiers auto-converted to badges
- **No execute function needed** - modifiers applied automatically
- JSON modifiers in `data/player-actions/*.json` automatically become badges

---

## Pattern 2: Pre-Roll Entity Selection

**When:** User must select an entity (settlement/faction/army) before rolling

**Examples:** 
- `executeOrPardonPrisoners` - select settlement (entity-selection)
- `requestEconomicAid` - select faction (entity-selection)
- `upgradeSettlement` - select settlement (entity-selection)
- `diplomaticMission` - select faction (entity-selection)
- `requestMilitaryAid` - select faction (entity-selection)
- `buildStructure` - select structure + settlement (configuration dialog)

**Structure:**
```typescript
export const actionPipeline = createActionPipeline('action-id', {
  preRollInteractions: [
    {
      // Most common: Entity selection
      type: 'entity-selection',
      id: 'settlement',
      entityType: 'settlement',  // 'settlement', 'faction', or 'army'
      label: 'Select Settlement',
      required: true,
      filter: (settlement) => settlement.tier >= 2  // Optional filter
    }
    // Alternative: Configuration dialog (like buildStructure)
    // {
    //   type: 'configuration',
    //   id: 'buildingDetails',
    //   component: 'BuildStructureDialog',
    //   label: 'Select structure and settlement'
    // }
  ],
  
  execute: async (ctx) => {
    // Modifiers already applied by execute-first pattern
    
    // Access selected entity from metadata
    const settlementId = ctx.metadata?.settlement?.id;
    const settlementName = ctx.metadata?.settlement?.name;
    
    // OR for configuration dialog:
    // const buildingDetails = ctx.metadata?.buildingDetails;
    
    // Use in execution...
  }
});
```

**Key Points:**
- Selection happens in Step 2 (before roll)
- Data stored in `ctx.metadata[interactionId]`
- Available in preview calculation and execute
- Two variants: `entity-selection` (simple) or `configuration` (complex)

---

## Pattern 3: Post-Apply Hex Selection

**When:** User selects hexes on map after rolling succeeds

**Examples:** `claimHexes`, `buildRoads`, `fortifyHex`, `createWorksite`, `sendScouts`

**Structure:**
```typescript
export const actionPipeline = createActionPipeline('action-id', {
  postApplyInteractions: [
    {
      type: 'map-selection',
      id: 'selectedHexes',
      mode: 'hex-selection',
      count: 1,  // Or dynamic based on outcome
      colorType: 'claim',
      
      // Only show on success
      condition: (ctx) => ctx.outcome === 'success',
      
      // Hex validation
      validateHex: (hexId, pendingClaims) => {
        // Return { valid: true } or { valid: false, reason: 'message' }
      },
      
      // Outcome-specific adjustments
      outcomeAdjustment: {
        criticalSuccess: { count: 3, title: 'Select 3 hexes' },
        success: { count: 1, title: 'Select 1 hex' }
      }
    }
  ],
  
  execute: async (ctx) => {
    // Modifiers already applied by execute-first pattern
    
    // Access hex selections from resolutionData
    const hexIds = ctx.resolutionData.compoundData?.selectedHexes;
    
    if (!hexIds || hexIds.length === 0) {
      return { success: true, cancelled: true };
    }
    
    // Process hexes...
  }
});
```

**Key Points:**
- Selection happens in Step 7 (after apply button)
- Data stored in `ctx.resolutionData.compoundData[interactionId]`
- Validation runs client-side before allowing selection

---

## Pattern 4: Post-Roll Custom Component (Inline)

**When:** User makes choice that affects the outcome (shown inline in outcome card)

**Examples:** `harvestResources`, `sellSurplus`, `purchaseResources`, `arrestDissidents`

**Structure:**
```typescript
export const actionPipeline = createActionPipeline('action-id', {
  postRollInteractions: [
    {
      type: 'configuration',
      id: 'resourceSelection',
      component: 'ResourceChoiceSelector',  // String name (preferred)
      
      condition: (ctx) => ctx.outcome === 'success',
      
      // Apply user's selection
      onComplete: async (data, context) => {
        const { selectedResource, amount } = data;
        
        await applyResourceChanges([{
          resource: selectedResource,
          value: amount
        }]);
      }
    }
  ],
  
  execute: async (ctx) => {
    // Modifiers already applied by execute-first pattern
    // Resources also applied by onComplete handler
    return { success: true };
  }
});
```

**Key Points:**
- Component shown INLINE in OutcomeDisplay (before apply button)
- Uses `postRollInteractions` (not `postApplyInteractions`)
- Component name as **string** (preferred) - looked up in registry
- Alternative: Pass Svelte component class directly (works but less reliable with HMR)
- `onComplete` executes during Step 8 with user's selection
- Component must emit `resolution` event with standard format

---

## Pattern 5: Post-Apply Custom Component

**When:** Complex configuration needed after user clicks apply

**Examples:** `disbandArmy`, `trainArmy`, `outfitArmy`, `recruitUnit`

**Structure:**
```typescript
export const actionPipeline = createActionPipeline('action-id', {
  postApplyInteractions: [
    {
      type: 'configuration',
      id: 'configuration',
      component: 'ConfigurationComponent',  // String name for registry lookup
      
      condition: (ctx) => ctx.outcome === 'success',
      
      componentProps: {
        maxUnits: 4  // Custom props for component
      }
    }
  ],
  
  execute: async (ctx) => {
    // Modifiers already applied by execute-first pattern
    
    // Access configuration data
    const config = ctx.resolutionData?.customComponentData?.configuration;
    
    if (!config) {
      return { success: true, cancelled: true };
    }
    
    // Use configuration...
  }
});
```

**Key Points:**
- Component shown in separate dialog (after apply button)
- Data stored in `ctx.resolutionData.customComponentData[interactionId]`
- User can cancel (handle gracefully)

---

## Pattern 6: Pre-Roll + Post-Apply

**When:** Need entity or configuration selection before roll AND additional interaction after

**Examples:** `buildStructure`, `repairStructure`, `establishSettlement`, `infiltration`

**Structure:**
```typescript
export const actionPipeline = createActionPipeline('action-id', {
  preRollInteractions: [
    {
      // Option A: Entity selection
      type: 'entity-selection',
      id: 'settlement',
      entityType: 'settlement',
      label: 'Select Settlement'
    }
    // OR Option B: Custom configuration
    // {
    //   type: 'configuration',
    //   id: 'buildingDetails',
    //   component: 'BuildStructureDialog'
    // }
  ],
  
  postApplyInteractions: [
    {
      type: 'map-selection',
      id: 'hexes',
      mode: 'hex-selection',
      count: 1,
      condition: (ctx) => ctx.outcome === 'success'
    }
  ],
  
  execute: async (ctx) => {
    // Modifiers already applied by execute-first pattern
    
    // Access both pre-roll and post-apply data
    const settlementId = ctx.metadata?.settlement?.id;
    // OR for configuration:
    // const buildingDetails = ctx.metadata?.buildingDetails;
    
    const hexIds = ctx.resolutionData.compoundData?.hexes;
    
    // Use both...
  }
});
```

**Key Points:**
- Combines Pattern 2 + Pattern 3 (or Pattern 2 + Pattern 5)
- Pre-roll can be **either** `entity-selection` OR `configuration`
- Pre-roll data stored in `ctx.metadata[interactionId]`
- Post-apply data stored in `ctx.resolutionData` (map in `compoundData`, config in `customComponentData`)
- Both datasets available in `execute()` and `preview.calculate()`

---

## Pattern 7: Custom Preview Calculation

**When:** Preview needs dynamic calculation (not just JSON conversion)

**Examples:** `collectStipend` (finds highest-tier settlement)

**Structure:**
```typescript
export const actionPipeline = createActionPipeline('action-id', {
  preview: {
    calculate: (ctx) => {
      // Custom calculation
      const settlements = ctx.kingdom.settlements || [];
      const highest = settlements.reduce((max, s) => 
        s.tier > max.tier ? s : max
      );
      
      const stipend = calculateStipend(highest.tier);
      
      return {
        resources: [{ resource: 'gold', value: stipend }],
        outcomeBadges: [],
        warnings: []
      };
    }
  },
  
  execute: async (ctx) => {
    // Modifiers already applied by execute-first pattern
    // Custom logic here if needed
  }
});
```

**Key Points:**
- Only needed when JSON modifiers aren't sufficient
- Return `PreviewData` structure
- Calculation happens in Step 5

---

## Pattern 8: Hex-Path Mode (Special)

**When:** Need army selection + movement path plotting

**Examples:** `deployArmy` (only action using this)

**Structure:**
```typescript
export const actionPipeline = createActionPipeline('deploy-army', {
  preRollInteractions: [
    {
      type: 'map-selection',
      id: 'deployment',
      mode: 'hex-path',  // Special mode!
      title: 'Deploy Army',
      
      // No count - user plots path with 2+ hexes
      // Component shows army list, user selects, plots path
    }
  ],
  
  execute: async (ctx) => {
    // Modifiers already applied by execute-first pattern
    
    const deployment = ctx.metadata?.deployment;
    const { armyId, path, armyName } = deployment;
    
    // Deploy army along path...
  }
});
```

**Key Points:**
- Uses `ArmyDeploymentPanel` instead of standard hex selector
- Integrated UX: army selection + path plotting in one dialog
- Returns `{ armyId, path, armyName }`

---

## Quick Implementation Checklist

When implementing a new action:

### 1. Determine Pattern
- [ ] Check examples above
- [ ] Note which optional steps needed
- [ ] Find reference implementation

### 2. Define Pipeline
- [ ] Copy pattern structure
- [ ] Update IDs and labels
- [ ] Add custom validation if needed

### 3. Implement Execute
- [ ] Access data from correct location (`metadata` vs `resolutionData`)
- [ ] Handle cancellation gracefully
- [ ] Return `{ success: boolean, error?: string }`

### 4. Test
- [ ] Test all outcomes (crit success, success, failure, crit fail)
- [ ] Test cancellation paths
- [ ] Verify state changes apply correctly

---

## Data Access Quick Reference

| Data Location | When Set | Access Pattern |
|---------------|----------|----------------|
| `ctx.metadata[id]` | Pre-roll interactions (Step 2) | `ctx.metadata?.settlementselection?.id` |
| `ctx.resolutionData.compoundData[id]` | Post-apply map selection (Step 7) | `ctx.resolutionData.compoundData?.selectedHexes` |
| `ctx.resolutionData.customComponentData[id]` | Post-apply configuration (Step 7) | `ctx.resolutionData?.customComponentData?.configuration` |
| `ctx.resolutionData.numericModifiers` | Dice rolling in OutcomeDisplay (Step 6) | Use `applyPreRolledModifiers(ctx)` |

---

## Common Mistakes

### ❌ Wrong interaction type
```typescript
postApplyInteractions: [
  {
    type: 'entity-selection',  // ❌ Should be 'map-selection'
    mode: 'hex-selection'
  }
]
```

### ✅ Correct
```typescript
postApplyInteractions: [
  {
    type: 'map-selection',  // ✅ Correct for hexes
    mode: 'hex-selection'
  }
]
```

### ❌ Accessing data from wrong location
```typescript
execute: async (ctx) => {
  const hexes = ctx.metadata?.selectedHexes;  // ❌ Wrong - postApply goes to resolutionData
}
```

### ✅ Correct
```typescript
execute: async (ctx) => {
  const hexes = ctx.resolutionData.compoundData?.selectedHexes;  // ✅ Correct
}
```

### ❌ Not handling cancellation
```typescript
execute: async (ctx) => {
  const config = ctx.resolutionData?.customComponentData?.config;
  await doSomething(config.value);  // ❌ Crashes if user cancelled!
}
```

### ✅ Correct
```typescript
execute: async (ctx) => {
  const config = ctx.resolutionData?.customComponentData?.config;
  if (!config) {
    return { success: true, cancelled: true };  // ✅ Graceful
  }
  await doSomething(config.value);
}
```

---

## Related Documentation

- **Full Architecture:** [pipeline-coordinator.md](./pipeline-coordinator.md)
- **Testing Guide:** [../../refactoring/TESTING_GUIDE.md](../../refactoring/TESTING_GUIDE.md)
- **Debugging Guide:** [../../refactoring/DEBUGGING_GUIDE.md](../../refactoring/DEBUGGING_GUIDE.md)
- **Resource Modification Best Practices:** [../../refactoring/resource-modification-audit.md](../../refactoring/resource-modification-audit.md)

## Helper Functions Reference

### For Dynamic Costs in Execute

Use these when you need to apply additional costs based on user selections or calculations:

```typescript
// Simple modifier application
const gameCommandsService = await createGameCommandsService();
await gameCommandsService.applyNumericModifiers([
  { resource: 'gold', value: -cost },
  { resource: 'unrest', value: 1 }
], ctx.outcome);

// With rich source tracking
await gameCommandsService.applyOutcome({
  type: 'action',
  sourceId: 'my-action',
  sourceName: `My Action (${entityName})`,
  outcome: ctx.outcome,
  modifiers: calculatedModifiers
});
```

### For Upfront Costs (Before Roll)

Use `applyActionCost()` for costs paid regardless of outcome:

```typescript
// src/pipelines/shared/applyActionCost.ts
await applyActionCost(myPipeline);  // Deducts cost defined in pipeline.cost
```

---

**Status:** ✅ Production Ready - All patterns validated with execute-first pattern
