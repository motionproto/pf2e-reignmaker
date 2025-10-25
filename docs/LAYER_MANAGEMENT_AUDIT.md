# Layer Management System Audit

**Date:** 2025-10-23  
**Last Updated:** 2025-10-25  
**Issue:** Layers sometimes persist when they should be removed, causing visual artifacts  
**Status:** ✅ **RESOLVED**

---

## Resolution Summary (2025-10-25)

The root cause was identified as **reactive store subscriptions continuing to fire after the scene control was toggled OFF**. The fix was simple and effective:

### What Was Fixed

1. **Added `overlayManager.clearAll()` when toggling scene control OFF**
   - Unsubscribes from all reactive stores
   - Prevents rendering while container is hidden
   - Location: `ReignMakerMapLayer.handleSceneControlToggle()`

2. **Improved canvasTearDown cleanup**
   - Calls `overlayManager.clearAll()` before destroying layers
   - Ensures clean state on scene changes
   - Location: `SceneControlRegistration.ts`

3. **Enhanced validation logging**
   - Tracks subscription lifecycle
   - Warns if subscriptions fire when they shouldn't
   - Helps identify future issues

### Why This Works

The reactive overlay system uses Svelte stores that automatically re-render when kingdom data changes. Previously, when toggling the scene control OFF:
- The PIXI container was hidden ✅
- But subscriptions kept running ❌
- Kingdom data changes (from Kingmaker sync, user actions, etc.) triggered rendering ❌
- Layers were drawn behind the hidden container, causing artifacts when toggled back ON ❌

Now when toggling OFF:
- The PIXI container is hidden ✅
- All subscriptions are unsubscribed ✅
- No rendering occurs ✅
- Clean slate when toggling back ON ✅

---

## Current Architecture

### 1. ReignMakerMapLayer (Singleton)
- **Purpose:** Manages PIXI container layers
- **Pattern:** Singleton with layer registry (Map<LayerId, MapLayer>)
- **Key Methods:**
  - `createLayer(id, zIndex)` - Creates or reuses existing layer (singleton pattern)
  - `clearLayer(id)` - Destroys children, hides layer
  - `showLayer(id)` - Makes layer visible
  - `hideLayer(id)` - Makes layer invisible
  - Various draw methods (`drawHexes`, `drawTerrainOverlay`, etc.)

### 2. OverlayManager (Singleton)
- **Purpose:** Manages overlay lifecycle and state persistence
- **Pattern:** Singleton with overlay registry (Map<string, MapOverlay>)
- **Key Methods:**
  - `showOverlay(id)` - Clears layers, calls overlay.show(), marks active
  - `hideOverlay(id)` - Calls overlay.hide(), clears layers, marks inactive
  - `toggleOverlay(id)` - Toggles between show/hide
  - `clearAll()` - Hides all overlays and clears all layers

### 3. MapOverlay Interface
Each overlay defines:
- `id` - Unique identifier
- `layerIds` - Array of layer IDs this overlay manages
- `show()` - Function to display the overlay
- `hide()` - Function to hide the overlay
- `isActive()` - Check if overlay is currently active

---

## Issues Identified

### 🔴 CRITICAL: Inconsistent Layer Showing
**Problem:** `drawHexes()` does NOT call `showLayer()`, but all other draw methods do.

**Evidence:**
```typescript
// drawHexes() - NO showLayer()
drawHexes(hexIds, style, layerId) {
  this.clearLayer(layerId);
  const layer = this.createLayer(layerId, zIndex);
  // ... draw graphics ...
  layer.addChild(graphics);
  // ❌ Missing: this.showLayer(layerId);
}

// drawTerrainOverlay() - HAS showLayer()
drawTerrainOverlay(hexData) {
  this.clearLayer(layerId);
  const layer = this.createLayer(layerId, 5);
  renderTerrainOverlay(layer, hexData, canvas, this.drawSingleHex.bind(this));
  this.showLayer(layerId); // ✅ Present
}
```

**Impact:** Territory and Settlements overlays rely on `drawHexes()` and must manually call `showLayer()`. This creates inconsistency and potential for forgetting to show the layer.

### 🔴 CRITICAL: Double Clearing Pattern
**Problem:** Layers are cleared in TWO places - once in OverlayManager, once in draw methods.

**Evidence:**
```typescript
// OverlayManager.showOverlay()
async showOverlay(id: string) {
  overlay.layerIds.forEach(layerId => {
    this.mapLayer.clearLayer(layerId); // ❌ First clear
  });
  await overlay.show(); // Calls drawTerrainOverlay() which...
}

// ReignMakerMapLayer.drawTerrainOverlay()
drawTerrainOverlay(hexData) {
  this.clearLayer(layerId); // ❌ Second clear
  // ...
}
```

**Impact:** Redundant operations, potential race conditions, unclear responsibility.

### 🟡 WARNING: Empty hide() Implementations
**Problem:** All overlay `hide()` methods are empty with comment "Cleanup handled by OverlayManager".

**Evidence:**
```typescript
{
  id: 'terrain',
  show: async () => { /* ... */ },
  hide: () => {
    // Cleanup handled by OverlayManager
  }
}
```

**Impact:** Creates tight coupling and makes it unclear what cleanup is expected. If OverlayManager's `hideOverlay()` changes, overlays might break.

### 🟡 WARNING: Manual showLayer() Calls in Overlays
**Problem:** Some overlays manually call `showLayer()` after drawing.

**Evidence:**
```typescript
// Territory overlay
show: async () => {
  this.mapLayer.drawHexes(hexIds, style, 'kingdom-territory');
  this.mapLayer.showLayer('kingdom-territory'); // ❌ Manual call
}

// Terrain overlay (no manual call - draw method handles it)
show: async () => {
  this.mapLayer.drawTerrainOverlay(hexData);
  // ✅ No manual showLayer() needed
}
```

**Impact:** Inconsistent patterns make code harder to understand and maintain.

### 🟡 WARNING: Layer Reuse Without Validation
**Problem:** `createLayer()` reuses existing layers but doesn't validate they're clean.

**Evidence:**
```typescript
createLayer(id: LayerId, zIndex: number = 0): PIXI.Container {
  if (this.layers.has(id)) {
    const existingLayer = this.layers.get(id)!;
    // ❌ No validation that layer is empty/clean
    return existingLayer.container;
  }
  // ...
}
```

**Impact:** If a layer wasn't properly cleared, old graphics persist when layer is reused.

### 🟢 INFO: Inconsistent clearLayer() Behavior
**Problem:** `clearLayer()` both destroys children AND hides the layer, but this isn't always what's wanted.

**Evidence:**
```typescript
clearLayer(id: LayerId): void {
  layer.container.removeChildren().forEach(child => {
    child.destroy({ children: true, texture: false, baseTexture: false });
  });
  layer.container.visible = false; // ❌ Always hides
  layer.visible = false;
}
```

**Impact:** Can't clear a layer without hiding it. This forces draw methods to call `showLayer()` after clearing.

---

## Root Causes

1. **Unclear Responsibility Boundaries**
   - Should OverlayManager or draw methods handle layer visibility?
   - Should clearing happen in OverlayManager or draw methods?

2. **Inconsistent Method Contracts**
   - Some draw methods show layers, others don't
   - Some draw methods clear first, some rely on caller to clear

3. **No Layer Lifecycle Validation**
   - No checks to ensure layers are in expected state
   - No logging to track layer state transitions

4. **Tight Coupling**
   - OverlayManager knows about layer IDs (should be abstraction)
   - Overlays have empty hide() methods (violates interface segregation)

---

## Recommended Solutions

### Solution A: Standardize Draw Method Contracts (RECOMMENDED)

**Principle:** All draw methods should be self-contained and follow the same pattern.

**Pattern:**
1. Clear the layer (remove old graphics)
2. Create/get the layer container
3. Draw new content
4. Show the layer

**Changes Required:**
```typescript
// Update drawHexes() to match other draw methods
drawHexes(hexIds, style, layerId = 'hex-selection', zIndex?) {
  this.ensureInitialized();
  this.clearLayer(layerId);
  const layer = this.createLayer(layerId, zIndex ?? this.getDefaultZIndex(layerId));
  
  const graphics = new PIXI.Graphics();
  // ... draw hexes ...
  layer.addChild(graphics);
  
  this.showLayer(layerId); // ✅ ADD THIS
}
```

**Remove double clearing:**
```typescript
// OverlayManager.showOverlay() - REMOVE pre-clearing
async showOverlay(id: string) {
  // ❌ REMOVE this clearing - let draw methods handle it
  // overlay.layerIds.forEach(layerId => {
  //   this.mapLayer.clearLayer(layerId);
  // });
  
  await overlay.show(); // This will handle clearing
  this.activeOverlays.add(id);
  this.saveState();
}
```

**Remove manual showLayer() calls from overlays:**
```typescript
// Territory overlay - simplified
show: async () => {
  this.mapLayer.drawHexes(hexIds, style, 'kingdom-territory');
  // ❌ REMOVE: this.mapLayer.showLayer('kingdom-territory');
  // Draw method now handles showing
}
```

### Solution B: Separate Clear and Hide Operations

**Problem:** `clearLayer()` both removes content AND hides the layer.

**Solution:** Split into two methods:
```typescript
// Only remove graphics, keep layer visible state
clearLayerContent(id: LayerId): void {
  const layer = this.layers.get(id);
  if (layer) {
    layer.container.removeChildren().forEach(child => {
      if (child instanceof PIXI.Graphics) child.clear();
      child.destroy({ children: true, texture: false, baseTexture: false });
    });
    // ✅ DON'T change visibility
  }
}

// Hide layer (keep content)
hideLayer(id: LayerId): void {
  const layer = this.layers.get(id);
  if (layer) {
    layer.container.visible = false;
    layer.visible = false;
  }
}

// Clear AND hide (combination)
clearLayer(id: LayerId): void {
  this.clearLayerContent(id);
  this.hideLayer(id);
}
```

### Solution C: Add Layer State Validation

**Purpose:** Detect when layers aren't cleaned up properly.

**Implementation:**
```typescript
private validateLayerEmpty(id: LayerId): boolean {
  const layer = this.layers.get(id);
  if (!layer) return true;
  
  const childCount = layer.container.children.length;
  if (childCount > 0) {
    console.warn(
      `[ReignMakerMapLayer] ⚠️ Layer ${id} has ${childCount} children when expected to be empty!`,
      'Children:', layer.container.children.map(c => c.name || c.constructor.name)
    );
    return false;
  }
  return true;
}

// Call before drawing
drawHexes(hexIds, style, layerId, zIndex?) {
  this.ensureInitialized();
  
  // ✅ Validate layer state
  if (!this.validateLayerEmpty(layerId)) {
    console.warn(`[ReignMakerMapLayer] Force-clearing dirty layer: ${layerId}`);
  }
  
  this.clearLayer(layerId);
  // ... rest of method
}
```

### Solution D: Registry-Based Layer Management

**Purpose:** Centralize all layer operations through a registry.

**Implementation:**
```typescript
class LayerRegistry {
  private layers = new Map<LayerId, LayerState>();
  
  register(id: LayerId, container: PIXI.Container, zIndex: number) {
    this.layers.set(id, {
      id,
      container,
      zIndex,
      visible: false,
      dirty: false,
      lastCleared: null,
      lastDrawn: null
    });
  }
  
  markDirty(id: LayerId) {
    const state = this.layers.get(id);
    if (state) state.dirty = true;
  }
  
  clear(id: LayerId) {
    const state = this.layers.get(id);
    if (!state) return;
    
    if (state.dirty) {
      console.log(`[LayerRegistry] Clearing dirty layer: ${id}`);
    }
    
    // Clear implementation...
    state.dirty = false;
    state.lastCleared = Date.now();
  }
  
  getDirtyLayers(): LayerId[] {
    return Array.from(this.layers.entries())
      .filter(([id, state]) => state.dirty)
      .map(([id]) => id);
  }
}
```

---

## Implementation Priority

### Phase 1: Quick Fixes (High Impact, Low Risk)
1. ✅ Make `drawHexes()` call `showLayer()` like other draw methods
2. ✅ Remove double clearing in `OverlayManager.showOverlay()`
3. ✅ Remove manual `showLayer()` calls from overlay definitions
4. ✅ Add layer state validation logging

### Phase 2: Architectural Improvements (Medium Risk)
5. Split `clearLayer()` into `clearLayerContent()` and `hideLayer()`
6. Update all draw methods to use new separation
7. Document layer lifecycle in method JSDoc comments

### Phase 3: Advanced Features (Optional)
8. Implement LayerRegistry for centralized tracking
9. Add developer tools for inspecting layer state
10. Add automated tests for layer lifecycle

---

## Testing Checklist

After implementing fixes, verify:

- [ ] Toggle each overlay on/off multiple times - no artifacts remain
- [ ] Toggle multiple overlays rapidly - no race conditions
- [ ] Refresh page with overlays active - state restores correctly
- [ ] Close toolbar with overlays active - overlays remain visible
- [ ] Toggle scene control off - all layers cleared
- [ ] Check browser console - no layer state warnings
- [ ] Inspect PIXI layer children counts - all zero when expected

---

## Conclusion

The layer artifact issue stems from **inconsistent responsibility assignment** and **lack of lifecycle validation**. The quick fixes in Phase 1 will resolve most immediate issues, while Phase 2 improvements will prevent future problems.

**Recommended Action:** Implement Phase 1 fixes first, test thoroughly, then evaluate if Phase 2 is needed.
