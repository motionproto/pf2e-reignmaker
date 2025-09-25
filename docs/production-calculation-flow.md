# Production Calculation Flow in PF2E Reignmaker

## Overview
The resource production system is properly consolidated with a single source of truth and consistent calculation across all UI components.

## Production Values (Per Reignmaker Lite Rules)

### Base Production by Worksite Type
| Terrain | Worksite | Base Production |
|---------|----------|-----------------|
| Plains | Farmstead | 2 Food |
| Forest | Logging Camp | 2 Lumber |
| Hills | Quarry | 1 Stone |
| Mountains | Mine | 1 Ore |
| Mountains | Quarry | 1 Stone |
| Swamp | Mine/Bog Mine | 1 Ore |
| Swamp | Hunting/Fishing Camp | 1 Food |
| Desert (Oasis) | Oasis Farm | 1 Food |

### Special Trait Bonus
- Hexes with special traits (e.g., Rich Vein, Fertile) add **+1** to production
- Example: Quarry on Hills with special trait = 1 + 1 = 2 Stone

## Architecture Flow

### 1. Individual Hex Calculation
**Location**: `src/models/Hex.ts`
- `Hex.getProduction()` calculates production for a single hex
- Applies base production from `Worksite.getBaseProduction(terrain)`
- Adds +1 if hex has special trait

### 2. Aggregation and Caching
**Location**: `src/models/KingdomState.ts`
- `updateCachedProduction()` aggregates all hex production
- Stores in `cachedProduction` Map for efficiency
- Called automatically when hexes change (via Territory Service)

### 3. Store Exposure
**Location**: `src/stores/kingdom.ts`
- `totalProduction` derived store exposes cached production
- Single source of truth for all UI components
- Automatically updates when kingdom state changes

### 4. UI Consumption
All UI components use the same `totalProduction` store:
- **Kingdom Stats** (`src/view/kingdom/components/KingdomStats.svelte`)
- **Territory Tab** (`src/view/kingdom/tabs/TerritoryTab.svelte`)
- **Resources Phase** (`src/view/kingdom/turnPhases/ResourcesPhase.svelte`)

## When Production Updates

1. **Territory Sync** (`src/services/territory/index.ts`)
   - When syncing from Kingmaker module
   - Calls `updateKingdomStore()` → `updateCachedProduction()`

2. **Manual Hex Changes**
   - Any modification to hexes triggers cache update
   - Ensures production always reflects current territory state

## Economics Service Integration

The Economics Service (`src/services/economics/index.ts`) properly uses the cached production:
- `collectTurnResources()` uses `state.cachedProduction`
- No duplicate calculation - just uses the cached values
- Adds settlement gold income on top of hex production

## Verification

Current implementation correctly matches Reignmaker Lite rules:
- ✅ Quarry on Hills: 1 Stone (2 with special trait)
- ✅ Mine on Mountains: 1 Ore (2 with special trait)
- ✅ Mine on Swamp: 1 Ore (2 with special trait)
- ✅ All production calculated in one place
- ✅ Single source of truth (cached in KingdomState)
- ✅ Consistent display across all UI components
- ✅ Automatic updates when territory changes

## Conclusion

The production calculation system is:
- **Not fragile** - properly consolidated with single calculation point
- **Efficient** - uses caching to avoid recalculation
- **Consistent** - all UI components use same source
- **Correct** - matches Reignmaker Lite rules exactly
