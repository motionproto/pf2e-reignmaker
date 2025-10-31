# Hex Selector Testing

Test the hex selector UI without going through the full action flow.

## Purpose

Standalone testing tool for the hex selection dialog and multi-hex selection logic. Allows testing different selection counts and color schemes without triggering actual game actions.

## Prerequisites

1. Load Foundry VTT with the Reignmaker module enabled
2. Open a scene with the Kingmaker map
3. Open browser console (F12 → Console tab)

## Available Command

```javascript
testHexSelector(count, type);
// count: number of hexes to select (default: 3)
// type: 'claim' | 'road' | 'settlement' | 'scout' (default: 'claim')
```

## Usage Examples

```javascript
// Select 3 hexes with claim styling (green)
testHexSelector();

// Select 5 hexes with claim styling
testHexSelector(5);

// Select 2 hexes with road styling (brown)
testHexSelector(2, 'road');

// Select 1 hex with settlement styling (blue)
testHexSelector(1, 'settlement');

// Select 4 hexes with scout styling (yellow)
testHexSelector(4, 'scout');
```

## What It Tests

- ✅ Hex selector dialog UI
- ✅ Color schemes for different action types
- ✅ Multi-hex selection logic
- ✅ Selection confirmation/cancellation
- ✅ Hex ID return values
- ✅ Selection limit enforcement

## Color Schemes by Type

| Type | Color | Use Case |
|------|-------|----------|
| `claim` | Green | Claiming territory |
| `road` | Brown | Building roads |
| `settlement` | Blue | Establishing settlements |
| `scout` | Yellow | Scouting/exploration |

## Expected Behavior

1. **Dialog opens** with instructions for selection
2. **Click hexes** on the map (up to `count` limit)
3. **Selected hexes highlight** with color based on `type`
4. **Counter updates** showing "X of Y selected"
5. **Confirm button** becomes enabled when selection is complete
6. **Click Confirm** or **Cancel**
7. **Returns result:**
   - Array of hex IDs (e.g., `['50.18', '51.19']`) if confirmed
   - `null` if cancelled

## Example Output

```javascript
// User selects 3 hexes and confirms
testHexSelector(3, 'claim');
// Returns: ['50.18', '51.18', '50.19']

// User cancels selection
testHexSelector(2, 'road');
// Returns: null
```

## Interactive Testing Flow

```javascript
// 1. Start hex selector test
testHexSelector(3, 'claim');

// 2. Dialog appears with message:
//    "Select 3 hexes on the map"

// 3. Click hexes on the map
//    - First hex: highlights green, counter shows "1 of 3 selected"
//    - Second hex: highlights green, counter shows "2 of 3 selected"
//    - Third hex: highlights green, counter shows "3 of 3 selected"

// 4. Click "Confirm" button
//    - Dialog closes
//    - Console logs: ["50.18", "51.18", "50.19"]

// Or click "Cancel" button
//    - Dialog closes
//    - Console logs: null
```

## Selection Behavior

### Single Selection (count = 1)
- Click a hex to select it
- Clicking another hex replaces the selection
- Only one hex can be selected at a time

### Multi Selection (count > 1)
- Click hexes to add them to selection
- Click selected hex again to deselect it
- Can select up to `count` hexes
- Cannot exceed the limit (clicking more hexes has no effect)

## Use Cases

- **Test hex selection UI** - Verify dialog appearance and behavior
- **Verify color schemes** - Check different action type colors
- **Debug selection logic** - Test single vs multi-selection
- **Test selection limits** - Ensure count enforcement works
- **Validate return values** - Confirm correct hex IDs are returned
- **UI/UX testing** - Check user experience of hex selection

## Troubleshooting

### Function not found
**Cause:** Debug utility not registered  
**Fix:**
```javascript
// Check if function exists
console.log(typeof testHexSelector);

// If undefined, reload the module
location.reload();
```

### Dialog doesn't open
**Cause:** Foundry UI not ready  
**Fix:**
1. Ensure scene is loaded
2. Check browser console for errors
3. Try again after Foundry fully loads

### Hexes don't highlight
**Cause:** Canvas layer issue or click handlers not attached  
**Fix:**
1. Check that you can see the map
2. Try clicking in different areas of hexes (center works best)
3. Close dialog and try again

### Wrong hex IDs returned
**Cause:** Coordinate conversion issue  
**Fix:**
1. Note which hexes you clicked visually
2. Compare with returned IDs
3. Use Hex Inspector to verify hex IDs: `game.reignmaker.hexInspector.enable()`

### Can't cancel selection
**Cause:** Dialog button issue  
**Fix:**
1. Press ESC key to close dialog
2. Refresh page if dialog is stuck

## Development Notes

### Registration

The function is registered globally:
```javascript
globalThis.testHexSelector = testHexSelector;
```

This makes it available directly without the `game.reignmaker` namespace.

### Integration with Hex Selector Service

Uses the actual hex selector service:
```javascript
import { selectHexes } from '../services/hex-selector/HexSelector';

async function testHexSelector(count = 3, type = 'claim') {
  const result = await selectHexes(count, type);
  console.log('Selected hexes:', result);
  return result;
}
```

### Return Values

- **Success:** `string[]` - Array of hex IDs in selection order
- **Cancelled:** `null` - User clicked Cancel or closed dialog
- **Error:** Logs error to console, returns `null`

### Performance

- Minimal overhead (just wraps existing service)
- Safe to call repeatedly
- Cleans up automatically when dialog closes

### When to Use This Tool

**Use when:**
- Developing new hex selection features
- Testing UI changes to hex selector
- Debugging hex selection issues
- Verifying color schemes for new action types

**Don't use for:**
- Actual gameplay (use proper action flow)
- Testing pathfinding (use Army Movement tool)
- Testing hex data (use Hex Inspector)

---

**Remember:** This is a **development tool only**. It tests the hex selector UI in isolation, bypassing normal game actions.
