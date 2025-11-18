# Custom Action Implementation Guide

## Overview

This guide explains how to create custom actions that integrate with the kingdom management system. Custom actions leverage the **standard modifier system** for automatic UI display and resolution, while allowing **custom components** for specialized interactions.

---

## Architecture Principles

### 1. **Modifier System = Automatic UI**

The `OutcomeDisplay` component automatically handles:
- ✅ Displaying dice rollers for `DiceModifier` types
- ✅ Showing choice buttons for `ChoiceModifier` types
- ✅ Computing values for `ComputedModifier` types
- ✅ Displaying static values for `StaticModifier` types
- ✅ Showing all results in the `StateChanges` component
- ✅ Validating completion before allowing "Apply"
- ✅ Converting everything to `ResolutionData` for the action

### 2. **Custom Components = Special UI Only**

Use custom components **only when** you need:
- Complex user input (settlement naming, structure selection)
- Multi-step flows (pre-roll dialogs)
- Special validation logic (capacity checks, eligibility)
- Custom visualizations (allocation sliders, maps)

### 3. **They Work Together**

Custom components are shown **alongside** standard modifier display, not as replacements!

---

## The Four Modifier Types

### 1. StaticModifier

**Fixed numeric value** applied immediately.

```json
{
  "type": "static",
  "resource": "gold",
  "value": -5,
  "duration": "immediate"
}
```

**When to use:**
- Fixed costs/gains (e.g., "gain 5 gold")
- Predetermined penalties (e.g., "lose 2 unrest")
- Flat bonuses (e.g., "+3 food")

**UI Behavior:** Displays the value directly in StateChanges

---

### 2. DiceModifier

**Player rolls dice** for the value.

```json
{
  "type": "dice",
  "resource": "food",
  "formula": "2d4+1",
  "negative": true,
  "duration": "immediate"
}
```

**When to use:**
- Variable outcomes (e.g., "lose 2d6 gold")
- Randomized gains/losses
- Scaling effects (e.g., "tier × d4")

**UI Behavior:** Shows dice roller button → user clicks → animates roll → displays result

---

### 3. ChoiceModifier

**Player chooses** from multiple resource options.

```json
{
  "type": "choice",
  "resources": ["lumber", "ore", "food"],
  "value": {
    "formula": "2d4+1",
    "negative": true
  },
  "negative": true,
  "duration": "immediate"
}
```

**When to use:**
- Flexible costs (e.g., "lose lumber OR ore OR food")
- Player-chosen effects
- Resource substitution

**UI Behavior:** Shows choice buttons → user selects → rolls dice if needed → displays selection

---

### 4. ComputedModifier ⭐ NEW

**Value calculated at runtime** based on game state.

```json
{
  "type": "computed",
  "resource": "gold",
  "formula": "halfUpgradeCost",
  "negative": true,
  "duration": "immediate"
}
```

**When to use:**
- Dynamic costs (e.g., settlement level-based)
- Context-dependent values (e.g., structure tier × 2)
- Game state calculations

**UI Behavior:** Action resolves the formula → displays as static value

---

## Implementing Computed Modifiers

### Step 1: Define in JSON

```json
{
  "id": "upgrade-settlement",
  "effects": {
    "criticalSuccess": {
      "description": "Upgrade at half cost!",
      "modifiers": [
        {
          "type": "computed",
          "resource": "gold",
          "formula": "halfUpgradeCost",
          "negative": true
        }
      ]
    },
    "success": {
      "modifiers": [
        {
          "type": "computed",
          "resource": "gold",
          "formula": "fullUpgradeCost",
          "negative": true
        }
      ]
    }
  }
}
```

### Step 2: Create Formula Resolver

```typescript
// In your action implementation (e.g., UpgradeSettlementAction.ts)
import { isComputedModifier, type EventModifier } from '../../types/modifiers';

/**
 * Resolve computed modifiers to static values
 */
function resolveComputedModifiers(
  modifiers: EventModifier[], 
  context: { settlementId: string; newLevel: number }
): EventModifier[] {
  return modifiers.map(mod => {
    if (!isComputedModifier(mod)) return mod;
    
    let value: number;
    
    switch (mod.formula) {
      case 'halfUpgradeCost':
        value = Math.ceil(context.newLevel / 2);
        break;
      
      case 'fullUpgradeCost':
        value = context.newLevel;
        break;
      
      default:
        console.warn(`Unknown formula: ${mod.formula}`);
        value = 0;
    }
    
    // Convert to static modifier
    return {
      type: 'static',
      resource: mod.resource,
      value: mod.negative ? -value : value,
      duration: mod.duration
    };
  });
}
```

### Step 3: Apply Before Displaying

```typescript
// In your action's execute or prepare method
const effectData = actionJson.effects[outcome];
const resolvedModifiers = resolveComputedModifiers(
  effectData.modifiers,
  { settlementId: 'settlement-123', newLevel: 5 }
);

// Pass resolved modifiers to OutcomeDisplay
checkInstance.display({
  outcome,
  modifiers: resolvedModifiers,  // Now all static!
  effect: effectData.description
});
```

---

## Action Implementation Patterns

### Pattern 1: Standard Modifiers Only

**Example:** Simple resource gain/loss actions

```typescript
// In YourAction.ts
export async function createYourAction() {
  return {
    async execute(outcome: string) {
      const effectData = actionJson.effects[outcome];
      
      // Pass modifiers directly to OutcomeDisplay
      await checkInstance.display({
        outcome,
        modifiers: effectData.modifiers,  // Static/Dice/Choice modifiers
        effect: effectData.description
      });
    }
  };
}
```

**No custom code needed!** OutcomeDisplay handles everything.

---

### Pattern 2: Computed Modifiers

**Example:** Dynamic costs based on game state

```typescript
export async function createUpgradeSettlementAction() {
  return {
    async execute(outcome: string, context: { settlementId: string }) {
      const settlement = findSettlementById(kingdom, context.settlementId);
      const newLevel = settlement.level + 1;
      
      const effectData = actionJson.effects[outcome];
      
      // Resolve computed modifiers
      const resolvedModifiers = resolveComputedModifiers(
        effectData.modifiers,
        { settlementId: context.settlementId, newLevel }
      );
      
      // Display with resolved values
      await checkInstance.display({
        outcome,
        modifiers: resolvedModifiers,
        effect: effectData.description.replace('{Settlement}', settlement.name)
      });
    }
  };
}
```

---

### Pattern 3: Custom Component + Modifiers

**Example:** Special UI for user input + standard cost display

```typescript
import EstablishSettlementDialog from './EstablishSettlementDialog.svelte';

export async function createEstablishSettlementAction() {
  return {
    async execute(outcome: string) {
      const effectData = actionJson.effects[outcome];
      
      // Show custom component AND standard modifiers
      await checkInstance.display({
        outcome,
        modifiers: effectData.modifiers,  // Standard costs shown
        effect: effectData.description,
        customComponent: EstablishSettlementDialog  // Additional UI for naming
      });
    },
    
    async resolve(resolutionData: ResolutionData) {
      // resolutionData.numericModifiers = standard modifier costs
      // resolutionData.customComponentData = { settlementName: 'New Town', ... }
      
      const settlementName = resolutionData.customComponentData?.settlementName;
      
      // Apply modifiers (automatic)
      await applyModifiers(resolutionData.numericModifiers);
      
      // Use custom data
      await createSettlement({ name: settlementName });
    }
  };
}
```

---

## Custom Component Interface

### Props Passed to Custom Components

```typescript
export let instance: ActiveCheckInstance | null = null;
export let outcome: string;
export let modifiers: EventModifier[] | undefined = undefined;
export let stateChanges: Record<string, any> | undefined = undefined;
```

### Storing Data

Use `updateInstanceResolutionState` to store data that syncs across all clients:

```typescript
import { updateInstanceResolutionState } from '../../controllers/shared/ResolutionStateHelpers';

async function handleSelection() {
  if (!instance) return;
  
  await updateInstanceResolutionState(instance.instanceId, {
    customComponentData: {
      settlementName: 'New Town',
      structureId: 'structure-123'
    }
  });
}
```

### Dispatching Events

```typescript
import { createEventDispatcher } from 'svelte';

const dispatch = createEventDispatcher();

function handleConfirm() {
  dispatch('selection', {
    settlementName: 'New Town',
    structureId: 'structure-123'
  });
}
```

---

## Best Practices

### ✅ DO

- **Use standard modifiers** for all resource changes
- **Resolve computed modifiers** before passing to OutcomeDisplay
- **Keep custom components minimal** - only for special UI
- **Store state in instance** using `updateInstanceResolutionState`
- **Dispatch events** to communicate with parent
- **Document formula strings** in your action implementation

### ❌ DON'T

- ❌ Handle resource changes in custom components (use modifiers!)
- ❌ Use magic numbers in JSON (use computed modifiers with named formulas)
- ❌ Store UI state locally in custom components (use instance state)
- ❌ Recreate standard UI (dice rollers, choice buttons) in custom code
- ❌ Forget to mark computed modifiers as `negative: true` for costs

---

## Complete Example: Upgrade Settlement

### JSON Definition
```json
{
  "id": "upgrade-settlement",
  "effects": {
    "criticalSuccess": {
      "description": "{Settlement} upgraded at half cost!",
      "modifiers": [
        { "type": "computed", "resource": "gold", "formula": "halfUpgradeCost", "negative": true }
      ]
    },
    "success": {
      "modifiers": [
        { "type": "computed", "resource": "gold", "formula": "fullUpgradeCost", "negative": true }
      ]
    }
  }
}
```

### TypeScript Implementation
```typescript
import { isComputedModifier } from '../../types/modifiers';
import type { EventModifier } from '../../types/modifiers';

function resolveComputedModifiers(modifiers: EventModifier[], newLevel: number): EventModifier[] {
  return modifiers.map(mod => {
    if (!isComputedModifier(mod)) return mod;
    
    const value = mod.formula === 'halfUpgradeCost' 
      ? Math.ceil(newLevel / 2) 
      : newLevel;
    
    return {
      type: 'static',
      resource: mod.resource,
      value: mod.negative ? -value : value,
      duration: mod.duration
    };
  });
}

export async function createUpgradeSettlementAction() {
  return {
    async execute(outcome: string, context: { settlementId: string }) {
      const settlement = findSettlementById(kingdom, context.settlementId);
      const newLevel = settlement.level + 1;
      const effectData = actionJson.effects[outcome];
      
      await checkInstance.display({
        outcome,
        modifiers: resolveComputedModifiers(effectData.modifiers, newLevel),
        effect: effectData.description.replace('{Settlement}', settlement.name)
      });
    },
    
    async resolve(resolutionData: ResolutionData) {
      await applyModifiers(resolutionData.numericModifiers);
      await upgradeSettlement(context.settlementId);
    }
  };
}
```

---

## Type Reference

### EventModifier Union Type
```typescript
type EventModifier = StaticModifier | DiceModifier | ChoiceModifier | ComputedModifier;
```

### Type Guards
```typescript
import { 
  isStaticModifier, 
  isDiceModifier, 
  isChoiceModifier, 
  isComputedModifier 
} from '../../types/modifiers';

modifiers.forEach(mod => {
  if (isComputedModifier(mod)) {
    // TypeScript knows: mod.formula exists
  }
});
```

### ResolutionData
```typescript
interface ResolutionData {
  numericModifiers: Array<{ resource: ResourceType; value: number }>;
  manualEffects: string[];
  complexActions: ComplexAction[];
  customComponentData?: any;
}
```

---

## Migration Checklist

Converting existing actions to use standard modifiers:

- [ ] Review action JSON - identify hardcoded costs/effects
- [ ] Add appropriate modifier types to JSON
- [ ] If costs are dynamic, use `ComputedModifier` with formula strings
- [ ] Create formula resolver function in action implementation
- [ ] Remove manual cost/effect handling from custom code
- [ ] Update custom components to focus on UI only (not business logic)
- [ ] Test all outcome paths (critical success through critical failure)
- [ ] Update action README with modifier usage

---

## Questions?

See existing implementations:
- **establish-settlement** - Great example of standard modifiers + custom naming UI
- **upgrade-settlement** - Uses computed modifiers for dynamic costs
- **repair-structure** - Mix of modifiers and custom cost choice UI

For architecture questions, check `.clinerules/ARCHITECTURE_SUMMARY.md`
