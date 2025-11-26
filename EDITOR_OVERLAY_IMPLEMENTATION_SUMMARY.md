# Map Editor / Overlay Integration - Implementation Summary

## Problem Statement

The map editor was not correctly using the OverlayManager, causing overlays to get "stuck on" when toggling between different editing states. Overlays should be centrally managed by the OverlayManager so they can be toggled on/off consistently, whether via the toolbar or during editor mode changes.

## Root Causes

1. **Lost User Preferences:** Editor called `clearAll(false)` on entry, discarding user's overlay configuration
2. **Aggressive Tool Switching:** Every tool change called `setActiveOverlays()` which hid ALL other overlays
3. **No State Preservation:** No mechanism to save/restore user's pre-editor overlay choices
4. **Unchecked Redraws:** Editor redraw helpers didn't check if overlays were active before drawing graphics
5. **Unclear Separation:** Not obvious which graphics were editor-only vs overlay-managed

## Solution Architecture

### 1. Editor Mode Profiles (High-Level Configuration)

**New Type:** `EditorMode`
- Represents high-level editing contexts: `'waterways' | 'crossings' | 'roads' | 'terrain' | 'bounty' | 'worksites' | 'settlements' | 'fortifications' | 'territory'`

**New Configuration:** `EDITOR_MODE_OVERLAYS`
```typescript
const EDITOR_MODE_OVERLAYS: Record<EditorMode, string[]> = {
  'waterways': ['water'],
  'crossings': ['water'],
  'roads': ['roads'],
  'terrain': ['terrain'],
  'bounty': ['resources'],
  'worksites': ['worksites'],
  'settlements': ['settlements', 'settlement-labels'],
  'fortifications': ['fortifications'],
  'territory': ['territories']
};
```

**New Method:** `setEditorMode(mode: EditorMode)`
- Called when user switches editor sections (e.g., Waterways → Roads)
- Applies default overlay configuration for that mode using `overlayManager.setActiveOverlays()`
- This is the ONLY place `setActiveOverlays()` is used - not on every tool change

### 2. State Stack Integration (Preserve User Choices)

**On Editor Entry (`enterEditorMode`):**
```typescript
// Save user's current overlay state
overlayManager.pushOverlayState();

// Clear graphics layers for clean slate
mapLayer.clearAllLayers();

// Don't set overlays yet - wait for setEditorMode() call
```

**On Editor Exit (`exitEditorMode`):**
```typescript
// Cleanup editor-only graphics
destroyConnectorLayer();

// Restore user's pre-editor overlay configuration
await overlayManager.popOverlayState();
```

### 3. Additive Tool Overlay Handling (Respect User Toggles)

**Replaced:** `autoToggleOverlayForTool()` (used `setActiveOverlays()`, hid other overlays)

**With:** `ensureToolOverlaysVisible()` (additive, only ensures required overlays are ON)

```typescript
// Old behavior (BAD):
setActiveOverlays(['water']); // Hides roads, settlements, etc.

// New behavior (GOOD):
if (!overlayManager.isOverlayActive('water')) {
  await overlayManager.showOverlay('water'); // Only turns ON if needed
}
// Other overlays remain untouched
```

**Updated:** `setTool()` method
- Now calls `ensureToolOverlaysVisible()` instead of `autoToggleOverlayForTool()`
- Tool changes within a mode don't reset overlay state
- Users can freely toggle overlays during editing

### 4. Overlay-Aware Redraws (No "Stuck On" Graphics)

**Updated Methods:**
- `refreshWaterLayer()` - checks `isOverlayActive('water')` before drawing
- `refreshRoadLayer()` - checks `isOverlayActive('roads')` before drawing
- `refreshTerrainOverlay()` - checks `isOverlayActive('terrain')` before drawing

```typescript
// Before:
mapLayer.clearLayer('water');
await mapLayer.drawWaterConnections('water', activePathId);

// After:
if (!overlayManager.isOverlayActive('water')) {
  logger.info('Skipping water layer refresh (overlay inactive)');
  return;
}
mapLayer.clearLayer('water');
await mapLayer.drawWaterConnections('water', activePathId);
```

### 5. Editor Graphics Separation (Clear Boundaries)

**Editor-Only Graphics (NOT managed by OverlayManager):**
- River connector dots (`RiverConnectorLayer` PIXI.Container)
- River path preview line (`RiverPathPreview` PIXI.Graphics)
- Created by: `initializeConnectorLayer()`, `renderPathPreview()`
- Destroyed by: `destroyConnectorLayer()`, `destroyPreviewGraphics()`
- Cleanup triggers: Tool change (away from river-edit), editor exit

**Overlay-Managed Graphics (managed by OverlayManager):**
- Water/rivers (`water` layer)
- Roads (`routes` layer)
- Terrain shading (`terrain-overlay` layer)
- Settlements, resources, fortifications, etc.
- Rendered by: Overlay reactive subscriptions
- Controlled by: `overlayManager.showOverlay()` / `hideOverlay()`

**Documentation:** Added comments explaining this separation in key methods

## Files Modified

### Core Service Layer

**`src/services/map/core/EditorModeService.ts`**
- Added `EditorMode` type and `EDITOR_MODE_OVERLAYS` configuration
- Added `currentMode` private field
- Added `setEditorMode(mode: EditorMode)` method
- Updated `enterEditorMode()` to use `pushOverlayState()`
- Updated `exitEditorMode()` to use `popOverlayState()` and remove `cleanupWaterLayer()`
- Replaced `autoToggleOverlayForTool()` with `ensureToolOverlaysVisible()`
- Updated `setTool()` to call new additive method
- Updated `refreshWaterLayer()` to check `isOverlayActive('water')`
- Updated `refreshRoadLayer()` to check `isOverlayActive('roads')`
- Updated `refreshTerrainOverlay()` to check `isOverlayActive('terrain')`
- Added documentation comments for overlay management strategy
- Removed `cleanupWaterLayer()` method (no longer needed)

### UI Layer

**`src/view/map/EditorModePanel.svelte`**
- Imported `EditorMode` type
- Updated `selectSection()` to call `setEditorMode()` before `setTool()`
- Updated `handleSectionChange()` to use async `selectSection()`

### Documentation

**`EDITOR_OVERLAY_TESTING.md`** (NEW)
- Comprehensive testing guide with 8 test scenarios
- Edge case testing procedures
- Success criteria and reporting guidelines
- Architecture diagrams

**`EDITOR_OVERLAY_IMPLEMENTATION_SUMMARY.md`** (NEW - this file)
- Complete implementation documentation
- Before/after behavior comparison
- Code examples and rationale

## Behavior Changes

### Before

| Action | Old Behavior | Issue |
|--------|-------------|-------|
| Open editor | `clearAll(false)` discards user overlays | Lost preferences |
| Switch tool | `setActiveOverlays([...])` hides other overlays | Aggressive hiding |
| Close editor | No state restoration | Lost preferences |
| Toggle overlay OFF | Graphics remain visible | "Stuck on" |
| Manual toggle during edit | Works, but next tool change resets | Frustrating UX |

### After

| Action | New Behavior | Benefit |
|--------|-------------|---------|
| Open editor | `pushOverlayState()` saves user overlays | Preserved |
| Switch mode | `setActiveOverlays([...])` applies mode defaults | Sensible defaults |
| Switch tool | `ensureToolOverlaysVisible()` only shows required | Additive |
| Close editor | `popOverlayState()` restores user overlays | Restored |
| Toggle overlay OFF | Graphics disappear (checked before draw) | Correct visuals |
| Manual toggle during edit | Persists across tool changes | Good UX |

## Testing Plan

See `EDITOR_OVERLAY_TESTING.md` for detailed test scenarios.

**Quick Smoke Test:**
1. Set custom overlays (e.g., Roads + Settlements)
2. Open editor → verify defaults apply
3. Toggle overlays manually → verify they work
4. Switch tools → verify manual toggles persist
5. Close editor → verify original overlays restored

## Migration Notes

**No Breaking Changes:**
- All existing editor functionality preserved
- Overlay system API unchanged
- UI behavior improved, not altered

**Backward Compatibility:**
- `setTool()` still works as before (just uses new internal method)
- `OverlayManager` already had state stack methods (no changes needed)
- Editor panel UI unchanged (just calls new `setEditorMode()`)

## Performance Considerations

**Improvements:**
- Fewer overlay redraws (only when actually needed)
- Editor redraws skip inactive overlays (saves rendering time)
- State stack is lightweight (just Set<string> copies)

**No Regressions:**
- Same number of PIXI containers as before
- Same cleanup patterns as before
- No additional subscriptions or listeners

## Future Enhancements

Possible improvements (not in scope for this fix):

1. **User-Configurable Mode Defaults:** Allow users to customize which overlays show for each editor mode
2. **Overlay Presets:** Save/load named overlay configurations
3. **Editor Mode Hints:** Show tooltip explaining which overlays are recommended for current mode
4. **Overlay Auto-Hide:** Option to auto-hide unrelated overlays when switching modes (current behavior is additive)

## Conclusion

The map editor now correctly integrates with the OverlayManager:
- ✅ User overlay preferences are preserved across editor sessions
- ✅ Editor modes apply sensible default overlays
- ✅ Tool changes are additive (don't hide other overlays)
- ✅ Overlay visuals always match their active state (no "stuck on" graphics)
- ✅ Editor-only graphics are clearly separated and properly cleaned up
- ✅ Manual overlay toggles work normally during editing

The implementation follows the existing architecture patterns and requires no breaking changes to the codebase.

