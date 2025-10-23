# River System Implementation Plan

## Background

During water terrain implementation, we identified that **rivers should be hex features, not terrain types**. This distinction is important because:

- **Terrain type** = What the hex is made of (plains, forest, hills, water, etc.)
- **Hex feature** = Special properties that modify a hex (roads, rivers, bridges, landmarks)

## Current State

### ✅ Completed: Water Terrain System
- Water implemented as a **terrain type** for lakes/oceans
- Water hexes provide automatic roads (free water transportation)
- Water hexes support Farmstead worksite (fishing boats = 1 food)
- Special rendering: half-width light blue roads on water hexes
- Proper Kingmaker integration (imports from `hexData.terrain`)

### ✅ Completed: Travel Difficulty
- Added `TravelDifficulty` type: `'open' | 'difficult' | 'greater-difficult' | 'water'`
- Integrated with Hex model as `travel` property
- Reads from Kingmaker module (`hexData.travel`)
- Ready for future movement/exploration mechanics

## River Implementation Plan

### Concept
Rivers are **hex features** that flow through non-water terrain (plains, forest, hills, etc.), providing transportation benefits similar to roads.

### River Properties
```typescript
interface RiverFeature {
  type: 'river';
  flowDirection?: 'north-south' | 'east-west' | 'northeast-southwest' | 'northwest-southeast';
  hasBridge?: boolean;  // Bridge = road crossing
  navigable?: boolean;  // Can boats travel on it?
}
```

### Game Mechanics

#### Transportation Benefits
- **Basic River:** Acts like a road for hexes it flows through (if navigable)
- **River Bridge:** Required for roads to cross rivers (action to build)
- **River Navigation:** Small boats can travel on navigable rivers

#### Movement Rules
- Rivers don't change terrain type (a plains hex with a river is still plains)
- Rivers may affect travel difficulty (crossing without bridge = difficult terrain)
- Bridge hexes allow normal road movement

### Implementation Steps

#### 1. **Update Hex Model** (`src/models/Hex.ts`)
```typescript
export interface RiverFeature {
  type: 'river';
  flowDirection?: string;
  hasBridge?: boolean;
  navigable?: boolean;
}

// Add to Hex class
class Hex {
  // ... existing properties
  hasRiver?: RiverFeature;  // River feature (if present)
  
  // Method to check if hex has navigable river
  hasNavigableRiver(): boolean {
    return this.hasRiver?.navigable ?? false;
  }
  
  // Method to check if hex provides road benefits
  providesRoadBenefits(): boolean {
    // Water terrain OR roads OR navigable rivers
    return this.terrain === 'water' || 
           this.hasRoad || 
           this.hasNavigableRiver();
  }
}
```

#### 2. **Update Territory Service** (`src/services/territory/index.ts`)
```typescript
// In syncFromKingmaker(), check for river features
const hasRiver = hexState.features?.find(f => f.type === 'river');
if (hasRiver) {
  hex.hasRiver = {
    type: 'river',
    navigable: (hasRiver as any).navigable ?? true,
    hasBridge: (hasRiver as any).bridge ?? false
  };
}
```

#### 3. **Update Map Rendering** (`src/services/map/ReignMakerMapLayer.ts`)
```typescript
// Render rivers as flowing blue lines through hexes
// Similar to road rendering but with wavy/flowing style
// Blue color (similar to water roads but different style)
// Show bridges as small icons where roads cross rivers
```

#### 4. **Player Actions**
- **Build Bridge:** Action to build a bridge over a river
  - Cost: Stone/lumber resources
  - Enables roads to cross the river hex
  - Required for road network continuity

#### 5. **Future Enhancements**
- River-based settlements (fishing villages, ports)
- River trade routes (bonus commerce)
- Flooding events (seasonal mechanics)
- Dam construction (control water flow)

### Data Model Comparison

```typescript
// WATER TERRAIN (current implementation)
const lakeHex = new Hex(
  row, col,
  'water',              // ← Terrain type
  'water',              // ← Travel difficulty
  new Worksite('Farmstead'), // Fishing
  false,
  null,
  1,
  false,  // No road needed (automatic)
  []
);

// RIVER FEATURE (future implementation)
const riverHex = new Hex(
  row, col,
  'plains',             // ← Still plains terrain
  'open',               // ← Normal travel (unless crossing)
  new Worksite('Farmstead'), // Farms work on plains
  false,
  null,
  1,
  false,
  [{ type: 'river', navigable: true, hasBridge: false }] // ← River as feature
);
```

## Next Steps

### Priority 1: Basic River Support
1. [ ] Add `hasRiver` property to Hex model
2. [ ] Update territory service to detect river features from Kingmaker
3. [ ] Store river data in kingdom state
4. [ ] Add visual indicator for river hexes (blue flowing line)

### Priority 2: River Mechanics
1. [ ] Implement `providesRoadBenefits()` method
2. [ ] Update road network calculation to include navigable rivers
3. [ ] Add river consideration to travel difficulty
4. [ ] Create "Build Bridge" player action

### Priority 3: Advanced Features
1. [ ] River trade route bonuses
2. [ ] Riverfront settlement benefits
3. [ ] Seasonal flooding mechanics
4. [ ] Dam/irrigation structures

## Technical Notes

### Kingmaker Module Integration
- Check if Kingmaker already has river features: `hexState.features.find(f => f.type === 'river')`
- Kingmaker may store river direction, navigability, bridges
- Import all river properties during sync

### Backward Compatibility
- Rivers are optional features (hexes without rivers work normally)
- Existing water terrain hexes are unaffected
- Default to `hasRiver = undefined` for non-river hexes

### Performance Considerations
- River rendering should use cached geometries (similar to roads)
- River network calculation separate from road network
- Only render rivers on visible hexes

## Questions to Resolve

1. **Should rivers block roads by default?**
   - Option A: Rivers require bridges for roads to cross (more realistic)
   - Option B: Roads can cross rivers freely (simpler)
   - **Recommendation:** Require bridges (adds strategic depth)

2. **How do rivers affect movement?**
   - Crossing river without bridge = difficult terrain?
   - Following river = road benefits?
   - **Recommendation:** Navigable rivers provide road benefits, crossing without bridge = difficult

3. **Can rivers connect to water hexes?**
   - Rivers that flow into lakes/oceans?
   - **Recommendation:** Yes, rivers can have endpoints at water terrain hexes

## References

- Water terrain implementation: `src/types/terrain.ts`, `src/models/Hex.ts`
- Road rendering: `src/services/map/ReignMakerMapLayer.ts` (drawRoads method)
- Kingmaker feature sync: `src/services/territory/index.ts` (extractSettlements pattern)
- Travel difficulty: `src/types/terrain.ts` (TravelDifficulty type)

---

**Status:** Ready for implementation
**Estimated Effort:** 2-3 sessions (basic river support)
**Dependencies:** Water terrain system (✅ complete), Travel difficulty (✅ complete)
