# Hex Center Testing

Verify the accuracy of hex center point calculations using Foundry's grid API.

## Purpose

Visual debugging tool for confirming that hex center coordinates are calculated correctly. Places visual markers on hexes to verify the grid coordinate system.

## Prerequisites

1. Load Foundry VTT with the Reignmaker module enabled
2. Open a scene with the Kingmaker map
3. Open browser console (F12 → Console tab)

## Available Commands

```javascript
// Activate hex center test mode (click hexes to place markers)
game.reignmaker.testHexCenter();

// Clear all test markers from the canvas
game.reignmaker.clearHexCenterTest();

// Deactivate test mode (stop listening for clicks)
game.reignmaker.deactivateHexCenterTest();
```

## Usage Flow

```javascript
// 1. Activate test mode
game.reignmaker.testHexCenter();

// 2. Click on hexes to place red crosshair markers at their centers
// Each marker shows the hex ID (e.g., "50.18")

// 3. Clear markers to test new hexes
game.reignmaker.clearHexCenterTest();

// 4. When finished testing
game.reignmaker.deactivateHexCenterTest();
```

## What It Tests

- ✅ Hex center point accuracy (using `canvas.grid.getCenterPoint()`)
- ✅ Hex offset calculations (i, j coordinates)
- ✅ Visual verification of center positions
- ✅ Grid coordinate system consistency
- ✅ Click-to-hex coordinate conversion

## Visual Markers

Each marker displays:
- **Red crosshair** - ±20px from center (horizontal and vertical lines)
- **Center dot** - 4px radius, filled red
- **Outer white ring** - 6px radius for contrast against dark backgrounds
- **Hex ID label** - Text label above marker showing hex coordinates

### Marker Appearance

```
        50.18          ← Hex ID label
          |
    ------+------      ← Red crosshair
          |
          ⊙            ← Center dot with white ring
```

## Use Cases

- **Verify grid alignment** - Confirm hexes are properly aligned with Foundry's grid
- **Debug coordinate conversions** - Check click position → hex offset calculations
- **Validate hex centers** - Ensure center calculations match visual hex centers
- **Test after grid changes** - Verify centers after changing grid size or offset
- **Troubleshoot hex selection** - Debug why clicks might miss intended hexes

## Example Workflow

```javascript
// Start testing
game.reignmaker.testHexCenter();

// Click several hexes around the map
// - Check if markers appear at visual center of each hex
// - Verify hex IDs match expected coordinates
// - Look for any systematic offset or misalignment

// Clear and test different area
game.reignmaker.clearHexCenterTest();
// Click more hexes in a different part of the map

// When satisfied with results
game.reignmaker.deactivateHexCenterTest();
```

## What to Look For

### ✅ Correct Alignment
- Marker appears at visual center of hex
- Crosshair lines align with hex edges
- Hex ID matches expected row/column

### ❌ Misalignment Issues
- Marker offset from hex center
- Consistent offset across multiple hexes (indicates grid misconfiguration)
- Hex IDs don't match visual position (coordinate calculation error)

## Troubleshooting

### "Canvas not available" Error
**Cause:** No scene is loaded  
**Fix:** Load a scene with the Kingmaker map

### Markers appear in wrong location
**Cause:** Grid size or offset mismatch  
**Fix:** 
1. Check scene grid settings in Foundry
2. Verify grid type is set to "Hexagonal Rows (Odd)"
3. Confirm grid size matches Kingmaker map expectations

### Can't see markers
**Cause:** Markers may be under other canvas layers  
**Fix:** 
1. Check browser console for confirmation messages
2. Try clicking in empty areas (no tokens/tiles)
3. Zoom in to see if markers are very small

### Markers don't clear
**Cause:** PIXI container not properly cleaned up  
**Fix:**
```javascript
// Force clear
game.reignmaker.clearHexCenterTest();

// Or deactivate and reactivate
game.reignmaker.deactivateHexCenterTest();
game.reignmaker.testHexCenter();
```

### Test mode won't deactivate
**Cause:** Click event listeners still attached  
**Fix:** Run deactivate command explicitly:
```javascript
game.reignmaker.deactivateHexCenterTest();
```

## Development Notes

### Coordinate System

The test uses Foundry's built-in grid API:
```javascript
// Click position → Grid offset
const offset = canvas.grid.getOffset(position);

// Grid offset → Center point
const center = canvas.grid.getCenterPoint(offset);

// Offset → Hex ID
const hexId = `${offset.i}.${offset.j}`;
```

### PIXI Graphics

Markers are drawn using PIXI.Graphics:
- Added to `canvas.controls` layer for visibility
- Drawn with basic shapes (lines, circles)
- Text labels use PIXI.Text with default styling

### Performance

- Minimal performance impact
- Markers are static (no animation or updates)
- Safe to place many markers for testing
- Clear markers periodically to avoid clutter

### When to Use This Tool

**Use when:**
- Setting up the map for the first time
- Debugging hex selection issues
- Verifying grid configuration changes
- Confirming coordinate system works correctly

**Don't use for:**
- Regular gameplay (purely a diagnostic tool)
- Testing other features (use appropriate debug utility)

---

**Remember:** This is a **development and diagnostic tool**. Use it to verify the hex grid coordinate system is working correctly.
