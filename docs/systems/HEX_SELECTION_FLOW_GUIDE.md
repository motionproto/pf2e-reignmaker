# Hex Selection System - Documentation

**Last Updated:** 2025-11-20  
**Status:** ✅ Production System (Actions #2-#7)

## System Overview

The Hex Selection System provides map-based interaction for kingdom actions. Users select hexes after viewing roll outcomes, with the system managing state transitions, validation, and data capture timing.

**Flow:** Roll → Apply Result → Select Hexes → Done → Completion → OK

---

## Architecture

### Components

**HexSelectorService** - Orchestrates the entire selection process  
**SelectionPanelManager** - Manages floating panel UI and state transitions  
**HexRenderer** - Renders selection visuals on canvas  
**CanvasInteractionHandler** - Handles click/hover events  
**SceneManager** - Manages scene switching and overlay visibility  

**Integration:** PipelineCoordinator → UnifiedCheckHandler → HexSelectorService

---

## UI States

### Panel State Machine

**State: `selecting`**
- User interacts with map to select hexes
- Panel displays: title, counter, Cancel button, Done button
- Done button: disabled until selection count matches target
- Optional: hex-info panel (shows info about currently selected hex)
- Optional: custom-selector component (for additional user choices)

**State: `completed`**
- Selection finalized, action executed
- Panel displays: completion title, summary, OK button
- Cancel button: hidden
- Done button: replaced with OK button (always enabled)
- Optional: completion-info display (captured before state changes)

### Visual States

**Hover State**
- Hex under cursor shows preview color (lower opacity)
- Validation runs but hex not yet selected
- Cleared when cursor moves or hex selected

**Selection State**
- Clicked hex shows selection color (higher opacity)
- Added to selectedHexes array
- For roads: includes connection rendering to adjacent roads
- Persists until deselected or Done clicked

**Completion State**
- Selection layer cleared after Done
- Permanent overlays render from updated kingdom data
- User sees final state while viewing completion panel

---

## Critical Timing

### Data Capture Order

**Problem:** Completion panel must show "what was paid" not "what exists now"

**Solution:** Capture BEFORE state changes

```
1. User clicks Done
2. Capture hex info (current state)
3. Execute action (state changes)
4. Wait for propagation (100ms)
5. Clear selection layer
6. Show completion panel (with captured info)
```

**Example:** Fortifying hex from Tier 1 → Tier 2
- Hex info captured: "Cost: 1 lumber" (Tier 1 → 2)
- Action executes: Hex becomes Tier 2
- Completion shows: "Cost: 1 lumber" (what was paid)
- NOT: "Cost: 2 lumber" (what it would cost now)

---

## Optional Features

### Hex Info Panel

**Purpose:** Display hex-specific information during selection

**When visible:**
- State: `selecting`
- Config: `getHexInfo` callback provided
- Trigger: Hex selected (updates on each selection change)

**When hidden:**
- No hex selected
- Hex deselected
- Config: no `getHexInfo` callback

**Data source:** Dynamic callback invoked with `hexId`

### Completion Info Display

**Purpose:** Show summary in completed state

**When visible:**
- State: `completed`
- Data: Captured during Done click (BEFORE state changes)

**When hidden:**
- State: `selecting`

**Data source:** Snapshot captured before action execution

### Custom Selector Component

**Purpose:** Additional user choices beyond hex selection

**When visible:**
- State: `selecting`
- Config: `customSelector` defined

**Integration:** 
- Component mounts in panel slot
- Provides metadata via callback
- Done button requires both: hex count match + metadata present

**Data return:** `{ hexIds: string[], metadata: object }`

---

## Validation System

### Validation Flow

```
1. User clicks hex
2. Validation function called with hexId
3. Returns: { valid: boolean, message?: string }
4. If valid: render selection, update panel
5. If invalid: show notification, no visual change
```

### Validation Timing

- Runs on every click (before selection rendered)
- Does NOT block hover preview
- Prevents invalid hexes from entering selectedHexes array

---

## State Transition Flow

```
1. Action Initiated
   → Service: active = true
   → Scene: switch to kingdom map
   → Panel: mount in 'selecting' state
   → Canvas: attach listeners

2. User Selects Hexes
   → Validation: check each click
   → Render: selection visual
   → Panel: update counter
   → Hex Info: update if configured
   → Done Button: enable when count matches

3. User Clicks Done
   → Canvas: detach listeners (no more clicks)
   → Capture: hex info (current state)
   → Execute: action via onComplete
   → Wait: 100ms for data propagation
   → Render: clear selection layer
   → Panel: transition to 'completed' state
   → Completion Info: set captured data

4. User Clicks OK
   → Scene: restore overlays
   → Scene: restore app
   → Service: cleanup
   → Promise: resolve
```

---

## Button State Logic

### Cancel Button
- **Enabled:** Always (in `selecting` state)
- **Disabled:** Never
- **Hidden:** In `completed` state
- **Action:** Cleanup, return null

### Done Button
- **Enabled:** `selectedCount === targetCount` AND (if custom selector: `metadata !== null`)
- **Disabled:** Count mismatch OR (if custom selector: no metadata)
- **Hidden:** In `completed` state
- **Action:** Capture data, execute, transition to `completed`

### OK Button
- **Enabled:** Always
- **Disabled:** Never
- **Hidden:** In `selecting` state
- **Visible:** In `completed` state only
- **Action:** Cleanup, restore app, resolve promise

---

## Color Types

System supports these action types via `colorType` configuration:

- `claim` - Territory claiming
- `road` - Road building (includes connection rendering)
- `fortify` - Hex fortification
- `worksite` - Worksite creation
- `scout` - Scouting (includes World Explorer integration)
- `settlement` - Settlement placement
- `unclaim` - Territory removal

Each type has distinct color schemes: existing, new, hover variants

---

## Cancellation Handling

**User Action:** Click Cancel button

**System Response:**
1. Detach canvas listeners
2. Clear visual layers
3. Restore overlays
4. Cleanup panel
5. Restore app
6. Resolve promise with `null`

**Action Handling:** Must check for null/empty results and exit gracefully

---

## Tested Actions

| Action | ColorType | Hex Info | Custom Selector |
|--------|-----------|----------|-----------------|
| Claim Hexes (#2) | `claim` | No | No |
| Build Roads (#3) | `road` | No | No |
| Fortify Hex (#4) | `fortify` | Yes | No |
| Create Worksite (#5) | `worksite` | No | Yes |
| Harvest Resources (#6) | ? | ? | ? |
| Send Scouts (#7) | `scout` | No | No |

**Note:** Harvest Resources marked tested but needs verification of hex selector usage

---

## Key System Behaviors

### Selection Layer vs Permanent Overlays

- **During Selection:** Selection layer renders user picks (temporary)
- **After Done:** Selection cleared, permanent overlays render from updated kingdom data
- **Purpose:** User sees "after" state in completion panel

### Outcome-Based Configuration

- Pipeline can adjust count/title based on roll outcome
- Condition check can skip interaction entirely (failures)
- Applied by UnifiedCheckHandler before invoking HexSelectorService

### Road Connection Rendering

- Roads render connections to adjacent roads automatically
- Connections tracked in Map for deselection handling
- Validation can check connectivity requirements

### World Explorer Integration

- Scout actions trigger hex reveal after Done
- Reveals happen BEFORE completion panel shown
- Integration point: `revealHexesInWorldExplorer()` method
