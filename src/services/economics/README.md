# Economics Service

The Economics Service provides centralized calculations for kingdom resource production, consumption, and economic modifiers. This separation allows for better testing, maintainability, and future expansion of economic features.

## Architecture

The service is organized into focused modules:

- **`index.ts`** - Main service facade that ties everything together
- **`production.ts`** - Resource production calculations from hexes and worksites  
- **`consumption.ts`** - Resource consumption and upkeep calculations
- **`bonuses.ts`** - Leadership bonuses and economic modifiers
- **`types.ts`** - TypeScript interfaces for the economics system

## Usage

```typescript
import { economicsService } from './services/economics';

// Calculate production
const production = economicsService.calculateProduction(hexes, modifiers);

// Calculate consumption  
const consumption = economicsService.calculateConsumption(settlements, armies);

// Calculate net resources
const net = economicsService.calculateNetResources(
  production, 
  consumption, 
  currentResources
);

// Check for food shortages
const foodSupply = economicsService.checkFoodSupply(
  availableFood, 
  consumption
);
```

## Key Features

### Production System
- Calculates base production from all hexes with worksites
- Applies special hex trait bonuses (+1 production)
- Supports economic modifiers (multipliers and flat bonuses)
- Provides detailed breakdown by hex for reporting

### Consumption System
- Settlement food consumption based on tier:
  - Village: 1 Food
  - Town: 4 Food
  - City: 8 Food
  - Metropolis: 12 Food
- Army food consumption: 1 Food per army
- Army support capacity calculation
- Extensible for future resource consumption types

### Modifier System
- Leadership bonuses based on skills
- War-time production penalties
- Seasonal effects (optional)
- Economic efficiency based on kingdom stats
- Stackable modifiers with multipliers and flat bonuses

### Resource Management
- Differentiates between storable resources (Food, Gold)
- Non-storable resources (Lumber, Stone, Ore) cleared each turn
- Settlement gold income (only if properly fed)
- Net resource calculations with shortage detection

## Integration Points

The service integrates with:
- **KingdomState** - Provides hexes, settlements, armies data
- **Kingdom Store** - Uses service for derived calculations
- **ResourcesPhase** - UI component for resource collection phase

## Future Expansion

The modular architecture supports easy addition of:
- Trade routes and commerce
- Market prices and resource exchange rates
- Taxation systems
- Economic policies and edicts
- Resource conversion and crafting
- Supply chains and logistics
