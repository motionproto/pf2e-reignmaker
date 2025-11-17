# Custom Component Integration - Pending Work

## Overview

Several actions require custom UI components for user interaction (resource selection, configuration, etc.). The pipeline system has defined the `configuration` interaction type for this, but the infrastructure is not yet fully implemented.

## Current Status

### ✅ Implemented
- Pipeline definition structure for `postApplyInteractions`
- `onComplete` callback pattern for executing logic after user input
- Interaction type definitions in CheckPipeline.ts

### ❌ Not Yet Implemented
- Custom component mounting in `UnifiedCheckHandler.executeConfiguration()`
- UI framework for displaying custom components during post-apply phase
- Data binding between components and pipeline context

## Affected Actions

### 1. sell-surplus (#3) - 🟡 PENDING
**Status:** Pipeline defined, gracefully degraded
**Component:** `SellResourceSelector.svelte`
**Functionality:** Select which resource to sell and amount
**Workaround:** Action succeeds without selection (no-op)
**Priority:** High (economic action, frequently used)

### 2. purchase-resources (#4)
**Status:** Not yet migrated
**Component:** Similar to sell-surplus
**Functionality:** Select which resource to purchase

### 3. Other actions with custom UI needs
- outfit-army (#23)
- infiltration (#24)
- arrest-dissidents (#22)

## Implementation Plan

### Phase 1: Configuration Dialog Infrastructure
1. Create `ConfigurationDialog.svelte` component
   - Mount custom components dynamically
   - Collect user input data
   - Pass data to `onComplete` callback

2. Update `UnifiedCheckHandler.executeConfiguration()`
   ```typescript
   private async executeConfiguration(interaction: any, kingdom: any): Promise<any> {
     // Instead of returning null:
     // 1. Show modal/dialog with interaction.component
     // 2. Wait for user to submit
     // 3. Return submitted data
     return await showConfigurationDialog(interaction.component, { kingdom, ...interaction });
   }
   ```

3. Create `showConfigurationDialog()` utility
   - Similar to existing `showEntitySelectionDialog()`
   - Returns Promise that resolves with user data
   - Handles cancellation

### Phase 2: Integrate with Existing Components
1. Update `SellResourceSelector.svelte`
   - Accept props from dialog system
   - Emit events for data submission
   - Handle cancellation

2. Test with sell-surplus action
   - Verify resource selection works
   - Verify onComplete executes with data
   - Verify resource changes apply

### Phase 3: Migrate Other Actions
1. purchase-resources (#4)
2. outfit-army (#23)
3. infiltration (#24)
4. arrest-dissidents (#22)

## Technical Details

### Data Flow
```
Pipeline Step 7 (postApplyInteractions)
  ↓
UnifiedCheckHandler.executePostApplyInteractions()
  ↓
UnifiedCheckHandler.executeConfiguration()
  ↓
showConfigurationDialog(component)  ← MISSING
  ↓
User interacts with component
  ↓
Component emits data
  ↓
Dialog resolves Promise with data
  ↓
UnifiedCheckHandler stores in resolutionData
  ↓
interaction.onComplete(data, context)
  ↓
Resource changes applied
```

### Required Files
- `src/services/InteractionDialogs.ts` (update)
  - Add `showConfigurationDialog()` function
- `src/view/kingdom/components/dialogs/ConfigurationDialog.svelte` (new)
  - Generic wrapper for custom components
- Update all custom component files
  - Standardize props/events interface

## Alternative Approach

Instead of a generic `ConfigurationDialog`, we could:
1. Keep component-specific logic in the pipeline
2. Have `executeConfiguration()` check `interaction.component` name
3. Call component-specific dialog functions

**Pros:** Simpler, more explicit
**Cons:** Less flexible, more code duplication

## Decision Needed

Which approach should we take?
- [ ] Generic ConfigurationDialog (more complex, more reusable)
- [ ] Component-specific dialogs (simpler, less flexible)

## Timeline

**Week 9:** Custom component infrastructure
**Week 10:** Migrate actions with custom UI

---

**Last Updated:** 2025-11-17
**Status:** 🟡 Blocked - Needs design decision
