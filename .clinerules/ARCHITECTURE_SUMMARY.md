## Core Architecture Principles

### 1. Single Source of Truth
- **Party Actor Flags** = ONLY persistent data source
- Kingdom data stored at: `actor.getFlag('pf2e-reignmaker', 'kingdom-data')`
- All writes go through wrapped actor methods (see Kingdom Actor Wrapper below)
- Stores are derived/reactive, never written to directly

### 2. Kingdom Actor Wrapper Pattern
- Party actors are regular Foundry Actors, NOT KingdomActor instances
- `wrapKingdomActor()` adds kingdom methods to party actors at runtime
- Wrapper applied during actor discovery in `kingdomSync.ts`
- Methods: `getKingdomData()`, `setKingdomData()`, `updateKingdomData()`, etc.
- All code uses these wrapped methods for consistent data access

### 3. Clean Separation of Concerns
- **Svelte components** = Presentation only (UI, user interaction, display logic)
- **Controllers** = Business logic only (phase operations, game rules, calculations)
- **Services** = Complex operations (utilities, integrations, reusable logic)
- **NO business logic in Svelte files** - components delegate to controllers/services

### 4. Data Flow Pattern
```
Read:  Party Actor Flags → Wrapped Actor → KingdomStore → Component Display
Write: Component Action → Controller → TurnManager → Wrapped Actor → Party Actor Flags → Foundry → All Clients
```

**Accessing Kingdom Data:**
```typescript
// ✅ Correct - use wrapped actor methods
const kingdom = actor.getKingdomData();
await actor.setKingdomData(data);
await actor.updateKingdomData(kingdom => { kingdom.fame += 1; });

// ❌ Wrong - don't call getFlag() directly in business logic
const kingdom = actor.getFlag('pf2e-reignmaker', 'kingdom-data');
```

### 5. Territory Filtering Pattern (Derived Stores)
- **Problem**: Duplicated filtering logic across components/controllers
- **Solution**: Centralized derived stores in KingdomStore.ts
- **Stores provide**: Reactive, automatically-updated, filtered data

**Available Derived Stores:**
```typescript
// In KingdomStore.ts
export const claimedHexes = derived(kingdomData, $data => 
  $data.hexes.filter(h => h.claimedBy === 1)
);

export const claimedSettlements = derived(kingdomData, $data =>
  $data.settlements.filter(s => {
    if (s.location.x === 0 && s.location.y === 0) return false;
    const hexId = /* calculate hex ID */;
    const hex = $data.hexes?.find(h => h.id === hexId);
    return hex && hex.claimedBy === 1;
  })
);

export const claimedWorksites = derived(claimedHexes, $hexes =>
  $hexes.reduce((counts, hex) => {
    // Count worksites from kingmakerFeatures
    return counts;
  }, {})
);
```

**Usage Pattern:**
```typescript
// ✅ Correct - use centralized derived stores
import { claimedHexes, claimedSettlements, claimedWorksites } from '../stores/KingdomStore';

// In Svelte components
$: settlements = $claimedSettlements;

// In controllers/services
const { claimedSettlements } = await import('../stores/KingdomStore');
const settlements = get(claimedSettlements);

// ❌ Wrong - don't duplicate filtering logic
const claimed = kingdom.hexes.filter(h => h.claimedBy === 1);
```

**Benefits:**
- ✅ Single Source of Truth for filtering
- ✅ Automatic reactivity (updates when kingdom data changes)
- ✅ Consistency guaranteed across all consumers
- ✅ Reduced code duplication (~60% less filtering code)
- ✅ Easier to maintain and update

### 6. Phase Management Pattern
- **TurnManager** = Central coordinator (turn/phase progression + step management)
- **Phase Components** = Mount when active, call `controller.startPhase()` 
- **Phase Controllers** = Execute phase business logic, mark completion
- **NO triggering from TurnManager** - phases are self-executing when mounted

```
Phase Flow: TurnManager.nextPhase() → Update currentPhase → 
           Component Mounts → controller.startPhase() → Execute Logic
```

### 7. Modular TurnManager Architecture
- **TurnManager** = Main coordinator class with modular utilities
- **PhaseHandler** = Utility class for step management (imported by TurnManager)
- **PhaseControllerHelpers** = Utility functions (imported by controllers)
- Utilities are implementation details, not separate architectural components

## Implementation Patterns

### Component Pattern (UI Only)
```svelte
<script>
// ✅ READ from stores
import { kingdomData, resources } from '../stores/KingdomStore';

// ✅ UI state only
let isProcessing = false;

// ✅ Delegate to controller
async function handleAction() {
  const { createController } = await import('../controllers/SomeController');
  const controller = await createController();
  const result = await controller.performAction();
  // Handle result in UI
}
</script>
```

### Controller Pattern (Business Logic Only)
```typescript
export async function createSomeController() {
  return {
    async performAction() {
      // Business logic here
      await setResource('fame', 1);
      await markPhaseStepCompleted('step-1');
      return { success: true };
    }
  };
}
```

### Phase Controller Pattern (Self-Executing Phases)
```typescript
export async function createPhaseController() {
  return {
    async startPhase() {
      console.log('🟡 [PhaseController] Starting phase...');
      try {
        // Execute phase-specific business logic
        await this.doPhaseWork();
        await markPhaseStepCompleted('phase-complete');
        
        // Notify completion
        await this.notifyPhaseComplete();
        console.log('✅ [PhaseController] Phase complete');
        return { success: true };
      } catch (error) {
        console.error('❌ [PhaseController] Phase failed:', error);
        return { success: false, error: error.message };
      }
    }
  };
}
```

### Phase Component Pattern (Auto-Starting)
```svelte
<script>
onMount(async () => {
  // Only start if we're in the correct phase and haven't run yet
  if ($kingdomData.currentPhase === OUR_PHASE && !isCompleted) {
    const controller = await createPhaseController();
    await controller.startPhase();
  }
});
</script>
```

## Key Rules

### DO:
- ✅ Keep Svelte components for presentation only
- ✅ Put business logic in controllers/services
- ✅ Use reactive stores for data display
- ✅ Use centralized derived stores (claimedHexes, claimedSettlements, etc.)
- ✅ Return `{ success: boolean, error?: string }` from controllers
- ✅ Use clear console logging with emoji indicators
- ✅ Name phase methods `startPhase()` not `runAutomation()`
- ✅ Let phases self-execute on mount, not triggered by TurnManager
- ✅ Keep TurnManager simple - only progression, no orchestration

### DON'T:
- ❌ Put business logic in Svelte components
- ❌ Write to derived stores directly
- ❌ Duplicate filtering logic (use derived stores instead)
- ❌ Create complex abstractions unless necessary
- ❌ Mix UI concerns with business logic
- ❌ Trigger phase controllers from TurnManager
- ❌ Use misleading names like "automation" for phase operations
- ❌ Create double-execution paths (TurnManager + Component)

## File Organization
```
src/
├── view/                    # Svelte components (presentation only)
├── controllers/             # Business logic (phase operations, game rules)
│   ├── events/              # Event types & providers
│   ├── incidents/           # Incident types & providers
│   └── shared/              # Shared controller utilities
├── services/                # Complex operations (utilities, calculations)
│   ├── domain/              # Domain services (events, incidents, unrest)
│   │   ├── events/          # EventService (load from dist/events.json)
│   │   └── incidents/       # IncidentService (load from dist/incidents.json)
│   ├── pf2e/                # PF2e integration services
│   └── ModifierService.ts   # Simplified modifier management
├── stores/                  # KingdomStore - Reactive bridges (read-only)
├── actors/                  # KingdomActor (type definitions)
├── utils/                   # Utility functions
│   └── kingdom-actor-wrapper.ts  # Wraps party actors with kingdom methods
├── hooks/                   # Foundry hooks
│   └── kingdomSync.ts       # Actor discovery and wrapping
└── models/                  # TurnManager, Modifiers (data structures)
```

## Event & Incident System (Normalized Structure)

### Data Location
- **Events:** `dist/events.json` (37 normalized events)
- **Incidents:** `dist/incidents.json` (30 normalized incidents: 8 minor, 10 moderate, 12 major)

### Normalized Structure
```typescript
{
  id: string;
  name: string;
  description: string;
  tier: number;  // All start at tier 1
  skills: EventSkill[];  // Flat structure
  effects: {  // Consolidated outcomes
    criticalSuccess?: { msg: string, modifiers: EventModifier[] },
    success?: { msg: string, modifiers: EventModifier[] },
    failure?: { msg: string, modifiers: EventModifier[] },
    criticalFailure?: { msg: string, modifiers: EventModifier[] }
  };
  ifUnresolved?: UnresolvedEvent;  // Becomes modifier if failed/ignored
}

// EventModifier can be StaticModifier, DiceModifier, or ChoiceModifier
// ChoiceModifier uses resource: ResourceType[] (array) for player selection
// Detection: Array.isArray(modifier.resource)
```

### Key Changes from Old System
- ✅ Removed: `escalation`, `priority`, `severity`, `fixed DCs`
- ✅ Simplified: `stages` → flat `skills` array
- ✅ Standardized: All outcomes use `EventModifier[]` format
- ✅ Duration: Only in modifiers, not at event level
- ✅ DC: Level-based only (no fixed values)

## Modifier System (Simplified)

### Storage
- **Location:** `kingdom.activeModifiers: ActiveModifier[]` (in KingdomActor)
- **NO complex priority/escalation logic**
- **Direct array manipulation** via `updateKingdom()`

### ActiveModifier Structure
```typescript
interface ActiveModifier {
  id: string;
  name: string;
  description: string;
  icon?: string;
  tier: number;
  
  // Source tracking
  sourceType: 'event' | 'incident' | 'structure';
  sourceId: string;
  sourceName: string;
  
  // Timing
  startTurn: number;
  
  // Effects (uses EventModifier format)
  modifiers: EventModifier[];
  
  // Resolution (optional)
  resolvedWhen?: ResolutionCondition;
}
```

### ModifierService Pattern
```typescript
// Create service
const modifierService = await createModifierService();

// Create modifier from event
const modifier = modifierService.createFromUnresolvedEvent(event, currentTurn);

// Add to KingdomActor directly
await updateKingdom(kingdom => {
  if (!kingdom.activeModifiers) kingdom.activeModifiers = [];
  kingdom.activeModifiers.push(modifier);
});

// Apply during Status phase
await modifierService.applyOngoingModifiers();

// Clean up expired
await modifierService.cleanupExpiredModifiers();
```

### Integration Points
1. **EventPhaseController** - Creates modifiers for failed/ignored events
2. **UnrestPhaseController** - Creates modifiers for unresolved incidents
3. **StatusPhaseController** - Applies ongoing modifiers each turn
4. **ModifierService** - Handles creation, application, cleanup

---

## Important Development Notes

### Browser Environment - NO CommonJS

**⚠️ CRITICAL: This is a browser-based Foundry VTT module**

- ❌ **NEVER use `require()`** - causes "require is not defined" errors
- ✅ **ALWAYS use ES6 imports** - `import { foo } from './bar'`
- ✅ **Use dynamic imports** if needed - `await import('./module')`

**Common Mistake:**
```typescript
// ❌ WRONG - Browser doesn't have require()
const { calculateProduction } = require('../services/economics/production');

// ✅ CORRECT - Use ES6 import at top of file
import { calculateProduction } from '../services/economics/production';

// ✅ CORRECT - Or dynamic import if needed inside function
const { calculateProduction } = await import('../services/economics/production');
```

**Why this matters:** Foundry VTT modules run in the browser, not Node.js. The browser doesn't have a `require()` function. Always use ES6 module syntax.

---

**Remember:** If you're touching UI, it goes in Svelte. If you're implementing game logic, it goes in controllers/services.
