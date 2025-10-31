# App Window Management Pattern

## Overview

The **AppWindowManager** provides centralized control for hiding/showing the Reignmaker app during map interactions. This replaces the previous pattern of manually calling Foundry's `.minimize()` API in each service.

## Why This Pattern?

### Problems with Previous Approach

1. **Duplication** - Each service (HexSelectorService, ArmyDeploymentPanel) duplicated the same minimize/restore logic
2. **Complexity** - Required 3 different search strategies to find the app window instance
3. **Unreliable** - Depended on Foundry's Application lifecycle which could fail
4. **UI Side Effects** - Foundry's `.minimize()` creates minimize buttons and window strips we don't want
5. **No Customization** - Couldn't easily change the hide behavior (fade vs slide vs minimize)

### Benefits of CSS-Based Approach

✅ **Reliable** - Direct DOM manipulation, no API dependencies  
✅ **Standardized** - One service, consistent behavior  
✅ **Flexible** - Easy to change visual style (slide, fade, minimize, hide)  
✅ **Better UX** - Smooth CSS transitions, hover-to-peek functionality  
✅ **No Conflicts** - Doesn't interfere with Foundry's Application state  
✅ **Maintainable** - Change behavior in one place  

## File Structure

```
src/
├── services/
│   └── ui/
│       └── AppWindowManager.ts    # Centralized app visibility service
├── styles/
│   └── map-interaction.css        # CSS for hide/show animations
└── index.ts                       # Import map-interaction.css
```

## How It Works

### 1. CSS Classes Control Visibility

The AppWindowManager adds/removes CSS classes on `#pf2e-reignmaker`:

```typescript
// Enter map mode - app slides to the right
appWindowManager.enterMapMode('slide');
// Adds: .map-interaction-mode .map-interaction-slide

// Exit map mode - app returns to normal
appWindowManager.exitMapMode();
// Removes all map interaction classes
```

### 2. CSS Provides Visual Styles

Four visual styles are available:

- **`slide`** (recommended) - Slides to right edge with 40px peek, hover to restore
- **`fade`** - Fades to 15% opacity
- **`minimize`** - Scales down and moves to corner
- **`hide`** - Completely hidden off-screen

All styles include smooth transitions and prevent interaction (`pointer-events: none`).

### 3. Hover Interaction

Users can hover over the app (except when `hide` mode) to temporarily restore it during map interaction:

```css
#pf2e-reignmaker.map-interaction-mode:not(.map-interaction-hide):hover {
  opacity: 1;
  transform: translateX(0);
  pointer-events: auto;
  z-index: 100;
}
```

## Usage Pattern

### In Map Interaction Services

Replace old minimize/restore methods:

```typescript
import { appWindowManager } from '../ui/AppWindowManager';

class SomeMapInteractionService {
  async startInteraction() {
    // Enter map mode (hide app)
    appWindowManager.enterMapMode('slide');
    
    // ... do map interaction ...
  }
  
  cleanup() {
    // Exit map mode (restore app)
    appWindowManager.exitMapMode();
    
    // ... rest of cleanup ...
  }
}
```

### Visual Style Selection

Choose based on use case:

```typescript
// For hex selection - slide (allows peek)
appWindowManager.enterMapMode('slide');

// For full-screen map work - hide
appWindowManager.enterMapMode('hide');

// For subtle overlay - fade
appWindowManager.enterMapMode('fade');

// For compact corner - minimize
appWindowManager.enterMapMode('minimize');
```

### Dynamic Style Changes

Change style while in map mode:

```typescript
// Start with slide
appWindowManager.enterMapMode('slide');

// User wants to see more of the map
if (userWantsFullScreen) {
  appWindowManager.changeStyle('hide');
}
```

## API Reference

### `appWindowManager.enterMapMode(style?: MapModeStyle)`

Enter map interaction mode and hide the app.

**Parameters:**
- `style` - Visual style: `'slide'` | `'fade'` | `'minimize'` | `'hide'` (default: `'slide'`)

**Example:**
```typescript
appWindowManager.enterMapMode('slide');
```

### `appWindowManager.exitMapMode()`

Exit map interaction mode and restore the app.

**Example:**
```typescript
appWindowManager.exitMapMode();
```

### `appWindowManager.isInMapMode(): boolean`

Check if currently in map interaction mode.

**Returns:** `true` if in map mode, `false` otherwise

**Example:**
```typescript
if (appWindowManager.isInMapMode()) {
  console.log('Already in map mode');
}
```

### `appWindowManager.getCurrentStyle(): MapModeStyle | null`

Get the current visual style (if in map mode).

**Returns:** Current style or `null` if not in map mode

**Example:**
```typescript
const currentStyle = appWindowManager.getCurrentStyle();
console.log('Current style:', currentStyle); // 'slide' or null
```

### `appWindowManager.changeStyle(newStyle: MapModeStyle)`

Change visual style while in map mode.

**Parameters:**
- `newStyle` - New visual style to apply

**Example:**
```typescript
// Change from slide to hide
appWindowManager.changeStyle('hide');
```

## Implementation Examples

### Example 1: HexSelectorService

```typescript
import { appWindowManager } from '../ui/AppWindowManager';

export class HexSelectorService {
  async selectHexes(config: HexSelectionConfig): Promise<string[] | null> {
    try {
      // Enter map mode
      appWindowManager.enterMapMode('slide');
      
      // ... hex selection logic ...
      
    } finally {
      // Always restore on exit
      appWindowManager.exitMapMode();
    }
  }
}
```

### Example 2: ArmyDeploymentPanel

```typescript
import { appWindowManager } from '../ui/AppWindowManager';

export class ArmyDeploymentPanel {
  async selectArmyAndPlotPath(skill: string): Promise<DeploymentResult | null> {
    // Enter map mode
    appWindowManager.enterMapMode('slide');
    
    // ... army selection and path plotting ...
    
    return new Promise((resolve) => {
      this.onComplete = () => {
        // Restore app before resolving
        appWindowManager.exitMapMode();
        resolve(result);
      };
    });
  }
}
```

## Customizing Visual Styles

To add a new visual style, edit `src/styles/map-interaction.css`:

```css
/* Add new style */
#pf2e-reignmaker.map-interaction-your-style {
  /* Your custom transforms, opacity, etc. */
  transform: scale(0.5) translateY(-50%);
  opacity: 0.4;
}
```

Then use it:

```typescript
appWindowManager.enterMapMode('your-style' as MapModeStyle);
```

## Migration Guide

### Before (Old Pattern)

```typescript
// Duplicated in every service
private minimizeReignmakerApp(): void {
  const ui = (globalThis as any).ui;
  let app = ui?.windows?.find((w: any) => 
    w.element?.id === 'pf2e-reignmaker'
  );
  // ... 2 more fallback strategies ...
  
  if (app && app.minimize) {
    app.minimize();
  }
}

private restoreReignmakerApp(): void {
  // ... another 30 lines of duplicate code ...
}
```

### After (New Pattern)

```typescript
import { appWindowManager } from '../ui/AppWindowManager';

private minimizeReignmakerApp(): void {
  appWindowManager.enterMapMode('slide');
}

private restoreReignmakerApp(): void {
  appWindowManager.exitMapMode();
}
```

**Result:** 60+ lines of duplicate code → 2 lines per service

## Best Practices

1. **Always pair enter/exit** - Use try/finally or Promise patterns to ensure exit is called
2. **Use 'slide' as default** - Provides best UX with hover-to-peek functionality
3. **Check isInMapMode()** - Prevent entering map mode twice
4. **Document your choice** - If using non-default style, explain why in comments
5. **Test hover behavior** - Ensure users can access the app if needed

## Future Enhancements

Potential improvements:

- User setting for preferred hide style
- Animation speed configuration
- Custom positioning (left vs right)
- Multi-app support (hide other windows too)
- Keyboard shortcut to toggle visibility during map mode

## Related Systems

- **HexSelectorService** - Uses AppWindowManager for hex selection
- **ArmyDeploymentPanel** - Uses AppWindowManager for army deployment
- **ReignMakerMapLayer** - Manages map overlays (separate concern)
- **OverlayManager** - Manages territory/road overlays (separate concern)
