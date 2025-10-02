## Core Architecture Principles

### 1. Single Source of Truth
- **KingdomActor** = ONLY persistent data source
- All writes go through KingdomActor methods
- Stores are derived/reactive, never written to directly

### 2. Clean Separation of Concerns
- **Svelte components** = Presentation only (UI, user interaction, display logic)
- **Controllers** = Business logic only (phase operations, game rules, calculations)
- **Services** = Complex operations (utilities, integrations, reusable logic)
- **NO business logic in Svelte files** - components delegate to controllers/services

### 3. Data Flow Pattern
```
Read:  KingdomActor → KingdomStore → Component Display
Write: Component Action → Controller → TurnManager → KingdomActor → Foundry → All Clients
```

### 4. Phase Management Pattern
- **TurnManager** = Central coordinator (turn/phase progression + step management)
- **Phase Components** = Mount when active, call `controller.startPhase()` 
- **Phase Controllers** = Execute phase business logic, mark completion
- **NO triggering from TurnManager** - phases are self-executing when mounted

```
Phase Flow: TurnManager.nextPhase() → Update currentPhase → 
           Component Mounts → controller.startPhase() → Execute Logic
```

### 5. Modular TurnManager Architecture
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
- ✅ Return `{ success: boolean, error?: string }` from controllers
- ✅ Use clear console logging with emoji indicators
- ✅ Name phase methods `startPhase()` not `runAutomation()`
- ✅ Let phases self-execute on mount, not triggered by TurnManager
- ✅ Keep TurnManager simple - only progression, no orchestration

### DON'T:
- ❌ Put business logic in Svelte components
- ❌ Write to derived stores directly
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
├── actors/                  # KingdomActor (single source of truth)
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

**Remember:** If you're touching UI, it goes in Svelte. If you're implementing game logic, it goes in controllers/services.
