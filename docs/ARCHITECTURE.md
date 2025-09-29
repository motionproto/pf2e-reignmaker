# Clean Architecture - PF2e Reignmaker

## Overview
This document describes the clean architecture implementation for the PF2e Reignmaker codebase, following Domain-Driven Design (DDD) principles and separation of concerns.

## Architecture Layers

### 1. Presentation Layer (UI Components)
**Location**: `src/view/`

**Responsibilities**:
- Display data to users
- Handle user interactions
- Manage UI-only state
- Call controller methods for business logic

**Key Principle**: Svelte components should be "dumb" - they should NOT contain business logic, service instantiation, or direct command execution.

### 2. Application Layer (Controllers)
**Location**: `src/controllers/`

**Responsibilities**:
- Orchestrate services and commands
- Manage application workflow
- Transform data for UI consumption
- Handle cross-cutting concerns

**Example Controllers**:
- `EventPhaseController` - Orchestrates event phase operations
- `ActionPhaseController` - Manages player actions
- `UnrestPhaseController` - Handles unrest phase logic

### 3. Domain Layer (Business Logic)
**Location**: `src/services/domain/`

**Structure**:
```
services/
├── domain/                   (Core business rules)
│   ├── events/              (Event-related services)
│   │   └── EventService.ts
│   ├── modifiers/           (Modifier management)
│   │   └── ModifierService.ts
│   ├── actions/             (Action execution)
│   │   └── ActionExecutionService.ts
│   └── shared/              (Shared domain services)
│       └── DiceService.ts
├── formatters/              (UI formatting services)
└── parsers/                 (Data parsing services)
```

### 4. Command Layer (State Mutations)
**Location**: `src/commands/`

**Structure**:
```
commands/
├── base/                    (Command infrastructure)
│   ├── Command.ts
│   └── CommandExecutor.ts
├── event/                   (Event-related commands)
│   └── ApplyEventOutcomeCommand.ts
├── action/                  (Action-related commands)
│   └── ExecuteActionCommand.ts
├── unrest/                  (Unrest-related commands)
│   └── ProcessUnrestCommand.ts
└── kingdom/                 (Kingdom state commands)
    ├── ResetKingdomCommand.ts
    └── UpdateResourcesCommand.ts
```

**Responsibilities**:
- Encapsulate state mutations
- Provide rollback capabilities
- Ensure transactional consistency
- Validate business rules before execution

### 5. Data Layer (State Management)
**Location**: `src/stores/`

**Key Stores**:
- `kingdom.ts` - Kingdom state management
- `gameState.ts` - Game flow and phase management

## Data Flow Pattern

```
User Interaction (Svelte Component)
    ↓
Controller Method Call
    ↓
Service Orchestration (Business Logic)
    ↓
Command Execution (State Mutation)
    ↓
Store Update
    ↓
UI Re-render (via Svelte reactivity)
```

## Refactoring Pattern

### Before (Anti-pattern):
```typescript
// ❌ BAD: Business logic in Svelte component
// EventsPhase.svelte
<script>
import { EventResolutionService } from '../services/EventResolutionService';

let eventService = new EventResolutionService();

async function handleEvent() {
    // Direct service calls and business logic in component
    const result = eventService.applyEventOutcome(event, outcome);
    // Direct store updates
    kingdomState.update(state => {
        state.unrest = result.unrest;
        return state;
    });
}
</script>
```

### After (Clean Architecture):
```typescript
// ✅ GOOD: Controller orchestrates business logic
// EventsPhase.svelte
<script>
import { eventPhaseController } from '../controllers/EventPhaseController';

async function handleEvent() {
    // Simple controller call
    const result = await eventPhaseController.applyEventOutcome(
        event, 
        outcome,
        $kingdomState,
        $gameState.currentTurn
    );
    // Controller handles all orchestration
}
</script>
```

## Benefits

1. **Testability**: Business logic isolated from UI framework
2. **Maintainability**: Clear separation of concerns
3. **Reusability**: Services and commands can be reused across different UI components
4. **Consistency**: All state mutations go through commands
5. **Debugging**: Clear data flow makes issues easier to trace

## Migration Status

### ✅ Completed
- [x] Reorganized service structure into domain folders
- [x] Moved commands from `impl/` to domain-specific folders
- [x] Updated import paths throughout codebase
- [x] Created EventPhaseController with proper orchestration

### 🚧 In Progress
- [ ] Refactor EventsPhase.svelte to use EventPhaseController
- [ ] Refactor ActionsPhase.svelte to use ActionPhaseController
- [ ] Refactor UnrestPhase.svelte to use UnrestPhaseController

### 📋 Future Work
- [ ] Create application services for complex orchestrations
- [ ] Implement infrastructure layer for external integrations
- [ ] Add comprehensive command logging and auditing
- [ ] Implement saga pattern for complex multi-step operations

## Key Files Refactored

### Services Reorganization
- `src/services/EventService.ts` → `src/services/domain/events/EventService.ts`
- `src/services/ModifierService.ts` → `src/services/domain/modifiers/ModifierService.ts`

### Commands Reorganization
- `src/commands/impl/ApplyEventOutcomeCommand.ts` → `src/commands/event/ApplyEventOutcomeCommand.ts`
- `src/commands/impl/ExecuteActionCommand.ts` → `src/commands/action/ExecuteActionCommand.ts`
- `src/commands/impl/ProcessUnrestCommand.ts` → `src/commands/unrest/ProcessUnrestCommand.ts`
- `src/commands/impl/ResetKingdomCommand.ts` → `src/commands/kingdom/ResetKingdomCommand.ts`
- `src/commands/impl/UpdateResourcesCommand.ts` → `src/commands/kingdom/UpdateResourcesCommand.ts`

## Best Practices

1. **Never instantiate services in UI components** - Use dependency injection through controllers
2. **Keep business logic out of stores** - Stores should only manage state
3. **Use commands for all state mutations** - Ensures consistency and rollback capability
4. **Controllers return UI-ready data** - No business logic calculations in components
5. **Services are stateless** - State belongs in stores or controller state

## Testing Strategy

### Unit Tests
- **Services**: Test business logic in isolation
- **Commands**: Test state mutations and rollback
- **Controllers**: Test orchestration and workflow

### Integration Tests
- **Controller + Services**: Test complete workflows
- **Commands + Stores**: Test state management

### E2E Tests
- **User Flows**: Test complete user interactions through the UI

## Conclusion

This clean architecture provides a solid foundation for the PF2e Reignmaker application, ensuring maintainability, testability, and clear separation of concerns. The refactoring from UI-heavy components to controller-orchestrated operations significantly improves code quality and developer experience.
