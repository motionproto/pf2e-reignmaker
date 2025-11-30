# Pre-Roll Selection Pattern

**Purpose:** Actions that require player selection (hexes, settlements, structures, etc.) before rolling the skill check.

---

## Pattern Overview

Some actions need the player to make choices **before** rolling:
- **Claim Hexes:** Select which hexes to claim
- **Harvest Resources:** Select which hex to harvest
- **Build Roads:** Select which hexes to build roads in
- **Establish Settlement:** Select name and location

## Implementation Flow

```
1. User clicks skill → Component intercepts
2. Check action.requiresSelection
3. Show selection dialog → User makes choices
4. Dialog returns selection data
5. Store selection in component state
6. Perform skill roll with normal flow
7. On success: Include selection in ResolutionData.complexActions
8. Controller applies effects using ActionEffectsService
```

## Example: Claim Hexes Action

### 1. Action JSON (data/player-actions/claim-hexes.json)
```json
{
  "id": "claim-hexes",
  "name": "Claim Hexes",
  "requiresSelection": true,
  "selectionType": "hex-multi",
  "effects": {
    "success": {
      "description": "Claim selected hexes",
      "modifiers": []
    }
  }
}
```

### 2. Component Check (ActionsPhase.svelte)
```typescript
async function handleExecuteSkill(event: CustomEvent, action: any) {
  // Check for pre-roll selection requirement
  if (action.requiresSelection) {
    // Show appropriate dialog based on action
    if (action.id === 'claim-hexes') {
      showHexSelectionDialog = true;
      pendingAction = action;
      return;  // Don't roll yet
    }
  }
  
  // Normal flow: proceed with roll
  await executeSkillAction(event, action);
}
```

### 3. Selection Dialog Handler
```typescript
function handleHexSelectionConfirm(event: CustomEvent) {
  const { hexIds } = event.detail;
  showHexSelectionDialog = false;
  
  // Store selection for use after roll
  actionSelections.set(pendingAction.id, { hexIds });
  
  // Now proceed with the skill roll
  // (The roll will be linked to this action's selections)
  executeSkillAction(pendingSkillEvent, pendingAction);
}
```

### 4. Include Selection in Resolution (BaseCheckCard)
```typescript
function handleApplyResult(event: CustomEvent) {
  const resolutionData = event.detail;  // From OutcomeDisplay
  
  // Add any pre-roll selections to complexActions
  const selections = actionSelections.get(action.id);
  if (selections) {
    resolutionData.complexActions.push({
      type: 'claimHex',
      data: selections
    });
  }
  
  // Forward to controller
  dispatch('primary', {
    checkId: id,
    checkType,
    resolution: resolutionData
  });
}
```

### 5. Controller Applies Effects (ActionPhaseController)
```typescript
async resolveAction(actionId, outcome, resolutionData, ...) {
  // Apply resource modifiers first
  await gameEffectsService.applyNumericModifiers(
    resolutionData.numericModifiers,
    outcome
  );
  
  // Apply complex actions (hex claims, etc.)
  if (resolutionData.complexActions.length > 0) {
    const actionEffects = await createActionEffectsService();
    await actionEffects.applyComplexActions(resolutionData.complexActions);
  }
}
```

---

## Selection Dialog Types

### Hex Selection (Single)
- **Used by:** Harvest Resources, Fortify Hex, Create Worksite
- **Returns:** `{ hexId: string }`

### Hex Selection (Multiple)
- **Used by:** Claim Hexes, Build Roads
- **Returns:** `{ hexIds: string[] }`
- **Validation:** Check adjacency, max count based on proficiency

### Settlement Selection
- **Used by:** Build Structure, Upgrade Settlement, Repair Structure
- **Returns:** `{ settlementId: string }`
- **Validation:** Check settlement tier, available slots

### Settlement Creation
- **Used by:** Establish Settlement
- **Returns:** `{ name: string, hexId: string, tier: number }`
- **Validation:** Check hex is claimed, not occupied

### Army Selection
- **Used by:** Deploy Army, Train Army, Outfit Army
- **Returns:** `{ armyId: string }`
- **Validation:** Army exists, correct status

---

## Validation Pattern

Pre-roll selections should be validated in the dialog:

```typescript
// In HexSelectionDialog.svelte
function validateSelection() {
  // Check hex adjacency
  const allAdjacent = selectedHexIds.every(hexId => 
    isAdjacentToControlled(hexId)
  );
  
  if (!allAdjacent) {
    error = 'All hexes must be adjacent to controlled territory';
    return false;
  }
  
  // Check max hexes based on proficiency
  const maxHexes = getMaxHexesByProficiency($kingdomData);
  if (selectedHexIds.length > maxHexes) {
    error = `Can only claim ${maxHexes} hexes with current proficiency`;
    return false;
  }
  
  return true;
}
```

---

## Post-Roll Effects Only (No Selection)

Some Category 2 actions don't need selection but still use ActionEffectsService:

### Example: Send Scouts
- **No pre-roll selection needed**
- **On success:** Reveal adjacent hex info automatically
- **Effect:** `{ type: 'revealHexInfo', data: { hexId: 'auto-detect' } }`

---

## Special Case: Build Structure

Build Structure uses a **full custom dialog** that handles both selection AND rolling internally:

```typescript
// BuildStructureDialog.svelte handles:
// 1. Settlement selection
// 2. Structure selection from catalog
// 3. Cost calculation (50% on crit)
// 4. Skill selection
// 5. Roll execution
// 6. Queue structure project on success

// This is a Category 3 action - more complex than standard pattern
```

---

## Inline Custom Resolution UI (NEW!)

For actions that need player input **after** the roll (e.g., resource selection, quantity input), use inline custom components instead of dialogs.

### Benefits
- Better UX - no modal interruption
- Context preserved - player sees outcome + UI together
- Multi-player synchronized via OutcomePreview
- Composable - multiple UIs can coexist

### Example: Purchase Resources

```typescript
// PurchaseResourcesUI.svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { OutcomePreview } from '../../../models/OutcomePreview';
  
  export let instance: OutcomePreview | null;
  export let outcome: string;
  export let modifiers: any[];
  export let stateChanges: Record<string, any>;
  
  const dispatch = createEventDispatcher();
  
  let selectedResource: string = 'food';
  let quantity: number = 1;
  let costMultiplier = outcome === 'criticalSuccess' ? 0.5 : 1;
  
  $: totalCost = quantity * 10 * costMultiplier;
  
  function handlePurchase() {
    // Dispatch selection event with ComplexAction
    dispatch('selection', {
      type: 'purchaseResources',
      data: {
        resource: selectedResource,
        quantity,
        cost: totalCost
      }
    });
  }
</script>

<div class="purchase-ui">
  <select bind:value={selectedResource}>
    <option value="food">Food</option>
    <option value="lumber">Lumber</option>
  </select>
  
  <input type="number" min="1" max="10" bind:value={quantity} />
  
  <div class="cost-display">
    Cost: {totalCost} gold
    {#if outcome === 'criticalSuccess'}
      <span class="discount">(50% off!)</span>
    {/if}
  </div>
  
  <button on:click={handlePurchase}>Purchase</button>
</div>
```

### Integration Pattern

```svelte
<!-- ActionsPhase.svelte -->
<script>
  import PurchaseResourcesUI from './custom-uis/PurchaseResourcesUI.svelte';
  
  // Map action IDs to custom UI components
  const customUIs = {
    'purchase-resources': PurchaseResourcesUI,
    'sell-surplus': SellSurplusUI,
    // ... more mappings
  };
  
  $: customComponent = customUIs[action.id] || null;
</script>

<BaseCheckCard
  id={action.id}
  name={action.name}
  customResolutionComponent={customComponent}
  on:customSelection={handleCustomSelection}
  ...
/>
```

### Handler Pattern

```typescript
function handleCustomSelection(event: CustomEvent) {
  const { type, data } = event.detail;
  
  // Add to ResolutionData.complexActions
  resolutionData.complexActions.push({
    type,
    data
  });
  
  // Forward to controller
  dispatch('primary', resolutionData);
}
```

### Multi-Player Synchronization

Custom UIs receive the `instance` prop with the OutcomePreview object. Use it to:
1. Read shared state from `instance.resolutionState`
2. Update state via `updateInstanceResolutionState()`
3. All players see the same state in real-time

```typescript
// In custom UI component
import { updateInstanceResolutionState } from '../../../controllers/shared/ResolutionStateHelpers';

async function handleSelection() {
  if (!instance) return;
  
  // Update shared state
  await updateInstanceResolutionState(instance.previewId, {
    customData: { selectedResource, quantity }
  });
  
  // Dispatch for local handling
  dispatch('selection', { ... });
}
```

---

## Summary

**Category 1:** No selection needed → Standard flow  
**Category 2 (Simple):** Pre-roll selection → Dialog pattern  
**Category 2 (Interactive):** Post-roll input → Inline custom UI  
**Category 3:** Complex entity management → Custom dialogs (BuildStructureDialog)

### Decision Guide

Use **Inline Custom UI** when:
- Player needs to make choices after seeing outcome
- Input is straightforward (dropdowns, sliders, quantity)
- Want to keep context visible
- Need real-time validation/feedback

Use **Pre-roll Dialog** when:
- Need game state context (maps, lists)
- Complex validation required
- Visual aids needed

Use **Custom Dialog** when:
- Full entity creation/modification
- Multi-page workflows
- Heavy system integration

The inline custom UI pattern provides the best UX for most post-roll interactions while keeping the check card system clean and flexible.
