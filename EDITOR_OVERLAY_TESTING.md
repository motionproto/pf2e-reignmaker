# Map Editor / Overlay Integration Testing Guide

## Overview
This guide validates the map editor's integration with the OverlayManager to ensure overlays behave consistently and respect user choices.

## What Was Fixed

### Before
- Editor called `clearAll(false)` on entry, losing user's overlay preferences
- `autoToggleOverlayForTool()` used `setActiveOverlays()` which hid ALL other overlays on every tool change
- No state stack, so user's pre-editor overlay configuration was lost
- Editor redraws didn't check if overlays were active, causing "stuck on" visuals

### After
- Editor uses `pushOverlayState()` / `popOverlayState()` to preserve user preferences
- High-level editor modes set default overlay configurations
- Tool changes are additive (only ensure required overlays are ON, don't hide others)
- Editor redraws check `isOverlayActive()` before drawing
- Clear separation between editor-only graphics (connectors, previews) and overlay-managed layers

## Test Scenarios

### Test 1: Editor Entry Preserves User Overlay State
**Goal:** Verify that opening the editor preserves your current overlay configuration

1. Open the Map Overlay Toolbar (Kingdom scene control button)
2. Enable a custom set of overlays (e.g., Roads + Settlements + Resources)
3. Note which overlays are active
4. Click "Map Editor" button to open the editor
5. **Expected:** Editor opens with its default overlay set for the initial mode (e.g., Settlements mode shows Settlements + Settlement Labels)
6. Close the editor (Cancel button)
7. **Expected:** Your original overlay configuration (Roads + Settlements + Resources) is restored exactly as it was

**Pass Criteria:** ✅ Pre-editor overlay state is restored on exit

---

### Test 2: Editor Mode Changes Apply Default Overlays
**Goal:** Verify that switching editor modes applies sensible default overlays

1. Open the Map Editor
2. Select "Waterways" section from the dropdown
3. **Expected:** Water overlay is active by default
4. Select "Roads" section
5. **Expected:** Roads overlay is active by default
6. Select "Terrain" section
7. **Expected:** Terrain overlay is active by default
8. Select "Territory" section
9. **Expected:** Territories overlay is active by default

**Pass Criteria:** ✅ Each editor mode shows its relevant default overlay(s)

---

### Test 3: Manual Overlay Toggles Work During Editing
**Goal:** Verify that users can freely toggle overlays while the editor is open

1. Open the Map Editor
2. Select "Waterways" section (Water overlay should be active)
3. Open the Map Overlay Toolbar (should still be accessible)
4. Toggle the Water overlay OFF via the toolbar button
5. **Expected:** Water graphics disappear from the map
6. Toggle the Water overlay back ON
7. **Expected:** Water graphics reappear
8. Enable additional overlays (e.g., Roads, Settlements)
9. **Expected:** Multiple overlays can be active simultaneously
10. Switch to a different editor tool within the same section (e.g., River Edit → River Scissors)
11. **Expected:** Your manual overlay choices remain unchanged

**Pass Criteria:** ✅ Overlay toggles work normally while editor is open
**Pass Criteria:** ✅ Tool changes within a mode don't reset overlay state

---

### Test 4: Tool Changes Are Additive (Don't Hide Other Overlays)
**Goal:** Verify that switching tools only ensures required overlays are ON, without hiding others

1. Open the Map Editor
2. Select "Waterways" section (Water overlay active)
3. Manually enable Roads overlay via toolbar
4. **Expected:** Both Water and Roads overlays are visible
5. Switch to "River Scissors" tool
6. **Expected:** Water overlay is still ON, Roads overlay is still ON (both remain visible)
7. Switch to "Roads" section
8. **Expected:** Roads overlay is ensured ON (already was), Water overlay remains ON (not hidden)

**Pass Criteria:** ✅ Switching tools/modes doesn't hide manually-enabled overlays

---

### Test 5: Overlay Visuals Match Active State (No "Stuck On" Graphics)
**Goal:** Verify that overlay graphics disappear when overlay is toggled OFF

1. Open the Map Editor
2. Select "Waterways" section
3. Draw some river segments (or use existing rivers)
4. Toggle Water overlay OFF via toolbar
5. **Expected:** River graphics disappear completely from map
6. **Expected:** Toolbar button shows Water overlay as inactive (not highlighted)
7. Toggle Water overlay back ON
8. **Expected:** River graphics reappear
9. Repeat for Roads overlay:
   - Draw some roads
   - Toggle Roads overlay OFF
   - **Expected:** Road graphics disappear
   - Toggle Roads overlay ON
   - **Expected:** Road graphics reappear

**Pass Criteria:** ✅ Overlay graphics always match the overlay's active state
**Pass Criteria:** ✅ No "stuck on" graphics when overlay is inactive

---

### Test 6: Editor-Only Graphics Are Separate from Overlays
**Goal:** Verify that editor-specific visuals (connector dots, preview lines) don't interfere with overlays

1. Open the Map Editor
2. Select "Waterways" section
3. Click "River Edit" tool
4. **Expected:** White connector dots appear at hex edges and centers (editor-only graphics)
5. Toggle Water overlay OFF via toolbar
6. **Expected:** Connector dots remain visible (they're editor graphics, not overlay graphics)
7. **Expected:** River water graphics disappear (they're overlay graphics)
8. Toggle Water overlay back ON
9. **Expected:** Both connector dots and river graphics are visible
10. Switch to "Roads" section
11. **Expected:** Connector dots disappear (only shown for river editing)
12. **Expected:** Water overlay remains in whatever state you left it

**Pass Criteria:** ✅ Editor-only graphics (connectors, previews) are independent of overlay state
**Pass Criteria:** ✅ Editor graphics are cleaned up when switching tools

---

### Test 7: Multiple Editor Sessions Maintain State
**Goal:** Verify that overlay state stack works across multiple editor open/close cycles

1. Set up custom overlays: Roads + Settlements
2. Open Map Editor → verify editor applies its defaults
3. Close Map Editor (Cancel)
4. **Expected:** Roads + Settlements restored
5. Change overlays to: Water + Resources
6. Open Map Editor again
7. Close Map Editor (Cancel)
8. **Expected:** Water + Resources restored (not Roads + Settlements from earlier)

**Pass Criteria:** ✅ Each editor session correctly saves and restores the state from immediately before opening

---

### Test 8: Editor Redraws Respect Overlay State
**Goal:** Verify that editor operations don't draw to inactive overlays

1. Open Map Editor
2. Select "Waterways" section
3. Toggle Water overlay OFF
4. Draw a river segment (click some connectors)
5. **Expected:** No river graphics appear (overlay is OFF)
6. Toggle Water overlay ON
7. **Expected:** River graphics now appear (overlay renders the data)
8. Repeat for roads:
   - Select "Roads" section
   - Toggle Roads overlay OFF
   - Paint some roads
   - **Expected:** No road graphics appear
   - Toggle Roads overlay ON
   - **Expected:** Road graphics appear

**Pass Criteria:** ✅ Editor operations don't render graphics when overlay is inactive
**Pass Criteria:** ✅ Graphics appear when overlay is re-enabled

---

## Edge Cases to Test

### Edge Case 1: Rapid Tool Switching
1. Open editor
2. Rapidly switch between different sections (Waterways → Roads → Terrain → Territory)
3. **Expected:** No visual glitches, overlays update smoothly
4. **Expected:** No console errors

### Edge Case 2: Overlay Toggle Spam
1. Open editor
2. Rapidly toggle an overlay ON/OFF multiple times
3. **Expected:** Graphics appear/disappear correctly each time
4. **Expected:** No "stuck" graphics or state desync

### Edge Case 3: Save vs Cancel
1. Open editor with custom overlays active
2. Make some map changes
3. Click "Save"
4. **Expected:** Editor closes, overlay state is restored
5. Open editor again
6. Make some map changes
7. Click "Cancel"
8. **Expected:** Editor closes, overlay state is restored (same as Save)

---

## Success Criteria Summary

All tests should pass with:
- ✅ No "stuck on" overlay graphics
- ✅ Overlay toolbar buttons accurately reflect active state
- ✅ User's overlay preferences are preserved across editor sessions
- ✅ Manual overlay toggles work normally during editing
- ✅ Tool/mode changes don't unexpectedly hide overlays
- ✅ Editor-only graphics are properly separated and cleaned up
- ✅ No console errors or warnings

---

## Reporting Issues

If any test fails, note:
1. Which test scenario failed
2. What you expected to happen
3. What actually happened
4. Any console errors (F12 → Console tab)
5. Steps to reproduce

## Implementation Notes

### Key Changes Made

**EditorModeService.ts:**
- Added `EditorMode` type and `EDITOR_MODE_OVERLAYS` configuration
- Added `setEditorMode()` method for high-level mode changes
- Refactored `enterEditorMode()` to use `pushOverlayState()`
- Refactored `exitEditorMode()` to use `popOverlayState()`
- Replaced `autoToggleOverlayForTool()` with `ensureToolOverlaysVisible()` (additive, not exclusive)
- Updated `refreshWaterLayer()`, `refreshRoadLayer()`, `refreshTerrainOverlay()` to check `isOverlayActive()` before drawing
- Added documentation comments explaining overlay management strategy

**EditorModePanel.svelte:**
- Updated to call `setEditorMode()` when switching sections
- Imports `EditorMode` type

**OverlayManager.ts:**
- Already had `pushOverlayState()` / `popOverlayState()` methods (no changes needed)
- Already had `setActiveOverlays()` method (now only used for editor mode changes, not tool changes)

### Architecture

```
User Opens Editor
  ↓
enterEditorMode()
  → pushOverlayState() (save user's current overlays)
  → clearAllLayers() (clean slate for graphics)
  ↓
User Selects Section (e.g., "Waterways")
  ↓
setEditorMode('waterways')
  → setActiveOverlays(['water']) (apply default for mode)
  ↓
User Selects Tool (e.g., "River Edit")
  ↓
setTool('river-edit')
  → ensureToolOverlaysVisible() (ensure 'water' is ON, don't hide others)
  → initializeConnectorLayer() (editor-only graphics)
  ↓
User Toggles Overlays via Toolbar
  → overlayManager.toggleOverlay() (works normally)
  ↓
User Closes Editor
  ↓
exitEditorMode()
  → destroyConnectorLayer() (cleanup editor graphics)
  → popOverlayState() (restore user's original overlays)
```

