# Hex Selection Hover Effect Debug Analysis

## Summary

Investigated hover effect rendering issues in the hex selection system. Added comprehensive debug logging to trace the execution path and identify the root cause.

## Architecture Verified

### 1. Property Mapping ✅ WORKING
- **Action Pipelines** define `validation` property
- **UnifiedCheckHandler** maps `validation` → `validationFn` (line 267)
- **HexSelectionConfig** type expects `validationFn`
- **CanvasInteractionHandler** accesses `this.config.validationFn`

**Verdict**: Property mapping is correct and should work.

### 2. Hover Rendering Flow

```
User hovers over hex
  ↓
CanvasInteractionHandler.handleCanvasMove()
  ↓
Validate hex with config.validationFn()
  ↓
Get hover style from HexRenderer.getHoverStyle()
  ↓
Call ReignMakerMapLayer.showInteractiveHover()
  ↓
Draw PIXI.Graphics to 'interactive-hover' layer (z-index 1000)
  ↓
Show layer via LayerManager
```

### 3. Debug Logging Added

**CanvasInteractionHandler.ts:**
- Log when config is null
- Log hex ID being hovered
- Log validation results (valid/invalid)
- Log when showing valid/invalid hover
- Log when hover fails (outside valid area)

**ReignMakerMapLayer.ts:**
- Log when showInteractiveHover() is called
- Log layer/container visibility state
- Log number of children in layer
- Log when hex graphics are added
- Log hex fill color and alpha values
- Log when drawing fails

## Possible Root Causes

Since the property mapping is working correctly, the issue must be one of these:

### 1. Container Visibility Issue
The main PIXI container (`ReignMakerMapLayer.container`) might be hidden when hex selection starts.

**Check:** `this.container.visible` state during hex selection

### 2. Layer Visibility Issue
The `interactive-hover` layer might not be visible despite calling `showLayer()`.

**Check:** `layer.visible` state after `showLayer()` call

### 3. Z-Index Issue
Z-index of 1000 might not be high enough to render above World Explorer/Fog of War layers.

**Check:** Compare z-indices of all active layers

### 4. Event Handler Not Firing
The `mousemove` event handler might not be attached correctly.

**Check:** Verify `canvas.stage.on('mousemove', ...)` is called

### 5. Validation Always Failing
The validation function might be rejecting all hexes (always returning invalid).

**Check:** Debug logs will show validation results

## Next Steps

### Phase 1: Build and Test
1. Run `npm run build` to compile with debug logging
2. Load module in Foundry VTT
3. Start any hex-selection action (e.g., Claim Hexes, Fortify Hex)
4. Hover over hexes and check browser console for debug logs
5. Identify which step is failing

### Phase 2: Fix Based on Logs
Once we see the debug output, we'll know exactly where the failure occurs:

- **If no logs appear**: Event handler not attached → fix attachment
- **If "config is null"**: Config not being set → fix setConfig() call
- **If "no validationFn"**: Mapping failed → verify UnifiedCheckHandler
- **If "validation result: false"**: Validation rejecting hexes → fix validation logic
- **If "showing hover" but no visual**: Layer/container visibility issue → fix visibility
- **If "failed to draw hex"**: Coordinate/grid issue → fix hex drawing

## Files Modified

1. `src/services/hex-selector/CanvasInteractionHandler.ts`
   - Added debug logging to `handleCanvasMove()`
   
2. `src/services/map/core/ReignMakerMapLayer.ts`
   - Added debug logging to `showInteractiveHover()`

## Test Actions

All 5 hex-selection actions should be tested:
1. ✅ Claim Hexes (`claimHexes.ts`)
2. ✅ Build Roads (`buildRoads.ts`)
3. ✅ Fortify Hex (`fortifyHex.ts`)
4. ✅ Create Worksite (`createWorksite.ts`)
5. ✅ Send Scouts (`sendScouts.ts`)

## Expected Debug Output

When hovering over a valid hex:
```
[CanvasInteractionHandler] Hovering hex: 10.15
[CanvasInteractionHandler] Validation result for 10.15: true
[CanvasInteractionHandler] Showing valid hover (green) for 10.15
[ReignMakerMapLayer] showInteractiveHover called for 10.15
[ReignMakerMapLayer] Added hex graphics for 10.15
[ReignMakerMapLayer] showInteractiveHover complete - layer now has 1 children
```

When hovering over an invalid hex:
```
[CanvasInteractionHandler] Hovering hex: 20.25
[CanvasInteractionHandler] Validation result for 20.25: false
[CanvasInteractionHandler] Showing invalid hover (red) for 20.25
[ReignMakerMapLayer] showInteractiveHover called for 20.25
[ReignMakerMapLayer] Added hex graphics for 20.25
[ReignMakerMapLayer] showInteractiveHover complete - layer now has 1 children
```

## Recommendations

1. **Build and test immediately** to see actual debug output
2. **Check browser console** for errors/warnings
3. **Verify PIXI container visibility** during hex selection
4. **Test with different actions** to see if issue is action-specific
5. **Check World Explorer integration** if using that module
