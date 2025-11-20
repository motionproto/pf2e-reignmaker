# Hex Selection Flow - Developer Guide

**Last Updated:** 2025-11-20  
**Status:** ✅ Audited and Documented

## Overview

This guide documents the canonical hex selection flow pattern used in Reignmaker for actions that require map-based hex selection. It covers two primary patterns, best practices, and common pitfalls.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Two Selection Patterns](#two-selection-patterns)
3. [Standard Flow (Post-Apply)](#standard-flow-post-apply)
4. [Hex Info Panel](#hex-info-panel)
5. [Actions Audit](#actions-audit)
6. [Validation Patterns](#validation-patterns)
7. [Common Pitfalls](#common-pitfalls)
8. [Implementation Checklist](#implementation-checklist)

---

## Architecture Overview

### Core Components

**Service Layer:**
- `HexSelectorService.ts` - Main orchestrator
- `SelectionPanelManager.ts` - Floating panel UI
- `HexRenderer.ts` - Visual rendering
- `CanvasInteractionHandler.ts` - Click/hover handling
- `SceneManager.ts` - Scene/overlay management

**Pipeline Integration:**
- `UnifiedCheckHandler.ts` - Executes postApplyInteractions
- `PipelineCoordinator.ts` - Orchestrates pipeline steps

### Data Flow

```
User Action → Roll Check → "Apply Result" → 
Hex Selection Panel → User Selects Hex(es) → "Done" → 
Capture Info (BEFORE changes) → Execute Action (via onComplete) → 
Show Completion Panel → "OK" → Cleanup
```

---

## Two Selection Patterns

### Pattern 1: Post-Apply Selection ✅ RECOMMENDED

**When:** User selects hex(es) AFTER seeing the roll outcome  
**Why:** Outcome affects selection (e.g., critical success allows more hexes)

**Actions Using This:**
- Claim Hexes
- Build Roads
- Fortify Hex
- Create Worksite
- Send Scouts

**Pipeline Config:**
```typescript
postApplyInteractions: [
  {
    type: 'map-selection',
    id: 'selectedHexes',
    mode: 'hex-selection',
    colorType: 'claim',
    validation: validateClaimHex,
    
    // Outcome-based adjustments
    outcomeAdjustment: {
      criticalSuccess: { count: 2, title: 'Select 2 hexes' },
      success: { count: 1, title: 'Select 1 hex' },
      failure: { count: 0 },  // No interaction
      criticalFailure: { count: 0 }
    },
    
    // Only show for successful outcomes
    condition: (ctx) => {
      return ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess';
    },
    
    // Execute when user completes selection
    onComplete: async (selectedHexIds: string[], ctx: any) => {
      await actionExecution(selectedHexIds);
    }
  }
]
```

### Pattern 2: Pre-Roll Selection ⚠️ SPECIAL CASES

**When:** Selection is required BEFORE the roll (location choice affects DC/modifiers)  
**Why:** Action needs location context for the skill check

**Actions Using This:**
- Establish Settlement (need location + name before roll)
- Deploy Army (need army + path before roll)

**Pipeline Config:**
```typescript
preRollInteractions: [
  {
    type: 'map-selection',
    id: 'location',
    mode: 'hex-selection',
    count: 1,
    colorType: 'settlement'
  },
  {
    type: 'text-input',
    id: 'settlementName',
    label: 'Settlement name'
  }
]
```

**Key Difference:** Pre-roll selections don't use the "Done → Completion Panel" pattern since there's no outcome yet.

---

## Standard Flow (Post-Apply)

### Complete User Journey

```
1. User clicks action → Roll check → "Apply Result" button
2. Hex selection panel appears (postApplyInteractions)
3. User clicks hexes on map:
   - Each click: validate → render selection → update panel
   - Hex info panel updates (if getHexInfo provided)
4. User clicks "Done" button:
   - HexSelectorService.handleDone() executes:
     a. Capture hex info BEFORE changes (getHexInfo callback)
     b. Return hexes to action (triggers onComplete handler)
     c. Wait 100ms for data propagation
     d. Clear selection layer (permanent overlays show through)
     e. Set completion hex info (captured before changes)
     f. Switch panel to 'completed' state
5. User sees completion panel with summary
6. User clicks "OK":
   - Cleanup and restore app
```

### Critical Implementation Details

**Timing of Data Capture:**
```typescript
// ✅ CORRECT - HexSelectorService.handleDone() (already implemented)
// Capture hex info BEFORE applying changes
let completionHexInfo: string | null = null;
if (this.config.getHexInfo && this.selectedHexes.length > 0) {
  completionHexInfo = this.config.getHexInfo(this.selectedHexes[0]);
}

// Return hexes (triggers onComplete → state changes)
resolver?.({ hexIds: hexes, metadata });

// Wait for propagation
await new Promise(resolve => setTimeout(resolve, 100));

// Clear selection (permanent overlays render from updated state)
this.mapLayer.clearSelection();

// Set completion info (captured BEFORE changes)
if (completionHexInfo) {
  this.panelManager.setCompletionHexInfo(completionHexInfo);
}
```

**Why This Matters:**
- Completion panel shows "what was paid" not "what is now"
- Prevents bug where costs appear different between selection and completion
- Example: Fortify Hex showed Tier 1 cost during selection, but Tier 2 cost in completion (fixed)

---

## Hex Info Panel

### Purpose

Shows action-specific information about the currently selected hex (e.g., costs, benefits, current state).

### When to Use

**✅ Use when:**
- Action has variable costs based on hex state (e.g., fortification tiers)
- Users need to see hex-specific details to make informed decisions
- Displaying benefits/warnings specific to the selected hex

**❌ Don't use when:**
- All hexes have identical costs/effects
- No hex-specific information to display
- Info would be redundant with outcome message

### Current Usage

| Action | Has Hex Info? | Purpose |
|--------|--------------|---------|
| Fortify Hex | ✅ Yes | Shows tier costs, benefits, special effects |
| Claim Hexes | ❌ No | All hexes same cost |
| Build Roads | ❌ No | All hexes same cost |
| Create Worksite | ❌ No | Worksite type selector provides info |
| Send Scouts | ❌ No | No hex-specific costs |

### Implementation

**In Pipeline:**
```typescript
postApplyInteractions: [{
  type: 'map-selection',
  // ...
  getHexInfo: (hexId: string) => {
    const kingdom = getKingdomData();
    const hex = kingdom.hexes?.find(h => h.id === hexId);
    
    // Build HTML string with cost/benefit info
    let html = '<div style="font-size: 13px;">';
    html += `<div><strong>Cost:</strong> ${cost}</div>`;
    html += `<div><strong>Benefits:</strong> ${benefits}</div>`;
    html += '</div>';
    
    return html;
  }
}]
```

**The Service Handles:**
- Showing/hiding the hex-info div automatically
- Capturing info BEFORE changes (for completion panel)
- Clearing info when hex deselected

---

## Custom Selector Components

### Purpose

Custom selector components allow actions to inject **interactive UI elements** into the hex selection panel, beyond just displaying information. This enables complex selection flows where users need to make additional choices related to their hex selection.

### Architecture

**Slot Injection:**
```
SelectionPanelManager
  ├── Standard UI (title, count, buttons)
  └── hex-info slot ← Custom component mounts here
```

**Data Flow:**
```
Custom Component → User Selection → Metadata Object → 
onComplete({ hexIds: [...], metadata: {...} })
```

### When to Use

**✅ Use Custom Selector when:**
- Action requires user to choose between multiple options for the selected hex
- Options affect execution logic (not just display)
- User needs interactive controls (buttons, dropdowns, etc.)
- Example: Choose worksite type (Farmstead vs Mine vs Quarry)

**✅ Use Hex Info Panel when:**
- Only need to display read-only information about the hex
- No user interaction needed beyond hex selection
- Example: Show fortification tier costs

**Key Difference:**
- **Hex Info Panel** = Read-only display (HTML string)
- **Custom Selector** = Interactive component (Svelte component with state)

### Implementation Pattern

**1. Create Custom Selector Component**

```svelte
<!-- WorksiteTypeSelector.svelte -->
<script lang="ts">
  export let selectedHex: string;  // Receives currently selected hex
  export let onSelect: (metadata: { worksiteType: string }) => void;  // Callback
  
  let selectedType: string | null = null;
  
  function handleSelect(type: string) {
    selectedType = type;
    onSelect({ worksiteType: type });  // Send metadata back
  }
</script>

<div class="worksite-selector">
  <h3>Choose Worksite Type</h3>
  
  <!-- Use choice-set styling pattern (docs/design-system/choice-buttons.md) -->
  <div class="choice-set">
    <button 
      class="choice-button"
      class:selected={selectedType === 'Farmstead'}
      on:click={() => handleSelect('Farmstead')}
    >
      Farmstead
    </button>
    <!-- More buttons... -->
  </div>
  
  <!-- Completion panel (shows after selection) -->
  {#if selectedType}
    <div class="completion-panel">
      <i class="fas fa-check-circle"></i>
      Selected: {selectedType}
    </div>
  {/if}
</div>

<style>
  /* Apply choice-set styling pattern */
  .choice-button {
    border: 2px solid var(--border-medium);
    outline: 1px solid transparent;
  }
  .choice-button.selected {
    border-color: var(--color-success);
    outline-color: var(--color-success);
  }
</style>
```

**2. Register in Pipeline**

```typescript
import WorksiteTypeSelector from '../../services/hex-selector/WorksiteTypeSelector.svelte';

export const createWorksitePipeline: CheckPipeline = {
  // ...
  postApplyInteractions: [{
    type: 'map-selection',
    id: 'selectedHex',
    mode: 'hex-selection',
    count: 1,
    
    // ✅ Custom selector configuration
    customSelector: {
      component: WorksiteTypeSelector,
      props: {}  // Optional additional props
    },
    
    // ✅ Receive metadata from custom selector
    onComplete: async (result: any) => {
      const hexId = result.hexIds[0];
      const worksiteType = result.metadata.worksiteType;
      
      await createWorksiteExecution(hexId, worksiteType);
    }
  }]
};
```

### Metadata Return Format

**Standard Format:**
```typescript
{
  hexIds: string[],           // Selected hex IDs
  metadata: {                 // Custom data from selector
    [key: string]: any
  }
}
```

**Example - Worksite Type:**
```typescript
{
  hexIds: ['hex-5-7'],
  metadata: {
    worksiteType: 'Farmstead'
  }
}
```

**Example - Multiple Values:**
```typescript
{
  hexIds: ['hex-5-7'],
  metadata: {
    structureType: 'Castle',
    structureTier: 2,
    customName: 'Stronghold of the North'
  }
}
```

### Styling Guidelines

**Use Choice-Set Pattern:**

Custom selectors should follow the choice-set styling pattern from `docs/design-system/choice-buttons.md`:

```scss
.choice-button {
  // Base state
  border: 2px solid var(--border-medium);
  outline: 1px solid transparent;
  transition: all 0.2s ease;
  
  // Hover state
  &:hover:not(:disabled) {
    border-color: var(--border-strong);
    transform: translateY(-1px);
  }
  
  // Selected state
  &.selected {
    border-color: var(--color-success);
    outline-color: var(--color-success);
    outline-offset: 2px;
  }
}
```

**Visual Feedback:**
- ✅ Show completion panel after selection
- ✅ Disable "Done" button until selection made
- ✅ Use icons for visual clarity (✓ for completion)
- ✅ Maintain consistent spacing with design system

### Current Implementation

| Action | Custom Selector? | Purpose |
|--------|-----------------|---------|
| **Create Worksite** | ✅ Yes | Choose worksite type (Farmstead/Mine/Quarry/Logging Camp) |
| **Other Actions** | ❌ No | Use hex info panels or no additional UI |

### Custom Selector vs Hex Info Panel

**Comparison:**

| Feature | Custom Selector | Hex Info Panel |
|---------|----------------|----------------|
| **Interactivity** | ✅ Full (buttons, inputs, etc.) | ❌ Read-only |
| **Component Type** | Svelte component | HTML string |
| **State Management** | ✅ Yes (component state) | ❌ No |
| **Metadata Return** | ✅ Yes (custom data) | ❌ No |
| **Styling** | ✅ Full control | ⚠️ Inline styles only |
| **Use Case** | User needs to choose options | Display info about hex |
| **Example** | Worksite type selector | Fortification cost display |

### Best Practices

**1. Single Responsibility:**
```typescript
// ✅ GOOD - Component focuses on selection
export let onSelect: (metadata: { type: string }) => void;

// ❌ BAD - Component tries to execute action
async function handleSelect(type: string) {
  await executeAction(type);  // Should be in onComplete
}
```

**2. Clear Visual Feedback:**
```svelte
<!-- ✅ GOOD - Shows what was selected -->
{#if selectedType}
  <div class="completion-panel">
    <i class="fas fa-check-circle"></i>
    Selected: {selectedType}
  </div>
{/if}

<!-- ❌ BAD - No confirmation -->
<button on:click={handleSelect}>Select</button>
```

**3. Validation Integration:**
```typescript
// ✅ GOOD - Combine custom selector with hex validation
postApplyInteractions: [{
  type: 'map-selection',
  customSelector: { component: WorksiteTypeSelector },
  validation: (hexId) => {
    // Validate hex is suitable for ANY worksite type
    if (hexHasSettlement(hexId)) {
      return { valid: false, message: 'Cannot build in settlement hex' };
    }
    return { valid: true };
  }
}]

// Custom selector then validates terrain compatibility for SPECIFIC type
```

**4. Metadata Structure:**
```typescript
// ✅ GOOD - Flat, simple structure
metadata: {
  worksiteType: 'Farmstead'
}

// ❌ BAD - Nested complexity
metadata: {
  selection: {
    category: 'worksite',
    subcategory: 'resource',
    type: 'Farmstead'
  }
}
```

### Implementation Checklist

**For New Custom Selectors:**
- [ ] Create Svelte component in `src/services/hex-selector/`
- [ ] Export `selectedHex: string` prop
- [ ] Export `onSelect: (metadata: object) => void` callback
- [ ] Apply choice-set styling pattern
- [ ] Include completion panel for visual feedback
- [ ] Register in pipeline with `customSelector` config
- [ ] Handle metadata in `onComplete` handler
- [ ] Test selection → completion → execution flow
- [ ] Verify metadata persists correctly
- [ ] Check styling consistency with design system

---

## Actions Audit
</parameter>

### Post-Apply Selection Actions

| Action | Count | Validation | Hex Info | onComplete | Notes |
|--------|-------|------------|----------|------------|-------|
| **Claim Hexes** | Dynamic (1-4) | ✅ Adjacent check | ❌ No | ✅ Yes | Proficiency-based count |
| **Build Roads** | Dynamic (1-4) | ✅ Road connectivity | ❌ No | ✅ Yes | Proficiency-based count |
| **Fortify Hex** | 1 | ✅ Resource check | ✅ Yes | ✅ Yes | Shows tier costs/benefits |
| **Create Worksite** | 1 | ✅ Terrain + settlement | ❌ No (custom) | ✅ Yes | Has custom selector |
| **Send Scouts** | Dynamic (1-2) | ✅ Adjacency to revealed | ❌ No | ❌ **NO** | Uses execute() instead |

### Pre-Roll Selection Actions

| Action | Purpose | Notes |
|--------|---------|-------|
| **Establish Settlement** | Location + name | Needs context for roll |
| **Deploy Army** | Army + path | Needs context for roll |

### Consistency Analysis

**✅ Consistent:**
- All post-apply actions follow select → "Done" → completion flow
- All have validation functions
- All use outcomeAdjustment for dynamic counts
- All use condition to skip on failure outcomes

**⚠️ Inconsistencies Found:**

1. **Send Scouts onComplete Missing**
   - Other post-apply actions use onComplete handler
   - Send Scouts relies on execute() function instead
   - **Recommendation:** Refactor to use onComplete for consistency

2. **Validation Return Types**
   - Some return `boolean`
   - Some return `ValidationResult { valid, message }`
   - **Recommendation:** Standardize on ValidationResult for better error messages

---

## Validation Patterns

### Standard Validation

**Purpose:** Determine if a hex can be selected, provide error messages

### Return Types

**Simple Boolean (Legacy):**
```typescript
validation: (hexId: string) => {
  return isHexValid(hexId);  // true/false
}
```

**ValidationResult Object (Recommended):**
```typescript
validation: (hexId: string) => {
  if (!isHexClaimedByPlayer(hexId)) {
    return { valid: false, message: 'Must be in claimed territory' };
  }
  return { valid: true };
}
```

### Common Validation Checks

**Territory Ownership:**
```typescript
import { isHexClaimedByPlayer } from '../shared/hexValidation';

if (!isHexClaimedByPlayer(hexId, kingdom)) {
  return { valid: false, message: 'Must be in claimed territory' };
}
```

**Settlement Check:**
```typescript
import { hexHasSettlement } from '../shared/hexValidation';

if (hexHasSettlement(hexId, kingdom)) {
  return { valid: false, message: 'Cannot build in settlement hexes' };
}
```

**Adjacency Check:**
```typescript
const adjacentHexes = getNeighborHexIds(hexId);
const hasClaimedAdjacent = adjacentHexes.some(adjId => 
  isHexClaimedByPlayer(adjId, kingdom)
);

if (!hasClaimedAdjacent) {
  return { valid: false, message: 'Must be adjacent to claimed territory' };
}
```

**Resource Check:**
```typescript
const nextTier = currentTier + 1;
const tierConfig = fortificationData.tiers[nextTier - 1];

if (kingdom.resources.lumber < tierConfig.cost.lumber) {
  return { 
    valid: false, 
    message: `Need ${tierConfig.cost.lumber} lumber` 
  };
}
```

### Validation Order

**✅ Best Practice - Check Most Specific First:**
```typescript
// 1. Check settlement (most specific error)
if (hexHasSettlement(hexId, kingdom)) {
  return { valid: false, message: 'Cannot build in settlement hexes' };
}

// 2. Check ownership (more general)
if (!isHexClaimedByPlayer(hexId, kingdom)) {
  return { valid: false, message: 'Must be in claimed territory' };
}

// 3. Check action-specific constraints
if (hex.worksite) {
  return { valid: false, message: 'Hex already has worksite' };
}
```

---

## Common Pitfalls

### 1. ❌ Capturing Data After Changes

**Problem:**
```typescript
// ❌ WRONG - Captured AFTER fortification was built
onComplete: async (hexIds) => {
  await fortifyHexExecution(hexId, nextTier);  // Changes state
  const hexInfo = getHexInfo(hexId);  // Shows NEW state (wrong)
}
```

**Solution:**
```typescript
// ✅ CORRECT - HexSelectorService captures BEFORE changes
getHexInfo: (hexId) => {
  // This is called BEFORE onComplete executes
  return buildHexInfoHtml(hexId);
}
```

### 2. ❌ Inconsistent onComplete Usage

**Problem:**
```typescript
// Some actions use onComplete
onComplete: async (hexIds) => { await action(hexIds); }

// Others skip it and rely on execute()
execute: async (ctx) => {
  const hexIds = ctx.resolutionData.compoundData?.selectedHexes;
  await action(hexIds);
}
```

**Solution:** Standardize on onComplete for post-apply actions.

### 3. ❌ Not Handling Cancellation

**Problem:**
```typescript
// ❌ Assumes user always selects hexes
execute: async (ctx) => {
  const hexIds = ctx.resolutionData.compoundData.selectedHexes;
  await action(hexIds);  // Throws if user cancelled
}
```

**Solution:**
```typescript
// ✅ Handle cancellation gracefully
execute: async (ctx) => {
  const hexIds = ctx.resolutionData?.compoundData?.selectedHexes;
  if (!hexIds || hexIds.length === 0) {
    console.log('User cancelled hex selection');
    return { success: true };  // Graceful exit
  }
  await action(hexIds);
}
```

### 4. ❌ Validation Without Error Messages

**Problem:**
```typescript
validation: (hexId) => {
  return isValid(hexId);  // User sees generic "Invalid hex" message
}
```

**Solution:**
```typescript
validation: (hexId) => {
  if (!hasResources) {
    return { valid: false, message: 'Not enough resources' };
  }
  return { valid: true };
}
```

### 5. ❌ Missing Outcome Condition

**Problem:**
```typescript
// ❌ Shows hex selection even on failure
postApplyInteractions: [{
  type: 'map-selection',
  // Missing condition check
}]
```

**Solution:**
```typescript
// ✅ Only show for successful outcomes
postApplyInteractions: [{
  type: 'map-selection',
  condition: (ctx) => {
    return ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess';
  }
}]
```

---

## Implementation Checklist

### For New Actions Using Post-Apply Selection

**Pipeline Configuration:**
- [ ] Add to `postApplyInteractions` (not preRollInteractions)
- [ ] Set appropriate `colorType` (claim, road, fortify, settlement, worksite, scout, movement)
- [ ] Implement validation function with ValidationResult return type
- [ ] Add `outcomeAdjustment` for all outcomes (set count: 0 for failures)
- [ ] Add `condition` to only show for success/criticalSuccess
- [ ] Implement `onComplete` handler for action execution
- [ ] Add `getHexInfo` if hex-specific costs/info needed

**Validation:**
- [ ] Check most specific constraints first (settlement → ownership → action-specific)
- [ ] Return ValidationResult objects with clear error messages
- [ ] Use shared validation utilities from `../shared/hexValidation`

**Execution:**
- [ ] Handle cancellation gracefully (check for null/empty results)
- [ ] Apply state changes in onComplete handler
- [ ] Apply modifiers in execute() function (using applyPipelineModifiers)

**Testing:**
- [ ] Test cancellation (click Cancel button)
- [ ] Test all outcomes (success, critical success, failure, critical failure)
- [ ] Verify hex info shows BEFORE changes (if using getHexInfo)
- [ ] Verify completion panel shows correct info
- [ ] Check that selection clears after "Done" (permanent overlays visible)
- [ ] Verify validation messages are clear and helpful

---

## Future Improvements

### Recommendations

1. **Standardize Send Scouts:**
   - Refactor to use onComplete handler like other actions
   - Currently uses execute() which is inconsistent

2. **Validation Return Type:**
   - Migrate all actions to ValidationResult return type
   - Better error messages for users

3. **Hex Info Panel Guidelines:**
   - Document when to use vs not use
   - Create reusable HTML templates for common patterns

4. **Dynamic Count Formula:**
   - Consider extracting proficiency-based count logic
   - Shared utility for claim/road actions

5. **Cancellation Handling:**
   - Add consistent pattern across all actions
   - Consider adding explicit "cancelled" flag in context

---

## Summary

### Key Principles

1. **Two Patterns:** Post-apply (outcome affects selection) vs Pre-roll (selection affects roll)
2. **Standard Flow:** Select → "Done" → Completion → "OK"
3. **Timing Critical:** Capture hex info BEFORE state changes
4. **Graceful Cancellation:** Always handle null/empty results
5. **Clear Validation:** Return messages that help users understand why hex is invalid
6. **Consistency:** Follow established patterns, use onComplete for post-apply actions

### Quick Reference

**Use Post-Apply When:**
- Outcome affects what user can select (count, type, etc.)
- Action needs outcome before making permanent changes

**Use Pre-Roll When:**
- Selection context is needed for the skill check itself
- Location/target affects DC or modifiers

**Always:**
- Validate with clear error messages
- Handle cancellation gracefully
- Use condition to skip selection on failures
- Let HexSelectorService capture info BEFORE changes
