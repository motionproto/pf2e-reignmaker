## Core Architecture Principles

### 1. Single Source of Truth
- **Party Actor Flags** = ONLY persistent data source
- Kingdom data stored at: `actor.getFlag('pf2e-reignmaker', 'kingdom-data')`
- All writes go through wrapped actor methods (see Kingdom Actor Wrapper below)
- Stores are derived/reactive, never written to directly

### 2. Kingmaker Integration (IMPORT ONLY)

**⚠️ CRITICAL: Kingmaker module is ONLY used for INITIAL IMPORT ⚠️**

**DO NOT use Kingmaker for regular gameplay operations!**

**Correct Usage:**
```typescript
// ✅ ONLY during initial setup
await territoryService.syncFromKingmaker();  // Import hex data ONCE

// ✅ All gameplay operations - update Kingdom Store directly
await updateKingdom(kingdom => {
  const hex = kingdom.hexes.find(h => h.id === hexId);
  if (hex) {
    hex.claimedBy = PLAYER_KINGDOM;  // PLAYER_KINGDOM = "player" constant
  }
});
```

**WRONG Usage (Common Mistake):**
```typescript
// ❌ NEVER do this during gameplay
await markHexesInKingmaker(hexIds);        // Write to Kingmaker
await territoryService.syncFromKingmaker(); // Read from Kingmaker
// This creates a circular dependency and breaks reactivity!
```

**Data Flow Rules:**
```
Initial Setup (ONE TIME ONLY):
  Kingmaker → syncFromKingmaker() → Kingdom Store

Regular Gameplay (ALWAYS):
  User Action → updateKingdom() → Kingdom Store → Reactive Overlays

NEVER:
  User Action → Kingmaker → sync → Kingdom Store ❌
```

**Why This Matters:**
- Kingdom Store is the source of truth for gameplay
- Reactive overlays subscribe to Kingdom Store, not Kingmaker
- Writing to Kingmaker creates sync issues and delays
- Kingmaker is a separate module with its own state management
- We only read from Kingmaker during initial setup to import map data

### 3. Kingdom Actor Wrapper Pattern
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
import { PLAYER_KINGDOM } from '../types/ownership';  // PLAYER_KINGDOM = "player"

export const claimedHexes = derived(kingdomData, $data => 
  $data.hexes.filter(h => h.claimedBy === PLAYER_KINGDOM)
);

export const claimedSettlements = derived(kingdomData, $data =>
  $data.settlements.filter(s => {
    if (s.location.x === 0 && s.location.y === 0) return false;
    const hexId = /* calculate hex ID */;
    const hex = $data.hexes?.find(h => h.id === hexId);
    return hex && hex.claimedBy === PLAYER_KINGDOM;
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
const claimed = kingdom.hexes.filter(h => h.claimedBy === PLAYER_KINGDOM);
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

### 8. Pipeline Architecture (9-Step Pattern for Actions)

**⚠️ CRITICAL: Actions use PipelineCoordinator, NOT archived controllers**

All player actions follow a standardized 9-step pipeline orchestrated by `PipelineCoordinator`:

```
Step 1: Requirements Check      (OPTIONAL - if pipeline.requirements defined)
Step 2: Pre-Roll Interactions   (OPTIONAL - if pipeline.preRollInteractions defined)
Step 3: Execute Roll            (ALWAYS - PF2e skill check with callback)
Step 4: Display Outcome         (ALWAYS - create outcome preview for UI)
Step 5: Outcome Interactions    (OPTIONAL - user interactions with outcome display)
Step 6: Wait For Apply          (ALWAYS - pause until "Apply Result" clicked)
Step 7: Post-Apply Interactions (OPTIONAL - if pipeline.postApplyInteractions defined)
Step 8: Execute Action          (ALWAYS - apply state changes)
Step 9: Cleanup                 (ALWAYS - track action + delete instance)
```

**Pipeline Definition Location:**
- Actions defined in: `src/pipelines/actions/*.ts`
- Registered in: `src/pipelines/PipelineRegistry.ts`
- Coordinator: `src/services/PipelineCoordinator.ts`

**Step Responsibilities (Separation of Concerns):**

**Step 4** - Create instance ONLY:
```typescript
// OutcomePreviewService.createActionOutcomePreview()
// - Create instance via createInstance()
// - Store outcome with BASIC data (no preview calculation)
// - Return instance ID
// ❌ Does NOT calculate preview (Step 5's job)
// ❌ Does NOT extract custom components (Step 7's job)
// ❌ Does NOT process game commands (Step 8's job)
```

**Step 5** - Calculate preview ONLY:
```typescript
// UnifiedCheckHandler.calculatePreview()
// - Build check context from pipeline + metadata
// - Calculate what will happen (resource changes, entity operations)
// - Format preview to special effects
// - Update instance with formatted preview for UI display
// ❌ Does NOT execute changes (Step 8's job)
```

**Step 6** - Wait for user:
```typescript
// Promise-based pause/resume pattern
// - Store context in pendingContexts map
// - Return promise that resolves when confirmApply() called
// - OutcomeDisplay shows preview, user clicks "Apply Result"
```

**Step 7** - Post-apply interactions ONLY:
```typescript
// UnifiedCheckHandler.executePostApplyInteractions()
// - Show custom components (if defined in pipeline)
// - Collect user input after confirmation
// - Return resolution data for Step 8
```

**Step 8** - Execute action ONLY:
```typescript
// UnifiedCheckHandler.executeCheck()
// - Apply resource changes
// - Execute game commands
// - Create/modify entities
// - Update kingdom state
```

**Clean Pipeline Example:**
```typescript
// src/pipelines/actions/example.ts
export const examplePipeline: CheckPipeline = {
  id: 'example-action',
  name: 'Example Action',
  
  // Step 1 (optional)
  requirements: (kingdom) => ({
    met: kingdom.resources.gold >= 10,
    reason: 'Need 10 gold'
  }),
  
  // Step 2 (optional)
  preRollInteractions: [
    {
      id: 'settlement',
      type: 'entity-selection',
      entityType: 'settlement',
      required: true
    }
  ],
  
  // Step 3 (always runs)
  skills: [
    { skill: 'politics', description: 'convince the council' }
  ],
  
  // Step 5 (optional)
  preview: {
    calculate: async (ctx) => ({
      resources: [/* resource changes */],
      specialEffects: [/* preview badges */]
    })
  },
  
  // Step 7 (optional)
  postApplyInteractions: [
    {
      id: 'bonus-type',
      type: 'configuration',
      component: CustomBonusSelector
    }
  ],
  
  // Step 8 (always runs)
  execute: async (ctx) => {
    // Apply state changes
    await updateKingdom(kingdom => {
      kingdom.resources.gold -= 10;
    });
    return { success: true };
  }
};
```

**Key Architectural Benefits:**
- ✅ **Separation of Concerns** - Each step has ONE job
- ✅ **No Circular Dependencies** - Steps don't call each other
- ✅ **Testable** - Each step can be tested independently
- ✅ **Reusable** - UnifiedCheckHandler shared across all actions
- ✅ **Clean Interfaces** - Simple, focused service methods

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
│   ├── actions/             # Action infrastructure (HOW to run actions)
│   ├── events/              # Event types & providers
│   ├── incidents/           # Incident types & providers
│   └── shared/              # Shared controller utilities
├── pipelines/               # Pipeline definitions (game content)
│   ├── actions/             # Action definitions (WHAT each action does)
│   ├── events/              # Event pipelines
│   ├── incidents/           # Incident pipelines
│   └── shared/              # Shared pipeline utilities
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

**Key Separation:**
- `controllers/actions/` = Infrastructure (HOW to run actions) - see README
- `pipelines/actions/` = Definitions (WHAT each action does) - see README
- Think: JavaScript engine vs JavaScript code

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
