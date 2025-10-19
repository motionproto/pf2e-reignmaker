# ReignMaker Map Layer Service

A general-purpose PIXI canvas layer service for rendering map annotations in Foundry VTT v13.

## Features

- **Multi-layer support**: Organize different types of annotations (kingdom hexes, selections, settlements, routes, etc.)
- **Proper Foundry integration**: Uses official v13 canvas patterns (`canvas.primary` group)
- **Flexible hex rendering**: Style hexes with custom colors, borders, and transparency
- **Sprite support**: Add custom sprites/markers to any layer
- **Scene control button**: Toggle kingdom hexes with toolbar button (rook icon ♜)
- **Auto cleanup**: Proper lifecycle management on canvas tear down

## Quick Start

### Scene Control Button (UI Toggle)

The module automatically adds a "Toggle Kingdom Hexes" button to the token controls toolbar.

```typescript
// Already registered in src/index.ts
import { registerKingdomHexControl } from './services/map';
registerKingdomHexControl(); // Called in init hook
```

### Programmatic Usage

```typescript
import { ReignMakerMapLayer, DEFAULT_HEX_STYLES } from './services/map';

const layer = ReignMakerMapLayer.getInstance();
```

## API Reference

### Drawing Hexes

**Draw multiple hexes with the same style:**

```typescript
const layer = ReignMakerMapLayer.getInstance();

// Using default styles
layer.drawHexes(
  ['50.18', '51.17', '52.16'],
  DEFAULT_HEX_STYLES.selection,
  'hex-selection'
);

// Custom style
layer.drawHexes(
  ['50.18', '51.17'],
  {
    fillColor: 0xFF0000,    // Red
    fillAlpha: 0.5,
    borderColor: 0xFF0000,
    borderWidth: 3,
    borderAlpha: 1.0
  },
  'my-custom-layer'
);
```

**Draw a single hex:**

```typescript
layer.drawHex('50.18', DEFAULT_HEX_STYLES.highlight, 'important-hex');
```

### Layer Management

**Create a layer:**

```typescript
const container = layer.createLayer('my-layer', 5); // layer ID, zIndex
```

**Show/hide layers:**

```typescript
layer.showLayer('hex-selection');
layer.hideLayer('hex-selection');
```

**Clear layer content:**

```typescript
layer.clearLayer('hex-selection'); // Remove all graphics but keep layer
```

**Remove layer completely:**

```typescript
layer.removeLayer('hex-selection'); // Destroy layer and all contents
```

### Sprites

**Add a sprite:**

```typescript
const sprite = PIXI.Sprite.from('path/to/icon.png');
sprite.position.set(1000, 500);
sprite.anchor.set(0.5); // Center the sprite
layer.addSprite(sprite, 'settlements');
```

**Remove a sprite:**

```typescript
layer.removeSprite(sprite);
```

### Kingdom Hexes

**Toggle kingdom hexes:**

```typescript
await layer.toggleKingdomHexes(); // Show if hidden, hide if visible
```

**Check visibility:**

```typescript
const isVisible = layer.isKingdomHexesVisible();
```

## Predefined Layers

| Layer ID | Purpose | Usage |
|----------|---------|-------|
| `kingdom-territory` | Kingdom hex highlights | Scene control button |
| `hex-selection` | Action-specific selections | Claim Hexes, Build Roads |
| `settlements` | Settlement markers | Future sprite rendering |
| `routes` | Roads and routes | Future route rendering |

You can also use custom layer IDs as strings.

## Default Styles

```typescript
import { DEFAULT_HEX_STYLES } from './services/map';

// Available styles:
DEFAULT_HEX_STYLES.kingdomTerritory  // Royal blue, 30% opacity
DEFAULT_HEX_STYLES.selection         // Chocolate, 50% opacity
DEFAULT_HEX_STYLES.highlight         // Gold, 40% opacity
```

## Usage Examples

### Example 1: Claim Hexes Action

```typescript
import { ReignMakerMapLayer, DEFAULT_HEX_STYLES } from '../services/map';

class ClaimHexesAction {
  async execute() {
    const layer = ReignMakerMapLayer.getInstance();
    
    // Show selected hexes
    layer.drawHexes(
      selectedHexIds,
      DEFAULT_HEX_STYLES.selection,
      'hex-selection'
    );
    
    // When action completes
    layer.clearLayer('hex-selection');
  }
}
```

### Example 2: Temporary Highlight

```typescript
const layer = ReignMakerMapLayer.getInstance();

// Highlight a hex temporarily
layer.drawHex('50.18', DEFAULT_HEX_STYLES.highlight, 'temp-highlight');

// Remove after 2 seconds
setTimeout(() => {
  layer.clearLayer('temp-highlight');
}, 2000);
```

### Example 3: Settlement Markers (Future)

```typescript
const layer = ReignMakerMapLayer.getInstance();

// Add settlement icon
const icon = PIXI.Sprite.from('icons/svg/village.svg');
icon.position.set(settlementX, settlementY);
icon.width = 32;
icon.height = 32;
icon.anchor.set(0.5);

layer.addSprite(icon, 'settlements');
```

## Coordinate System

Hex IDs use **dot notation** which maps directly to Foundry grid coordinates:

```typescript
"50.18" → {i: 50, j: 18}
```

The service automatically converts these to canvas pixel coordinates using Foundry's `canvas.grid.getVertices({i, j})`.

## Lifecycle

The service automatically cleans up on canvas tear down:

```typescript
Hooks.on('canvasTearDown', () => {
  const layer = ReignMakerMapLayer.getInstance();
  layer.destroy(); // Auto cleanup
});
```

## Architecture

```
ReignMakerMapLayer (Singleton)
├── PIXI.Container (main container in canvas.primary)
    ├── Layer: kingdom-territory (PIXI.Container)
    │   └── PIXI.Graphics (hex fills/borders)
    ├── Layer: hex-selection (PIXI.Container)
    │   └── PIXI.Graphics (temp selections)
    ├── Layer: settlements (PIXI.Container)
    │   └── PIXI.Sprite[] (settlement icons)
    └── Layer: custom-* (PIXI.Container)
        └── Mixed PIXI objects
```

## Migration from Old HexHighlighter

The old `HexHighlighter.ts` can remain for UI selection dialogs. This new service is specifically for canvas rendering:

**Old (UI selection):**
```typescript
import { HexHighlighter } from './services/hex-selector/HexHighlighter';
// Used in action dialogs for interactive selection
```

**New (Canvas rendering):**
```typescript
import { ReignMakerMapLayer } from './services/map';
// Used for displaying hexes on the map
```

## Technical Notes

- **Lazy initialization**: Container is created on first use, not at module init
- **Foundry v13 pattern**: Integrates with `canvas.primary` (with `canvas.interface` fallback)
- **Singleton pattern**: One instance manages all map annotations
- **Layer isolation**: Each feature type has its own container for easy management
