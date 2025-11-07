# Map Services Refactoring Analysis

## Overview

After structural reorganization of `src/services/map/`, the code is now well-organized by function (core, editors, renderers, utils). However, several files have grown large and complex, presenting opportunities for refactoring to improve maintainability.

## Key Files Analyzed

### 1. ReignMakerMapLayer.ts (~1,000 lines)
**Current Responsibilities:**
- PIXI container lifecycle management
- Layer creation and singleton pattern
- Layer visibility control (show/hide/clear)
- Generic hex drawing utilities
- Rendering delegation to specialized modules
- Interactive selection/hover management
- Territory, road, settlement rendering orchestration
- Scene control toggle handling
- Toolbar coordination

**Issues Identified:**
- ✅ **Too many responsibilities** - violates Single Responsibility Principle
- ✅ **Mixed abstraction levels** - low-level PIXI operations mixed with high-level orchestration
- ✅ **Duplication** - similar layer clearing patterns repeated
- ✅ **Long methods** - some methods exceed 50 lines
- ✅ **Complex visibility model** - container vs. layer visibility logic spread throughout

### 2. OverlayManager.ts (~900 lines)
**Current Responsibilities:**
- Overlay registration and lifecycle
- Reactive store subscriptions
- State persistence (localStorage)
- Overlay state stack (push/pop for temporary views)
- Mutual exclusivity groups
- Zoom subscription management
- All default overlay definitions

**Issues Identified:**
- ✅ **Giant registration method** - `registerDefaultOverlays()` is 700+ lines
- ✅ **Mixed concerns** - overlay logic mixed with all overlay definitions
- ✅ **Hard to extend** - adding new overlays requires editing core file
- ✅ **Testability** - difficult to test individual overlays in isolation

### 3. EditorModeService.ts
**Note:** Not reviewed yet, but likely has similar patterns given the domain complexity.

---

## Proposed Refactoring Strategy

### Phase 1: Extract Overlay Definitions (High Value, Low Risk)

**Problem:** All overlay definitions are hardcoded in `OverlayManager.registerDefaultOverlays()`

**Solution:** Extract each overlay to its own file in `src/services/map/overlays/`

```typescript
// src/services/map/overlays/TerrainOverlay.ts
export const terrainOverlay: MapOverlay = {
  id: 'terrain',
  name: 'Terrain',
  icon: 'fa-mountain',
  layerIds: ['terrain-overlay'],
  exclusiveGroup: 'terrain-display',
  store: derived(kingdomData, $data => 
    $data.hexes.filter((h: any) => h.terrain)
  ),
  render: (hexes) => {
    const hexData = hexes.map((h: any) => ({ id: h.id, terrain: h.terrain }));
    if (hexData.length === 0) {
      mapLayer.clearLayer('terrain-overlay');
      return;
    }
    mapLayer.drawTerrainOverlay(hexData);
  },
  hide: () => {},
  isActive: () => overlayManager.isOverlayActive('terrain')
};
```

**Benefits:**
- ✅ Each overlay is self-contained and testable
- ✅ Easy to add new overlays without touching core
- ✅ Clear dependencies (imports) for each overlay
- ✅ Reduces OverlayManager from 900 to ~300 lines

**Files to Create:**
- `src/services/map/overlays/TerrainOverlay.ts`
- `src/services/map/overlays/TerrainDifficultyOverlay.ts`
- `src/services/map/overlays/TerritoryOverlay.ts`
- `src/services/map/overlays/TerritoryBorderOverlay.ts`
- `src/services/map/overlays/SettlementsOverlay.ts`
- `src/services/map/overlays/RoadsOverlay.ts`
- `src/services/map/overlays/WaterOverlay.ts`
- `src/services/map/overlays/WorksitesOverlay.ts`
- `src/services/map/overlays/ResourcesOverlay.ts`
- `src/services/map/overlays/SettlementIconsOverlay.ts`
- `src/services/map/overlays/SettlementLabelsOverlay.ts`
- `src/services/map/overlays/FortificationsOverlay.ts`
- `src/services/map/overlays/index.ts` (exports all overlays)

---

### Phase 2: Extract Layer Manager (Medium Value, Low Risk)

**Problem:** ReignMakerMapLayer does both layer lifecycle AND rendering orchestration

**Solution:** Extract layer management to `LayerManager` class

```typescript
// src/services/map/core/LayerManager.ts
export class LayerManager {
  private layers: Map<LayerId, MapLayer> = new Map();
  private container: PIXI.Container;
  
  createLayer(id: LayerId, zIndex: number): PIXI.Container
  getLayer(id: LayerId): PIXI.Container | undefined
  removeLayer(id: LayerId): void
  clearLayerContent(id: LayerId): void
  clearLayer(id: LayerId): void
  showLayer(id: LayerId): void
  hideLayer(id: LayerId): void
  clearAllLayers(): void
  // ... etc
}
```

**Benefits:**
- ✅ Separates concerns (layer lifecycle vs. rendering)
- ✅ Testable in isolation
- ✅ Reusable for other PIXI-based features
- ✅ Reduces ReignMakerMapLayer complexity

---

### Phase 3: Extract Hex Drawing Utilities (Medium Value, Low Risk)

**Problem:** Generic hex drawing mixed with specialized rendering in ReignMakerMapLayer

**Solution:** Move to `src/services/map/utils/HexDrawing.ts`

```typescript
// src/services/map/utils/HexDrawing.ts
export class HexDrawing {
  static drawSingleHex(
    graphics: PIXI.Graphics, 
    hexId: string, 
    style: HexStyle, 
    canvas: any
  ): boolean
  
  static drawMultipleHexes(
    layer: PIXI.Container,
    hexIds: string[],
    style: HexStyle,
    canvas: any
  ): number  // Returns count of successful draws
  
  static getHexVertices(hexId: string, canvas: any): { x: number; y: number }[]
  
  static normalizeHexId(hexId: string): string
}
```

**Benefits:**
- ✅ Reusable across editors and renderers
- ✅ Unit testable without PIXI canvas
- ✅ Clear API for hex operations
- ✅ Reduces duplication

---

### Phase 4: Simplify Visibility Management (Low Value, Medium Risk)

**Problem:** Container vs. layer visibility logic is complex and spread throughout

**Solution:** Create explicit `VisibilityState` class to encapsulate rules

```typescript
// src/services/map/core/VisibilityState.ts
export class VisibilityState {
  private containerVisible: boolean = false;
  private layerStates: Map<LayerId, boolean> = new Map();
  
  // Encapsulates the "both must be true" rule
  isLayerVisible(layerId: LayerId): boolean {
    return this.containerVisible && (this.layerStates.get(layerId) ?? false);
  }
  
  setContainerVisible(visible: boolean): void
  setLayerVisible(layerId: LayerId, visible: boolean): void
  getContainerVisible(): boolean
  getLayerState(layerId: LayerId): boolean
}
```

**Benefits:**
- ✅ Single source of truth for visibility rules
- ✅ Easier to understand and debug
- ✅ Testable visibility logic

**Risks:**
- ⚠️ May introduce bugs if not carefully tested
- ⚠️ Requires coordination with PIXI container state

---

### Phase 5: Extract Interactive Selection Logic (Low Value, Low Risk)

**Problem:** Interactive hover/selection logic mixed into main layer class

**Solution:** Create `InteractiveSelectionManager`

```typescript
// src/services/map/core/InteractiveSelectionManager.ts
export class InteractiveSelectionManager {
  private layerManager: LayerManager;
  private hexDrawing: HexDrawing;
  
  showInteractiveHover(hexId: string, style: HexStyle, roadPreview?: string[]): void
  hideInteractiveHover(): void
  addHexToSelection(hexId: string, style: HexStyle, roadConnections?: string[]): void
  removeHexFromSelection(hexId: string): void
  clearSelection(): void
  
  private drawRoadPreviewLines(...): void  // Internal helper
}
```

**Benefits:**
- ✅ Isolates interactive selection concerns
- ✅ Easier to test selection workflows
- ✅ Reduces ReignMakerMapLayer size

---

## Refactoring Priorities

### High Priority (Do First)
1. **Extract Overlay Definitions** - Biggest bang for buck, low risk
2. **Extract Layer Manager** - Clear separation of concerns

### Medium Priority (Do If Time)
3. **Extract Hex Drawing Utilities** - Good for code reuse
4. **Extract Interactive Selection** - Improves clarity

### Low Priority (Nice to Have)
5. **Simplify Visibility Management** - Higher risk, lower impact

---

## Implementation Guidelines

### DO:
- ✅ Make changes incrementally (one phase at a time)
- ✅ Build and test after each refactoring step
- ✅ Keep existing public API unchanged (refactor internals only)
- ✅ Add JSDoc comments to new files
- ✅ Use existing patterns (singleton, factory, etc.)

### DON'T:
- ❌ Refactor multiple phases simultaneously
- ❌ Change behavior during refactoring (only structure)
- ❌ Break existing imports (maintain exports via index.ts)
- ❌ Remove logging or debug capabilities

---

## Estimated Impact

### Before Refactoring:
- `OverlayManager.ts`: ~900 lines
- `ReignMakerMapLayer.ts`: ~1,000 lines
- **Total complexity:** Very High

### After Phase 1 (Overlays):
- `OverlayManager.ts`: ~300 lines (-67%)
- `overlays/*.ts`: 12 files × ~50 lines = 600 lines
- **Net change:** Slightly more code, much better organized

### After Phase 2 (Layer Manager):
- `LayerManager.ts`: ~200 lines
- `ReignMakerMapLayer.ts`: ~800 lines (-20%)

### After All Phases:
- Core files: 4 files × ~300 lines = 1,200 lines
- Overlay definitions: 12 files × ~50 lines = 600 lines
- Utility classes: 2 files × ~150 lines = 300 lines
- **Total:** ~2,100 lines (vs. 1,900 before, but MUCH more maintainable)

**Key Metric:** Average file size drops from 950 lines to 120 lines

---

## Next Steps

1. Review this analysis with team
2. Get approval for Phase 1 (lowest risk, highest value)
3. Create branch: `refactor/map-overlays-extraction`
4. Extract one overlay as proof-of-concept
5. Test thoroughly
6. Extract remaining overlays
7. Update imports and verify build
8. Merge to main

## Questions to Answer

- Should we extract overlays to their own files or keep them in OverlayManager?
- Is LayerManager extraction worth the effort?
- Are there other areas of map code that need attention?
- What testing strategy should we use for these refactorings?

---

**Document Status:** Draft for Review  
**Author:** Cline  
**Date:** 2025-11-05  
**Related:** `ARCHITECTURE_SUMMARY.md`, `river-editor-implementation-summary.md`
