# Refactor ArmyDeploymentPanel to Svelte - Plan

**Goal:** Refactor `ArmyDeploymentPanel` service to follow architecture patterns: move business logic to a controller, make Svelte component more self-contained, and keep service focused on integration/coordination only.

## Current Architecture Problems

### Issues with Current Implementation

1. **Too Much Business Logic in Service**
   - Service class (`ArmyDeploymentPanel.ts`) contains:
     - Army selection logic
     - Path validation and management
     - Roll handling and reroll logic
     - State machine management (panelState)
     - Outcome handling and game command execution
   - Should be in a controller instead

2. **Service Manages UI State**
   - Service directly updates component props via `$set()`
   - Service manages panel state machine
   - Should be reactive state in Svelte component

3. **Tight Coupling**
   - Service tightly coupled to specific UI component
   - Difficult to test business logic separately
   - Hard to reuse logic in different contexts

4. **Violates Separation of Concerns**
   - According to architecture rules:
     - **Svelte components** = Presentation only (UI, user interaction, display logic)
     - **Controllers** = Business logic only (phase operations, game rules, calculations)
     - **Services** = Complex operations (utilities, integrations, reusable logic)
   - Current implementation mixes all three

## Target Architecture

Following the pattern from `HexSelectorService` and architecture docs:

```
┌─────────────────────────────────────────┐
│  ArmyDeploymentPanelService (Service)   │
│  - Entry point (selectArmyAndPlotPath)  │
│  - Integration (minimize app, cleanup)  │
│  - Event listener management            │
│  - Component mounting/unmounting        │
└──────────────┬──────────────────────────┘
               │
               │ delegates to
               ▼
┌─────────────────────────────────────────┐
│  ArmyDeploymentController (Controller)  │
│  - Army selection logic                 │
│  - Path validation                      │
│  - Roll trigger logic                   │
│  - Reroll logic                         │
│  - Game command execution               │
│  - State management                     │
└──────────────┬──────────────────────────┘
               │
               │ updates state
               ▼
┌─────────────────────────────────────────┐
│  ArmyDeploymentPanel.svelte (Component) │
│  - Reactive UI state                    │
│  - User interactions                    │
│  - Display logic                        │
│  - Delegates actions to controller      │
└─────────────────────────────────────────┘
```

## Refactoring Steps

### Phase 1: Create Controller (Business Logic)

**File:** `src/controllers/army/ArmyDeploymentController.ts`

**Responsibilities:**
- Army selection and validation
- Path management and validation
- Roll trigger coordination
- Reroll logic (with fame)
- Outcome handling
- Game command execution

**Key Methods:**
```typescript
export async function createArmyDeploymentController() {
  return {
    // Army selection
    async selectArmy(armyId: string): Promise<{ success: boolean; error?: string }>
    async validateArmySelection(armyId: string): Promise<{ valid: boolean; error?: string }>
    
    // Path management
    getPlottedPath(): string[]
    setPlottedPath(path: string[]): void
    validatePath(path: string[]): { valid: boolean; error?: string }
    
    // Roll coordination
    async triggerRoll(skill: string, armyId: string, path: string[]): Promise<void>
    
    // Reroll
    async handleReroll(): Promise<{ success: boolean; error?: string }>
    
    // Outcome handling
    async applyOutcome(outcome: string): Promise<{ success: boolean; error?: string }>
    
    // State queries
    getSelectedArmyId(): string | null
    getCurrentState(): 'selection' | 'waiting-for-roll' | 'showing-result' | 'animating' | 'completed'
    getRollResult(): RollResultData | null
  };
}
```

**Dependencies:**
- `armyMovementMode` service (for path plotting)
- `RerollHelpers` (for fame reroll logic)
- `GameCommandsResolver` (for applying deployment effects)
- `PipelineCoordinator` (for reroll execution)

### Phase 2: Refactor Svelte Component (Self-Contained UI)

**File:** `src/view/army/ArmyDeploymentPanel.svelte`

**Changes:**

1. **Manage State Internally**
   - Move `panelState` to reactive state inside component
   - Manage `selectedArmyId`, `plottedPath`, `rollResult` internally
   - Subscribe to controller state updates

2. **Add Reactive Stores**
   - Create writable stores for state that controller updates
   - Component subscribes to stores for reactivity

3. **Delegate Actions**
   - All button clicks delegate to controller methods
   - Component only handles UI feedback

4. **Event-Driven Updates**
   - Controller emits events when state changes
   - Component listens and updates UI accordingly

**New Props:**
```typescript
export let controller: ArmyDeploymentController;
export let onComplete: (result: DeploymentResult | null) => void;
export let onCancel: () => void;
```

**Remove These Props (now internal state):**
- `selectedArmyId` → internal reactive state
- `plottedPath` → internal reactive state
- `panelState` → internal reactive state
- `rollResult` → internal reactive state

### Phase 3: Simplify Service (Integration Only)

**File:** `src/services/army/ArmyDeploymentPanel.ts`

**Keep Only:**
- Entry point (`selectArmyAndPlotPath`)
- App window management (minimize/restore)
- Component mounting/unmounting
- Event listener setup/cleanup (token clicks, keyboard, roll completion)
- Integration coordination

**Remove:**
- Army selection logic → Controller
- Path management → Controller
- Roll handling → Controller
- Reroll logic → Controller
- State management → Controller/Component
- Component prop updates → Component reactive state

**New Structure:**
```typescript
export class ArmyDeploymentPanel {
  private active = false;
  private service: ArmyDeploymentController | null = null;
  private component: SvelteComponent | null = null;
  private panelMountPoint: HTMLElement | null = null;
  
  // Event handlers (delegate to controller)
  private tokenClickHandler: ((event: any) => void) | null = null;
  private keyDownHandler: ((event: KeyboardEvent) => void) | null = null;
  private rollCompleteHandler: ((event: any) => void) | null = null;
  
  async selectArmyAndPlotPath(
    skill: string,
    onRollTrigger: (skill: string, armyId: string, path: string[]) => Promise<void>
  ): Promise<DeploymentResult | null> {
    // 1. Create controller
    // 2. Minimize app
    // 3. Mount component (pass controller)
    // 4. Attach event listeners (delegate to controller)
    // 5. Wait for completion
    // 6. Cleanup
  }
  
  private async mountPanel(controller: ArmyDeploymentController): Promise<void> {
    // Mount component, pass controller instance
  }
  
  private cleanup(): void {
    // Remove listeners, unmount component, restore app
  }
}
```

### Phase 4: Update Integration Points

**Files to Update:**

1. **`src/view/kingdom/turnPhases/ActionsPhase.svelte`**
   - No changes needed (calls service entry point)
   - Service interface remains the same

2. **Event Listeners**
   - Token click → delegate to `controller.selectArmy()`
   - Keyboard → delegate to `controller.handleCancel()`
   - Roll complete → delegate to `controller.handleRollComplete()`

3. **Movement Mode Integration**
   - Controller manages `armyMovementMode` activation/deactivation
   - Controller sets up path change callbacks
   - Controller handles path completion

## Detailed Implementation

### Controller State Management

**Approach:** Controller uses reactive stores that component subscribes to

```typescript
// In controller
import { writable } from 'svelte/store';

const selectedArmyIdStore = writable<string | null>(null);
const plottedPathStore = writable<string[]>([]);
const panelStateStore = writable<PanelState>('selection');
const rollResultStore = writable<RollResultData | null>(null);

export async function createArmyDeploymentController() {
  return {
    // Expose stores for component subscription
    selectedArmyId: selectedArmyIdStore,
    plottedPath: plottedPathStore,
    panelState: panelStateStore,
    rollResult: rollResultStore,
    
    async selectArmy(armyId: string) {
      // Validation logic...
      selectedArmyIdStore.set(armyId);
      panelStateStore.set('selection');
      // Activate movement mode...
    },
    
    // ... other methods
  };
}
```

**Component Usage:**
```svelte
<script>
  let controller;
  $: selectedArmyId = $controller.selectedArmyId;
  $: plottedPath = $controller.plottedPath;
  $: panelState = $controller.panelState;
  $: rollResult = $controller.rollResult;
</script>
```

### Event Flow

**Roll Completion Flow:**
```
1. Pipeline completes roll → dispatches 'kingdomRollComplete' event
2. Service listener receives event → calls controller.handleRollComplete()
3. Controller updates rollResult store → component reacts
4. Component shows result UI
5. User clicks Confirm → component calls controller.applyOutcome()
6. Controller executes game command → updates state → component reacts
```

**Reroll Flow:**
```
1. User clicks Reroll → component calls controller.handleReroll()
2. Controller checks fame → deducts fame
3. Controller clears instance → triggers new pipeline execution
4. Pipeline re-executes → new roll completes
5. Event fires → controller updates rollResult → component reacts
```

### Testing Strategy

**Unit Tests:**
- Controller methods (army selection, path validation, reroll logic)
- Service integration (mounting, cleanup, event listeners)
- Component UI rendering (different states)

**Integration Tests:**
- Full deployment flow (select → plot → roll → confirm)
- Reroll flow
- Cancel flow
- Error handling

## Migration Checklist

### Phase 1: Create Controller
- [ ] Create `src/controllers/army/ArmyDeploymentController.ts`
- [ ] Move army selection logic from service
- [ ] Move path validation logic
- [ ] Move roll trigger logic
- [ ] Move reroll logic
- [ ] Move outcome application logic
- [ ] Create reactive stores for state
- [ ] Write unit tests for controller methods

### Phase 2: Refactor Component
- [ ] Update component to use controller stores
- [ ] Move state management to component (where appropriate)
- [ ] Update event handlers to delegate to controller
- [ ] Remove props that are now internal state
- [ ] Add controller prop
- [ ] Test component rendering in all states

### Phase 3: Simplify Service
- [ ] Remove business logic from service
- [ ] Keep only integration code (mounting, listeners, cleanup)
- [ ] Update service to use controller
- [ ] Test service integration

### Phase 4: Integration
- [ ] Verify ActionsPhase.svelte still works
- [ ] Test full deployment flow
- [ ] Test reroll flow
- [ ] Test cancel flow
- [ ] Test error scenarios
- [ ] Update documentation

## Benefits

1. **Better Separation of Concerns**
   - Business logic in controller (testable, reusable)
   - UI logic in component (reactive, self-contained)
   - Integration in service (minimal, focused)

2. **Easier Testing**
   - Controller can be unit tested independently
   - Component can be tested with mock controller
   - Service integration tests are simpler

3. **Better Reusability**
   - Controller logic can be reused in other contexts
   - Component can be adapted for different use cases

4. **Follows Architecture Patterns**
   - Aligns with existing patterns (HexSelectorService, PhaseControllers)
   - Matches documented architecture principles

## Potential Challenges

1. **State Synchronization**
   - Controller and component need to stay in sync
   - Solution: Use reactive stores, controller emits updates

2. **Event Listener Coordination**
   - Service still needs to coordinate event listeners
   - Solution: Service attaches listeners, delegates to controller

3. **Movement Mode Integration**
   - Movement mode needs to work with controller
   - Solution: Controller manages movement mode lifecycle

4. **Roll Completion Event**
   - Event needs to reach controller
   - Solution: Service listener forwards to controller method

## References

- Architecture docs: `docs/ARCHITECTURE.md`
- Similar pattern: `src/services/hex-selector/HexSelectorService.ts`
- Controller pattern: `src/controllers/*PhaseController.ts`
- Component pattern: `src/view/kingdom/turnPhases/*.svelte`


