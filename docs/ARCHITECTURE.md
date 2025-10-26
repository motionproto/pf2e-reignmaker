# PF2e Reignmaker - Architecture Guide

**Last Updated:** October 3, 2025

## Overview

PF2e Reignmaker is a Foundry VTT module implementing kingdom management mechanics for Pathfinder 2e. The architecture uses **KingdomActor as the single source of truth** with **reactive Svelte stores as read-only bridges** for UI components. The system features a **dual-effect player action system** with structured game effects and resource modifiers for complete type safety.

## Quick Start for Developers & AI Programmers

### Core Concepts

1. **Single Source of Truth**: All kingdom data lives in `KingdomActor`. Never write to stores directly.
2. **Reactive Bridge**: Svelte stores provide reactive access to KingdomActor data (read-only).
3. **Separation of Concerns**: Components = UI only. Controllers = Business logic. Services = Complex utilities.
4. **Self-Executing Phases**: Phase components auto-start their controllers on mount. TurnManager only handles progression.
5. **Dual-Effect Actions**: Player actions use structured `modifiers` (resources) + `gameEffects` (gameplay mechanics).

### Data Flow
```
Read:  KingdomActor → Reactive Store → Component Display
Write: Component → Controller → KingdomActor → Foundry → All Clients
```

### Key Files to Know

**Data Layer:**
- `src/actors/KingdomActor.ts` - Single source of truth (ALL writes go here)
- `src/stores/KingdomStore.ts` - Reactive bridge (read-only stores + write helpers)

**Turn/Phase System:**
- `src/models/turn-manager/TurnManager.ts` - Turn/phase progression coordinator
- `src/controllers/*PhaseController.ts` - Phase business logic (6 phase controllers)
- `src/controllers/shared/PhaseControllerHelpers.ts` - Shared phase utilities

**Player Actions:**
- `src/controllers/actions/action-types.ts` - Action interfaces
- `src/controllers/actions/game-commands.ts` - 25+ typed game command definitions
- `src/controllers/actions/action-loader.ts` - Load/query actions from JSON
- `src/controllers/actions/action-execution.ts` - Execute actions, apply effects
- `data/player-actions/*.json` - 29 action definitions (structured effects)

**UI Layer:**
- `src/view/kingdom/turnPhases/*.svelte` - Phase UI components (presentation only)

### Common Tasks

**Read Kingdom Data:**
```typescript
import { kingdomData, resources, fame } from '../stores/KingdomStore'
$: currentGold = $resources.gold  // Reactive in Svelte
```

**Modify Kingdom Data:**
```typescript
import { updateKingdom, modifyResource } from '../stores/KingdomStore'
await modifyResource('gold', -50)  // Spend 50 gold
await updateKingdom(k => k.unrest = Math.max(0, k.unrest - 1))
```

**Execute Player Action:**
```typescript
import { actionLoader } from '../controllers/actions/action-loader'
import { actionExecutionService } from '../controllers/actions/action-execution'

const action = actionLoader.getActionById('claim-hexes')
const result = actionExecutionService.executeAction(action, 'success', kingdom)
```

**Create Phase Controller:**
```typescript
export async function createPhaseController() {
  return {
    async startPhase() {
      await initializePhaseSteps([{ name: 'step-1' }])
      // Do phase work...
      await completePhaseStepByIndex(0)
      return createPhaseResult(true)
    }
  }
}
```

## Core Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Foundry VTT Integration                     │
├─────────────────────────────────────────────────────────────────┤
│                     View Layer (Svelte)                        │
│                 ↕ (Reactive Subscriptions)                     │
├─────────────────────────────────────────────────────────────────┤
│                 Reactive Store Bridge Layer                    │
│    kingdomData, currentTurn, resources, etc. (READ-ONLY)       │
│                 ↕ (Derived from KingdomActor)                  │
├─────────────────────────────────────────────────────────────────┤
│                    KingdomActor (Single Source of Truth)       │
│                      ↕ (All writes go here)                    │
├─────────────────────────────────────────────────────────────────┤
│                    Foundry VTT Persistence                     │
└─────────────────────────────────────────────────────────────────┘
```

## Ownership System (Unified String-Based Pattern)

### Overview

The ownership system uses a **unified string-based pattern** for both settlements and hexes, replacing the previous mixed boolean/number system with a clear, extensible approach.

### Core Design

**Location:** `src/types/ownership.ts`

```typescript
// Single constant for player kingdom
export const PLAYER_KINGDOM = "player";

// Unified type for all ownership
export type OwnershipValue = string | null;
```

### Usage Across Models

**Settlements:**
```typescript
interface Settlement {
  owned: OwnershipValue;  // "player" | "FactionName" | null
  // ...
}
```

**Hexes:**
```typescript
interface Hex {
  claimedBy: OwnershipValue;  // "player" | "FactionName" | null
  // ...
}
```

### Ownership Values

| Value | Meaning | Example |
|-------|---------|---------|
| `PLAYER_KINGDOM` (`"player"`) | Owned by player kingdom | Player's capital |
| String (other) | Owned by named faction | `"Pitax"`, `"Brevoy"` |
| `null` | Unowned/wilderness | Unclaimed territory |

### Common Patterns

**Check Player Ownership:**
```typescript
import { PLAYER_KINGDOM } from '../types/ownership';

if (hex.claimedBy === PLAYER_KINGDOM) {
  // Player owns this hex
}

if (settlement.owned === PLAYER_KINGDOM) {
  // Player owns this settlement
}
```

**Check Faction Ownership:**
```typescript
if (hex.claimedBy === "Pitax") {
  // Pitax controls this hex
}
```

**Check Unowned:**
```typescript
if (settlement.owned === null) {
  // Unowned settlement
}
```

**Store Filters (Derived Stores):**
```typescript
// In KingdomStore.ts
export const ownedSettlements = derived(kingdomData, $data => {
  return $data.settlements.filter(s => s.owned === PLAYER_KINGDOM);
});

export const claimedHexes = derived(kingdomData, $data => {
  return $data.hexes.filter(h => h.claimedBy === PLAYER_KINGDOM);
});
```

### Benefits of This Approach

1. **Consistent** - Same pattern for settlements and hexes
2. **Self-documenting** - `"player"` is clearer than `1` or `true`
3. **Type-safe** - Single constant prevents typos
4. **Extensible** - Easy to add new factions without code changes
5. **Idiomatic** - Uses TypeScript's native `null` for "unowned" state

### Kingmaker Integration

The territory service converts Kingmaker's ownership format during import:

```typescript
// In TerritoryService.syncFromKingmaker()
const claimedBy = hexState.claimed ? PLAYER_KINGDOM : null;
```

### Migration Notes

**Removed:**
- Helper functions (`isPlayerOwned()`, `isFactionOwned()`, etc.)
- Mixed ownership types (boolean/number/string)
- Complex ownership checks

**Replaced With:**
- Direct property comparison
- Unified `OwnershipValue` type
- Single `PLAYER_KINGDOM` constant

## Key Components

### 1. KingdomActor (`src/actors/KingdomActor.ts`)
**Role:** Single source of truth for all kingdom data

**Key Methods:**
```typescript
// Data access
getKingdom(): KingdomData | null

// Data mutations (ALL writes go here)
updateKingdom(updater: (kingdom: KingdomData) => void): Promise<void>
modifyResource(resource: string, amount: number): Promise<void>
setResource(resource: string, amount: number): Promise<void>
markPhaseStepCompleted(stepId: string): Promise<void>
addSettlement(settlement: Settlement): Promise<void>

// Resource management
resources: {
  gold: number,
  food: number,
  lumber: number,
  stone: number,
  ore: number
}
```

### 2. Reactive Store Bridge (`src/stores/KingdomStore.ts`)
**Role:** Read-only reactive bridge between KingdomActor and UI

**Available Stores:**
```typescript
// Core stores
export const kingdomActor = writable<KingdomActor | null>(null);
export const kingdomData = derived(kingdomActor, $actor => $actor?.getKingdom());

// Convenience derived stores (all READ-ONLY)
export const currentTurn = derived(kingdomData, $data => $data.currentTurn);
export const currentPhase = derived(kingdomData, $data => $data.currentPhase);
export const resources = derived(kingdomData, $data => $data.resources);
export const fame = derived(kingdomData, $data => $data.fame);
export const unrest = derived(kingdomData, $data => $data.unrest);
```

**Write Functions (delegate to KingdomActor):**
```typescript
export async function updateKingdom(updater: (kingdom: KingdomData) => void)
export async function setResource(resource: string, amount: number)
export async function modifyResource(resource: string, amount: number)
```

### 3. TurnManager (`src/models/turn-manager/`)
**Role:** Central coordinator for turn/phase progression and player action tracking

**Structure:**
```
src/models/turn-manager/
├── index.ts          # Clean module exports
├── TurnManager.ts    # Main coordinator (turn/phase progression, player actions)
└── phase-handler.ts  # Step management utilities (imported by TurnManager)
```

**TurnManager Responsibilities:**
- Turn and phase progression only
- Player action state tracking (turn-scoped, in-memory)
- Phase step delegation to PhaseHandler
- Utility functions for game mechanics

**Key Methods:**
```typescript
// Turn and phase progression
async nextPhase(): Promise<void>
async endTurn(): Promise<void>
async setCurrentPhase(phase: TurnPhase): Promise<void>
async skipToPhase(phase: TurnPhase): Promise<void>
async getCurrentPhase(): Promise<string>

// Phase step management (delegates to PhaseHandler)
async initializePhaseSteps(steps: Array<{ name: string }>): Promise<void>
async completePhaseStepByIndex(stepIndex: number): Promise<{ phaseComplete: boolean }>
async isStepCompletedByIndex(stepIndex: number): Promise<boolean>
async isCurrentPhaseComplete(): Promise<boolean>
async resetPhaseSteps(): Promise<void>

// Player action management (turn-scoped state)
spendPlayerAction(playerId: string, phase: TurnPhase): boolean
resetPlayerAction(playerId: string): void
getPlayerAction(playerId: string): PlayerAction | undefined

// Utility functions
async canPerformAction(actionId: string): Promise<boolean>
async markActionUsed(actionId: string): Promise<void>
async getUnrestPenalty(): Promise<number>
async spendFameForReroll(): Promise<boolean>
async getTurnSummary(): Promise<string>
```

**PhaseHandler Utilities:**
```typescript
// Step initialization and completion logic (imported by TurnManager)
static async initializePhaseSteps(steps: Array<{ name: string }>): Promise<void>
static async completePhaseStepByIndex(stepIndex: number): Promise<StepCompletionResult>
static async isStepCompletedByIndex(stepIndex: number): Promise<boolean>
static async isCurrentPhaseComplete(): Promise<boolean>
```

**Important Architectural Principle:** 
- TurnManager does NOT trigger or orchestrate phase controllers
- Phases are self-executing when their component mounts
- TurnManager only handles progression, not execution

### 4. Phase Controllers (`src/controllers/*PhaseController.ts`)
**Role:** Execute phase-specific business logic (self-contained)

**Available Controllers:**
- `StatusPhaseController.ts` - Apply ongoing modifiers, check kingdom status
- `EventPhaseController.ts` - Resolve kingdom events
- `UnrestPhaseController.ts` - Handle incidents and unrest effects
- `ResourcePhaseController.ts` - Collect resources from worksites
- `ActionPhaseController.ts` - Execute player actions
- `UpkeepPhaseController.ts` - End-of-turn cleanup

**Phase Guard System:**

All phase controllers MUST include a phase guard at the start of `startPhase()` to prevent:
- Cross-phase contamination (wrong-phase controllers running)
- Component state loss (mid-phase re-initialization)
- Stale step persistence (incorrect steps from other phases)

```typescript
export async function createPhaseController() {
  return {
    async startPhase() {
      reportPhaseStart('PhaseControllerName')
      
      try {
        // ✅ REQUIRED: Phase guard prevents inappropriate initialization
        const guardResult = checkPhaseGuard(TurnPhase.MY_PHASE, 'PhaseControllerName')
        if (guardResult) return guardResult
        
        // Safe to initialize - we're in the correct phase
        await initializePhaseSteps(steps)
        
        // Execute phase logic
        await this.doPhaseWork()
        
        // Complete steps as work progresses
        await completePhaseStepByIndex(0)
        await completePhaseStepByIndex(1)
        
        reportPhaseComplete('PhaseControllerName')
        return createPhaseResult(true)
      } catch (error) {
        reportPhaseError('PhaseControllerName', error)
        return createPhaseResult(false, error.message)
      }
    }
  }
}
```

**How the Phase Guard Works:**

The guard performs four checks:
1. **No steps exist** → Allow initialization (fresh phase entry)
2. **Wrong phase** → Block initialization (prevents EventPhase from running during Unrest)
3. **Mid-phase with progress** → Block re-initialization (preserves rolled dice, selections)
4. **Correct phase, no progress** → Allow initialization (fixes stale steps)

**Why This Matters:**

Without the guard, component re-mounts (from navigation or reactive updates) could cause:
- Wrong-phase controllers to overwrite correct phase steps
- Loss of user progress (rolled dice values, selected choices)
- Phase completion buttons becoming inactive

With the guard:
- Each phase's steps remain isolated and correct
- Component state persists across re-mounts
- Phases complete reliably without interference

**Shared Helper Functions:**
```typescript
// From src/controllers/shared/PhaseControllerHelpers.ts
reportPhaseStart(controllerName: string): void
reportPhaseComplete(controllerName: string): void
reportPhaseError(controllerName: string, error: Error): void
createPhaseResult(success: boolean, error?: string): PhaseResult
checkPhaseGuard(phaseName: TurnPhase, controllerName: string): PhaseResult | null  // ✅ REQUIRED
initializePhaseSteps(steps: Array<{ name: string }>): Promise<void>
completePhaseStepByIndex(stepIndex: number): Promise<StepCompletionResult>
isStepCompletedByIndex(stepIndex: number): Promise<boolean>
```

### 5. Player Action System (`src/controllers/actions/`)
**Role:** Structured action execution with type-safe effects

**Architecture:**
```
src/controllers/actions/
├── action-types.ts       # TypeScript interfaces for actions
├── game-commands.ts      # 25+ typed game command definitions
├── action-loader.ts      # Load and manage action definitions
└── action-execution.ts   # Execute actions and apply effects
```

**Action Structure:**
```typescript
interface PlayerAction {
  id: string
  name: string
  category: ActionCategory
  brief: string
  description: string
  skills: SkillOption[]
  effects: {
    criticalSuccess: ActionEffect
    success: ActionEffect
    failure: ActionEffect
    criticalFailure: ActionEffect
  }
  requirements?: string[]
  costs?: Record<string, number>
}

interface ActionEffect {
  description: string
  modifiers: ActionModifier[]      // Resource changes (gold, unrest, etc.)
  gameEffects: GameEffect[]        // Gameplay mechanics (claim hexes, build, etc.)
}
```

**Game Command Types (25+ commands):**
- **Territory:** `claimHexes`, `fortifyHex`, `buildRoads`
- **Construction:** `buildStructure`, `foundSettlement`, `upgradeSettlement`, `createWorksite`
- **Military:** `recruitArmy`, `trainArmy`, `deployArmy`, `recoverArmy`, `disbandArmy`
- **Diplomatic:** `establishDiplomaticRelations`, `requestEconomicAid`, `infiltration`
- **Support:** `aidBonus`, `grantReroll`, `hireAdventurers`
- **Unrest:** `arrestDissidents`, `executePrisoners`, `pardonPrisoners`

**ActionLoader Class:**
```typescript
// Load all actions from JSON
loadActions(): void

// Query actions
getActionById(actionId: string): PlayerAction | null
getActionsByCategory(category: string): PlayerAction[]
getAllActions(): PlayerAction[]

// Action utilities
canPerformWithSkill(action: PlayerAction, skill: string): boolean
getActionSkills(action: PlayerAction): SkillOption[]
getActionOutcome(action, outcome): ActionEffect
```

**ActionExecutionService:**
```typescript
// Validate and execute
checkActionRequirements(action, kingdomData): RequirementResult
parseActionOutcome(action, outcome): ParsedActionEffect
executeAction(action, outcome, kingdomData): ExecutionResult

// Utilities
getActionDC(characterLevel: number): number
getAvailableActions(kingdomData): PlayerAction[]
```

### 6. Phase Components (`src/view/kingdom/turnPhases/*.svelte`)
**Role:** Mount when active, auto-start phase execution

**Key Pattern:**
```svelte
<script>
import { onMount } from 'svelte'
import { kingdomData } from '../stores/KingdomStore'

onMount(async () => {
  if ($kingdomData.currentPhase === OUR_PHASE && !isCompleted) {
    const { createPhaseController } = await import('../controllers/PhaseController')
    const controller = await createPhaseController()
    await controller.startPhase()
  }
})
</script>
```

## Data Flow Pattern

### **Golden Rule: Read from Bridge, Write to Source**

#### Read Path (Reactive):
```
KingdomActor → kingdomData store → Component Display
```

#### Write Path (Actions):
```
Component Action → Controller → KingdomActor → Foundry → All Clients Update
```

#### Phase Execution Flow:
```
TurnManager.nextPhase() → Update currentPhase → 
Component Mounts → controller.startPhase() → Execute Logic
```

**Key Change:** TurnManager no longer triggers controllers. Phases are self-executing when mounted.

## Development Patterns

### 1. Component Implementation (Presentation Only)

```svelte
<script>
// ✅ READ from reactive bridge
import { kingdomData, fame, resources } from '../stores/KingdomStore';

// ✅ UI State only
let isProcessing = false;
let errorMessage = '';

// ✅ Reactive display logic
$: currentFame = $fame;
$: currentGold = $resources.gold;
$: canAffordFame = $resources.gold >= 100;

// ✅ UI calls controller - NO business logic here
async function buyFame() {
  if (isProcessing) return;
  
  isProcessing = true;
  errorMessage = '';
  
  try {
    // Delegate ALL business logic to controller
    const { createEconomyController } = await import('../controllers/EconomyController');
    const controller = await createEconomyController();
    
    const result = await controller.purchaseFame(100);
    
    if (!result.success) {
      errorMessage = result.error || 'Purchase failed';
    }
  } catch (error) {
    errorMessage = 'Error processing purchase';
    console.error('❌ [Component] Fame purchase failed:', error);
  } finally {
    isProcessing = false;
  }
}
</script>

<!-- ✅ Presentation only -->
<div class="fame-section">
  <p>Fame: {$fame}</p>
  <p>Gold: {$resources.gold}</p>
  
  {#if errorMessage}
    <div class="error">{errorMessage}</div>
  {/if}
  
  <button 
    on:click={buyFame} 
    disabled={isProcessing || !canAffordFame}
    class:processing={isProcessing}
  >
    {#if isProcessing}
      <i class="fas fa-spinner fa-spin"></i>
      Processing...
    {:else}
      Buy Fame (100 gold)
    {/if}
  </button>
</div>
```

### 2. Phase Implementation (Self-Executing Pattern)

**Controller:**
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
    },
    
    async notifyPhaseComplete() {
      const { turnManager } = await import('../stores/turn');
      const manager = get(turnManager);
      if (manager) {
        await manager.markCurrentPhaseComplete();
      }
    }
  };
}
```

**Component:**
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

### 3. View Layer Code Placement

**Decision Tree:**
```
Is this code for a Phase Component (turnPhases/)?
├─ YES → Use Phase Controller (src/controllers/[Phase]PhaseController.ts)
│
└─ NO → Is this a Reusable Component?
    ├─ UI helper (icons, colors, formatters)
    │   └─ src/view/kingdom/utils/presentation.ts
    │
    └─ Data transformation (filter, group, format)
        └─ src/view/kingdom/logic/[Component]Logic.ts
```

**Key Rules:**
- **Components** (`*.svelte`) - UI only, delegate all logic
- **Presentation Utils** - Stateless helpers (no data processing)
- **Logic Files** - Transform data for display (no state changes)
- **Controllers** - Game rules + state modification (phases only)

## Key Principles

### 1. Single Source of Truth
**KingdomActor** is the ONLY persistent data source. All state writes go through KingdomActor methods. Stores are reactive bridges, never written to directly.

### 2. Clear Separation of Concerns
- **Components** - UI only (presentation, user interaction)
- **Presentation Utils** - Stateless UI helpers (icons, colors)
- **Logic Files** - Data prep for display (filter, group, format)
- **Phase Controllers** - Game rules + state modification
- **Services** - Complex reusable operations

### 3. Phase Self-Execution
**TurnManager** only handles progression. Phase components mount and call `controller.startPhase()` automatically. NO triggering from TurnManager.

### 4. Reactive Bridge Pattern
Stores provide reactive access, not storage. Components read from stores, write to KingdomActor. UI auto-updates when KingdomActor changes.

### 5. Direct Simplicity
Direct function calls, clear emoji logging, minimal abstractions, maximum clarity.

## Event & Incident System

### Data Structure

All events and incidents use a standardized structure stored in `dist/events.json` and `dist/incidents.json`:

```typescript
interface KingdomEvent {
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

### Modifier System

**Storage Location:** `kingdom.activeModifiers: ActiveModifier[]` in KingdomActor

**ActiveModifier Structure:**
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

**ModifierService Pattern:**
```typescript
// Create service instance
const modifierService = await createModifierService();

// Create modifier from unresolved event
const modifier = modifierService.createFromUnresolvedEvent(event, currentTurn);

// Add to KingdomActor directly
await updateKingdom(kingdom => {
  if (!kingdom.activeModifiers) kingdom.activeModifiers = [];
  kingdom.activeModifiers.push(modifier);
});

// Apply during Status phase
await modifierService.applyOngoingModifiers();

// Clean up expired modifiers
await modifierService.cleanupExpiredModifiers();
```

**Integration Points:**
1. **EventPhaseController** - Creates modifiers for failed/ignored events
2. **UnrestPhaseController** - Creates modifiers for unresolved incidents
3. **StatusPhaseController** - Applies ongoing modifiers each turn
4. **ModifierService** - Handles creation, application, cleanup

**Key Features:**
- Direct array manipulation via `updateKingdom()`
- Turn-based or ongoing duration options
- Applied automatically during Status phase

## File Organization

```
src/
├── actors/                    # KingdomActor (single source of truth)
│   └── KingdomActor.ts        # All persistent kingdom data
├── models/                    # Data structures and game logic
│   ├── turn-manager/          # Turn/phase coordination
│   │   ├── TurnManager.ts     # Central coordinator
│   │   └── phase-handler.ts   # Step management utilities
│   ├── PlayerActions.ts       # Action data management
│   └── Modifiers.ts           # Modifier type definitions
├── stores/                    # Reactive bridge layer (read-only)
│   └── KingdomStore.ts        # Reactive stores + write functions
├── controllers/               # Phase execution and business logic
│   ├── StatusPhaseController.ts
│   ├── EventPhaseController.ts
│   ├── UnrestPhaseController.ts
│   ├── ResourcePhaseController.ts
│   ├── ActionPhaseController.ts
│   ├── UpkeepPhaseController.ts
│   ├── actions/               # Player action system
│   │   ├── action-types.ts    # TypeScript interfaces
│   │   ├── game-commands.ts   # Game command definitions
│   │   ├── action-loader.ts   # Action loading/querying
│   │   └── action-execution.ts # Action execution logic
│   ├── events/                # Event type providers
│   ├── incidents/             # Incident type providers
│   └── shared/                # Shared controller utilities
│       └── PhaseControllerHelpers.ts
├── services/                  # Complex operations and utilities
│   ├── domain/                # Domain-specific services
│   │   ├── events/            # Event management
│   │   └── incidents/         # Incident management
│   ├── pf2e/                  # PF2e system integration
│   └── ModifierService.ts     # Modifier lifecycle management
├── view/                      # Svelte UI components (presentation only)
│   └── kingdom/
│       ├── turnPhases/        # Phase-specific UI components
│       ├── components/        # Reusable UI components
│       ├── tabs/              # Tab view components
│       ├── utils/             # Presentation utilities (shared)
│       │   └── presentation.ts # Icons, colors, formatters (UI-only)
│       └── logic/             # Component-specific business logic
│           ├── OutcomeDisplayLogic.ts
│           ├── BuildStructureDialogLogic.ts
│           └── structureLogic.ts
├── types/                     # TypeScript type definitions
│   └── events.ts              # Event/incident types
└── utils/                     # Utility functions
```

**Data Files:**
```
data/
├── player-actions/            # 29 action JSON files (structured effects)
├── events/                    # Event definitions (resource modifiers)
└── incidents/                 # Incident definitions (resource modifiers)
```

## View Layer Code Examples

### Presentation Utilities (UI Helpers)
```typescript
// src/view/kingdom/utils/presentation.ts
export function getCategoryIcon(category: string): string {
  const icons = { 'Military & Training': 'fa-shield-alt' };
  return icons[category] || 'fa-building';
}

export function capitalizeSkills(skills: string[]): string[] {
  return skills.map(s => s.split(' ').map(w => 
    w.charAt(0).toUpperCase() + w.slice(1)
  ).join(' '));
}
```

### Component Logic (Data Transformation)
```typescript
// src/view/kingdom/logic/BuildStructureDialogLogic.ts
export function getSkillsForCategory(category: string, structures: Structure[]): string[] {
  return structures
    .filter(s => getCategoryDisplayName(s.category) === category)
    .flatMap(s => s.skills);
}

export function separateBuiltAndAvailable(
  structures: Structure[], 
  settlement: Settlement
): { built: Structure[], available: Structure[] } {
  return {
    built: structures.filter(s => settlement.structureIds.includes(s.id)),
    available: structures.filter(s => !settlement.structureIds.includes(s.id))
  };
}
```

### Phase Controllers (Game Rules)
```typescript
// src/controllers/ResourcePhaseController.ts
export async function createResourcePhaseController() {
  return {
    async collectResources() {
      // Game rule: collect resources from worksites
      await updateKingdom(k => {
        k.resources.gold += calculateIncome(k);
      });
    }
  };
}
```

**Usage Pattern:**
```svelte
<script>
// Import appropriate helpers
import { getCategoryIcon } from '../utils/presentation';
import { getSkillsForCategory } from '../logic/BuildStructureDialogLogic';
import { createPhaseController } from '../../../controllers/PhaseController'; // Phases only

// Use in component
$: icon = getCategoryIcon(category);
$: skills = getSkillsForCategory(category, structures);
</script>
```

## Common Operations

### Reading Data:
```typescript
import { kingdomData, fame, resources } from '../stores/KingdomStore'
import { get } from 'svelte/store'

// Reactive access in Svelte components
$: currentFame = $fame
$: goldAmount = $resources.gold
$: currentPhase = $kingdomData.currentPhase

// Direct access in controllers
const kingdom = get(kingdomData)
const currentGold = kingdom.resources.gold
```

### Writing Data:
```typescript
import { updateKingdom, setResource, modifyResource } from '../stores/KingdomStore'

// Simple resource updates
await setResource('gold', 100)        // Set absolute value
await modifyResource('gold', -50)     // Add/subtract value

// Complex update
await updateKingdom(kingdom => {
  kingdom.resources.gold -= 50
  kingdom.fame += 1
  kingdom.unrest = Math.max(0, kingdom.unrest - 1)
  
  // Add active modifiers
  if (!kingdom.activeModifiers) kingdom.activeModifiers = []
  kingdom.activeModifiers.push(newModifier)
})
```

### Phase Step Management:
```typescript
import { 
  initializePhaseSteps, 
  completePhaseStepByIndex,
  isStepCompletedByIndex 
} from '../controllers/shared/PhaseControllerHelpers'

// Initialize steps for a phase
const steps = [
  { name: 'collect-resources' },
  { name: 'apply-effects' }
]
await initializePhaseSteps(steps)

// Complete steps as work progresses
await completePhaseStepByIndex(0)

// Check step status
const isComplete = await isStepCompletedByIndex(0)
```

### Player Action Execution:
```typescript
import { actionLoader } from '../controllers/actions/action-loader'
import { actionExecutionService } from '../controllers/actions/action-execution'

// Load and query actions
const action = actionLoader.getActionById('claim-hexes')
const expandActions = actionLoader.getActionsByCategory('expand-borders')

// Check requirements
const requirements = actionExecutionService.checkActionRequirements(action, kingdom)
if (!requirements.met) {
  console.log(requirements.reason)
}

// Execute action
const result = actionExecutionService.executeAction(action, 'success', kingdom)

// Apply state changes
for (const [resource, value] of result.stateChanges) {
  await modifyResource(resource, value)
}
```

### Loading Actions from JSON:
```typescript
// Actions are automatically loaded at startup
// Located in: data/player-actions/*.json

// Example action structure:
{
  "id": "claim-hexes",
  "name": "Claim Hexes",
  "category": "expand-borders",
  "skills": [
    { "skill": "survival", "description": "wilderness expertise" }
  ],
  "effects": {
    "success": {
      "description": "Claim hexes based on proficiency",
      "modifiers": [],
      "gameEffects": [
        {
          "type": "claimHexes",
          "count": "proficiency-scaled",
          "scaling": { "trained": 1, "expert": 1, "master": 2, "legendary": 3 }
        }
      ]
    }
  }
}
```

## Hex Coordinate System

### Overview

The hex coordinate system uses **Foundry VTT's native grid offsets** as the single source of truth. All hex IDs are stored in **dot notation** format (`"i.j"`) which directly maps to Foundry's grid coordinates.

### Coordinate Formats

**Dot Notation (Our Format):**
```typescript
"2.19"  // i=2, j=19 - Foundry grid offset
"5.18"  // i=5, j=18
```

**Kingmaker Numeric (Legacy Format):**
```typescript
219   // (i * 100) + j = (2 * 100) + 19 = 219
518   // (i * 100) + j = (5 * 100) + 18 = 518
```

**Colon Notation (Hex Selector):**
```typescript
"2:19"  // Used internally by hex-selector service
```

### Coordinate Transformations

**Kingmaker → Reignmaker (Read):**
```typescript
// In TerritoryService.convertHexId()
numericId: 219 
  → row = Math.floor(219 / 100)  // 2
  → col = 219 % 100               // 19
  → dotNotation: "2.19"
```

**Reignmaker → Kingmaker (Write):**
```typescript
// In TerritoryService.updateKingmakerSettlement()
location: {x: 2, y: 19}
  → hexKey = (100 * 2) + 19  // 219
```

**Dot Notation → Foundry Grid:**
```typescript
// In ReignMakerMapLayer.drawSingleHex()
hexId: "2.19"
  → split('.') → ["2", "19"]
  → {i: 2, j: 19}
  → new GridHex({i: 2, j: 19}, canvas.grid)
```

### Validation System

All hex IDs are validated before storage to prevent coordinate system bugs:

```typescript
// In TerritoryService.validateHexId()
function validateHexId(hexId: string): boolean {
  // Must use dot notation
  if (!hexId.includes('.')) return false
  
  // Must have exactly 2 parts
  const parts = hexId.split('.')
  if (parts.length !== 2) return false
  
  // Both parts must be valid numbers
  const i = parseInt(parts[0], 10)
  const j = parseInt(parts[1], 10)
  if (isNaN(i) || isNaN(j)) return false
  
  // Coordinates must be in reasonable range (0-99)
  // This catches bugs like "20.19" which should be "2.19"
  if (i < 0 || i > 99 || j < 0 || j > 99) return false
  
  return true
}
```

**Validation runs automatically during:**
- `TerritoryService.syncFromKingmaker()` - All hex data from Kingmaker
- `TerritoryService.updateKingdomStore()` - Before writing to KingdomActor

**Error Behavior:**
- Invalid hex IDs throw an error with clear message
- Prevents bad data from entering the system
- Protects against future coordinate bugs

### Rendering System

**Vertex Calculation (Foundry v13 Pattern):**

```typescript
// In ReignMakerMapLayer.drawSingleHex()

// 1. Parse hex ID to grid offset
const [i, j] = hexId.split('.').map(Number)  // "2.19" → {i:2, j:19}

// 2. Create GridHex instance
const hex = new GridHex({i, j}, canvas.grid)

// 3. Get hex center (world coordinates)
const center = hex.center  // {x: 1234, y: 5678}

// 4. Get vertices (grid-relative, NOT world coordinates!)
const relativeVertices = canvas.grid.getShape(hex.offset)

// 5. Apply Kingmaker's scaling factor (fixes gaps)
const scale = (canvas.grid.sizeY + 2) / canvas.grid.sizeY

// 6. Translate to world coordinates
const worldVertices = relativeVertices.map(v => ({
  x: center.x + (v.x * scale),
  y: center.y + (v.y * scale)
}))

// 7. Draw polygon
graphics.drawPolygon(worldVertices.flatMap(v => [v.x, v.y]))
```

**Critical Implementation Detail:**
- `canvas.grid.getShape()` returns vertices **relative to (0,0)**, NOT world coordinates
- Must translate by adding to hex center to get correct world positions
- Scaling factor `(sizeY + 2) / sizeY` prevents gaps between hexes (matches Kingmaker)

### Data Flow

**Sync from Kingmaker:**
```
Kingmaker State (numeric: 219)
  ↓ TerritoryService.syncFromKingmaker()
  ↓ convertHexId() → "2.19"
  ↓ validateHexId() → ✅ Valid
  ↓ updateKingdomStore()
KingdomActor.kingdom.hexes[{id: "2.19", ...}]
```

**Render on Map:**
```
KingdomActor.kingdom.hexes
  ↓ KingdomStore (reactive)
  ↓ ReignMakerMapLayer.showKingdomHexes()
  ↓ drawSingleHex("2.19")
  ↓ Parse → {i: 2, j: 19}
  ↓ GridHex + vertex translation
Canvas Display (correct position)
```

**Write to Kingmaker:**
```
User Action (claim hex at 2.19)
  ↓ ClaimHexesAction
  ↓ hexId: "2:19" → split → {i: 2, j: 19}
  ↓ numericId = (2 * 100) + 19 = 219
Kingmaker State Update (hexes[219].claimed = true)
```

### Best Practices

**DO:**
- ✅ Always use dot notation (`"i.j"`) for stored hex IDs
- ✅ Parse coordinates only when needed for rendering/writing
- ✅ Rely on `validateHexId()` to catch invalid formats
- ✅ Use `TerritoryService.syncFromKingmaker()` for data import
- ✅ Test hex rendering after coordinate changes

**DON'T:**
- ❌ Store hex IDs in numeric or colon formats
- ❌ Manually construct hex IDs without validation
- ❌ Assume `getShape()` returns world coordinates
- ❌ Skip coordinate validation during sync
- ❌ Mix coordinate systems in the same context

### Troubleshooting

**Hexes not appearing on map?**
1. Check console for validation errors
2. Verify hex IDs use dot notation (`"2.19"` not `"219"` or `"2:19"`)
3. Confirm coordinates are in scene bounds (0-99 typically)
4. Test with known-good coordinates (scene center)

**Wrong hex positions?**
1. Verify coordinate transformation matches Kingmaker pattern
2. Check vertex scaling factor is applied
3. Ensure world coordinate translation (center + vertices)
4. Compare with Kingmaker's hex rendering

**Coordinate validation failing?**
1. Check hex ID format (must have dot separator)
2. Verify coordinates are numeric
3. Ensure range is reasonable (0-99 for Stolen Lands)
4. Review sync logs for conversion errors

## System Integration Points

### Events & Incidents
- **Location**: `data/events/*.json` and `data/incidents/*.json`
- **Format**: Normalized structure with `EventModifier[]` for outcomes
- **Processing**: Controllers create `ActiveModifier` instances for unresolved items
- **See**: `docs/GAME_EFFECTS_SYSTEM.md` for detailed effect system documentation

### Modifiers
- **Storage**: `kingdom.activeModifiers: ActiveModifier[]` in KingdomActor
- **Service**: `src/services/ModifierService.ts` handles lifecycle
- **Application**: StatusPhaseController applies ongoing modifiers each turn
- **Cleanup**: Automatic expiration based on turn count or resolution conditions

### Player Actions
- **29 Actions**: Loaded from `data/player-actions/*.json` at startup
- **6 Categories**: uphold-stability, military-operations, expand-borders, urban-planning, foreign-affairs, economic-actions
- **Type Safety**: Full TypeScript validation via `action-types.ts` and `game-commands.ts`
- **Execution**: GameCommandsService and GameCommandsResolver handle command execution

### Turn Phases (in order)
1. **STATUS** - Apply modifiers, check kingdom state
2. **EVENT** - Resolve kingdom events  
3. **UNREST** - Handle incidents, imprisoned unrest
4. **RESOURCE** - Collect from worksites
5. **ACTION** - Players execute actions
6. **UPKEEP** - End-of-turn cleanup

## Error Handling

**Console Logging Pattern:**
- 🟡 `[Controller]` - Phase/action start
- ✅ `[Controller]` - Success completion
- ❌ `[Controller]` - Error/failure
- 🔄 `[Controller]` - Reset/cleanup
- 🧹 `[Service]` - Maintenance operations

**Error Patterns:**
```typescript
try {
  // Operation
  return { success: true, data: result }
} catch (error) {
  console.error('❌ [Component] Operation failed:', error)
  return { success: false, error: error.message }
}
```

## Testing Approach

- **Unit Tests**: Test KingdomActor operations directly
- **Integration**: Test component reactivity with mock KingdomActor
- **Turn Flow**: Test phase progression with simple scenarios
- **Actions**: Validate action requirements and outcome parsing
- **Data Validation**: JSON schema validation for actions/events/incidents

---

## Additional Documentation

- **Game Effects System**: See `docs/GAME_EFFECTS_SYSTEM.md` for detailed action effect documentation
- **Phase Controllers**: See `docs/PHASE_CONTROLLER_GUIDE.md` for phase implementation patterns  
- **TurnManager Reference**: See `docs/TURNMANAGER_REFERENCE.md` for turn/phase coordination details

## Worksite Production Recalculation Pattern

### Overview

`worksiteProduction` is **derived data stored for efficiency**, not a cache. It's calculated from hexes but persisted in KingdomActor to avoid recalculating on every read. This pattern maintains data consistency while optimizing performance.

### Storage Location

```typescript
// In KingdomActor
interface KingdomData {
  worksiteProduction: Record<string, number>           // Total production by resource
  worksiteProductionByHex: Array<[HexInfo, Map<string, number>]>  // Per-hex breakdown
}
```

### Recalculation Helper

**Location:** `src/utils/recalculateProduction.ts`

**Main Function:**
```typescript
// Recalculates production from current hexes and updates KingdomActor
async function recalculateWorksiteProduction(): Promise<boolean>
```

**Convenience Wrapper:**
```typescript
// Silent failure version for use in services (doesn't block operations)
async function tryRecalculateProduction(): Promise<void>
```

### When to Recalculate

Call `recalculateWorksiteProduction()` whenever hexes or worksites change:

**✅ Automatic Recalculation:**
- **TerritoryService.syncFromKingmaker()** - After Kingmaker import
- **TerritoryService.importFromFoundryGrid()** - After grid import
- **TerritoryService.updateKingdomStore()** - After any hex bulk update

**⚠️ Manual Recalculation Needed:**
- Hex editing UI (claim/unclaim hexes)
- Worksite creation/modification through player actions
- Direct hex data manipulation

### Implementation Pattern

**In Services (Automatic):**
```typescript
// Territory service already handles this
private async updateKingdomStore(hexes: Hex[]): Promise<void> {
  await updateKingdom(state => {
    state.hexes = hexes.map(/* ... */)
    // Inline calculation during bulk updates
    state.worksiteProduction = calculateFromHexes(hexes)
  })
  
  // Recalculate to ensure consistency
  const { tryRecalculateProduction } = await import('../../utils/recalculateProduction')
  await tryRecalculateProduction()
}
```

**In Actions (Manual):**
```typescript
// After worksite-related changes
async createWorksite(data: WorksiteData): Promise<void> {
  await updateKingdom(kingdom => {
    // Modify hex worksite data
    const hex = kingdom.hexes.find(h => h.id === data.hexId)
    if (hex) hex.worksite = data.worksite
  })
  
  // Recalculate production
  const { tryRecalculateProduction } = await import('../utils/recalculateProduction')
  await tryRecalculateProduction()
}
```

### How It Works

1. **Read current hexes** from KingdomActor
2. **Convert to Hex instances** (with terrain, worksites, bonuses)
3. **Calculate production** using economics service
4. **Update KingdomActor** with new production values
5. **Reactivity triggers** UI updates automatically

### Key Principles

- **Not a cache** - It's persistent derived data
- **Efficiency** - Avoids recalculating on every resource collection
- **Consistency** - Recalculates whenever source data (hexes) changes
- **Single Source** - Hexes are the source of truth, production is derived
- **Automatic updates** - Reactive stores trigger UI updates when production changes

### Integration Points

| Location | Purpose | Status |
|----------|---------|--------|
| **TerritoryService** | Bulk hex updates (Kingmaker sync, imports) | ✅ Integrated |
| **ActionEffectsService** | Worksite creation via actions | ⚠️ Could benefit |
| **Hex Editing UI** | Manual hex/worksite modifications | 🔮 Future feature |
| **ResourcePhaseController** | Uses stored production (no recalc needed) | ✅ Correct usage |

### Performance Impact

- **Minimal** - Only recalculates after bulk operations (rare)
- **Async** - Doesn't block UI or gameplay
- **Safe** - Silent failure won't break hex operations
- **Efficient** - Resource collection uses stored values (fast)

### Future Considerations

When implementing hex editing UI:
```typescript
// Example: Manual hex claim
async function claimHex(hexId: string): Promise<void> {
  await updateKingdom(kingdom => {
    const hex = kingdom.hexes.find(h => h.id === hexId)
    if (hex) hex.claimedBy = 1
  })
  
  // IMPORTANT: Recalculate production after hex changes
  await recalculateWorksiteProduction()
}
```

---

This architecture provides a **clean, maintainable system** that leverages Foundry's strengths while keeping the code **simple and understandable**. The dual-effect action system provides complete type safety, and the reactive bridge pattern ensures consistent data flow throughout the application.
