# PF2e Reignmaker - Architecture Guide

**Last Updated:** 2025-12-10

---

## Overview

PF2e Reignmaker is a Foundry VTT module implementing kingdom management mechanics for Pathfinder 2e. The architecture follows **three core principles**:

1. **Single Source of Truth** - KingdomActor stores all persistent data
2. **Reactive Bridge Pattern** - Svelte stores provide read-only UI access
3. **Clear Separation of Concerns** - Components (UI), Controllers (logic), Services (utilities)

---

## Quick Start for Developers

### Data Flow Pattern

```
Read:  KingdomActor → Reactive Store → Component Display
Write: Component → Controller → KingdomActor → Foundry → All Clients
```

### Key Concepts

**KingdomActor** = Single source of truth (all writes go here)  
**Reactive Stores** = Read-only bridge for UI (derived from KingdomActor)  
**Controllers** = Business logic (phase execution, game rules)  
**Services** = Reusable utilities (complex operations)  
**Components** = Presentation only (no business logic)

### Common Operations

**Read Kingdom Data:**
```typescript
import { kingdomData, resources, fame } from '../stores/KingdomStore'

// Reactive access in Svelte
$: currentGold = $resources.gold
$: currentPhase = $kingdomData.currentPhase
```

**Modify Kingdom Data:**
```typescript
import { updateKingdom, modifyResource } from '../stores/KingdomStore'

// Simple resource updates
await modifyResource('gold', -50)  // Spend 50 gold

// Complex updates
await updateKingdom(kingdom => {
  kingdom.resources.gold -= 50
  kingdom.fame += 1
  kingdom.unrest = Math.max(0, kingdom.unrest - 1)
})
```

**Execute Player Action:**
```typescript
import { pipelineRegistry } from '../pipelines/PipelineRegistry'
import { pipelineCoordinator } from '../services/PipelineCoordinator'

const action = pipelineRegistry.getPipeline('claim-hexes')
if (action) {
  await pipelineCoordinator.executePipeline('claim-hexes', {
    actor: { selectedSkill: 'leadership', fullActor: someActor }
  })
}
```

---

## Core Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Foundry VTT Integration                     │
├─────────────────────────────────────────────────────────────────┤
│                     View Layer (Svelte)                        │
│                 ↕ (Reactive Subscriptions)                     │
├─────────────────────────────────────────────────────────────────┤
│                 Reactive Store Bridge Layer                    │
│    kingdomData, resources, fame, etc. (READ-ONLY)             │
│                 ↕ (Derived from KingdomActor)                  │
├─────────────────────────────────────────────────────────────────┤
│                    KingdomActor (Single Source of Truth)       │
│                      ↕ (All writes go here)                    │
├─────────────────────────────────────────────────────────────────┤
│                    Foundry VTT Persistence                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Design Patterns

### 1. Single Source of Truth

**KingdomActor** is the ONLY persistent data source. All state writes go through KingdomActor methods.

**Key Methods:**
```typescript
getKingdom(): KingdomData | null
updateKingdom(updater: (kingdom: KingdomData) => void): Promise<void>
modifyResource(resource: string, amount: number): Promise<void>
```

**Principle:** Never write to stores directly - they're derived from KingdomActor.

---

### 2. Reactive Bridge Pattern

**Reactive stores** provide UI access without tight coupling to Foundry actors.

**Available Stores:**
```typescript
export const kingdomData = derived(kingdomActor, $actor => $actor?.getKingdom())
export const currentTurn = derived(kingdomData, $data => $data.currentTurn)
export const resources = derived(kingdomData, $data => $data.resources)
export const fame = derived(kingdomData, $data => $data.fame)
```

**Write Functions** (delegate to KingdomActor):
```typescript
export async function updateKingdom(updater: (kingdom: KingdomData) => void)
export async function setResource(resource: string, amount: number)
export async function modifyResource(resource: string, amount: number)
```

**Principle:** Components read from stores, write through helper functions.

---

### 3. Separation of Concerns

**Components** (`*.svelte`) - Presentation only
- Display data from reactive stores
- Handle user interactions
- Delegate all logic to controllers/services
- NO business logic

**Controllers** (`src/controllers/`) - Business logic
- Phase execution (6 phase controllers)
- Game rule enforcement
- State modification via KingdomActor
- Return `{ success: boolean, error?: string }`

**Services** (`src/services/`) - Reusable utilities
- Complex operations (territory sync, modifiers)
- PF2e system integration
- Domain-specific logic

**Principle:** Keep concerns isolated for maintainability.

---

### 4. Phase Self-Execution Pattern

**Architecture:**
```
Component Mounts → Calls controller.startPhase() → Controller Executes
```

**TurnManager Role:** Progression only (nextPhase, endTurn)  
**Controller Role:** Execution (phase business logic)

**Phase Guard System:**

Every controller MUST include a guard to prevent:
- Cross-phase contamination
- Component state loss
- Stale step persistence

```typescript
async startPhase() {
  // REQUIRED: Phase guard
  const guardResult = checkPhaseGuard(TurnPhase.MY_PHASE, 'MyController')
  if (guardResult) return guardResult
  
  // Safe to initialize
  await initializePhaseSteps(steps)
  // Execute phase logic...
}
```

**Principle:** Phases are self-contained, TurnManager only coordinates.

**See:** [`docs/core-systems/phases/`](./core-systems/phases/) for complete phase system documentation

---

### 5. TypeScript Pipeline Architecture

All actions, events, and incidents are **self-contained TypeScript pipelines**.

**Structure:**
```typescript
export const myActionPipeline: CheckPipeline = {
  id: 'my-action',
  name: 'My Action',
  checkType: 'action',
  skills: [{ skill: 'survival', description: '...' }],
  outcomes: {
    success: {
      description: '...',
      modifiers: [{ resource: 'gold', value: -5 }],
      gameCommands: [{ type: 'claimHexes', count: 1 }]
    }
  },
  requirements: () => ({ met: true }),
  getDC: () => 15
}
```

**Registry Access:**
```typescript
import { pipelineRegistry } from '../pipelines/PipelineRegistry'

const action = pipelineRegistry.getPipeline('claim-hexes')
const allActions = pipelineRegistry.getPipelinesByType('action')
```

**Benefits:**
- Single source of truth (no JSON sync issues)
- Full TypeScript type safety
- Runtime registry access
- Self-contained definitions

**See:** [`docs/core-systems/pipeline/`](./core-systems/pipeline/) for complete pipeline documentation

---

### 6. Execute-First Pattern (Resource Modifiers)

**Pattern:** Modifiers applied BEFORE custom `execute()` functions run.

**Benefits:**
- Fame bonus automatic (+1 on critical success)
- Shortfall detection automatic (+1 unrest per missing resource)
- Simple pipelines need no `execute()` function
- Custom logic only in `execute()`

**Implementation:**
```typescript
// Simple pipeline - no execute needed
export const simplePipeline: CheckPipeline = {
  // ... base fields
  outcomes: {
    success: {
      modifiers: [{ resource: 'gold', value: -5 }]
    }
  }
  // Modifiers applied automatically!
}

// Complex pipeline - custom logic only
export const complexPipeline: CheckPipeline = {
  // ... base fields
  execute: async (ctx) => {
    // Modifiers already applied
    // Only implement custom game logic here
    await someCustomLogic(ctx)
  }
}
```

**See:** [`docs/core-systems/pipeline/pipeline-patterns.md`](./core-systems/pipeline/pipeline-patterns.md) for implementation patterns

---

### 7. Unified Ownership Pattern

**Pattern:** String-based ownership for settlements and hexes.

```typescript
export const PLAYER_KINGDOM = "player"
export type OwnershipValue = string | null

// Usage
if (hex.claimedBy === PLAYER_KINGDOM) { /* player owns */ }
if (settlement.owned === "Pitax") { /* faction owns */ }
if (hex.claimedBy === null) { /* unowned */ }
```

**Benefits:**
- Consistent across settlements and hexes
- Self-documenting (`"player"` vs `1` or `true`)
- Type-safe (single constant prevents typos)
- Extensible (easy to add factions)

---

## Key Systems

### Turn & Phase System

**6 Phases per turn:**
1. STATUS - Apply modifiers, check kingdom state
2. RESOURCES - Collect from worksites
3. EVENTS - Resolve kingdom events
4. UNREST - Check for incidents
5. ACTIONS - Execute player actions
6. UPKEEP - End-of-turn cleanup

**Turn Lifecycle:**
```
TurnManager.endTurn()
  ├─→ endOfTurnCleanup() [private]
  │     ├─→ Resource decay (lumber, stone, ore → 0)
  │     ├─→ Fame expires (unused fame lost)
  │     └─→ Vote cleanup
  │
  └─→ initializeTurn() [private]
        ├─→ Increment currentTurn
        ├─→ Reset to STATUS phase
        ├─→ Reset turnState (fresh)
        ├─→ Initialize fame = 1
```

**See:** [`docs/core-systems/phases/turn-and-phase-system.md`](./core-systems/phases/turn-and-phase-system.md)

---

### Pipeline System

**9-Step Execution:**
1. Requirements Check
2. Pre-Roll Interactions
3. Execute Roll
4. Display Outcome
5. Outcome Interactions
6. Wait For Apply
7. Post-Apply Interactions
8. Execute Action
9. Cleanup

**Coordinator:** `PipelineCoordinator` orchestrates all steps  
**Registry:** `PipelineRegistry` provides runtime access

**See:** [`docs/core-systems/pipeline/pipeline-coordinator.md`](./core-systems/pipeline/pipeline-coordinator.md)

---

### Modifier System

**Storage:** `kingdom.activeModifiers: ActiveModifier[]`  
**Service:** `ModifierService` handles lifecycle  
**Application:** StatusPhaseController applies each turn

**Structure:**
```typescript
interface ActiveModifier {
  id: string
  name: string
  sourceType: 'event' | 'incident' | 'structure'
  startTurn: number
  modifiers: EventModifier[]
}
```

---

## File Organization

```
src/
├── actors/KingdomActor.ts           # Single source of truth
├── stores/KingdomStore.ts           # Reactive bridge
├── models/turn-manager/             # Turn coordination
│   └── TurnManager.ts
├── controllers/                     # Phase controllers
│   ├── StatusPhaseController.ts
│   ├── EventPhaseController.ts
│   ├── UnrestPhaseController.ts
│   ├── ResourcePhaseController.ts
│   ├── ActionPhaseController.ts
│   └── UpkeepPhaseController.ts
├── pipelines/                       # Self-contained pipelines
│   ├── PipelineRegistry.ts          # Central registry
│   ├── actions/                     # 29 action pipelines
│   ├── events/                      # Event pipelines
│   └── incidents/                   # Incident pipelines
├── services/                        # Reusable utilities
│   ├── PipelineCoordinator.ts       # 9-step execution
│   └── domain/                      # Domain services
└── view/                            # Svelte components
    └── kingdom/
        ├── turnPhases/              # Phase UI
        └── components/              # Reusable UI
```

---

## Detailed Documentation

### Core Systems
- **Turn & Phase System** → [`docs/core-systems/phases/`](./core-systems/phases/)
- **Pipeline Architecture** → [`docs/core-systems/pipeline/`](./core-systems/pipeline/)
- **Services** → [`docs/core-systems/services/`](./core-systems/services/)

### Reference
- **API Reference** → [`docs/API_REFERENCE.md`](./API_REFERENCE.md)
- **Build System** → [`docs/BUILD_SYSTEM.md`](./BUILD_SYSTEM.md)

### Guides
- **Testing Guide** → [`docs/guides/testing-guide.md`](./guides/testing-guide.md)
- **Debugging Guide** → [`docs/guides/debugging-guide.md`](./guides/debugging-guide.md)

---

## Design Principles Summary

1. **Single Source of Truth** - KingdomActor is the only persistent data source
2. **Reactive Bridge** - Stores provide reactive access, not storage
3. **Separation of Concerns** - Components (UI), Controllers (logic), Services (utilities)
4. **Phase Self-Execution** - Components trigger controllers, TurnManager only coordinates
5. **TypeScript Pipelines** - Self-contained, type-safe, single source of truth
6. **Execute-First Pattern** - Modifiers applied before custom logic
7. **Direct Simplicity** - Clear function calls, minimal abstractions, maximum clarity

---

This architecture provides a **clean, maintainable system** that leverages Foundry's strengths while keeping the code **simple and understandable**.

**For complete API details, see:** [`API_REFERENCE.md`](./API_REFERENCE.md)
